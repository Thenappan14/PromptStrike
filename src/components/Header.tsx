import React, { useEffect } from 'react';
import { HelpCircle, Compass, Gamepad2, BookOpen, FileCheck2, ShieldCheck, ClipboardList } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  // Update document title for SEO on tab change
  useEffect(() => {
    let title = 'PromptStrike - AI Verification Portal';
    let metaDescription = 'Detect synthetic media, compare AI deepfakes, and learn verification techniques.';

    switch (activeTab) {
      case 'sandbox':
        title = 'Analyser | PromptStrike';
        metaDescription = 'Analyze media for AI alterations with our synthetic scanner.';
        break;
      case 'showcase':
        title = 'Visual Comparisons | PromptStrike';
        metaDescription = 'Compare authentic and deepfaked media side-by-side.';
        break;
      case 'quiz':
        title = 'Spot the Fake Quiz | PromptStrike';
        metaDescription = 'Test your ability to spot AI-generated faces and voices.';
        break;
      case 'guides':
        title = 'Knowledge Guides | PromptStrike';
        metaDescription = 'Checklists and manuals for identifying synthetic media.';
        break;
      case 'nist':
        title = 'NIST AI RMF Scorer | PromptStrike';
        metaDescription = 'Score documents against NIST AI Risk Management Framework controls.';
        break;
    }

    document.title = title;
    
    // Update meta tag if it exists
    const metaDescriptionTag = document.querySelector('meta[name="description"]');
    if (metaDescriptionTag) {
      metaDescriptionTag.setAttribute('content', metaDescription);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = metaDescription;
      document.head.appendChild(meta);
    }
  }, [activeTab]);

  return (
    <nav>
      <div className="nav-container">
        <div className="flex-center gap-2" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('sandbox')}>
          <img src="/brand/logo.png" alt="PromptStrike" className="brand-logo" />
        </div>

        <div className="nav-links">
          <button
            id="nav-btn-sandbox"
            className={`nav-link ${activeTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('sandbox')}
          >
            <Compass size={18} />
            <span>Analyser</span>
          </button>
          <button
            id="nav-btn-showcase"
            className={`nav-link ${activeTab === 'showcase' ? 'active' : ''}`}
            onClick={() => setActiveTab('showcase')}
          >
            <HelpCircle size={18} />
            <span>Showcase</span>
          </button>
          <button
            id="nav-btn-quiz"
            className={`nav-link ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz')}
          >
            <Gamepad2 size={18} />
            <span>Quiz</span>
          </button>
          <button
            id="nav-btn-guides"
            className={`nav-link ${activeTab === 'guides' ? 'active' : ''}`}
            onClick={() => setActiveTab('guides')}
          >
            <BookOpen size={18} />
            <span>Guides</span>
          </button>
          <button
            id="nav-btn-nist"
            className={`nav-link ${activeTab === 'nist' ? 'active' : ''}`}
            onClick={() => setActiveTab('nist')}
          >
            <FileCheck2 size={18} />
            <span>NIST RMF</span>
          </button>
          <a
            id="nav-btn-security"
            className="nav-link"
            href="https://mcp-security-scanner.pages.dev/"
            target="_blank"
            rel="noreferrer"
          >
            <ShieldCheck size={18} />
            <span>Security</span>
          </a>
          <a
            id="nav-btn-summarizer"
            className="nav-link"
            href="https://ai-verify-process-checks-summary.pages.dev/"
            target="_blank"
            rel="noreferrer"
          >
            <ClipboardList size={18} />
            <span>Summarizer</span>
          </a>
        </div>
      </div>
    </nav>
  );
};
