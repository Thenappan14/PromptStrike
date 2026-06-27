import { useState } from 'react';
import { Header } from './components/Header';
import { Sandbox } from './components/Sandbox';
import { Showcase } from './components/Showcase';
import { Quiz } from './components/Quiz';
import { Guides } from './components/Guides';
import { NistScorer } from './components/NistScorer';
import { ShieldAlert } from 'lucide-react';
import './App.css';

const embeddedTools: Record<string, { title: string; url: string }> = {
  summarizer: {
    title: 'Process Checks Summarizer',
    url: 'https://ai-verify-process-checks-summary.pages.dev/',
  },
};

function App() {
  const [activeTab, setActiveTab] = useState<string>('sandbox');
  const embeddedTool = embeddedTools[activeTab];

  return (
    <div className="app-container">
      {/* Header component */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main content body */}
      <main className="main-content">
        {/* Banner Alert */}
        <div
          className="glass-panel mb-6 flex-between"
          style={{
            borderColor: 'var(--border-glow)',
            background: 'linear-gradient(90deg, rgba(193,18,31,0.08) 0%, rgba(125,27,35,0.05) 100%)',
            padding: '1rem 1.5rem'
          }}
        >
          <div className="flex-center gap-4" style={{ justifyContent: 'flex-start' }}>
            <ShieldAlert size={20} className="text-gradient" />
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>PromptStrike Verification Portal Online</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                Currently running local client-side forensic simulators. All analyzed files remain completely private and are processed locally.
              </p>
            </div>
          </div>
          <span className="badge badge-cyan" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Audit
          </span>
        </div>

        {/* Tab Routing */}
        {activeTab === 'sandbox' && <Sandbox />}
        {activeTab === 'showcase' && <Showcase />}
        {activeTab === 'quiz' && <Quiz />}
        {activeTab === 'guides' && <Guides />}
        {activeTab === 'nist' && <NistScorer />}
        {embeddedTool && (
          <section className="embedded-tool-section">
            <div className="embedded-tool-header">
              <h2>{embeddedTool.title}</h2>
            </div>
            <iframe
              className="embedded-tool-frame"
              src={embeddedTool.url}
              title={embeddedTool.title}
              loading="lazy"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <p style={{ fontWeight: 500 }}>
            <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>PROMPTSTRIKE</span> Forensic Media Audit Framework
          </p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            Developed under Advanced Biometrics & Media Synthesis Auditing standards. Educational Demonstrator.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
