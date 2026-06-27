import { useState } from 'react';
import { Header } from './components/Header';
import { Sandbox } from './components/Sandbox';
import { Showcase } from './components/Showcase';
import { Quiz } from './components/Quiz';
import { Guides } from './components/Guides';
import { NistScorer } from './components/NistScorer';
import { ShieldAlert } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<string>('sandbox');

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
            background: 'linear-gradient(90deg, rgba(0,242,254,0.03) 0%, rgba(168,85,247,0.03) 100%)',
            padding: '1rem 1.5rem'
          }}
        >
          <div className="flex-center gap-4" style={{ justifyContent: 'flex-start' }}>
            <ShieldAlert size={20} className="text-gradient" />
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Deepfake Verification Portal Online</span>
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
      </main>

      {/* Footer */}
      <footer>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <p style={{ fontWeight: 500 }}>
            DEEP<span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>SENTINEL</span> Forensic Media Audit Framework
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
