import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, Play, RefreshCw, BarChart2, ShieldAlert, Link2 } from 'lucide-react';

interface SamplePreset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  fileName: string;
  sourceUrl?: string;
  isFake: boolean;
  score: number;
  details: {
    facialSymmetry: number;
    gazeCoherence: number;
    spectralConsistency: number;
    compressionNoise: number;
  };
  anomalies: string[];
}

const PRESETS: SamplePreset[] = [
  {
    id: 'sample-1',
    name: 'Political Address (Video)',
    type: 'video',
    fileName: 'senate_address_cloned.mp4',
    isFake: true,
    score: 96.8,
    details: { facialSymmetry: 82, gazeCoherence: 94, spectralConsistency: 88, compressionNoise: 91 },
    anomalies: ['Mismatched earlobe geometries', 'Double eye reflections (light source mismatch)', 'Unnatural mouth boundary blending during vowel sounds']
  },
  {
    id: 'sample-2',
    name: 'Corporate CEO Announcement (Audio)',
    type: 'audio',
    fileName: 'ceo_earnings_call_synthetic.wav',
    isFake: true,
    score: 87.2,
    details: { facialSymmetry: 0, gazeCoherence: 0, spectralConsistency: 95, compressionNoise: 78 },
    anomalies: ['Unnatural noise-floor silence (cutouts)', 'Metallic robotic harmonics in the 4kHz band', 'Inconsistent speech envelope breathing intervals']
  },
  {
    id: 'sample-3',
    name: 'Executive Headshot (Image)',
    type: 'image',
    fileName: 'executive_portrait_authentic.jpg',
    isFake: false,
    score: 3.4,
    details: { facialSymmetry: 12, gazeCoherence: 5, spectralConsistency: 8, compressionNoise: 14 },
    anomalies: ['No synthetic markers found', 'Normal camera sensor noise distribution', 'Natural iris reflection symmetry']
  }
];

