import React, { useState, useEffect } from 'react';

const Settings: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>環境設定</h1>
      </header>
      
      <main className="settings-content">
        <section className="settings-section">
          <h2>外観</h2>
          <div className="setting-item">
            <span className="setting-label">テーマ</span>
            <div className="theme-toggle">
              <button 
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => toggleTheme('light')}
              >
                ライト
              </button>
              <button 
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => toggleTheme('dark')}
              >
                ダーク
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>バックアップ</h2>
          <div className="setting-item">
            <span className="setting-label">自動バックアップを有効にする</span>
            <input type="checkbox" defaultChecked />
          </div>
        </section>

        <section className="settings-section">
          <h2>バージョン情報</h2>
          <div className="setting-item">
            <span className="setting-label">Mobs Manager Editor</span>
            <span className="setting-value">v0.1.0</span>
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
        }

        .settings-header h1 {
          margin: 0;
          font-family: var(--font-title);
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

        .setting-value {
          font-size: 12px;
          opacity: 0.8;
        }

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--accent-color);
        }
      `}</style>
    </div>
  );
};

export default Settings;
