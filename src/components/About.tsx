import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { translations, type Language } from '../i18n/translations';
import { open } from '@tauri-apps/plugin-shell';

const About: React.FC = () => {
  const [lang, setLang] = useState<Language>('ja');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Language initialization
    const savedLang = localStorage.getItem('lang') as Language | null;
    if (savedLang) {
      setLang(savedLang);
    } else {
      const systemLang = navigator.language.startsWith('ja') ? 'ja' :
        navigator.language.startsWith('zh') ? 'zh' : 'en';
      setLang(systemLang);
    }

    // Listen for theme changes (Tauri Event)
    const unlistenTheme = listen<string>('theme-changed', (event) => {
      const newTheme = event.payload as 'light' | 'dark';
      setTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    });

    // Listen for language changes (Tauri Event)
    const unlistenLang = listen<string>('lang-changed', (event) => {
      setLang(event.payload as Language);
    });

    // Fallback: Listen for storage events (Standard Browser Event)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as 'light' | 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      if (e.key === 'lang' && e.newValue) {
        setLang(e.newValue as Language);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unlistenTheme.then(f => f());
      unlistenLang.then(f => f());
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const t = translations[lang];

  const handleLinkClick = async (url: string) => {
    try {
      await open(url);
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  };

  const renderWithLinks = (text: string) => {
    const links = [
      { pattern: /Stellionix/g, url: 'https://github.com/Stellionix' },
      { pattern: /大渕凜/g, url: 'https://github.com/rinfromniigata' },
      { pattern: /Ofuchi Rin/g, url: 'https://github.com/rinfromniigata' },
      { pattern: /Apache 2\.0/g, url: 'https://github.com/nid-techtech/mobsManagerGUI/blob/main/LICENSE' },
    ];

    let parts: (string | React.ReactNode)[] = [text];

    links.forEach(({ pattern, url }) => {
      const newParts: (string | React.ReactNode)[] = [];
      parts.forEach((part, partIdx) => {
        if (typeof part === 'string') {
          const split = part.split(pattern);
          const matches = part.match(pattern);

          if (matches) {
            split.forEach((s, i) => {
              newParts.push(s);
              if (i < matches.length) {
                newParts.push(
                  <span
                    key={`link-${url}-${partIdx}-${i}`}
                    className="link"
                    onClick={() => handleLinkClick(url)}
                  >
                    {matches[i]}
                  </span>
                );
              }
            });
          } else {
            newParts.push(part);
          }
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return parts;
  };

  return (
    <div className="about-container">
      <div className="about-content">
        <h1 className="app-title">{t.appTitle}</h1>
        <p className="app-version">{t.version}</p>

        <div className="credits">
          <p className="copyright">{renderWithLinks(t.copyright)}</p>
          <p className="authors">{renderWithLinks(t.authors)}</p>
        </div>

        <div className="disclaimer-box">
          <p>{renderWithLinks(t.disclaimer)}</p>
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


        .app-title {
          margin: 24px 0 0 0;
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
          white-space: pre-wrap;
        }

        .disclaimer-box {
          margin-top: 8px;
          padding: 12px;
          background: var(--sidebar-bg);
          border-radius: 8px;
          border: 1px solid var(--border-color);
          font-size: 10px;
          line-height: 1.4;
          text-align: left;
          max-width: 340px;
          opacity: 0.7;
          white-space: pre-wrap;
        }

        .link {
          color: var(--accent-color);
          text-decoration: underline;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .link:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default About;
