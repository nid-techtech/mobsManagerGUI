import React, { useState, useEffect, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { translations, type Language } from '../i18n/translations';

interface MobEntry {
  '==': string;
  Name: string;
  WorldName: string;
  AllSpawn: boolean;
  NaturalSpawn: boolean;
  CustomSpawn: boolean;
  SpawnerSpawn: boolean;
  EggSpawn: boolean;
  BreedingSpawn: boolean;
  IronGolemSpawn: boolean;
}

interface MobsData {
  mobs: MobEntry[];
}

interface AggregatedMob {
  name: string;
  modId: string;
  multiverseControl: boolean;
  selectedDimension: string;
  worlds: string[];
}

function IndeterminateCheckbox({ 
  checked, 
  indeterminate, 
  onChange,
  disabled
}: { 
  checked: boolean, 
  indeterminate: boolean, 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  disabled?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input 
      type="checkbox" 
      ref={ref}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

function formatRichText(text: string) {
  if (!text) return '';
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function App() {
  const [vanillaMobs, setVanillaMobs] = useState<Set<string>>(new Set());
  const [multiWordMods, setMultiWordMods] = useState<string[]>([]);
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  useEffect(() => {
    // Load initial settings
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    const savedLang = localStorage.getItem('lang') as Language;
    if (savedLang) {
      setLang(savedLang);
    } else {
      const systemLang = navigator.language.startsWith('ja') ? 'ja' : 
                         navigator.language.startsWith('zh') ? 'zh' : 'en';
      setLang(systemLang);
    }

    // Listen for setting changes from other windows
    const unlistenTheme = listen<string>('theme-changed', (event) => {
      const newTheme = event.payload as 'light' | 'dark';
      setTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    });

    const unlistenLang = listen<string>('lang-changed', (event) => {
      setLang(event.payload as Language);
    });

    // Fallback: Listen for storage events (works across windows of the same origin)
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

    // Load resource lists
    const loadLists = async () => {
      try {
        const [vanillaText, multiWordText] = await invoke<[string, string]>('get_mod_lists');

        const parseList = (text: string) => {
          return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('- '))
            .map(line => line.substring(2).trim());
        };

        setVanillaMobs(new Set(parseList(vanillaText)));
        setMultiWordMods(parseList(multiWordText).sort((a, b) => b.length - a.length));
      } catch (e) {
        console.error('Failed to load resource lists:', e);
      }
    };
    loadLists();

    // Menu event listeners
    const unlistenImport = listen('import_mobs', () => handleImport());
    const unlistenBackup = listen('import_backup', () => handleImportBackup());
    const unlistenSave = listen('save', () => handleSave());
    const unlistenSaveAs = listen('save_as', () => handleSaveAs());
    const unlistenSearch = listen('search', () => searchInputRef.current?.focus());

    return () => {
      unlistenTheme.then(f => f());
      unlistenLang.then(f => f());
      unlistenImport.then(f => f());
      unlistenBackup.then(f => f());
      unlistenSave.then(f => f());
      unlistenSaveAs.then(f => f());
      unlistenSearch.then(f => f());
      window.removeEventListener('storage', handleStorage);
    };
  }, [data, filePath, backupEnabled]); // Add dependencies to keep handlers fresh in listeners

  const getModId = (mobName: string) => {
    if (vanillaMobs.has(mobName)) return 'minecraft';
    if (mobName.includes(':')) return mobName.split(':')[0];
    
    // Check multi-word mods
    for (const mod of multiWordMods) {
      if (mobName.startsWith(mod)) {
        if (mobName.length === mod.length || mobName[mod.length] === '_') {
          return mod;
        }
      }
    }

    if (mobName.includes('_')) return mobName.split('_')[0];
    return 'minecraft';
  };

  const processImportedData = (loadedData: MobsData, path: string) => {
    setData(loadedData);
    setFilePath(path);
    
    // Initialize UI state
    const initialUIState: any = {};
    loadedData.mobs.forEach(mob => {
      if (!initialUIState[mob.Name]) {
        initialUIState[mob.Name] = {
          multiverseControl: true, // Default to true as per common use case
          selectedDimension: mob.WorldName
        };
      }
    });
    setMobUIState(initialUIState);
  };

  const handleImport = async () => {
    try {
      console.log('Opening file dialog...');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }]
      });
      if (selected && typeof selected === 'string') {
        console.log('Selected file:', selected);
        const loadedData = await invoke<MobsData>('load_mobs_data', { path: selected });
        processImportedData(loadedData, selected);
      }
    } catch (error) {
      console.error('Failed to import file:', error);
      alert('Failed to import file: ' + error);
    }
  };

  const handleImportBackup = async () => {
    try {
      let defaultPath = undefined;
      if (filePath) {
        const parent = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : null;
        if (parent) {
          defaultPath = `${parent}/backups`;
        }
      }
      
      const selected = await open({
        multiple: false,
        filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }],
        defaultPath
      });
      if (selected && typeof selected === 'string') {
        const loadedData = await invoke<MobsData>('load_mobs_data', { path: selected });
        processImportedData(loadedData, selected);
      }
    } catch (error) {
      console.error('Failed to import backup:', error);
      alert('Failed to import backup: ' + error);
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

  const handleSaveAs = async () => {
    if (!data) return;
    try {
      const selected = await save({
        filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }],
        defaultPath: 'mobsData.yml'
      });
      if (selected) {
        await invoke('save_mobs_data', { path: selected, data, backup: backupEnabled });
        setFilePath(selected);
        alert('Saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save as:', error);
      alert('Failed to save as: ' + error);
    }
  };

  const mods = useMemo(() => {
    if (!data) return [];
    const modSet = new Set<string>();
    data.mobs.forEach(mob => {
      modSet.add(getModId(mob.Name));
    });
    return Array.from(modSet).sort((a, b) => {
      if (a === 'minecraft') return -1;
      if (b === 'minecraft') return 1;
      return a.localeCompare(b);
    });
  }, [data, vanillaMobs, multiWordMods]);

  const filteredMobs = useMemo(() => {
    if (!data) return [];
    const mobGroups: { [name: string]: AggregatedMob } = {};
    
    data.mobs.forEach(mob => {
      const modId = getModId(mob.Name);

      // If no search query, filter by selected mod
      if (!searchQuery && modId !== selectedMod) return;
      // If there is a search query, filter by name across all mods
      if (searchQuery && !mob.Name.toLowerCase().includes(searchQuery.toLowerCase())) return;

      if (!mobGroups[mob.Name]) {
        mobGroups[mob.Name] = {
          name: mob.Name,
          modId,
          multiverseControl: mobUIState[mob.Name]?.multiverseControl ?? true,
          selectedDimension: mobUIState[mob.Name]?.selectedDimension ?? mob.WorldName,
          worlds: []
        };
      }
      if (!mobGroups[mob.Name].worlds.includes(mob.WorldName)) {
        mobGroups[mob.Name].worlds.push(mob.WorldName);
      }
    });

    return Object.values(mobGroups).sort((a, b) => a.name.localeCompare(b.name));
  }, [data, selectedMod, searchQuery, mobUIState, vanillaMobs, multiWordMods]);

  const updateMobValue = (mobName: string, field: keyof MobEntry, value: any, worldName: string) => {
    if (!data) return;
    const isControl = mobUIState[mobName]?.multiverseControl;
    
    const newData = { ...data, mobs: data.mobs.map(mob => {
      if (mob.Name === mobName) {
        if (isControl || mob.WorldName === worldName) {
          const updatedMob = { ...mob, [field]: value };
          // If AllSpawn is toggled, update all other spawn reasons
          if (field === 'AllSpawn') {
            updatedMob.NaturalSpawn = value;
            updatedMob.CustomSpawn = value;
            updatedMob.SpawnerSpawn = value;
            updatedMob.EggSpawn = value;
            updatedMob.BreedingSpawn = value;
            updatedMob.IronGolemSpawn = value;
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
      <header className="app-header" data-tauri-drag-region>
        <h1 className="pixel-title">{t.appTitle}</h1>
        <div className="header-actions">
          <button type="button" className="action-btn" onClick={() => { console.log('Save clicked'); handleSave(); }} disabled={!data}>{t.saveFile}</button>
          <div className="search-box">
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder={t.search} 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>
      
      <main className="app-main">
        {!data ? (
          <div className="welcome-screen">
            <button type="button" className="large-button" onClick={() => { console.log('Large Import clicked'); handleImport(); }}>{t.importFile}</button>
            <p className="import-help">{formatRichText(t.importHelp)}</p>
          </div>
        ) : (
          <>
            <aside className="app-sidebar">
              <div className="mod-tabs-container">
                {mods.map(mod => (
                  <button 
                    key={mod} 
                    className={`mod-tab ${!searchQuery && selectedMod === mod ? 'active' : ''}`}
                    onClick={() => setSelectedMod(mod)}
                  >
                    {mod === 'minecraft' ? t.vanilla : mod}
                  </button>
                ))}
              </div>
            </aside>
            <section className="app-content">
              <table className="mobs-table">
                <thead>
                  <tr>
                    <th>{t.mobName}</th>
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
                      m.Name === mob.name && 
                      m.WorldName === (mob.multiverseControl ? mob.worlds[0] : mob.selectedDimension)
                    );
                    if (!currentEntry) return null;

                    return (
                      <tr key={mob.name}>
                        <td>
                          <div className="mob-name-cell">
                            {mob.name}
                            {searchQuery && (
                              <span className="mod-label-hint">
                                by [{mob.modId === 'minecraft' ? t.vanilla : mob.modId}]
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="group-separator">
                          <input 
                            type="checkbox" 
                            checked={mob.multiverseControl}
                            onChange={e => setMobUIState(prev => ({
                              ...prev,
                              [mob.name]: { ...prev[mob.name], multiverseControl: e.target.checked }
                            }))}
                          />
                        </td>
                        <td className={`sub-separator ${mob.multiverseControl ? 'disabled-cell' : ''}`}>
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
                        <td className="group-separator">
                          <IndeterminateCheckbox 
                            checked={currentEntry.AllSpawn}
                            indeterminate={currentEntry.AllSpawn && !(
                              currentEntry.NaturalSpawn &&
                              currentEntry.CustomSpawn &&
                              currentEntry.SpawnerSpawn &&
                              currentEntry.EggSpawn &&
                              currentEntry.BreedingSpawn &&
                              currentEntry.IronGolemSpawn
                            )}
                            onChange={e => updateMobValue(mob.name, 'AllSpawn', e.target.checked, currentEntry.WorldName)}
                          />
                        </td>
                        <td className={`sub-separator ${!currentEntry.AllSpawn ? 'disabled-cell' : ''}`}>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.AllSpawn}
                            checked={currentEntry.NaturalSpawn}
                            onChange={e => updateMobValue(mob.name, 'NaturalSpawn', e.target.checked, currentEntry.WorldName)}
                          />
                        </td>
                        <td className={!currentEntry.AllSpawn ? 'disabled-cell' : ''}>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.AllSpawn}
                            checked={currentEntry.CustomSpawn}
                            onChange={e => updateMobValue(mob.name, 'CustomSpawn', e.target.checked, currentEntry.WorldName)}
                          />
                        </td>
                        <td className={!currentEntry.AllSpawn ? 'disabled-cell' : ''}>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.AllSpawn}
                            checked={currentEntry.SpawnerSpawn}
                            onChange={e => updateMobValue(mob.name, 'SpawnerSpawn', e.target.checked, currentEntry.WorldName)}
                          />
                        </td>
                        <td className={!currentEntry.AllSpawn ? 'disabled-cell' : ''}>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.AllSpawn}
                            checked={currentEntry.EggSpawn}
                            onChange={e => updateMobValue(mob.name, 'EggSpawn', e.target.checked, currentEntry.WorldName)}
                          />
                        </td>
                        <td className={!currentEntry.AllSpawn ? 'disabled-cell' : ''}>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.AllSpawn}
                            checked={currentEntry.BreedingSpawn}
                            onChange={e => updateMobValue(mob.name, 'BreedingSpawn', e.target.checked, currentEntry.WorldName)}
                          />
                        </td>
                        <td className={!currentEntry.AllSpawn ? 'disabled-cell' : ''}>
                          <input 
                            type="checkbox" 
                            disabled={!currentEntry.AllSpawn}
                            checked={currentEntry.IronGolemSpawn}
                            onChange={e => updateMobValue(mob.name, 'IronGolemSpawn', e.target.checked, currentEntry.WorldName)}
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
          --locked-bg: rgba(243, 244, 246, 0.8);
          --zebra-bg: #f2f2f2;
        }

        [data-theme='dark'] {
          --glass-bg: rgba(30, 41, 59, 0.8);
          --glass-border: rgba(255, 255, 255, 0.1);
          --shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          --locked-bg: rgba(56, 56, 56, 0.8);
          --zebra-bg: #26344b;
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
          padding: 10px 30px 10px 80px;
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

        .header-actions .action-btn {
          padding: 8px 16px;
          border: 1px solid var(--border-color);
          background: var(--sidebar-bg);
          color: var(--text-color);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          font-family: var(--font-main);
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
        }

        .header-actions .action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          background: var(--bg-color);
          border-color: var(--accent-color);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
        }

        .header-actions .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        .import-help {
          margin-top: 24px;
          font-size: 14px;
          color: var(--text-color);
          opacity: 0.6;
          max-width: 80%;
          text-align: center;
          line-height: 1.6;
        }

        code {
          font-family: var(--font-code);
          background: rgba(0, 0, 0, 0.05);
          padding: 0 4px;
          border-radius: 4px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          font-size: 0.82em;
          color: var(--accent-color);
          vertical-align: baseline;
        }

        [data-theme='dark'] code {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .app-sidebar {
          width: var(--sidebar-width);
          background-color: var(--sidebar-bg);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          z-index: 10;
          overflow: hidden;
        }

        .search-box {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .mod-tabs-container {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding-bottom: 20px;
        }

        .search-box input {
          width: 200px;
          padding: 8px 14px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--sidebar-bg);
          color: var(--text-color);
          outline: none;
          font-size: 13px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .search-box input:focus {
          border-color: var(--accent-color);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
          width: 240px;
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
          flex-shrink: 0;
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
          table-layout: fixed;
        }

        .mobs-table th:nth-child(1) { width: 42%; }
        .mobs-table th:nth-child(2) { width: 8%; text-align: center; }
        .mobs-table th:nth-child(3) { width: 10%; text-align: center; }
        .mobs-table th:nth-child(4) { width: 8%; text-align: center; }
        .mobs-table th:nth-child(n+5) { width: 5.33%; text-align: center; }

        .mobs-table td:nth-child(2),
        .mobs-table td:nth-child(3),
        .mobs-table td:nth-child(4),
        .mobs-table td:nth-child(n+5) {
          text-align: center;
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
          box-sizing: border-box;
          white-space: normal;
          line-height: 1.2;
        }

        .mobs-table td {
          padding: 14px 12px;
          border-bottom: 1px solid var(--border-color);
          transition: background-color 0.1s;
          box-sizing: border-box;
        }

        .group-separator {
          border-left: 1px solid var(--border-color);
          border-left-color: rgba(128, 128, 128, 0.2);
        }

        .sub-separator {
          border-left: 1px solid var(--border-color);
          border-left-color: rgba(128, 128, 128, 0.08);
        }

        .disabled-cell {
          background-color: var(--locked-bg) !important;
        }

        .disabled-cell input,
        .disabled-cell select {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mob-name-cell {
          font-weight: 600;
          font-size: 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .mod-label-hint {
          font-size: 11px;
          font-weight: 400;
          opacity: 0.6;
          color: var(--accent-color);
        }

        .mobs-table tr:nth-child(even) td {
          background-color: var(--zebra-bg);
        }

        .mobs-table tr:hover td {
          background-color: rgba(59, 130, 246, 0.05);
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
