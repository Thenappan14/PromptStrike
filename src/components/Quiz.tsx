import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, RotateCcw, ArrowRight } from 'lucide-react';

interface Question {
  id: number;
  scenario: string;
  options: { label: string; isCorrect: boolean }[];
  explanation: string;
  visualGraphic: 'eyes' | 'audio' | 'ears' | 'teeth' | 'bg';
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    scenario: "You are analyzing high-resolution headshots for a campaign. You zoom in on the subjects' eyes to audit the reflections. Which of the following specimens is a deepfake?",
    options: [
      { label: "Specimen A: The reflection of the camera flash is visible at the 2 o'clock position on both irises.", isCorrect: false },
      { label: "Specimen B: The reflection of the window light is at the 10 o'clock position in the left eye, and the 2 o'clock position in the right eye.", isCorrect: true }
    ],
    explanation: "In real photography, light sources project onto both eyes from the same angle. If reflection positions (catchlights) are mismatched, it indicates they were synthesized independently by a generator, a classic deepfake artifact.",
    visualGraphic: 'eyes'
  },
  {
    id: 2,
    scenario: "An audio clip of a bank CEO announcing an emergency acquisition goes viral. You load it into a spectrogram editor. Which spectrogram signature points to a deepfake voice?",
    options: [
      { label: "Signature A: In-between words show small traces of room noise and low-frequency breathing envelopes.", isCorrect: false },
      { label: "Signature B: In-between words drop to absolute digital zero noise (pure silence), and high-frequency vowels exhibit metallic peaks.", isCorrect: true }
    ],
    explanation: "Text-to-speech algorithms struggle with natural breathing pacing and ambient environment matching. They often insert absolute digital silence (noise-gates) between phrases, and produce 'metallic' robotic harmonics in higher frequencies.",
    visualGraphic: 'audio'
  },
  {
    id: 3,
    scenario: "You review a video of a CEO speaking. As they turn their head, you audit bilateral symmetry. Which of the following observations confirms a deepfake?",
    options: [
      { label: "Observation A: The subject is wearing matching circular earrings that glint at different times.", isCorrect: false },
      { label: "Observation B: The left earlobe is attached directly to the jaw, while the right earlobe is detached and dangling.", isCorrect: true }
    ],
    explanation: "Generative adversarial networks (GANs) construct faces piece-by-piece, often failing on global consistency. This leads to asymmetrical ears, mismatched glasses frames, or asymmetrical jewelry shapes.",
    visualGraphic: 'ears'
  },
  {
    id: 4,
    scenario: "A video of a politician speaking shows them smiling widely. You capture frames and analyze their mouth details. Which visual pattern indicates AI generation?",
    options: [
      { label: "Specimen X: The teeth show slight gaps, realistic yellowing near the gums, and natural shadows.", isCorrect: false },
      { label: "Specimen Y: The teeth form a uniform, continuous white band with no distinct vertical division or individual shadows.", isCorrect: true }
    ],
    explanation: "Generative AI historically struggles with granular, repeating structures like teeth. Older algorithms blend teeth together into a single, uniform white 'unitooth' barrier or smudged teeth borders.",
    visualGraphic: 'teeth'
  },
  {
    id: 5,
    scenario: "You audit a politician's interview video. The subject is sitting in front of vertical window blinds. Which artifact confirms deepfake mask manipulation?",
    options: [
      { label: "Artifact A: The blinds behind the subject have a slight chromatic aberration in the lens corners.", isCorrect: false },
      { label: "Artifact B: The straight lines of the window blinds bend, warp, or flicker briefly whenever the subject's cheeks or neck move near them.", isCorrect: true }
    ],
    explanation: "When deepfake models overlay a face onto a target actor, the boundary margins must be blended. This often causes the background pixels directly adjacent to the face boundary to warp or wobble during motion, revealing the seam.",
    visualGraphic: 'bg'
  }
];

