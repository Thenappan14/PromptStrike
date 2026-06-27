import React, { useState } from 'react';
import { BookOpen, ShieldAlert, Sparkles, CheckSquare, Eye, Volume2, Shield } from 'lucide-react';

interface GuideCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: {
    heading: string;
    points: { check: string; detail: string }[];
  }[];
}

const CATEGORIES: GuideCategory[] = [
  {
    id: 'video',
    title: 'Video Verification',
    icon: <Eye size={18} />,
    content: [
      {
        heading: "Biometric and Facial Artifacts",
        points: [
          { check: "Rate of Blinking", detail: "Check if the subject blinks naturally. Older deepfakes feature individuals who rarely blink or blink at irregular, rapid frequencies." },
          { check: "Lip-Sync Coherence", detail: "Observe high-consonant mouth motions (e.g., B, M, P). AI generators often fail to match visual lip boundaries with phonetic sound delays." },
          { check: "Double Boundaries", detail: "Look closely at the cheeklines, chin, and hair edges. Blending errors leave double outlines or faint blur rings." }
        ]
      },
      {
        heading: "Physics and Light Auditing",
        points: [
          { check: "Background Occlusion", detail: "Watch when the subject moves their head across objects in the background. Check if background lines (like doorframes) warp briefly." },
          { check: "Reflection Symmetry", detail: "Zoom into the pupils. Real light projects identical reflections. Deepfakes generate eyes separately, resulting in unmatched reflection points." }
        ]
      }
    ]
  },
  {
    id: 'audio',
    title: 'Audio Forensics',
    icon: <Volume2 size={18} />,
    content: [
      {
        heading: "Voice Synthesis Signatures",
        points: [
          { check: "Inconsistent Noise Floor", detail: "Listen to the silence between words. Cloned audio generators often inject absolute digital zero (pure silence) rather than natural room tone." },
          { check: "Robotic Harmonics", detail: "Analyze high-pitched words. Synthetic speech engines often introduce subtle metallic resonances or robotic distortion at frequencies above 3kHz." },
          { check: "Speech Breathing Envelopes", detail: "Natural speech contains inhalation breaks before sentences. Synthetic voiceovers often run for long periods without breathing or insert breaths at odd syntax points." }
        ]
      }
    ]
  },
  {
    id: 'tech',
    title: 'AI Technology Primer',
    icon: <Sparkles size={18} />,
    content: [
      {
        heading: "Generative Frameworks",
        points: [
          { check: "GAN (Generative Adversarial Network)", detail: "Two models competing (generator and discriminator) to synthesize faces. Historically prone to bilateral asymmetry and texture smudging." },
          { check: "Diffusion Models", detail: "Generating images by gradually removing noise. Prone to hand anomalies, bad text rendering, and inconsistent details in busy backgrounds." },
          { check: "Neural Voice Cloning (TTS)", detail: "Synthesizing vocal characteristics from short voice samples. Prone to robotic pitch flattenings and phrasing speed fluctuations." }
        ]
      }
    ]
  },
  {
    id: 'security',
    title: 'Defense Checklists',
    icon: <Shield size={18} />,
    content: [
      {
        heading: "Enterprise and Personal Safeguards",
        points: [
          { check: "Establish Out-of-Band Verification", detail: "When receiving unexpected, high-stakes audio or video instructions, call back on a pre-established direct communication line." },
          { check: "Use Shared Family Passphrases", detail: "In an era of voice cloning scams, establish a private challenge-response passphrase with family members to verify distress calls." },
          { check: "Verify Source Signatures", detail: "Confirm media authenticity through metadata checks or cryptographic digital content signatures (C2PA standard)." }
        ]
      }
    ]
  }
];

export const Guides: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('video');

  const selectedCategory = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];

  return (
    <div>
      <h2 className="mb-2">Media Verification Guide</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '800px' }}>
        Learn how forensic analysts audit synthetic media. Access checklists, technical frameworks, and defensive protocols.
      </p>

      <div className="dashboard-grid">
        {/* Category Selector */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                className={`btn ${activeCategory === category.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', padding: '1rem', width: '100%' }}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.icon}
                <span style={{ marginLeft: '0.5rem' }}>{category.title}</span>
              </button>
            ))}
          </div>

          <div className="glass-panel mt-6" style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--color-purple)' }}>
            <div className="flex-center gap-2 mb-2" style={{ justifyContent: 'flex-start' }}>
              <ShieldAlert size={16} style={{ color: 'var(--color-purple)' }} />
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Did you know?</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Deepfakes struggle with lateral head rotations. Turning a face more than 40 degrees profile-view forces the AI models to hallucinate angles with less training data, leading to severe visual flickering.
            </p>
          </div>
        </div>

        {/* Guide Content */}
        <div className="glass-panel" style={{ flex: 1 }}>
          <div className="flex-center gap-2 mb-4" style={{ justifyContent: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <BookOpen size={20} className="text-gradient" />
            <h3 style={{ fontSize: '1.25rem' }}>{selectedCategory.title} Checklist</h3>
          </div>

          {selectedCategory.content.map((section, sIdx) => (
            <div key={sIdx} className="mb-6">
              <h4 className="mb-3" style={{ fontSize: '1rem', color: 'var(--color-cyan)', fontWeight: 600 }}>
                {section.heading}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {section.points.map((point, pIdx) => (
                  <div 
                    key={pIdx} 
                    style={{ 
                      padding: '1rem', 
                      background: 'rgba(255,255,255,0.01)', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ marginTop: '2px' }}>
                      <CheckSquare size={16} className="text-gradient" style={{ opacity: 0.8 }} />
                    </div>
                    <div>
                      <h5 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {point.check}
                      </h5>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {point.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
