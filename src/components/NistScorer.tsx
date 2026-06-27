import React, { useRef, useState } from 'react';
import { Download, FileCheck2, FileText, FileUp, RefreshCw, Trash2 } from 'lucide-react';

interface FileResult {
  name: string;
  status: string;
  chars?: number;
  error?: string;
}

interface FunctionScore {
  name: string;
  earned: number;
  max: number;
  matched: string[];
  missed: string[];
}

interface ScoreResult {
  files: FileResult[];
  functions: FunctionScore[];
  overall: {
    earned: number;
    max: number;
  };
}

const ALLOWED_EXTENSIONS = ['docx', 'pdf', 'xlsx'];

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() || '';

const coveragePercent = (earned: number, max: number) => max ? Math.round((earned / max) * 100) : 0;

const generateMarkdownReport = (result: ScoreResult) => {
  const overallPercent = coveragePercent(result.overall.earned, result.overall.max);
  const sortedFunctions = [...result.functions].sort(
    (a, b) => coveragePercent(a.earned, a.max) - coveragePercent(b.earned, b.max)
  );
  const weakest = sortedFunctions[0];
  const strongest = sortedFunctions[sortedFunctions.length - 1];
  const priorityGaps = result.functions.flatMap((fn) =>
    fn.missed.slice(0, 5).map((id) => `${id} (${fn.name})`)
  );

  return [
    '# NIST AI RMF Scoring Report',
    '',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    '## Executive Summary',
    '',
    `Overall, the uploaded evidence references **${result.overall.earned} of ${result.overall.max}** NIST AI RMF controls, representing **${overallPercent}% coverage**.`,
    strongest ? `The strongest coverage area is **${strongest.name}** at **${coveragePercent(strongest.earned, strongest.max)}%**.` : '',
    weakest ? `The largest improvement opportunity is **${weakest.name}** at **${coveragePercent(weakest.earned, weakest.max)}%**.` : '',
    '',
    '## Function Coverage',
    '',
    ...result.functions.flatMap((fn) => [
      `### ${fn.name}`,
      '',
      `- Coverage: ${fn.earned}/${fn.max} (${coveragePercent(fn.earned, fn.max)}%)`,
      `- Matched controls: ${fn.matched.length ? fn.matched.join(', ') : 'None'}`,
      `- Missing controls: ${fn.missed.length ? fn.missed.join(', ') : 'None'}`,
      ''
    ]),
    '## Priority Gaps',
    '',
    ...(priorityGaps.length
      ? priorityGaps.slice(0, 12).map((gap) => `- ${gap}`)
      : ['- No missing controls identified.']),
    '',
    '## Files Processed',
    '',
    ...result.files.map((file) =>
      `- ${file.name}: ${file.status === 'ok' ? `${(file.chars || 0).toLocaleString()} characters extracted` : file.error || file.status}`
    ),
    '',
    '## Suggested Next Steps',
    '',
    '- Add explicit references to missing NIST AI RMF controls where they are relevant.',
    '- Strengthen weak areas with named owners, review cadence, thresholds, and escalation paths.',
    '- Re-run the scorer after updating policy or evidence documents.',
    ''
  ].filter(Boolean).join('\n');
};

const markdownToPlainText = (markdown: string) =>
  markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^- /gm, '- ');

const markdownToHtml = (markdown: string) => {
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  const escapeHtml = (text: string) =>
    text.replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char] || char);
  const inline = (text: string) => escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  lines.forEach((line) => {
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const listItem = line.match(/^- (.*)$/);

    if (heading) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
    } else if (listItem) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${inline(listItem[1])}</li>`;
    } else if (line.trim()) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<p>${inline(line)}</p>`;
    } else if (inList) {
      html += '</ul>';
      inList = false;
    }
  });

  if (inList) html += '</ul>';
  return html;
};

