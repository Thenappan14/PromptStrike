import dns from "dns/promises";
import https from "https";
import http from "http";
import net from "net";
import tls from "tls";

const COMMON_PORTS = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 587, 993, 995, 3000, 3306, 3389, 5432, 6379, 8000, 8080, 8443, 9200, 27017];
const SEVERITY_ORDER = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };

function finding(severity, title, detail = "") {
  return { severity, title, detail };
}

function parseTarget(raw) {
  const value = String(raw || "").trim();
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http/https targets are allowed.");
  return url;
}

function requestUrl(url, timeout = 12000) {
  const client = url.protocol === "http:" ? http : https;
  return new Promise((resolve, reject) => {
    const req = client.request(url, { method: "GET", headers: { "User-Agent": "PromptStrike-Scanner/1.0" } }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        if (body.length < 50000) body += chunk.toString("utf8");
      });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.setTimeout(timeout, () => req.destroy(new Error("Request timed out.")));
    req.end();
  });
}

function checkPort(host, port, timeout = 1800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (open) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

function getCertificate(host) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false, timeout: 8000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.destroy();
      resolve(cert && Object.keys(cert).length ? cert : null);
    });
    socket.once("error", () => resolve(null));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

async function phaseReputation(url) {
  return {
    mcp: "VirusTotal MCP",
    phase: "Reputation & threat intel",
    status: process.env.VIRUSTOTAL_API_KEY ? "skipped" : "skipped",
    reason: process.env.VIRUSTOTAL_API_KEY
      ? "VirusTotal live lookup is not enabled in this integrated endpoint."
      : "VIRUSTOTAL_API_KEY not configured.",
    findings: [],
  };
}

async function phasePorts(url, ips) {
  const phase = { mcp: "nmap MCP", phase: "Port / service exposure", status: "ok", findings: [], raw: {} };
  const host = ips[0] || url.hostname;
  const results = await Promise.all(COMMON_PORTS.map(async (port) => ({ port, open: await checkPort(host, port) })));
  const openPorts = results.filter((result) => result.open).map((result) => result.port);
  phase.raw = { host, openPorts };
  phase.findings.push(finding("INFO", `Open ports: ${openPorts.join(", ") || "none detected in common-port scan"}`));
  const risky = { 21: "FTP", 23: "Telnet", 3389: "RDP", 3306: "MySQL", 5432: "Postgres", 6379: "Redis", 27017: "MongoDB", 9200: "Elasticsearch" };
  openPorts.forEach((port) => {
    if (risky[port]) phase.findings.push(finding("MEDIUM", `Sensitive service exposed: ${risky[port]} on port ${port}`));
  });
  return phase;
}

async function phaseHeaders(url) {
  const phase = { mcp: "Awesome Kali MCP", phase: "TLS & HTTP security headers", status: "ok", findings: [], raw: {} };
  const response = await requestUrl(url);
  const headers = response.headers || {};
  const checks = [
    ["strict-transport-security", "HSTS / Strict-Transport-Security", "MEDIUM"],
    ["content-security-policy", "Content-Security-Policy", "MEDIUM"],
    ["x-frame-options", "X-Frame-Options", "LOW"],
    ["x-content-type-options", "X-Content-Type-Options", "LOW"],
    ["referrer-policy", "Referrer-Policy", "LOW"],
    ["permissions-policy", "Permissions-Policy", "INFO"],
  ];

  phase.raw.status = response.status;
  checks.forEach(([key, label, severity]) => {
    if (!headers[key]) phase.findings.push(finding(severity, `Missing header: ${label}`));
  });
  if (headers.server) phase.findings.push(finding("INFO", `Server header: ${headers.server}`));
  if (headers["x-powered-by"]) phase.findings.push(finding("LOW", `Tech disclosure: X-Powered-By ${headers["x-powered-by"]}`));

  if (url.protocol === "https:") {
    const cert = await getCertificate(url.hostname);
    if (cert) {
      phase.findings.push(finding("INFO", `TLS certificate subject: ${cert.subject?.CN || "unknown"}`));
      phase.raw.certificate = { subject: cert.subject, issuer: cert.issuer, valid_to: cert.valid_to };
    } else {
      phase.findings.push(finding("MEDIUM", "Could not retrieve TLS certificate details."));
    }
  } else {
    phase.findings.push(finding("MEDIUM", "Target uses HTTP, not HTTPS."));
  }

  return phase;
}

async function phaseApi(apiUrl) {
  const phase = { mcp: "Postman MCP", phase: "API security testing", status: "ok", findings: [], raw: {} };
  if (!apiUrl) return { ...phase, status: "skipped", reason: "Needs an API endpoint URL.", findings: [] };
  const url = parseTarget(apiUrl);
  const response = await requestUrl(url);
  phase.raw = { status: response.status, contentType: response.headers["content-type"] };
  if (response.status === 200) phase.findings.push(finding("MEDIUM", "Endpoint returns 200 without authentication. Verify this endpoint is intended to be public."));
  if (response.status === 401 || response.status === 403) phase.findings.push(finding("INFO", `Auth appears enforced (HTTP ${response.status}).`));
  if (response.headers["access-control-allow-origin"] === "*") phase.findings.push(finding("LOW", "Permissive CORS: Access-Control-Allow-Origin is *"));
  if (/Traceback|Exception|SQL syntax|stack trace|ORA-\d{5}/i.test(response.body)) phase.findings.push(finding("MEDIUM", "Verbose error or stack trace leakage detected."));
  return phase;
}

function skipped(mcp, phase, reason) {
  return { mcp, phase, status: "skipped", reason, findings: [] };
}

async function runScan(target, options = {}) {
  const url = parseTarget(target);
  const ips = await dns.lookup(url.hostname, { all: true }).then((rows) => rows.map((row) => row.address)).catch(() => []);
  const phases = await Promise.all([
    phaseReputation(url),
    phasePorts(url, ips),
    phaseHeaders(url),
    skipped("Snyk CLI MCP", "Dependency / CVE scan", "Repository path scanning is not enabled in the web integration."),
    phaseApi(options.apiUrl),
    skipped("WireMCP", "Traffic analysis", "PCAP analysis is not enabled in the web integration."),
    skipped("Container-MCP", "Payload sandboxing", "File artifact scanning is not enabled in the web integration."),
  ]);

  const findings = phases.flatMap((phase) => phase.findings.map((item) => ({ ...item, mcp: phase.mcp })));
  findings.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  findings.forEach((item) => {
    counts[item.severity] += 1;
  });

  return {
    target: url.href,
    host: url.hostname,
    ips,
    scannedAt: new Date().toISOString(),
    counts,
    phases,
    findings,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    if (!body.authorized) throw new Error("Authorization not confirmed.");
    if (!body.target) throw new Error("No target provided.");
    const result = await runScan(body.target, { apiUrl: body.apiUrl });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Scan failed." });
  }
}
