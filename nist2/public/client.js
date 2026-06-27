// client.js — shared front-end helpers.
// Document text extraction runs in the browser (pdf.js / mammoth) so heavy
// parsers stay out of the Worker. Extracted plain text is sent to the API.

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

export async function whoami() {
  try { return await api("/api/me"); }
  catch { return { authenticated: false }; }
}

export function showMsg(el, text, kind = "err") {
  el.innerHTML = `<div class="msg ${kind}">${escapeHtml(text)}</div>`;
}
export function clearMsg(el) { el.innerHTML = ""; }

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Lazy-load a script from CDN once.
const loaded = {};
function loadScript(src) {
  if (loaded[src]) return loaded[src];
  loaded[src] = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
  return loaded[src];
}

// Extract plain text from a File (.txt, .docx, .pdf).
export async function extractText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) {
    return await file.text();
  }
  if (name.endsWith(".docx")) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    const buf = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer: buf });
    return result.value || "";
  }
  if (name.endsWith(".pdf")) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(" ") + "\n";
    }
    return text;
  }
  throw new Error("Unsupported file type. Use .pdf, .docx, or .txt.");
}

// Convert generated Markdown to a downloadable .docx (client-side).
export async function downloadDocx(markdown, filename = "enhanced-policy.docx") {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html-docx-js/0.3.1/html-docx.min.js");
  const html = mdToHtml(markdown);
  const blob = window.htmlDocx.asBlob(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`
  );
  triggerDownload(blob, filename);
}

export function downloadMarkdown(markdown, filename = "enhanced-policy.md") {
  triggerDownload(new Blob([markdown], { type: "text/markdown" }), filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Minimal Markdown -> HTML for the docx export (headings, bold, lists, paragraphs).
function mdToHtml(md) {
  const lines = md.split("\n");
  let html = "", inList = false;
  const inline = (t) => escapeHtml(t)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>");
  for (const line of lines) {
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    if (h) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
    } else if (li) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(li[1])}</li>`;
    } else if (line.trim() === "") {
      if (inList) { html += "</ul>"; inList = false; }
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${inline(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}
