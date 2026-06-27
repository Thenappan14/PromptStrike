// Cloudflare Pages Functions backend (advanced mode).
// Runs the HTTP/TCP-capable scan phases entirely on Cloudflare — no local backend.
// Phases needing a shell/filesystem (Snyk, WireMCP, Container) report "needs local agent".
import { connect } from 'cloudflare:sockets';

const sev = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };
const finding = (severity, title, detail = '') => ({ severity, title, detail });

const SECRET_PATTERNS = [
  [/authorization:\s*basic\s+[a-z0-9+/=]+/i, 'HTTP Basic credentials (cleartext)'],
  [/authorization:\s*bearer\s+[\w.\-]{8,}/i, 'Bearer token (cleartext)'],
  [/api[_-]?key["'=:\s]+[\w\-]{16,}/i, 'API key'],
  [/eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\./, 'JWT token'],
];

function parseTarget(raw) {
  const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http/https targets are allowed');
  return u;
}

// DNS-over-HTTPS resolution (no dns module in Workers)
async function resolveHost(host) {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
      { headers: { accept: 'application/dns-json' } });
    const j = await r.json();
    return (j.Answer || []).filter((a) => a.type === 1).map((a) => a.data);
  } catch { return []; }
}

// ---- VirusTotal ----
async function phaseVirusTotal(url, env) {
  const out = { mcp: 'VirusTotal MCP', phase: 'Reputation & threat intel', status: 'ok', findings: [], raw: {} };
  const key = env.VIRUSTOTAL_API_KEY;
  if (!key) { out.status = 'skipped'; out.reason = 'VIRUSTOTAL_API_KEY not configured'; return out; }
  try {
    const r = await fetch(`https://www.virustotal.com/api/v3/domains/${url.hostname}`, { headers: { 'x-apikey': key } });
    if (r.status === 404) { out.findings.push(finding('INFO', 'Domain not yet in VirusTotal corpus')); return out; }
    if (!r.ok) { out.status = 'error'; out.reason = `VT API HTTP ${r.status}`; return out; }
    const j = await r.json();
    const stats = j.data?.attributes?.last_analysis_stats || {};
    out.raw = { stats, reputation: j.data?.attributes?.reputation ?? 0 };
    const mal = stats.malicious || 0, susp = stats.suspicious || 0;
    if (mal > 2) out.findings.push(finding('HIGH', `${mal} engines flag this domain as malicious`, JSON.stringify(stats)));
    else if (mal + susp > 0) out.findings.push(finding('INFO', `${mal} malicious / ${susp} suspicious (likely low-rep false positive)`));
    else out.findings.push(finding('INFO', 'No malicious detections'));
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

// ---- nmap (TCP-connect via cloudflare:sockets) ----
const COMMON_PORTS = [21, 22, 23, 53, 80, 110, 143, 443, 445, 587, 993, 995, 1433, 3306, 3389, 5432, 5900, 6379, 8000, 8080, 8443, 9200, 27017];
async function checkPort(host, port, timeoutMs = 2500) {
  let socket;
  try {
    socket = connect({ hostname: host, port }, { allowHalfOpen: false });
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs));
    await Promise.race([socket.opened, timeout]);
    return true;
  } catch { return false; }
  finally { try { await socket?.close(); } catch {} }
}
async function phaseNmap(host) {
  const out = { mcp: 'nmap MCP', phase: 'Port / service exposure', status: 'ok', findings: [], raw: {} };
  try {
    const open = [];
    // small batches to respect Worker concurrent-connection limits
    for (let i = 0; i < COMMON_PORTS.length; i += 5) {
      const batch = COMMON_PORTS.slice(i, i + 5);
      const res = await Promise.all(batch.map(async (p) => ({ p, open: await checkPort(host, p) })));
      for (const r of res) if (r.open) open.push(r.p);
    }
    out.raw = { host, openPorts: open, method: 'TCP connect scan (cloudflare:sockets)' };
    out.findings.push(finding('INFO', `Open ports: ${open.join(', ') || 'none'}`, `target ${host}`));
    const risky = { 21: 'FTP', 23: 'Telnet', 3389: 'RDP', 3306: 'MySQL', 5432: 'Postgres', 6379: 'Redis', 27017: 'MongoDB', 9200: 'Elasticsearch' };
    for (const p of open) if (risky[p]) out.findings.push(finding('MEDIUM', `Sensitive service exposed: ${risky[p]} (port ${p})`, host));
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

// ---- Awesome Kali (HTTP security headers; TLS version probing needs local agent) ----
async function phaseWebSurface(url) {
  const out = { mcp: 'Awesome Kali MCP', phase: 'HTTP security headers', status: 'ok', findings: [], raw: {} };
  try {
    const r = await fetch(url.href, { headers: { 'User-Agent': 'MCP-Scanner/1.0' }, redirect: 'manual' });
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
      const v = r.headers.get(k);
      if (v) present[k] = v; else { missing.push(label); out.findings.push(finding(s, `Missing header: ${label}`)); }
    }
    const server = r.headers.get('server');
    if (server) out.findings.push(finding('INFO', `Server header: ${server}`));
    out.raw = { status: r.status, headersPresent: present, headersMissing: missing, note: 'TLS version probing requires a local agent (openssl) — not available in a Worker' };
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

// ---- Postman (API endpoint checks) ----
async function phasePostman(apiUrl) {
  const out = { mcp: 'Postman MCP', phase: 'API security testing', status: 'ok', findings: [], raw: {} };
  if (!apiUrl) { out.status = 'skipped'; out.reason = 'Needs an API endpoint URL'; return out; }
  let u; try { u = parseTarget(apiUrl); } catch (e) { out.status = 'error'; out.reason = e.message; return out; }
  try {
    const r = await fetch(u.href, { headers: { 'User-Agent': 'MCP-Scanner/1.0', accept: 'application/json' }, redirect: 'manual' });
    const body = (await r.text()).slice(0, 50000);
    out.raw = { status: r.status, contentType: r.headers.get('content-type') };
    if (r.status === 200) out.findings.push(finding('MEDIUM', 'Endpoint returns 200 without authentication', 'Verify this endpoint is meant to be public'));
    else if (r.status === 401 || r.status === 403) out.findings.push(finding('INFO', `Auth enforced (HTTP ${r.status})`));
    const acao = r.headers.get('access-control-allow-origin');
    if (acao === '*') out.findings.push(finding(r.headers.get('access-control-allow-credentials') === 'true' ? 'HIGH' : 'LOW', `Permissive CORS: ACAO ${acao}`));
    if (/Traceback|Exception in|at [\w.$]+\([\w.]+:\d+\)|SQL syntax|ORA-\d{5}|stack trace/i.test(body))
      out.findings.push(finding('MEDIUM', 'Verbose error / stack trace leakage in response'));
    if (r.headers.get('x-powered-by')) out.findings.push(finding('LOW', `Tech disclosure: X-Powered-By ${r.headers.get('x-powered-by')}`));
    for (const [re, label] of SECRET_PATTERNS) if (re.test(body)) { out.findings.push(finding('HIGH', `Sensitive data in API response: ${label}`)); break; }
  } catch (e) { out.status = 'error'; out.reason = e.message; }
  return out;
}

const localAgent = (mcp, phase) => ({ mcp, phase, status: 'skipped', reason: 'Needs a local agent (shell/filesystem not available on Cloudflare Workers)', findings: [] });

async function runScan(rawTarget, opts, env) {
  const url = parseTarget(rawTarget);
  const ips = await resolveHost(url.hostname);
  const host = ips[0] || url.hostname;

  const [vt, nmap, web, postman] = await Promise.all([
    phaseVirusTotal(url, env),
    phaseNmap(host),
    phaseWebSurface(url),
    phasePostman(opts.apiUrl),
  ]);

  const phases = [
    vt, nmap, web,
    localAgent('Snyk CLI MCP', 'Dependency / CVE scan'),
    postman,
    localAgent('WireMCP', 'Traffic analysis'),
    localAgent('Container-MCP', 'Payload sandboxing'),
  ];

  const all = phases.flatMap((p) => (p.findings || []).map((f) => ({ ...f, mcp: p.mcp })));
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of all) counts[f.severity] = (counts[f.severity] || 0) + 1;
  all.sort((a, b) => sev[b.severity] - sev[a.severity]);

  return { target: url.href, host: url.hostname, ips, scannedAt: new Date().toISOString(), counts, phases, findings: all, hostedOn: 'cloudflare' };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/scan' && request.method === 'POST') {
      try {
        const { target, authorized, apiUrl } = await request.json();
        if (!authorized) throw new Error('Authorization not confirmed');
        if (!target) throw new Error('No target provided');
        const result = await runScan(target, { apiUrl }, env);
        return Response.json(result);
      } catch (e) {
        return Response.json({ error: e.message }, { status: 400 });
      }
    }
    // Everything else → static assets
    return env.ASSETS.fetch(request);
  },
};