const downloadBlob = (content: BlobPart, filename: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const downloadTextReport = (result: ScoreResult) => {
  downloadBlob(markdownToPlainText(generateMarkdownReport(result)), 'nist-ai-rmf-score-report.txt', 'text/plain');
};

const downloadWordReport = (result: ScoreResult) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.45;color:#111827}h1,h2,h3{color:#0f172a}li{margin-bottom:4px}</style></head><body>${markdownToHtml(generateMarkdownReport(result))}</body></html>`;
  downloadBlob(html, 'nist-ai-rmf-score-report.doc', 'application/msword');
};

const printPdfReport = (result: ScoreResult) => {
  const html = markdownToHtml(generateMarkdownReport(result));
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html><html><head><title>NIST AI RMF Score Report</title><style>body{font-family:Arial,sans-serif;line-height:1.45;color:#111827;margin:32px}h1,h2,h3{color:#0f172a}li{margin-bottom:4px}@media print{button{display:none}}</style></head><body>${html}<button onclick="window.print()" style="margin-top:24px;padding:10px 14px">Print or Save as PDF</button></body></html>`);
  printWindow.document.close();
};

export const NistScorer: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = (selectedFiles: FileList | File[]) => {
    const incoming = Array.from(selectedFiles);
    setFiles((current) => {
      const next = [...current];
      incoming.forEach((file) => {
        const duplicate = next.some((item) => item.name === file.name && item.size === file.size);
        if (!duplicate) next.push(file);
      });
      return next;
    });
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setResult(null);
    setError('');
  };

  const scoreDocuments = async () => {
    if (!files.length) return;

    setIsScoring(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file, file.name));

    try {
      const response = await fetch('/api/score', {
        method: 'POST',
        body: formData
      });
      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : null;

      if (!response.ok) {
        setError(data?.error || `Scoring failed with HTTP ${response.status}.`);
        if (data?.files) {
          setResult({ files: data.files, functions: [], overall: { earned: 0, max: 0 } });
        }
        return;
      }

      setResult(data);
    } catch {
      setError('Could not reach the NIST scoring service. Run with Cloudflare Pages Functions to use /api/score.');
    } finally {
      setIsScoring(false);
    }
  };

  return (
    <div>
      <div className="glass-panel mb-6" style={{ borderColor: 'rgba(0, 230, 118, 0.18)' }}>
        <div className="flex-center gap-2 mb-2" style={{ justifyContent: 'flex-start' }}>
          <FileCheck2 size={24} style={{ color: 'var(--color-emerald)' }} />
          <h2>NIST AI RMF Document Scorer</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '760px', fontSize: '0.95rem' }}>
          Upload policy, risk, assessment, or register documents. The scorer checks references to NIST AI RMF controls across Govern, Map, Measure, and Manage.
        </p>
      </div>

      <div className="dashboard-grid">
        <div>
          <div
            className={`glass-panel text-center ${dragActive ? 'glass-panel-glow' : ''}`}
            style={{
              borderStyle: 'dashed',
              borderWidth: '2px',
              padding: '2.5rem 1.5rem',
              backgroundColor: dragActive ? 'rgba(0, 230, 118, 0.03)' : 'transparent'
            }}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              if (event.dataTransfer.files) addFiles(event.dataTransfer.files);
            }}
          >
            <FileUp size={42} className="mb-3" style={{ color: 'var(--color-emerald)', opacity: 0.85 }} />
            <h3 className="mb-1" style={{ fontSize: '1.15rem' }}>Drop NIST evidence documents here</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Supports .docx, .pdf, and .xlsx files
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".docx,.pdf,.xlsx"
              style={{ display: 'none' }}
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="glass-panel mt-6">
              <div className="flex-between mb-4">
                <h3 style={{ fontSize: '1.05rem' }}>{files.length} file{files.length > 1 ? 's' : ''} ready</h3>
                <button className="btn btn-secondary" style={{ padding: '0.45rem 0.7rem' }} onClick={clearAll}>
                  <Trash2 size={16} />
                  <span>Clear</span>
                </button>
              </div>

              <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1rem' }}>
                {files.map((file, index) => {
                  const ext = extensionOf(file.name);
                  const supported = ALLOWED_EXTENSIONS.includes(ext);
                  return (
                    <div
                      key={`${file.name}-${file.size}`}
                      className="flex-between"
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <span className={`badge ${supported ? 'badge-emerald' : 'badge-crimson'}`}>{ext || 'file'}</span>
                        <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{file.name}</span>
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.55rem' }} onClick={() => removeFile(index)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button className="btn btn-primary w-full" onClick={scoreDocuments} disabled={isScoring}>
                {isScoring ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    <span>Scoring documents...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 size={18} />
                    <span>Score Against NIST AI RMF</span>
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="glass-panel mt-6" style={{ borderColor: 'rgba(255, 8, 68, 0.35)', color: 'var(--color-crimson)' }}>
              {error}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2">NIST Score Report</h2>
          {!result || result.functions.length === 0 ? (
            <div className="glass-panel text-center" style={{ padding: '2.5rem 1.5rem', borderStyle: 'dotted' }}>
              <FileCheck2 size={42} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>No NIST Score Yet</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Upload documents and score them to see control coverage.
              </p>
            </div>
          ) : (
            <>
            <div className="glass-panel" style={{ borderColor: 'rgba(168, 85, 247, 0.25)', padding: '1rem' }}>
              <div className="flex-between mb-2">
                <div className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                  <FileText size={20} style={{ color: 'var(--color-purple)' }} />
                  <h3 style={{ fontSize: '1rem' }}>Generated Report</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem' }}
                    onClick={() => downloadWordReport(result)}
                  >
                    <Download size={15} />
                    <span>Word</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem' }}
                    onClick={() => printPdfReport(result)}
                  >
                    <Download size={15} />
                    <span>PDF</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem' }}
                    onClick={() => downloadTextReport(result)}
                  >
                    <Download size={15} />
                    <span>TXT</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <p style={{ margin: 0 }}>
                  Overall coverage is{' '}
                  <strong style={{ color: 'var(--color-emerald)' }}>
                    {coveragePercent(result.overall.earned, result.overall.max)}%
                  </strong>
                  , with {result.overall.earned} of {result.overall.max} controls referenced.
                </p>
                <div>
                  <h4 className="mb-1" style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Priority Gaps</h4>
                  <ul style={{ paddingLeft: '1.1rem', lineHeight: 1.35, margin: 0 }}>
                    {result.functions.flatMap((fn) => fn.missed.slice(0, 2).map((id) => `${id} (${fn.name})`)).slice(0, 5).map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', margin: 0 }}>
                  Export includes the executive summary, controls, gaps, and next steps.
                </p>
              </div>
            </div>

            <div className="glass-panel glass-panel-glow mt-6" style={{ padding: '1rem' }}>
              <div className="flex-between mb-4">
                <div>
                  <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Score Summary</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-emerald)', lineHeight: 1.1 }}>
                    {result.overall.earned}/{result.overall.max}
                  </div>
                </div>
                <span className="badge badge-emerald">
                  {coveragePercent(result.overall.earned, result.overall.max)}%
                </span>
              </div>

              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {result.functions.map((fn) => {
                  const width = fn.max ? (fn.earned / fn.max) * 100 : 0;
                  return (
                    <details key={fn.name} className="glass-panel" style={{ padding: '0.75rem', borderRadius: '8px' }}>
                      <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                        <div className="flex-between mb-2" style={{ fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 800 }}>{fn.name}</span>
                          <span style={{ fontWeight: 700 }}>{fn.earned}/{fn.max}</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${width}%`, background: 'var(--color-emerald)' }} />
                        </div>
                      </summary>
                      <div style={{ marginTop: '0.75rem' }}>
                        <h4 className="mb-2" style={{ fontSize: '0.72rem', color: 'var(--color-emerald)' }}>Matched</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                          {fn.matched.length ? fn.matched.map((id) => <span key={id} className="badge badge-emerald">{id}</span>) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None referenced.</span>}
                        </div>
                        <h4 className="mb-2" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Not Matched</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {fn.missed.map((id) => <span key={id} className="badge">{id}</span>)}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
