#!/usr/bin/env node
/*
 * MCP Security Toolkit — Scan Server
 * A dependency-free Node backend that performs a non-destructive security
 * assessment of a user-supplied URL, mapping each phase to one of the 8 MCP
 * security servers. Phases that require extra inputs (repo, pcap, file, API
 * spec) are reported as "skipped — needs <input>" rather than faked.
 *
 * Run:  node server.js   (then open http://localhost:8787)
 */
'use strict';

const http = require('http');
const https = require('https');
const tls = require('tls');
const net = require('net');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const crypto = require('crypto');

// Promisified command runner (captures stdout even on non-zero exit)
function sh(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 60000, maxBuffer: 20 * 1024 * 1024, ...opts },
      (err, stdout, stderr) => resolve({ err, stdout: stdout || '', stderr: stderr || '' }));
  });
}

// Patterns used to flag cleartext secrets in pcap/file string dumps
const SECRET_PATTERNS = [
  [/authorization:\s*basic\s+[a-z0-9+/=]+/i, 'HTTP Basic credentials (cleartext)'],
  [/authorization:\s*bearer\s+[\w.\-]{8,}/i, 'Bearer token (cleartext)'],
  [/(?:password|passwd|pwd)["'=:\s]+[^\s"'&]{3,}/i, 'Cleartext password'],
  [/set-cookie:[^\n]*(?:session|sid|token|auth)/i, 'Session cookie in cleartext'],
  [/api[_-]?key["'=:\s]+[\w\-]{16,}/i, 'API key'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'Private key material'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key ID'],
  [/eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\./, 'JWT token'],
];

const PORT = process.env.PORT || 8787;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MCP_ROOT = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// Minimal .env loader (reads keys from the existing MCP server .env files)
// ---------------------------------------------------------------------------
function loadEnvFile(p) {
  try {
    const out = {};
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch { return {}; }
}
const localEnv = loadEnvFile(path.join(__dirname, '.env'));
const vtEnv = loadEnvFile(path.join(MCP_ROOT, 'mcp-virustotal', '.env'));
const VT_KEY = process.env.VIRUSTOTAL_API_KEY || process.env.VT_API_KEY || localEnv.VIRUSTOTAL_API_KEY || localEnv.VT_API_KEY || vtEnv.VIRUSTOTAL_API_KEY || vtEnv.VT_API_KEY || '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sev = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };

function finding(severity, title, detail) {
  return { severity, title, detail };
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    if (body) req.write(body);
    req.end();
  });
}

function parseTarget(raw) {
  let u;
  try { u = new URL(raw.includes('://') ? raw : `https://${raw}`); }
  catch { throw new Error('Invalid URL'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http/https targets are allowed');
  return u;
}

// ---------------------------------------------------------------------------
// Phase 1 — VirusTotal MCP (reputation / threat intel)
// ---------------------------------------------------------------------------
async function phaseVirusTotal(url) {
  const out = { mcp: 'VirusTotal MCP', phase: 'Reputation & threat intel', status: 'ok', findings: [], raw: {} };
  if (!VT_KEY) { out.status = 'skipped'; out.reason = 'VIRUSTOTAL_API_KEY not configured'; return out; }
  try {
    const domain = url.hostname;
    const r = await httpsRequest({
      hostname: 'www.virustotal.com', path: `/api/v3/domains/${domain}`,
      method: 'GET', headers: { 'x-apikey': VT_KEY },
    });
    if (r.status === 404) { out.findings.push(finding('INFO', 'Domain not yet in VirusTotal corpus (no prior submissions)', '')); return out; }
    if (r.status !== 200) { out.status = 'error'; out.reason = `VT API HTTP ${r.status}`; return out; }
    const j = JSON.parse(r.body);
    const stats = j.data?.attributes?.last_analysis_stats || {};
    const rep = j.data?.attributes?.reputation ?? 0;
    out.raw = { stats, reputation: rep };
    const mal = stats.malicious || 0, susp = stats.suspicious || 0;
    if (mal > 2) out.findings.push(finding('HIGH', `${mal} engines flag this domain as malicious`, JSON.stringify(stats)));
    else if (mal + susp > 0) out.findings.push(finding('INFO', `${mal} malicious / ${susp} suspicious (likely low-rep false positive)`, JSON.stringify(stats)));
    else out.findings.push(finding('INFO', 'No malicious detections', JSON.stringify(stats)));
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 2 — nmap MCP (port / service exposure)  [TCP-connect, non-destructive]
// ---------------------------------------------------------------------------
const COMMON_PORTS = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 587, 993, 995, 1433, 1521, 2000, 3000, 3306, 3389, 5060, 5432, 5900, 6379, 8000, 8080, 8443, 9200, 27017];
function checkPort(host, port, timeout = 2500) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    const fin = (open) => { if (!done) { done = true; s.destroy(); resolve(open); } };
    s.setTimeout(timeout);
    s.once('connect', () => fin(true));
    s.once('timeout', () => fin(false));
    s.once('error', () => fin(false));
    s.connect(port, host);
  });
}
async function phaseNmap(url, ips) {
  const out = { mcp: 'nmap MCP', phase: 'Port / service exposure', status: 'ok', findings: [], raw: {} };
  const host = ips[0] || url.hostname;
  try {
    const results = await Promise.all(COMMON_PORTS.map(async (p) => ({ p, open: await checkPort(host, p) })));
    const open = results.filter((r) => r.open).map((r) => r.p);
    out.raw = { host, openPorts: open, method: 'TCP connect scan (top ports)' };
    out.findings.push(finding('INFO', `Open ports: ${open.join(', ') || 'none'}`, `target ${host}`));
    const risky = { 21: 'FTP', 23: 'Telnet', 3389: 'RDP', 3306: 'MySQL', 5432: 'Postgres', 6379: 'Redis', 27017: 'MongoDB', 9200: 'Elasticsearch' };
    for (const p of open) if (risky[p]) out.findings.push(finding('MEDIUM', `Sensitive service exposed: ${risky[p]} (port ${p})`, host));
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 4 — Awesome Kali MCP (TLS + HTTP security headers)
// ---------------------------------------------------------------------------
// Node's bundled OpenSSL refuses to initiate TLS 1.0/1.1, so we shell out to the
// system openssl for an accurate "does the server accept this version?" answer.
const OPENSSL_FLAG = { 'TLSv1': '-tls1', 'TLSv1.1': '-tls1_1', 'TLSv1.2': '-tls1_2', 'TLSv1.3': '-tls1_3' };
function testTlsVersion(host, version) {
  return new Promise((resolve) => {
    const flag = OPENSSL_FLAG[version];
    const child = execFile('openssl', ['s_client', '-connect', `${host}:443`, '-servername', host, flag],
      { timeout: 9000 }, (err, stdout) => {
        resolve(/^\s*Protocol\s*:\s*TLSv/m.test(stdout || ''));
      });
    child.stdin.end(''); // openssl waits on stdin otherwise
  });
}
function getCert(host) {
  return new Promise((resolve) => {
    const s = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false, timeout: 8000 }, () => {
      const c = s.getPeerCertificate();
      resolve({ issuer: c.issuer?.O, subject: c.subject?.CN, validTo: c.valid_to, validFrom: c.valid_from });
      s.destroy();
    });
    s.once('error', () => resolve(null));
    s.once('timeout', () => { resolve(null); s.destroy(); });
  });
}
async function phaseWebSurface(url) {
  const out = { mcp: 'Awesome Kali MCP', phase: 'TLS & HTTP security headers', status: 'ok', findings: [], raw: {} };
  const host = url.hostname;
  try {
    // Headers
    const r = await new Promise((resolve, reject) => {
      const req = https.request({ hostname: host, path: url.pathname || '/', method: 'GET', headers: { 'User-Agent': 'MCP-Scanner/1.0' } },
        (res) => { res.on('data', () => {}); res.on('end', () => resolve(res)); });
      req.on('error', reject); req.setTimeout(12000, () => req.destroy(new Error('timeout'))); req.end();
    });
    const h = r.headers;
    const checks = [
      ['strict-transport-security', 'HSTS (Strict-Transport-Security)', 'MEDIUM'],
      ['content-security-policy', 'Content-Security-Policy', 'MEDIUM'],
      ['x-frame-options', 'X-Frame-Options (clickjacking)', 'LOW'],
      ['x-content-type-options', 'X-Content-Type-Options', 'LOW'],
      ['referrer-policy', 'Referrer-Policy', 'LOW'],
      ['permissions-policy', 'Permissions-Policy', 'INFO'],
    ];
    const present = {}, missing = [];
    for (const [k, label, s] of checks) {
      if (h[k]) present[k] = h[k];
      else { missing.push(label); out.findings.push(finding(s, `Missing header: ${label}`, '')); }
    }
    if (h['server']) out.findings.push(finding('INFO', `Server header: ${h['server']}`, ''));
    out.raw.headersPresent = present; out.raw.headersMissing = missing;

    // TLS versions
    const versions = ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];
    const accepted = {};
    for (const v of versions) accepted[v] = await testTlsVersion(host, v);
    out.raw.tls = accepted;
    if (accepted['TLSv1'] || accepted['TLSv1.1'])
      out.findings.push(finding('MEDIUM', 'Legacy TLS 1.0/1.1 accepted', JSON.stringify(accepted)));
    out.raw.certificate = await getCert(host);
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 5 — Snyk CLI MCP (dependency / known-CVE scan)
// Activated when the user supplies a local repo/manifest path.
// ---------------------------------------------------------------------------
function runSnyk(cwd) {
  return new Promise((resolve) => {
    execFile('snyk', ['test', '--json'], { cwd, timeout: 120000, maxBuffer: 20 * 1024 * 1024 },
      (err, stdout) => resolve(stdout || '')); // snyk exits non-zero when vulns found; stdout still holds JSON
  });
}
async function phaseSnyk(repoPath) {
  const out = { mcp: 'Snyk CLI MCP', phase: 'Dependency / CVE scan', status: 'ok', findings: [], raw: {} };
  if (!repoPath) { out.status = 'skipped'; out.reason = 'Needs a repository or dependency manifest path'; return out; }
  const dir = path.resolve(repoPath.replace(/^~(?=\/|$)/, process.env.HOME || ''));
  if (!fs.existsSync(dir)) { out.status = 'error'; out.reason = `Path not found: ${dir}`; return out; }
  const manifests = ['package.json', 'requirements.txt', 'pom.xml', 'go.mod', 'Gemfile', 'build.gradle', 'pyproject.toml', 'composer.json'];
  if (!manifests.some((m) => fs.existsSync(path.join(dir, m)))) {
    out.status = 'error'; out.reason = `No supported manifest in ${dir} (looked for ${manifests.slice(0, 4).join(', ')}…)`; return out;
  }
  try {
    const raw = await runSnyk(dir);
    let j; try { j = JSON.parse(raw); } catch { out.status = 'error'; out.reason = (raw || 'snyk produced no output').slice(0, 300); return out; }
    const vulns = (Array.isArray(j) ? j.flatMap((x) => x.vulnerabilities || []) : (j.vulnerabilities || []));
    const uniq = new Map();
    for (const v of vulns) uniq.set(v.id, v);
    out.raw = { path: dir, dependencyCount: j.dependencyCount, total: uniq.size };
    if (uniq.size === 0) { out.findings.push(finding('INFO', 'No known vulnerabilities found', dir)); return out; }
    const map = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
    for (const v of uniq.values()) {
      const fix = v.fixedIn?.length ? ` → fix in ${v.fixedIn.join(', ')}` : ' (no fix yet)';
      out.findings.push(finding(map[v.severity] || 'LOW', `${v.packageName}@${v.version}: ${v.title}`, `${(v.identifiers?.CVE || []).join(', ')}${fix}`));
    }
    out.findings.sort((a, b) => sev[b.severity] - sev[a.severity]);
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 6 — Postman MCP (API endpoint security checks)  [non-destructive GETs]
// ---------------------------------------------------------------------------
async function phasePostman(apiUrl) {
  const out = { mcp: 'Postman MCP', phase: 'API security testing', status: 'ok', findings: [], raw: {} };
  if (!apiUrl) { out.status = 'skipped'; out.reason = 'Needs an API endpoint URL'; return out; }
  let u; try { u = parseTarget(apiUrl); } catch (e) { out.status = 'error'; out.reason = e.message; return out; }
  try {
    const r = await new Promise((resolve, reject) => {
      const req = https.request({ hostname: u.hostname, path: (u.pathname || '/') + (u.search || ''), method: 'GET', headers: { 'User-Agent': 'MCP-Scanner/1.0', 'Accept': 'application/json' } },
        (res) => { let b = ''; res.on('data', (c) => (b += c.length > 50000 ? '' : c)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b })); });
      req.on('error', reject); req.setTimeout(12000, () => req.destroy(new Error('timeout'))); req.end();
    });
    out.raw = { status: r.status, contentType: r.headers['content-type'] };
    // Auth enforcement
    if (r.status === 200) out.findings.push(finding('MEDIUM', 'Endpoint returns 200 without authentication', 'Verify this endpoint is meant to be public'));
    else if (r.status === 401 || r.status === 403) out.findings.push(finding('INFO', `Auth enforced (HTTP ${r.status})`, ''));
    // CORS
    const acao = r.headers['access-control-allow-origin'];
    if (acao === '*') out.findings.push(finding(r.headers['access-control-allow-credentials'] === 'true' ? 'HIGH' : 'LOW', `Permissive CORS: ACAO ${acao}`, ''));
    // Verbose errors / stack traces
    if (/Traceback|Exception in|at [\w.$]+\([\w.]+:\d+\)|SQL syntax|ORA-\d{5}|stack trace/i.test(r.body))
      out.findings.push(finding('MEDIUM', 'Verbose error / stack trace leakage in response', ''));
    // Server/version disclosure
    if (r.headers['server']) out.findings.push(finding('INFO', `Server header: ${r.headers['server']}`, ''));
    if (r.headers['x-powered-by']) out.findings.push(finding('LOW', `Tech disclosure: X-Powered-By ${r.headers['x-powered-by']}`, ''));
    // Sensitive data in body
    for (const [re, label] of SECRET_PATTERNS) if (re.test(r.body)) { out.findings.push(finding('HIGH', `Sensitive data in API response: ${label}`, '')); break; }
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 7 — WireMCP (pcap cleartext-secret / exposure analysis)
// ---------------------------------------------------------------------------
async function phaseWire(pcapPath) {
  const out = { mcp: 'WireMCP', phase: 'Traffic analysis', status: 'ok', findings: [], raw: {} };
  if (!pcapPath) { out.status = 'skipped'; out.reason = 'Needs a captured .pcap file'; return out; }
  const file = path.resolve(pcapPath.replace(/^~(?=\/|$)/, process.env.HOME || ''));
  if (!fs.existsSync(file)) { out.status = 'error'; out.reason = `File not found: ${file}`; return out; }
  try {
    const ft = (await sh('file', ['-b', file])).stdout.trim();
    out.raw = { file, type: ft };
    if (!/pcap|capture|tcpdump/i.test(ft)) out.findings.push(finding('INFO', `File may not be a pcap: ${ft}`, ''));
    const dump = (await sh('strings', ['-n', '6', file])).stdout;
    const hits = [];
    for (const [re, label] of SECRET_PATTERNS) if (re.test(dump)) hits.push(label);
    if (/GET \/| HTTP\/1\.[01]\r?\n/i.test(dump)) out.findings.push(finding('LOW', 'Cleartext HTTP traffic present in capture', ''));
    for (const h of [...new Set(hits)]) out.findings.push(finding('HIGH', `Cleartext secret in traffic: ${h}`, '(value redacted)'));
    if (!hits.length) out.findings.push(finding('INFO', 'No cleartext secrets matched known patterns', file));
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 8 — Container-MCP (safe static inspection of a file + VT hash lookup)
// Static only — never executes the artifact.
// ---------------------------------------------------------------------------
async function phaseContainer(filePath) {
  const out = { mcp: 'Container-MCP', phase: 'Payload sandboxing (static)', status: 'ok', findings: [], raw: {} };
  if (!filePath) { out.status = 'skipped'; out.reason = 'Needs a file/payload artifact'; return out; }
  const file = path.resolve(filePath.replace(/^~(?=\/|$)/, process.env.HOME || ''));
  if (!fs.existsSync(file)) { out.status = 'error'; out.reason = `File not found: ${file}`; return out; }
  try {
    const buf = fs.readFileSync(file);
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    const ft = (await sh('file', ['-b', file])).stdout.trim();
    out.raw = { file, type: ft, sha256, size: buf.length };
    out.findings.push(finding('INFO', `File: ${ft} (${buf.length} bytes)`, `sha256 ${sha256}`));
    // VirusTotal hash lookup (no upload — privacy-safe)
    if (VT_KEY) {
      const r = await httpsRequest({ hostname: 'www.virustotal.com', path: `/api/v3/files/${sha256}`, method: 'GET', headers: { 'x-apikey': VT_KEY } });
      if (r.status === 200) {
        const st = JSON.parse(r.body).data?.attributes?.last_analysis_stats || {};
        const mal = st.malicious || 0;
        out.findings.push(finding(mal > 0 ? 'CRITICAL' : 'INFO', `VirusTotal: ${mal} engines flag this file as malicious`, JSON.stringify(st)));
      } else if (r.status === 404) out.findings.push(finding('INFO', 'Hash not seen by VirusTotal before', sha256));
    }
    // IOC strings
    const dump = (await sh('strings', ['-n', '6', file])).stdout;
    const urls = (dump.match(/https?:\/\/[^\s"'<>]{6,}/gi) || []).slice(0, 5);
    if (urls.length) out.findings.push(finding('LOW', `Embedded URLs (${urls.length}): ${urls.join(', ')}`, ''));
    for (const [re, label] of SECRET_PATTERNS) if (re.test(dump)) { out.findings.push(finding('MEDIUM', `Embedded secret-like string: ${label}`, '')); break; }
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

function skipped(mcp, phase, reason) { return { mcp, phase, status: 'skipped', reason, findings: [] }; }

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------
async function runScan(rawTarget, opts = {}) {
  const url = parseTarget(rawTarget);
  let ips = [];
  try { ips = (await dns.lookup(url.hostname, { all: true })).map((a) => a.address); } catch {}

  const [vt, nmap, web, snyk, postman, wire, container] = await Promise.all([
    phaseVirusTotal(url),
    phaseNmap(url, ips),
    phaseWebSurface(url),
    phaseSnyk(opts.repoPath),
    phasePostman(opts.apiUrl),
    phaseWire(opts.pcapPath),
    phaseContainer(opts.filePath),
  ]);

  const phases = [vt, nmap, web, snyk, postman, wire, container];

  // Aggregate
  const all = phases.flatMap((p) => (p.findings || []).map((f) => ({ ...f, mcp: p.mcp })));
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of all) counts[f.severity] = (counts[f.severity] || 0) + 1;
  all.sort((a, b) => sev[b.severity] - sev[a.severity]);

  return {
    target: url.href,
    host: url.hostname,
    ips,
    scannedAt: new Date().toISOString(),
    counts,
    phases,
    findings: all,
  };
}

// ---------------------------------------------------------------------------
// HTTP server (static files + /api/scan)
// ---------------------------------------------------------------------------
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
function serveStatic(req, res) {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const fp = path.join(PUBLIC_DIR, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/scan') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', async () => {
      try {
        const { target, authorized, repoPath, apiUrl, pcapPath, filePath } = JSON.parse(body || '{}');
        if (!authorized) throw new Error('Authorization not confirmed');
        if (!target) throw new Error('No target provided');
        const result = await runScan(target, { repoPath, apiUrl, pcapPath, filePath });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  🛡️  MCP Security Scanner running:  http://localhost:${PORT}`);
  console.log(`  VirusTotal key: ${VT_KEY ? 'loaded ✓' : 'missing ✗'}\n`);
});
