import React, { useState, useEffect } from 'react';
import { translations, type Language } from '../i18n/translations';

const About: React.FC = () => {
  const [lang, setLang] = useState<Language>('ja');

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as Language | null;
    if (savedLang) {
      setLang(savedLang);
    } else {
      const systemLang = navigator.language.startsWith('ja') ? 'ja' : 
                         navigator.language.startsWith('zh') ? 'zh' : 'en';
      setLang(systemLang);
    }
  }, []);

  const t = translations[lang];

  return (
    <div className="about-container">
      <div className="about-content">
        <div className="app-icon">
          <img src="/favicon.svg" alt="App Icon" />
        </div>
        <h1 className="app-title">{t.appTitle}</h1>
        <p className="app-version">{t.version}</p>
        
        <div className="credits">
          <p className="copyright">{t.copyright}</p>
          <p className="authors">{t.authors}</p>
        </div>

        <div className="disclaimer-box">
          <p>{t.disclaimer}</p>
        </div>
      </div>

      <style>{`
        .about-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          color: var(--text-color);
          background: var(--bg-color);
          user-select: none;
        }

        .about-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .app-icon img {
          width: 80px;
          height: 80px;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));
        }

        .app-title {
          margin: 0;
          font-family: var(--font-title);
          font-size: 24px;
          color: var(--accent-color);
        }

        .app-version {
          margin: 0;
          font-size: 14px;
          opacity: 0.7;
        }

        .credits {
          font-size: 12px;
          opacity: 0.8;
          line-height: 1.6;
        }

        .disclaimer-box {
          margin-top: 16px;
          padding: 12px;
          background: var(--sidebar-bg);
          border-radius: 8px;
          border: 1px solid var(--border-color);
          font-size: 10px;
          line-height: 1.4;
          text-align: left;
          max-width: 340px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

export default About;
