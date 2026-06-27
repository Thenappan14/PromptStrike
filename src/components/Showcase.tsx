import React, { useState } from 'react';
import { Eye, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface Hotspot {
  id: string;
  x: number; // percentage
  y: number; // percentage
  title: string;
  description: string;
}

interface ShowcasePreset {
  id: string;
  title: string;
  description: string;
  hotspots: Hotspot[];
}

const PRESETS: ShowcasePreset[] = [
  {
    id: 'case-1',
    title: 'Visual Case Study: Artificial Iris & Gaze',
    description: 'Modern generative AI struggles to align eye reflections and maintain consistent iris circularity across frames. Use the slider to discover gaze inconsistencies.',
    hotspots: [
      {
        id: 'h1-1',
        x: 43,
        y: 42,
        title: 'Asymmetric Pupil Dilation',
        description: 'Under close examination, the synthetic eye shows irregular pupillary borders and dilation that does not match local illumination.'
      },
      {
        id: 'h1-2',
        x: 58,
        y: 40,
        title: 'Mismatched Eye Reflections',
        description: 'Light reflections (catchlights) in the eyes are generated independently, resulting in reflections pointing in physically impossible directions.'
      },
      {
        id: 'h1-3',
        x: 50,
        y: 65,
        title: 'Blending Margin Seams',
        description: 'A faint line is visible around the facial perimeter where the AI-generated face mask is blended into the original background footage.'
      }
    ]
  },
  {
    id: 'case-2',
    title: 'Visual Case Study: Teeth & Ear Symmetry',
    description: 'Diffusion models often fail on repeating geometries, like teeth borders, and asymmetric bilateral structures like earlobes.',
    hotspots: [
      {
        id: 'h2-1',
        x: 23,
        y: 52,
        title: 'Earlobe Asymmetry',
        description: 'The right earlobe is detached while the left is attached. Deepfakes frequently miss global bilateral symmetry.'
      },
      {
        id: 'h2-2',
        x: 51,
        y: 72,
        title: 'Teeth Smudging',
        description: 'Instead of individual teeth boundaries, the model produces a continuous white band or blurred, overlapping boundaries.'
      },
      {
        id: 'h2-3',
        x: 77,
        y: 53,
        title: 'Double Jaw Contour',
        description: 'A faint ghosting outline appears near the jaw during high-motion frames, indicating lagging face-model alignment.'
      }
    ]
  }
];

export const Showcase: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<ShowcasePreset>(PRESETS[0]);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  // Helper to render the Face Wireframe SVG
  // `isFake` modifies paths to introduce distortions
  const renderFaceSVG = (isFake: boolean) => {
    const strokeColor = isFake ? 'var(--color-crimson)' : 'var(--color-cyan)';
    const glowColor = isFake ? 'rgba(255, 8, 68, 0.4)' : 'rgba(0, 242, 254, 0.3)';
    
    return (
      <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%', display: 'block', background: '#090a10' }}>
        <defs>
          <radialGradient id={`glow-${isFake ? 'fake' : 'real'}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Glow */}
        <circle cx="200" cy="200" r="160" fill={`url(#glow-${isFake ? 'fake' : 'real'})`} />

        {/* Background Grid Lines */}
        <g stroke="rgba(255,255,255,0.03)" strokeWidth="0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <React.Fragment key={i}>
              <line x1={(i + 1) * 40} y1="0" x2={(i + 1) * 40} y2="400" />
              <line x1="0" y1={(i + 1) * 40} x2="400" y2={(i + 1) * 40} />
            </React.Fragment>
          ))}
        </g>

        {/* Outer Face Boundary */}
        <path
          d={isFake 
            ? "M 120 120 C 110 200, 115 280, 200 340 C 285 280, 280 200, 280 120 C 275 60, 125 60, 120 120 Z" 
            : "M 120 120 C 110 200, 120 280, 200 330 C 280 280, 290 200, 280 120 C 270 60, 130 60, 120 120 Z"
          }
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeDasharray={isFake ? "4 4" : ""}
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
        />

        {/* Left Eye */}
        <path
          d="M 150 170 C 160 160, 180 160, 190 170 C 180 180, 160 180, 150 170 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        {/* Left Iris / Pupil */}
        <circle cx={isFake ? "168" : "170"} cy="170" r="6" fill="none" stroke={strokeColor} strokeWidth="1" />
        {/* Left Catchlight */}
        <circle cx={isFake ? "167" : "172"} cy="168" r="1.5" fill={isFake ? "none" : strokeColor} stroke={isFake ? strokeColor : "none"} strokeWidth="0.5" />

        {/* Right Eye */}
        <path
          d="M 210 170 C 220 160, 240 160, 250 170 C 240 180, 220 180, 210 170 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        {/* Right Iris / Pupil */}
        <circle cx="230" cy="170" r="6" fill="none" stroke={strokeColor} strokeWidth="1" />
        {/* Right Catchlight (GLITCHED on fake: offset and double reflection) */}
        <circle cx={isFake ? "233" : "232"} cy="168" r="1.5" fill={strokeColor} />
        {isFake && <circle cx="227" cy="172" r="1" fill="var(--color-crimson)" />}

        {/* Nose Bridge */}
        <path
          d="M 200 170 L 200 230 C 190 235, 190 240, 200 242 C 210 240, 210 235, 200 230"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />

        {/* Mouth */}
        <path
          d={isFake
            ? "M 160 270 C 170 278, 230 278, 240 270 C 225 285, 175 285, 160 270 Z" // Smudged blending mouth
            : "M 165 270 C 175 265, 225 265, 235 270 C 225 280, 175 280, 165 270 Z"
          }
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />

        {/* Teeth Geometry Grid */}
        <path
          d={isFake 
            ? "M 170 272 L 230 272" // Single flat line on fake
            : "M 175 271 L 225 271 M 185 268 L 185 273 M 195 267 L 195 274 M 205 267 L 205 274 M 215 268 L 215 273"
          }
          stroke={strokeColor}
          strokeWidth="1"
          fill="none"
        />

        {/* Face Landmark Mesh Overlay (High-tech scanner lines) */}
        <g stroke={isFake ? "rgba(255,8,68,0.15)" : "rgba(0,242,254,0.12)"} strokeWidth="0.8">
          <line x1="200" y1="90" x2="170" y2="170" />
          <line x1="200" y1="90" x2="230" y2="170" />
          <line x1="170" y1="170" x2="200" y2="230" />
          <line x1="230" y1="170" x2="200" y2="230" />
          <line x1="200" y1="230" x2="165" y2="270" />
          <line x1="200" y1="230" x2="235" y2="270" />
          <line x1="165" y1="270" x2="200" y2="330" />
          <line x1="235" y1="270" x2="200" y2="330" />
        </g>
      </svg>
    );
  };

  return (
    <div>
      <h2 className="mb-2">Before & After Showcase</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '800px' }}>
        Select a case study below, drag the slider to compare the authentic biometric wireframe (left) with the deepfaked model signatures (right), and click hotspots to learn about typical synthesis bugs.
      </p>

      {/* Case Tabs */}
      <div className="glass-panel mb-6" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`btn ${selectedCase.id === p.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '0.6rem 1rem' }}
              onClick={() => {
                setSelectedCase(p);
                setActiveHotspot(null);
              }}
            >
              <span>{p.title.split(':')[1] || p.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Interactive Slider Area */}
        <div>
          <div className="slider-wrapper">
            {/* Authentic layer (Always left) */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
              {renderFaceSVG(false)}
            </div>

            {/* Deepfake layer (Always right, clipped by slider width) */}
            <div 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%',
                clipPath: `polygon(${sliderPosition}% 0%, 100% 0%, 100% 100%, ${sliderPosition}% 100%)`
              }}
            >
              {renderFaceSVG(true)}
            </div>

            {/* Sliding Badges */}
            <div className="slider-badge left">Authentic Biometrics</div>
            <div className="slider-badge right">AI Glitched Artifacts</div>

            {/* Slider Input Range overlay */}
            <input
              id="showcase-slider-input"
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={handleSliderChange}
              className="slider-bar-input"
            />

            {/* Custom slider handle */}
            <div className="slider-handle" style={{ left: `${sliderPosition}%` }}>
              <Eye size={16} className="text-gradient" />
            </div>

            {/* Hotspots Overlay (Only visible relative to slider split) */}
            {selectedCase.hotspots.map((hotspot) => {
              // Decide if it falls in the "Authentic" (left) or "Deepfake" (right) side based on slider position
              const isRightSide = hotspot.x > sliderPosition;
              
              return (
                <button
                  key={hotspot.id}
                  id={`hotspot-${hotspot.id}`}
                  style={{
                    position: 'absolute',
                    left: `${hotspot.x}%`,
                    top: `${hotspot.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isRightSide ? 'rgba(255, 8, 68, 0.2)' : 'rgba(0, 242, 254, 0.2)',
                    border: `2px solid ${isRightSide ? 'var(--color-crimson)' : 'var(--color-cyan)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 25,
                    animation: 'pulse 2.5s infinite',
                    boxShadow: isRightSide ? 'var(--glow-crimson)' : 'var(--glow-cyan)'
                  }}
                  onClick={() => setActiveHotspot(hotspot)}
                  title="View forensic detail"
                >
                  <Info size={12} style={{ color: isRightSide ? 'var(--color-crimson)' : 'var(--color-cyan)' }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Hotspot details sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Case Info */}
          <div className="glass-panel">
            <h3 className="mb-2" style={{ fontSize: '1.1rem' }}>{selectedCase.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              {selectedCase.description}
            </p>
          </div>

          {/* Hotspot Inspector */}
          <div className="glass-panel" style={{ flex: 1 }}>
            {activeHotspot ? (
              <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <div className="flex-between mb-3" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: activeHotspot.x > sliderPosition ? 'var(--color-crimson)' : 'var(--color-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {activeHotspot.x > sliderPosition ? 'Deepfake Anomaly' : 'Authentic Marker'}
                  </span>
                  {activeHotspot.x > sliderPosition ? <AlertTriangle size={16} className="text-gradient-rose" /> : <CheckCircle size={16} style={{ color: 'var(--color-emerald)' }} />}
                </div>
                <h3 className="mb-2" style={{ fontSize: '1.1rem' }}>{activeHotspot.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  {activeHotspot.description}
                </p>
              </div>
            ) : (
              <div className="text-center" style={{ padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Eye size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Forensic Lens Inspector</h4>
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Click any of the glowing hotspot markers on the wireframe model to inspect specific forensic biometric traits.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
