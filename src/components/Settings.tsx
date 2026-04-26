import React, { useState, useEffect } from 'react';
import { emit } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { resourceDir, join, appDataDir } from '@tauri-apps/api/path';
import { translations, type Language } from '../i18n/translations';

const Settings: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<Language>('ja');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    const savedLang = localStorage.getItem('lang') as Language | null;
    let initialLang: Language = 'ja';
    if (savedLang) {
      initialLang = savedLang;
    } else {
      initialLang = navigator.language.startsWith('ja') ? 'ja' : 
                    navigator.language.startsWith('zh') ? 'zh' : 'en';
    }
    setLang(initialLang);
    invoke('update_menu', { lang: initialLang });
  }, []);

  const t = translations[lang];

  const updateTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    emit('theme-changed', newTheme);
  };

  const updateLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    invoke('update_menu', { lang: newLang });
    emit('lang-changed', newLang);
  };

  const handleOpenModList = async () => {
    try {
      // In development, the resources folder is in the project root.
      // In production, it should be in the resourceDir.
      // For now, we try to find it relative to the executable or in resourceDir.
      const resDir = await resourceDir();
      const filePath = await join(resDir, 'resources', 'modsList', 'modsNameWithAboveTwoWords.md');
      await open(filePath);
    } catch (err) {
      console.error('Failed to open mod list:', err);
      // Fallback for development if resourceDir doesn't work as expected
      try {
        await open('resources/modsList/modsNameWithAboveTwoWords.md');
      } catch (innerErr) {
        console.error('Final fallback failed:', innerErr);
      }
    }
  };

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>{t.settingsTitle}</h1>
      </header>
      
      <main className="settings-content">
        <section className="settings-section">
          <h2>{t.appearance}</h2>
          <div className="setting-item">
            <span className="setting-label">{t.theme}</span>
            <div className="theme-toggle">
              <button 
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => updateTheme('light')}
              >
                {t.light}
              </button>
              <button 
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => updateTheme('dark')}
              >
                {t.dark}
              </button>
            </div>
          </div>
          <div className="setting-item">
            <span className="setting-label">{t.language}</span>
            <select 
              className="lang-select"
              value={lang}
              onChange={(e) => updateLang(e.target.value as Language)}
            >
              <option value="ja">{t.japanese}</option>
              <option value="en">{t.english}</option>
              <option value="zh">{t.chinese}</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h2>{t.backup}</h2>
          <div className="setting-item">
            <span className="setting-label">{t.backupEnabled}</span>
            <input type="checkbox" defaultChecked />
          </div>
        </section>

        <section className="settings-section">
          <h2>{t.modSetting}</h2>
          <div className="setting-item">
            <span className="setting-label">{t.editModList}</span>
            <button className="action-btn" onClick={handleOpenModList}>
              {t.openInEditor}
            </button>
          </div>
        </section>


      </main>

      <style>{`
        .settings-container {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          user-select: none;
          color: var(--text-color);
        }

        .settings-header h1 {
          margin: 0;
          font-family: var(--font-main);
          font-size: 24px;
          color: var(--accent-color);
        }

        .settings-section {
          margin-bottom: 16px;
        }

        .settings-section h2 {
          font-size: 14px;
          color: var(--text-color);
          opacity: 0.6;
          margin-bottom: 8px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 4px;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .setting-label {
          font-size: 14px;
        }

        .theme-toggle {
          display: flex;
          background: var(--sidebar-bg);
          border-radius: 8px;
          padding: 2px;
          border: 1px solid var(--border-color);
        }

        .theme-btn {
          padding: 4px 12px;
          border: none;
          background: transparent;
          color: var(--text-color);
          font-size: 12px;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .theme-btn.active {
          background: var(--accent-color);
          color: white;
        }

        .lang-select {
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--sidebar-bg);
          color: var(--text-color);
          font-size: 13px;
          outline: none;
          cursor: pointer;
        }



        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--accent-color);
        }

        .action-btn {
          padding: 6px 12px;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .action-btn:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default Settings;
