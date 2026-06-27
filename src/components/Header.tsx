import React, { useEffect } from 'react';
import { Shield, HelpCircle, Compass, Gamepad2, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  // Update document title for SEO on tab change
  useEffect(() => {
    let title = 'Deepfake Sentinel - AI Verification Portal';
    let metaDescription = 'Detect synthetic media, compare AI deepfakes, and learn verification techniques.';

    switch (activeTab) {
      case 'sandbox':
        title = 'Detection Sandbox | Deepfake Sentinel';
        metaDescription = 'Analyze media for AI alterations with our synthetic scanner.';
        break;
      case 'showcase':
        title = 'Visual Comparisons | Deepfake Sentinel';
        metaDescription = 'Compare authentic and deepfaked media side-by-side.';
        break;
      case 'quiz':
        title = 'Spot the Fake Quiz | Deepfake Sentinel';
        metaDescription = 'Test your ability to spot AI-generated faces and voices.';
        break;
      case 'guides':
        title = 'Knowledge Guides | Deepfake Sentinel';
        metaDescription = 'Checklists and manuals for identifying synthetic media.';
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
          <Shield size={26} className="text-gradient" style={{ color: 'var(--color-cyan)' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            DEEP<span className="text-gradient">SENTINEL</span>
          </span>
        </div>

        <div className="nav-links">
          <button
            id="nav-btn-sandbox"
            className={`nav-link ${activeTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('sandbox')}
          >
            <Compass size={18} />
            <span>Sandbox</span>
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
        </div>
      </div>
    </nav>
  );
};
