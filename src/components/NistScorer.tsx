import React, { useRef, useState } from 'react';
import { FileCheck2, FileUp, RefreshCw, Trash2 } from 'lucide-react';

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
          <h2 className="mb-4">NIST Score Report</h2>
          {result && result.functions.length > 0 ? (
            <div className="glass-panel glass-panel-glow">
              <div className="text-center mb-6" style={{ padding: '1.5rem 0', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '2.75rem', fontWeight: 900, color: 'var(--color-emerald)', lineHeight: 1 }}>
                  {result.overall.earned}/{result.overall.max}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginTop: '0.35rem' }}>
                  Controls Referenced
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {result.functions.map((fn) => {
                  const width = fn.max ? (fn.earned / fn.max) * 100 : 0;
                  return (
                    <details key={fn.name} className="glass-panel" style={{ padding: '1rem', borderRadius: '8px' }}>
                      <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                        <div className="flex-between mb-2">
                          <span style={{ fontWeight: 800 }}>{fn.name}</span>
                          <span style={{ fontWeight: 700 }}>{fn.earned}/{fn.max}</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${width}%`, background: 'var(--color-emerald)' }} />
                        </div>
                      </summary>
                      <div style={{ marginTop: '1rem' }}>
                        <h4 className="mb-2" style={{ fontSize: '0.78rem', color: 'var(--color-emerald)' }}>Matched</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.85rem' }}>
                          {fn.matched.length ? fn.matched.map((id) => <span key={id} className="badge badge-emerald">{id}</span>) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None referenced.</span>}
                        </div>
                        <h4 className="mb-2" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Not Matched</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {fn.missed.map((id) => <span key={id} className="badge">{id}</span>)}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-panel text-center" style={{ padding: '4rem 1.5rem', borderStyle: 'dotted' }}>
              <FileCheck2 size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>No NIST Score Yet</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Upload documents and score them to see control coverage.
              </p>
            </div>
          )}

          {result?.files && result.files.length > 0 && (
            <div className="glass-panel mt-6">
              <h3 className="mb-3" style={{ fontSize: '1rem' }}>Files Processed</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {result.files.map((file) => (
                  <div key={file.name} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: file.status === 'ok' ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                      {file.status === 'ok' ? 'OK' : 'ISSUE'}
                    </strong>
                    <span> {file.name} - {file.status === 'ok' ? `${(file.chars || 0).toLocaleString()} characters extracted` : file.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