export const Sandbox: React.FC = () => {
  const [selectedSample, setSelectedSample] = useState<SamplePreset | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Drag and drop states
  const [dragActive, setDragActive] = useState(false);

  const createMockSample = (
    name: string,
    type: 'video' | 'audio' | 'image',
    sourceUrl?: string
  ): SamplePreset => {
    const fakeNamePattern = /(ai|fake|deepfake|synthetic|generated|cloned|altered|manipulated)/i;
    const realNamePattern = /(real|authentic|original|genuine|verified)/i;
    const isMockFake = fakeNamePattern.test(name)
      ? true
      : realNamePattern.test(name)
        ? false
        : Math.random() > 0.45;
    const mockScore = isMockFake
      ? parseFloat((80 + Math.random() * 19).toFixed(1))
      : parseFloat((2 + Math.random() * 8).toFixed(1));

    return {
      id: sourceUrl ? 'linked-media' : 'custom',
      name,
      type,
      fileName: name,
      sourceUrl,
      isFake: isMockFake,
      score: mockScore,
      details: {
        facialSymmetry: isMockFake ? Math.floor(65 + Math.random() * 25) : Math.floor(5 + Math.random() * 15),
        gazeCoherence: isMockFake ? Math.floor(70 + Math.random() * 25) : Math.floor(8 + Math.random() * 15),
        spectralConsistency: isMockFake ? Math.floor(60 + Math.random() * 35) : Math.floor(10 + Math.random() * 12),
        compressionNoise: isMockFake ? Math.floor(75 + Math.random() * 20) : Math.floor(8 + Math.random() * 15)
      },
      anomalies: isMockFake
        ? sourceUrl
          ? ['Linked video frame stream contains facial boundary artifacts', 'Metadata handoff is incomplete for remote platform media', 'Irregular speech-to-mouth alignment detected in sampled segments']
          : ['Unnatural blending seams along facial boundaries', 'Mismatched audio-video frame syncing', 'Irregular frequency spikes in high frequency band']
        : ['No synthetic fingerprints detected']
    };
  };

  const selectLocalFile = (file: File) => {
    const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
    const nextPreviewUrl = URL.createObjectURL(file);

    setPreviewUrl(nextPreviewUrl);
    setSelectedSample(createMockSample(file.name, type as 'video' | 'audio' | 'image'));
    setShowReport(false);
    setUrlError('');
  };

  // File analysis logs simulator
  const logSteps = [
    'Initializing neural network layers...',
    'Decompressing media streams and calculating bitrates...',
    'Extracting frame matrices and keyframes...',
    'Mapping facial landmark coordinates (68-point mesh)...',
    'Analyzing eye movement and gaze vector coordinates...',
    'Running voice spectrum noise-floor coherence check...',
    'Computing GAN-fingerprint artifacts & camera sensor pattern noise...',
    'Generating final synthesis probability scoring...'
  ];

  const getVerdictColor = (sample: SamplePreset) =>
    sample.isFake ? 'var(--color-crimson)' : 'var(--color-emerald)';

  const getVerdictConfidence = (sample: SamplePreset) =>
    parseFloat((100 - sample.score).toFixed(1));

  const getAuthenticityScore = (anomalyScore: number) => 100 - anomalyScore;

  const getAuthenticityColor = (authenticityScore: number) =>
    authenticityScore > 50 ? 'var(--color-emerald)' : 'var(--color-crimson)';

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectLocalFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedUrl = mediaUrl.trim();

    try {
      const parsedUrl = new URL(trimmedUrl);
      const isSupportedProtocol = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';

      if (!isSupportedProtocol) {
        setUrlError('Please enter a valid http or https link.');
        return;
      }

      const host = parsedUrl.hostname.replace(/^www\./, '');
      const isYouTube = host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com');
      const label = isYouTube ? 'YouTube Political Address Link' : `${host} Media Link`;

      setPreviewUrl(null);
      setSelectedSample(createMockSample(label, 'video', trimmedUrl));
      setShowReport(false);
      setUrlError('');
    } catch {
      setUrlError('Please enter a valid media URL.');
    }
  };

  // Run analysis trigger
  const runAnalysis = () => {
    if (!selectedSample) return;
    setIsAnalyzing(true);
    setShowReport(false);
    setAnalysisProgress(0);
    setAnalysisLogs([]);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Progress simulation effect
  useEffect(() => {
    if (!isAnalyzing) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 2.5; // reaches 100 in 4s
      if (progress >= 100) {
        clearInterval(interval);
        setIsAnalyzing(false);
        setShowReport(true);
      } else {
        setAnalysisProgress(progress);
        
        // Add log lines sequentially
        const logIndex = Math.floor((progress / 100) * logSteps.length);
        if (logIndex < logSteps.length && !analysisLogs.includes(logSteps[logIndex])) {
          setAnalysisLogs(prev => [...prev, logSteps[logIndex]]);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isAnalyzing, analysisLogs]);

  // Face scanner mesh canvas animator
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // Face mesh points
    const points: { x: number; y: number; originalX: number; originalY: number; targetX: number; targetY: number; isWarning: boolean }[] = [];

    // Generate simulated face landmark coordinates
    if (selectedSample?.type === 'audio') {
      // For audio, we will draw an audio waveform
    } else {
      // Video or Image: face circle outline + nose, eyes, mouth
      const centerX = width / 2;
      const centerY = height / 2 - 10;
      const radius = Math.min(width, height) * 0.25;

      // Face boundary points
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI + Math.PI * 0.05;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 1.1;
        points.push({ x, y, originalX: x, originalY: y, targetX: x, targetY: y, isWarning: selectedSample?.isFake && i % 3 === 0 ? true : false });
      }
      // Eyes
      points.push({ x: centerX - radius * 0.35, y: centerY - radius * 0.2, originalX: centerX - radius * 0.35, originalY: centerY - radius * 0.2, targetX: centerX - radius * 0.35, targetY: centerY - radius * 0.2, isWarning: !!selectedSample?.isFake });
      points.push({ x: centerX + radius * 0.35, y: centerY - radius * 0.2, originalX: centerX + radius * 0.35, originalY: centerY - radius * 0.2, targetX: centerX + radius * 0.35, targetY: centerY - radius * 0.2, isWarning: !!selectedSample?.isFake });
      
      // Nose bridge and tip
      points.push({ x: centerX, y: centerY - radius * 0.1, originalX: centerX, originalY: centerY - radius * 0.1, targetX: centerX, targetY: centerY - radius * 0.1, isWarning: false });
      points.push({ x: centerX, y: centerY + radius * 0.1, originalX: centerX, originalY: centerY + radius * 0.1, targetX: centerX, targetY: centerY + radius * 0.1, isWarning: false });
      
      // Mouth
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius * 0.25;
        const y = centerY + radius * 0.3 + Math.sin(angle) * radius * 0.1;
        points.push({ x, y, originalX: x, originalY: y, targetX: x, targetY: y, isWarning: selectedSample?.isFake && i % 2 === 0 ? true : false });
      }
    }

    let frameCount = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      frameCount++;

      if (selectedSample?.type === 'audio') {
        // Draw audio wave
        ctx.strokeStyle = isAnalyzing ? '#00f2fe' : '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sliceWidth = width / 100;
        
        for (let i = 0; i < 100; i++) {
          const x = i * sliceWidth;
          // generate wave amplitude
          const noise = isAnalyzing ? Math.sin(frameCount * 0.1 + i * 0.2) * 50 * Math.random() : Math.sin(i * 0.1) * 15;
          const y = height / 2 + noise * Math.exp(-Math.pow((i - 50) / 30, 2)); // envelope shape
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Draw frequency bars at the bottom
        if (isAnalyzing) {
          ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
          for (let i = 0; i < width; i += 8) {
            const barHeight = Math.random() * (height / 3);
            ctx.fillRect(i, height - barHeight, 6, barHeight);
          }
        }
      } else {
        // Draw image/video facial scanning grid
        // Move points slightly to simulate tracking twitching
        points.forEach(p => {
          const twitchFactor = isAnalyzing ? 3 : 0.8;
          p.x = p.originalX + (Math.random() - 0.5) * twitchFactor;
          p.y = p.originalY + (Math.random() - 0.5) * twitchFactor;
        });

        // Draw lines connecting mesh points
        ctx.lineWidth = 1;
        ctx.strokeStyle = isAnalyzing ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 255, 255, 0.1)';
        
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
            if (dist < width * 0.15) {
              ctx.beginPath();
              ctx.moveTo(points[i].x, points[i].y);
              ctx.lineTo(points[j].x, points[j].y);
              ctx.strokeStyle = (points[i].isWarning && points[j].isWarning && isAnalyzing)
                ? 'rgba(255, 8, 68, 0.35)' 
                : isAnalyzing ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.08)';
              ctx.stroke();
            }
          }
        }

        // Draw landmark nodes
        points.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, isAnalyzing ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = (p.isWarning && isAnalyzing) ? 'var(--color-crimson)' : 'var(--color-cyan)';
          ctx.shadowBlur = isAnalyzing ? 10 : 0;
          ctx.shadowColor = (p.isWarning && isAnalyzing) ? 'var(--color-crimson)' : 'var(--color-cyan)';
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        });

        // Draw horizontal sweep line when scanning
        if (isAnalyzing) {
          const sweepY = (Math.sin(frameCount * 0.03) * 0.5 + 0.5) * height;
          ctx.strokeStyle = 'var(--color-cyan)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, sweepY);
          ctx.lineTo(width, sweepY);
          ctx.stroke();
          
          // Glow effect on scanner sweep
          ctx.fillStyle = 'rgba(0, 242, 254, 0.06)';
          ctx.fillRect(0, Math.max(0, sweepY - 30), width, Math.min(height - sweepY, 30));
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [selectedSample, isAnalyzing]);

  return (
    <div className="dashboard-grid">
      {/* Media Input Pane */}
      <div>
        <h2 className="mb-4">Media Analysis Sandbox</h2>
        
        {/* Preset Selector */}
        <div className="glass-panel mb-6">
          <h3 className="mb-3" style={{ fontSize: '1.1rem' }}>Select Verification Sample</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`btn ${selectedSample?.id === preset.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, minWidth: '180px', padding: '0.6rem 1rem' }}
                onClick={() => {
                  setPreviewUrl(null);
                  setSelectedSample(preset);
                  setShowReport(false);
                  setUrlError('');
                }}
              >
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upload Sandbox */}
        <div 
          className={`glass-panel mb-6 text-center ${dragActive ? 'glass-panel-glow' : ''}`}
          style={{ 
            borderStyle: 'dashed', 
            borderWidth: '2px', 
            padding: '2.5rem 1.5rem', 
            backgroundColor: dragActive ? 'rgba(0, 242, 254, 0.02)' : 'transparent',
            cursor: 'pointer'
          }}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          {!selectedSample && (
            <>
              <Upload size={40} className="text-gradient mb-3" style={{ opacity: 0.8 }} />
              <h3 className="mb-1" style={{ fontSize: '1.15rem' }}>Drag & Drop Media File</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Supports MP4, WAV, JPG, PNG up to 100MB, or paste a public video link
              </p>
            </>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <label className="btn btn-secondary" style={{ display: 'inline-flex', padding: '0.5rem 1.25rem' }}>
              <span>Browse Local Files</span>
              <input
                type="file"
                style={{ display: 'none' }}
                accept="video/*,audio/*,image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    selectLocalFile(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
          <form onSubmit={handleUrlSubmit} style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => {
                  setMediaUrl(e.target.value);
                  setUrlError('');
                }}
                placeholder="Paste YouTube or video link"
                aria-label="Media URL"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-family)',
                  fontSize: '0.9rem',
                  padding: '0.65rem 0.85rem'
                }}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '0.65rem 1rem' }}>
                <Link2 size={17} />
                <span>Add Link</span>
              </button>
            </div>
            {urlError && (
              <p style={{ color: 'var(--color-crimson)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                {urlError}
              </p>
            )}
          </form>

          {selectedSample && (
            <div style={{ marginTop: '1.25rem', textAlign: 'left' }}>
              <div className="flex-between mb-3">
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Target: {selectedSample.fileName}
                </span>
                <span className={`badge ${selectedSample.type === 'video' ? 'badge-purple' : selectedSample.type === 'audio' ? 'badge-cyan' : 'badge-emerald'}`}>
                  {selectedSample.type.toUpperCase()}
                </span>
              </div>
              {selectedSample.sourceUrl && (
                <a
                  href={selectedSample.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'block', color: 'var(--color-cyan)', fontSize: '0.78rem', marginBottom: '0.75rem', wordBreak: 'break-all', textDecoration: 'none' }}
                >
                  {selectedSample.sourceUrl}
                </a>
              )}

              <div className="scanner-container" style={{ height: '280px', width: '100%', marginBottom: '1rem', backgroundColor: '#05060a' }}>
                {selectedSample.type === 'image' && previewUrl && (
                  <img
                    src={previewUrl}
                    alt={selectedSample.fileName}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: isAnalyzing ? 0.45 : 1, transition: 'opacity 0.3s' }}
                  />
                )}
                {selectedSample.type === 'image' && !previewUrl && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: isAnalyzing ? 0.35 : 0.7, transition: 'opacity 0.3s' }}>
                    <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #161926, #242838)', display: 'flex', alignItems: 'center', justifyItems: 'center', border: '1px solid var(--border-color)' }}>
                      <FileText size={32} style={{ color: 'var(--color-cyan)', margin: 'auto' }} />
                    </div>
                  </div>
                )}
                {selectedSample.type === 'video' && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: isAnalyzing ? 0.35 : 0.7 }}>
                    <Play size={40} style={{ color: 'var(--color-purple)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Senate Address Frame Stream</span>
                  </div>
                )}
                {selectedSample.type === 'audio' && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: isAnalyzing ? 0.35 : 0.7 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Audio Spectral Wave</span>
                  </div>
                )}

                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
              </div>

              <button
                id="btn-run-analysis"
                className="btn btn-primary w-full"
                onClick={runAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={18} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                    <span>Analyzing ({Math.floor(analysisProgress)}%)...</span>
                  </>
                ) : (
                  <>
                    <BarChart2 size={18} />
                    <span>Run Verification Scan</span>
                  </>
                )}
              </button>

              {isAnalyzing && (
                <>
                  <div className="progress-bar-bg" style={{ marginTop: '1rem' }}>
                    <div className="progress-bar-fill" style={{ width: `${analysisProgress}%` }} />
                  </div>
                  <div style={{ marginTop: '1rem', background: '#05060a', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#00f2fe', maxHeight: '100px', overflowY: 'auto' }}>
                    {analysisLogs.map((log, index) => (
                      <div key={index} style={{ marginBottom: '4px' }}>
                        &gt; {log}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          </div>
      </div>

      {/* Forensic Report Side-Panel */}
      <div>
        <h2 className="mb-4">Forensic Analysis Report</h2>
        {showReport && selectedSample ? (
          <div className="glass-panel glass-panel-glow" style={{ borderLeftWidth: '4px', borderLeftColor: getVerdictColor(selectedSample) }}>
            <div className="flex-between mb-4">
              <span style={{ fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '0.02em', color: getVerdictColor(selectedSample), lineHeight: 1.05 }}>
                {selectedSample.isFake ? 'This is AI Generated' : 'This is Legit'}
              </span>
              {selectedSample.isFake ? <ShieldAlert size={34} style={{ color: getVerdictColor(selectedSample), flexShrink: 0 }} /> : <CheckCircle2 size={34} style={{ color: getVerdictColor(selectedSample), flexShrink: 0 }} />}
            </div>

            {/* Score gauge */}
            <div className="text-center mb-6" style={{ padding: '1.5rem 0', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: getVerdictColor(selectedSample) }}>
                {getVerdictConfidence(selectedSample)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.25rem', fontWeight: 600 }}>
                Authenticity Score
              </div>
            </div>

            {/* Parameters confidence bar */}
            <h4 className="mb-3" style={{ fontSize: '0.9rem' }}>Authenticity Detail Vectors</h4>
            
            {selectedSample.type !== 'audio' && (
              <>
                <div className="mb-3">
                  <div className="flex-between mb-1" style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Facial Boundary Coherence</span>
                    <span style={{ fontWeight: 600 }}>{getAuthenticityScore(selectedSample.details.facialSymmetry)}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${getAuthenticityScore(selectedSample.details.facialSymmetry)}%`,
                        background: getAuthenticityColor(getAuthenticityScore(selectedSample.details.facialSymmetry))
                      }}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex-between mb-1" style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Eye Gaze & Reflection Parity</span>
                    <span style={{ fontWeight: 600 }}>{getAuthenticityScore(selectedSample.details.gazeCoherence)}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${getAuthenticityScore(selectedSample.details.gazeCoherence)}%`,
                        background: getAuthenticityColor(getAuthenticityScore(selectedSample.details.gazeCoherence))
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="mb-3">
              <div className="flex-between mb-1" style={{ fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Spectral Harmonic Integrity</span>
                <span style={{ fontWeight: 600 }}>{getAuthenticityScore(selectedSample.details.spectralConsistency)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${getAuthenticityScore(selectedSample.details.spectralConsistency)}%`,
                    background: getAuthenticityColor(getAuthenticityScore(selectedSample.details.spectralConsistency))
                  }}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex-between mb-1" style={{ fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Camera Sensor Pattern Match</span>
                <span style={{ fontWeight: 600 }}>{getAuthenticityScore(selectedSample.details.compressionNoise)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${getAuthenticityScore(selectedSample.details.compressionNoise)}%`,
                    background: getAuthenticityColor(getAuthenticityScore(selectedSample.details.compressionNoise))
                  }}
                />
              </div>
            </div>

            {/* List of anomalies */}
            <h4 className="mb-2" style={{ fontSize: '0.9rem' }}>Anomalous Findings</h4>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4' }}>
              {selectedSample.anomalies.map((anomaly, idx) => (
                <li key={idx} style={{ marginBottom: '6px' }}>
                  {anomaly}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary w-full" style={{ padding: '0.5rem', fontSize: '0.8rem' }} onClick={() => setShowReport(false)}>
                Clear Analysis
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel text-center" style={{ padding: '4rem 1.5rem', borderStyle: 'dotted' }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>No Verification Data</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Select a media file and click "Run Verification Scan" to view the forensic audit reports.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1.2s linear infinite;
        }
      `}</style>
    </div>
  );
};
