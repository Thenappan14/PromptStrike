'use strict';

const form = document.getElementById('scanForm');
const targetInput = document.getElementById('target');
const repoInput = document.getElementById('repoPath');
const apiInput = document.getElementById('apiUrl');
const pcapInput = document.getElementById('pcapPath');
const fileInput = document.getElementById('filePath');
const authBox = document.getElementById('authorized');
const scanBtn = document.getElementById('scanBtn');
const formError = document.getElementById('formError');
const resultsSection = document.getElementById('resultsSection');
const summaryEl = document.getElementById('summary');
const phasesEl = document.getElementById('phases');
const rawJsonEl = document.getElementById('rawJson');

const SEV_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const SEV_CLASS = { CRITICAL: 'crit', HIGH: 'high', MEDIUM: 'med', LOW: 'low', INFO: 'info' };

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = !msg;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  const target = targetInput.value.trim();
  if (!target) return showError('Enter a target URL.');
  if (!authBox.checked) return showError('You must confirm authorization before scanning.');

  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning…';
  resultsSection.hidden = false;
  summaryEl.innerHTML = '<div class="loading">Running 8 MCP phases against <b>' + escapeHtml(target) + '</b>…</div>';
  phasesEl.innerHTML = '';
  rawJsonEl.textContent = '';

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target, authorized: true,
        repoPath: repoInput.value.trim() || undefined,
        apiUrl: apiInput.value.trim() || undefined,
        pcapPath: pcapInput.value.trim() || undefined,
        filePath: fileInput.value.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Scan failed');
    render(data);
  } catch (err) {
    summaryEl.innerHTML = '';
    showError(err.message);
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = 'Run scan';
  }
});

function render(data) {
  // Summary
  const c = data.counts;
  const chips = SEV_ORDER.map((s) =>
    `<span class="sevchip sevchip--${SEV_CLASS[s]}">${c[s] || 0} <small>${s}</small></span>`).join('');
  summaryEl.innerHTML = `
    <div class="summary__head">
      <div>
        <h2 class="section__title">Assessment report</h2>
        <p class="summary__meta"><b>${escapeHtml(data.target)}</b> · ${escapeHtml((data.ips || []).join(', ') || 'no IP')} · ${new Date(data.scannedAt).toLocaleString()}</p>
      </div>
      <div class="sevrow">${chips}</div>
    </div>`;

  // Phase cards
  phasesEl.innerHTML = data.phases.map(phaseCard).join('');
  rawJsonEl.textContent = JSON.stringify(data, null, 2);
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function phaseCard(p) {
  const statusPill = {
    ok: '<span class="pill pill--live">ran</span>',
    skipped: '<span class="pill pill--na">skipped</span>',
    error: '<span class="pill pill--err">error</span>',
  }[p.status] || '';
  let inner = '';
  if (p.status === 'skipped' || p.status === 'error') {
    inner = `<p class="phase__reason">${escapeHtml(p.reason || '')}</p>`;
  } else if (!p.findings.length) {
    inner = '<p class="phase__reason">No findings.</p>';
  } else {
    inner = '<ul class="findings">' + p.findings.map((f) =>
      `<li><span class="sevdot sevdot--${SEV_CLASS[f.severity]}"></span>
        <span class="finding__sev">${f.severity}</span>
        <span class="finding__title">${escapeHtml(f.title)}</span></li>`).join('') + '</ul>';
  }
  return `<article class="phase">
    <div class="phase__head"><h3>${escapeHtml(p.mcp)}</h3>${statusPill}</div>
    <p class="phase__sub">${escapeHtml(p.phase)}</p>
    ${inner}
  </article>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