export const Quiz: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  const currentQuestion = QUESTIONS[currentIdx];

  const handleOptionClick = (optIdx: number) => {
    if (isAnswered) return;
    setSelectedOpt(optIdx);
    setIsAnswered(true);
    if (currentQuestion.options[optIdx].isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedOpt(null);
    setIsAnswered(false);
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const resetQuiz = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setScore(0);
    setQuizFinished(false);
    setIsAnswered(false);
  };

  const getRank = () => {
    if (score === 5) return { title: "Master Biometric Auditor", color: "var(--color-cyan)" };
    if (score >= 3) return { title: "Forensic Analyst", color: "var(--color-purple)" };
    return { title: "Junior Media Verifier", color: "var(--text-secondary)" };
  };

  const renderVisualHint = (type: string) => {
    return (
      <div style={{ width: '100%', height: '100px', background: '#0e1017', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem', overflow: 'hidden', position: 'relative' }}>
        {type === 'eyes' && (
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '3px' }}>
                <div style={{ width: '22px', height: '12px', border: '1px solid var(--color-cyan)', borderRadius: '50%', position: 'relative' }}>
                  <div style={{ width: '4px', height: '4px', background: 'var(--color-cyan)', borderRadius: '50%', position: 'absolute', top: '4px', left: '6px' }} />
                </div>
                <div style={{ width: '22px', height: '12px', border: '1px solid var(--color-cyan)', borderRadius: '50%', position: 'relative' }}>
                  <div style={{ width: '4px', height: '4px', background: 'var(--color-cyan)', borderRadius: '50%', position: 'absolute', top: '4px', left: '6px' }} />
                </div>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-cyan)', marginTop: '4px', display: 'block' }}>Specimen A</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '3px' }}>
                <div style={{ width: '22px', height: '12px', border: '1px solid var(--color-crimson)', borderRadius: '50%', position: 'relative' }}>
                  <div style={{ width: '4px', height: '4px', background: 'var(--color-crimson)', borderRadius: '50%', position: 'absolute', top: '2px', left: '4px' }} />
                </div>
                <div style={{ width: '22px', height: '12px', border: '1px solid var(--color-crimson)', borderRadius: '50%', position: 'relative' }}>
                  <div style={{ width: '4px', height: '4px', background: 'var(--color-crimson)', borderRadius: '50%', position: 'absolute', top: '6px', left: '12px' }} />
                </div>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-crimson)', marginTop: '4px', display: 'block' }}>Specimen B</span>
            </div>
          </div>
        )}
        {type === 'audio' && (
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              {/* wavy line */}
              <div style={{ width: '60px', height: '15px', borderBottom: '1px dashed var(--text-muted)', position: 'relative', display: 'flex', gap: '2px' }}>
                <div style={{ width: '4px', height: '8px', background: 'var(--color-cyan)' }} />
                <div style={{ width: '4px', height: '4px', background: 'var(--color-cyan)' }} />
                <div style={{ width: '4px', height: '12px', background: 'var(--color-cyan)' }} />
                <div style={{ width: '4px', height: '6px', background: 'var(--color-cyan)' }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-cyan)', marginTop: '4px', display: 'block' }}>Signature A (Natural)</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60px', height: '15px', borderBottom: '1px dashed var(--text-muted)', position: 'relative', display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
                <div style={{ width: '4px', height: '15px', background: 'var(--color-crimson)' }} />
                <div style={{ width: '12px', height: '1px', background: 'var(--color-crimson)' }} />
                <div style={{ width: '4px', height: '15px', background: 'var(--color-crimson)' }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-crimson)', marginTop: '4px', display: 'block' }}>Signature B (Synthetic)</span>
            </div>
          </div>
        )}
        {type === 'ears' && (
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ width: '10px', height: '20px', border: '1px solid var(--color-cyan)', borderRadius: '40% 10% 10% 40%' }} />
                <div style={{ width: '10px', height: '20px', border: '1px solid var(--color-cyan)', borderRadius: '10% 40% 40% 10%' }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-cyan)', marginTop: '4px', display: 'block' }}>Observation A</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ width: '10px', height: '20px', border: '1px solid var(--color-crimson)', borderRadius: '40% 10% 10% 40%' }} />
                <div style={{ width: '10px', height: '14px', border: '1px solid var(--color-crimson)', borderRadius: '10% 40% 0 0' }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-crimson)', marginTop: '4px', display: 'block' }}>Observation B</span>
            </div>
          </div>
        )}
        {type === 'teeth' && (
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '40px', height: '12px', border: '1px solid var(--color-cyan)', display: 'flex', gap: '3px', padding: '1px' }}>
                <div style={{ width: '5px', height: '8px', background: 'var(--color-cyan)' }} />
                <div style={{ width: '5px', height: '8px', background: 'var(--color-cyan)' }} />
                <div style={{ width: '5px', height: '8px', background: 'var(--color-cyan)' }} />
                <div style={{ width: '5px', height: '8px', background: 'var(--color-cyan)' }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-cyan)', marginTop: '4px', display: 'block' }}>Specimen X</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '40px', height: '12px', border: '1px solid var(--color-crimson)', padding: '1px' }}>
                <div style={{ width: '100%', height: '100%', background: 'var(--color-crimson)' }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-crimson)', marginTop: '4px', display: 'block' }}>Specimen Y</span>
            </div>
          </div>
        )}
        {type === 'bg' && (
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '40px', height: '24px', position: 'relative', border: '1px solid var(--border-color)' }}>
                <div style={{ position: 'absolute', left: '10px', top: 0, bottom: 0, width: '1px', background: 'var(--color-cyan)' }} />
                <div style={{ position: 'absolute', left: '20px', top: 0, bottom: 0, width: '1px', background: 'var(--color-cyan)' }} />
                <div style={{ position: 'absolute', left: '30px', top: 0, bottom: 0, width: '1px', background: 'var(--color-cyan)' }} />
                <circle cx="20" cy="12" r="6" fill="#0e1017" stroke="var(--color-cyan)" strokeWidth="0.8" />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-cyan)', marginTop: '4px', display: 'block' }}>Artifact A</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '40px', height: '24px', position: 'relative', border: '1px solid var(--border-color)' }}>
                <path d="M 10 0 L 10 5 Q 8 12, 10 19 L 10 24 M 20 0 L 20 24 M 30 0 L 30 24" fill="none" stroke="var(--color-crimson)" strokeWidth="0.8" />
                <circle cx="15" cy="12" r="6" fill="#0e1017" stroke="var(--color-crimson)" strokeWidth="0.8" />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-crimson)', marginTop: '4px', display: 'block' }}>Artifact B</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {!quizFinished ? (
        <div>
          <div className="flex-between mb-4">
            <h2>Spot the Fake Training</h2>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Round {currentIdx + 1} of {QUESTIONS.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="progress-bar-bg mb-6">
            <div className="progress-bar-fill" style={{ width: `${((currentIdx + 1) / QUESTIONS.length) * 100}%` }} />
          </div>

          <div className="glass-panel">
            {renderVisualHint(currentQuestion.visualGraphic)}

            <p style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: '1.5', marginBottom: '1.5rem' }}>
              {currentQuestion.scenario}
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              {currentQuestion.options.map((opt, oIdx) => {
                let btnClass = "";
                if (isAnswered) {
                  if (opt.isCorrect) btnClass = "correct";
                  else if (selectedOpt === oIdx) btnClass = "incorrect";
                }
                return (
                  <button
                    key={oIdx}
                    id={`quiz-option-${currentIdx}-${oIdx}`}
                    className={`quiz-option ${btnClass}`}
                    onClick={() => handleOptionClick(oIdx)}
                    disabled={isAnswered}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Explanation box */}
            {isAnswered && (
              <div 
                className="glass-panel" 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  borderLeft: `3px solid ${currentQuestion.options[selectedOpt || 0].isCorrect ? 'var(--color-emerald)' : 'var(--color-crimson)'}`,
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  animation: 'fadeIn 0.4s ease-out'
                }}
              >
                <div className="flex-between mb-2">
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: currentQuestion.options[selectedOpt || 0].isCorrect ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                    {currentQuestion.options[selectedOpt || 0].isCorrect ? 'CORRECT AUDIT' : 'MISSED MARK'}
                  </span>
                  {currentQuestion.options[selectedOpt || 0].isCorrect ? <CheckCircle2 size={16} style={{ color: 'var(--color-emerald)' }} /> : <XCircle size={16} style={{ color: 'var(--color-crimson)' }} />}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {isAnswered && (
              <div className="flex-center">
                <button 
                  id="btn-quiz-next"
                  className="btn btn-primary w-full" 
                  onClick={handleNext}
                >
                  <span>{currentIdx === QUESTIONS.length - 1 ? 'Finish training' : 'Next Round'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel text-center" style={{ padding: '3rem 2rem', animation: 'fadeIn 0.5s ease-out' }}>
          <Award size={64} className="text-gradient mb-4" />
          <h2 className="mb-2">Training Session Completed</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            You successfully audited the samples. Here is your evaluation report:
          </p>

          <div className="glass-panel mb-6" style={{ background: 'rgba(255,255,255,0.02)', display: 'inline-block', minWidth: '280px', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Correct Detections
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-cyan)', margin: '0.5rem 0' }}>
              {score} / {QUESTIONS.length}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: getRank().color }}>
              Rank: {getRank().title}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={resetQuiz}>
              <RotateCcw size={16} />
              <span>Restart Training</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
