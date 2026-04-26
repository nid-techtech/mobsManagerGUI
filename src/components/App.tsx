import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { translations, Language } from '../i18n/translations';

interface MobEntry {
  class_name: string;
  name: string;
  world_name: string;
  all_spawn: boolean;
  natural_spawn: boolean;
  custom_spawn: boolean;
  spawner_spawn: boolean;
  egg_spawn: boolean;
  breeding_spawn: boolean;
  iron_golem_spawn: boolean;
}

interface MobsData {
  mobs: MobEntry[];
}

interface AggregatedMob {
  name: string;
  multiverseControl: boolean;
  selectedDimension: string;
  worlds: string[];
}

export default function App() {
  const [data, setData] = useState<MobsData | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>('ja');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedMod, setSelectedMod] = useState<string>('minecraft');
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  // UI state for each mob (multiverseControl, selectedDimension)
  const [mobUIState, setMobUIState] = useState<{ [name: string]: { multiverseControl: boolean, selectedDimension: string } }>({});

  const t = translations[lang];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    const systemLang = navigator.language.startsWith('ja') ? 'ja' : 'en';
    setLang(systemLang);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleImport = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }]
      });
      if (selected && typeof selected === 'string') {
        const loadedData = await invoke<MobsData>('load_mobs_data', { path: selected });
        setData(loadedData);
        setFilePath(selected);
        
        // Initialize UI state
        const initialUIState: any = {};
        loadedData.mobs.forEach(mob => {
          if (!initialUIState[mob.name]) {
            initialUIState[mob.name] = {
              multiverseControl: true, // Default to true as per common use case
              selectedDimension: mob.world_name
            };
          }
        });
        setMobUIState(initialUIState);
      }
    } catch (error) {
      console.error('Failed to import file:', error);
      alert('Failed to import file: ' + error);
    }
  };

  const handleSave = async () => {
    if (!filePath || !data) return;
    try {
      await invoke('save_mobs_data', { path: filePath, data, backup: backupEnabled });
      alert('Saved successfully!');
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file: ' + error);
    }
  };

  const mods = useMemo(() => {
    if (!data) return [];
    const modSet = new Set<string>();
    data.mobs.forEach(mob => {
      let modId = 'minecraft';
      if (mob.name.includes(':')) modId = mob.name.split(':')[0];
      else if (mob.name.includes('_')) modId = mob.name.split('_')[0];
      modSet.add(modId);
    });
    return Array.from(modSet).sort((a, b) => {
      if (a === 'minecraft') return -1;
      if (b === 'minecraft') return 1;
      return a.localeCompare(b);
    });
  }, [data]);

  const filteredMobs = useMemo(() => {
    if (!data) return [];
    const mobGroups: { [name: string]: AggregatedMob } = {};
    
    data.mobs.forEach(mob => {
      let modId = 'minecraft';
      if (mob.name.includes(':')) modId = mob.name.split(':')[0];
      else if (mob.name.includes('_')) modId = mob.name.split('_')[0];

      if (modId !== selectedMod) return;
      if (searchQuery && !mob.name.toLowerCase().includes(searchQuery.toLowerCase())) return;

      if (!mobGroups[mob.name]) {
        mobGroups[mob.name] = {
          name: mob.name,
          multiverseControl: mobUIState[mob.name]?.multiverseControl ?? true,
          selectedDimension: mobUIState[mob.name]?.selectedDimension ?? mob.world_name,
          worlds: []
        };
      }
      mobGroups[mob.name].worlds.push(mob.world_name);
    });

    return Object.values(mobGroups).sort((a, b) => a.name.localeCompare(b.name));
  }, [data, selectedMod, searchQuery, mobUIState]);

  const updateMobValue = (mobName: string, field: keyof MobEntry, value: any, worldName: string) => {
    if (!data) return;
    const isControl = mobUIState[mobName]?.multiverseControl;
    
    const newData = { ...data, mobs: data.mobs.map(mob => {
      if (mob.name === mobName) {
        if (isControl || mob.world_name === worldName) {
          const updatedMob = { ...mob, [field]: value };
          // If all_spawn is set to false, reset other spawn reasons
          if (field === 'all_spawn' && value === false) {
            updatedMob.natural_spawn = false;
            updatedMob.custom_spawn = false;
            updatedMob.spawner_spawn = false;
            updatedMob.egg_spawn = false;
            updatedMob.breeding_spawn = false;
            updatedMob.iron_golem_spawn = false;
          }
          return updatedMob;
        }
      }
      return mob;
    }) };
    setData(newData);
  };

  const getDimensionLabel = (dim: string) => {
    if (dim === 'DIM-1') return t.nether;
    if (dim === 'DIM1') return t.theEnd;
    return dim;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="pixel-title">{t.appTitle}</h1>
        <div className="header-actions">
          <button onClick={handleImport}>{t.importFile}</button>
          <button onClick={handleSave} disabled={!data}>{t.saveFile}</button>
          <div className="backup-toggle">
            <input 
              type="checkbox" 
              id="backup-check" 
              checked={backupEnabled} 
              onChange={e => setBackupEnabled(e.target.checked)} 
            />
            <label htmlFor="backup-check">{t.backupEnabled}</label>
          </div>
          <button onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}>
            {lang === 'ja' ? 'English' : '日本語'}
          </button>
          <button onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={() => setShowAbout(true)}>ℹ️</button>
        </div>
      </header>
      
      <main className="app-main">
        {!data ? (
          <div className="welcome-screen">
            <p>{t.importFile}...</p>
            <button className="large-button" onClick={handleImport}>{t.importFile}</button>
          </div>
        ) : (
          <>
            <aside className="app-sidebar">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder={t.search} 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              {mods.map(mod => (
                <button 
                  key={mod} 
                  className={`mod-tab ${selectedMod === mod ? 'active' : ''}`}
                  onClick={() => setSelectedMod(mod)}
                >
                  {mod === 'minecraft' ? t.vanilla : mod}
                </button>
              ))}
            </aside>
            <section className="app-content">
              <table className="mobs-table">
                <thead>
                  <tr>
                    <th>Mob Name</th>
                    <th>{t.multiverseControl}</th>
                    <th>{t.dimensions}</th>
                    <th>{t.allSpawn}</th>
                    <th>{t.natural}</th>
                    <th>{t.custom}</th>
                    <th>{t.spawner}</th>
                    <th>{t.egg}</th>
                    <th>{t.breeding}</th>
                    <th>{t.ironGolem}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMobs.map(mob => {
                    const currentEntry = data.mobs.find(m => 
                      m.name === mob.name && 
                      m.world_name === (mob.multiverseControl ? mob.worlds[0] : mob.selectedDimension)
                    );
                    if (!currentEntry) return null;

                    return (
                      <tr key={mob.name}>
                        <td className="mob-name-cell">{mob.name}</td>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={mob.multiverseControl}
                            onChange={e => setMobUIState(prev => ({
                              ...prev,
                              [mob.name]: { ...prev[mob.name], multiverseControl: e.target.checked }
                            }))}
                          />
                        </td>
                        <td>
                          <select 
                            disabled={mob.multiverseControl}
                            value={mob.selectedDimension}
                            onChange={e => setMobUIState(prev => ({
                              ...prev,
                              [mob.name]: { ...prev[mob.name], selectedDimension: e.target.value }
                            }))}
                          >
                            {mob.worlds.map(w => (
                              <option key={w} value={w}>{getDimensionLabel(w)}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={currentEntry.all_spawn}
                            onChange={e => updateMobValue(mob.name, 'all_spawn', e.target.checked, mob.selectedDimension)}
                          />
                        </td>
                        <td>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.all_spawn}
                            checked={currentEntry.natural_spawn}
                            onChange={e => updateMobValue(mob.name, 'natural_spawn', e.target.checked, mob.selectedDimension)}
                          />
                        </td>
                        <td>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.all_spawn}
                            checked={currentEntry.custom_spawn}
                            onChange={e => updateMobValue(mob.name, 'custom_spawn', e.target.checked, mob.selectedDimension)}
                          />
                        </td>
                        <td>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.all_spawn}
                            checked={currentEntry.spawner_spawn}
                            onChange={e => updateMobValue(mob.name, 'spawner_spawn', e.target.checked, mob.selectedDimension)}
                          />
                        </td>
                        <td>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.all_spawn}
                            checked={currentEntry.egg_spawn}
                            onChange={e => updateMobValue(mob.name, 'egg_spawn', e.target.checked, mob.selectedDimension)}
                          />
                        </td>
                        <td>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.all_spawn}
                            checked={currentEntry.breeding_spawn}
                            onChange={e => updateMobValue(mob.name, 'breeding_spawn', e.target.checked, mob.selectedDimension)}
                          />
                        </td>
                        <td>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.all_spawn}
                            checked={currentEntry.iron_golem_spawn}
                            onChange={e => updateMobValue(mob.name, 'iron_golem_spawn', e.target.checked, mob.selectedDimension)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>

      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{t.aboutApp}</h2>
            <p>{t.disclaimer}</p>
            <button onClick={() => setShowAbout(false)}>Close</button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --glass-bg: rgba(255, 255, 255, 0.7);
          --glass-border: rgba(255, 255, 255, 0.3);
          --shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          --sidebar-width: 260px;
        }

        [data-theme='dark'] {
          --glass-bg: rgba(26, 26, 26, 0.8);
          --glass-border: rgba(255, 255, 255, 0.1);
          --shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--bg-color);
          overflow: hidden;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 30px;
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--glass-border);
          box-shadow: var(--shadow);
          z-index: 100;
        }

        .pixel-title {
          font-family: var(--font-title);
          font-size: 28px;
          background: linear-gradient(135deg, var(--accent-color), #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          letter-spacing: 1px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-actions button {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 8px;
          font-weight: 500;
        }

        .header-actions button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
        }

        .backup-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          background: var(--sidebar-bg);
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .app-main {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .welcome-screen {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: radial-gradient(circle at center, var(--sidebar-bg), var(--bg-color));
        }

        .large-button {
          padding: 16px 40px;
          font-size: 20px;
          background: linear-gradient(135deg, var(--accent-color), #4f46e5);
          color: white;
          border: none;
          border-radius: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .large-button:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 15px 30px rgba(79, 70, 229, 0.4);
        }

        .app-sidebar {
          width: var(--sidebar-width);
          background-color: var(--sidebar-bg);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          z-index: 10;
        }

        .search-box {
          padding: 20px;
        }

        .search-box input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          background: var(--bg-color);
          color: var(--text-color);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .search-box input:focus {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .mod-tab {
          padding: 14px 24px;
          margin: 2px 10px;
          border-radius: 10px;
          text-align: left;
          background: transparent;
          border: none;
          color: var(--text-color);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          opacity: 0.7;
        }

        .mod-tab:hover {
          background-color: rgba(0, 0, 0, 0.05);
          opacity: 1;
        }

        .mod-tab.active {
          background-color: var(--accent-color);
          color: white;
          opacity: 1;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .app-content {
          flex: 1;
          background: var(--bg-color);
          overflow: auto;
          position: relative;
        }

        .mobs-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .mobs-table th {
          position: sticky;
          top: 0;
          background: var(--glass-bg);
          backdrop-filter: blur(8px);
          padding: 16px 12px;
          text-align: left;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 1px;
          color: #888;
          border-bottom: 1px solid var(--border-color);
          z-index: 20;
        }

        .mobs-table td {
          padding: 14px 12px;
          border-bottom: 1px solid var(--border-color);
          transition: background-color 0.1s;
        }

        .mob-name-cell {
          font-weight: 600;
          font-size: 14px;
        }

        .mobs-table tr:hover td {
          background-color: rgba(59, 130, 246, 0.03);
        }

        /* Checkbox styling */
        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--accent-color);
        }

        select {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-color);
          color: var(--text-color);
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        select:focus {
          border-color: var(--accent-color);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }

        .modal-content {
          background: var(--bg-color);
          padding: 40px;
          border-radius: 24px;
          max-width: 500px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          border: 1px solid var(--glass-border);
          transform: translateY(0);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #888;
        }
      ` }} />
    </div>
  );
}
