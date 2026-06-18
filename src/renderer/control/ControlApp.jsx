import React, { useState, useEffect, useCallback, useRef } from 'react';

const PRIO_ORDER = { alto: 0, medio: 1, bajo: 2, none: 3 };

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function uid() {
  return 'x' + Date.now() + Math.random().toString(36).substr(2, 9);
}

function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

export default function ControlApp() {
  const [activeTab, setActiveTab] = useState('overlay');
  const [activeSubTab, setActiveSubTab] = useState('general');

  // Config State
  const [config, setConfig] = useState({
    widgets: {},
    glassWidgets: {},
    textAlign: {},
    social: [],
    game: [],
    customSounds: {},
    activeScene: 'none'
  });
  
  // Session State
  const [session, setSession] = useState({ sections: [], done: [] });
  const [historial, setHistorial] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [gameProfiles, setGameProfiles] = useState([]);

  // Ephemeral State
  const [saveInd, setSaveInd] = useState(false);
  const [qrModal, setQrModal] = useState({ open: false, url: '' });
  const [audioDevices, setAudioDevices] = useState([]);
  const [ttStatus, setTtStatus] = useState({ state: 'disconnected', msg: 'Desconectado', username: '', stats: null });
  
  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerMode, setTimerMode] = useState('chrono');
  const [countdownTarget, setCountdownTarget] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDoneMsg, setTimerDoneMsg] = useState(false);
  const [countdownInput, setCountdownInput] = useState({ mins: '', secs: '' });
  
  // Poll State
  const [poll, setPoll] = useState({ question: '', duration: 60, options: ['Sí', 'No'] });
  const [isPollActive, setIsPollActive] = useState(false);

  // Objectives Input
  const [newObjective, setNewObjective] = useState({ name: '', cur: '', max: '', sub: '', prio: 'none', section: '' });
  const [newSection, setNewSection] = useState({ name: '', show: false });
  const [notes, setNotes] = useState('');
  const [plantillaName, setPlantillaName] = useState('');

  // Queue State
  const [queueData, setQueueData] = useState({ current: null, queue: [] });

  // Widget Options State
  const [widgetOptsOpen, setWidgetOptsOpen] = useState({});

  // Chat State
  const [chatHistory, setChatHistory] = useState([]);

  // Refs for stream-alert subathon logic
  const configRef = useRef(config);
  const timerModeRef = useRef(timerMode);
  const timerRunningRef = useRef(timerRunning);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { timerModeRef.current = timerMode; }, [timerMode]);
  useEffect(() => { timerRunningRef.current = timerRunning; }, [timerRunning]);

  // Debounced Save Notes
  const notesTimerRef = useRef(null);
  
  // Timer Interval
  const timerIntervalRef = useRef(null);

  const showSaved = () => {
    setSaveInd(true);
    setTimeout(() => setSaveInd(false), 1200);
  };

  const configTimerRef = useRef(null);
  const profilesTimerRef = useRef(null);

  const saveConfig = useCallback((partial) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...partial };
      if (configTimerRef.current) clearTimeout(configTimerRef.current);
      configTimerRef.current = setTimeout(() => {
        window.api.saveConfig(newConfig).catch(e => console.error('saveConfig error:', e));
      }, 200);
      return newConfig;
    });
    showSaved();
  }, []);

  const saveGameProfilesDebounced = useCallback((newP) => {
    setGameProfiles(newP);
    if (profilesTimerRef.current) clearTimeout(profilesTimerRef.current);
    profilesTimerRef.current = setTimeout(() => {
      window.api.saveGameProfiles(newP);
    }, 500);
  }, []);

  const refreshAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const filtered = [];
      audioInputs.forEach(device => {
        if (device.deviceId !== 'default' && device.deviceId !== 'communications') {
          filtered.push({ id: device.deviceId, label: device.label || `Micrófono ${filtered.length + 1}` });
        }
      });
      setAudioDevices(filtered);
    } catch (err) {
      console.error("Error al enumerar dispositivos de audio:", err);
    }
  };

  const loadInitialData = async () => {
    const [_config, _session, _hist, _plant, _profiles, _notes] = await Promise.all([
      window.api.getConfig(),
      window.api.getSession(),
      window.api.getHistorial(),
      window.api.getPlantillas(),
      window.api.getGameProfiles(),
      window.api.getNotes()
    ]);

    const cfg = _config || {};
    if (!cfg.social || cfg.social.length === 0) {
      cfg.social = [
        { id:'tiktok', icon:'tiktok', handle:'', visible:false },
        { id:'twitch', icon:'twitch', handle:'', visible:false },
        { id:'youtube', icon:'youtube', handle:'', visible:false },
        { id:'discord', icon:'discord', handle:'', visible:false }
      ];
    }
    cfg.social.forEach(s => { if(!s.uid) s.uid = s.id; if(!s.icon) s.icon = s.id; });
    if (!cfg.widgets) cfg.widgets = {};
    if (!cfg.glassWidgets) cfg.glassWidgets = {};
    if (!cfg.textAlign) cfg.textAlign = {};
    if (!cfg.game) cfg.game = [];

    setConfig(cfg);
    
    if (_session) {
      setSession(_session);
      if (_session.timerSeconds !== undefined) {
        setTimerSeconds(_session.timerSeconds);
        setTimerMode(_session.timerMode || 'chrono');
        setCountdownTarget(_session.countdownTarget || 0);
        window.api.timerTick({ seconds: _session.timerSeconds, mode: _session.timerMode || 'chrono', running: false });
      }
    }
    
    if (_hist) setHistorial(_hist);
    if (_plant && _plant.plantillas) setPlantillas(_plant.plantillas);
    if (_profiles) setGameProfiles(_profiles);
    if (_notes && _notes.notes) setNotes(_notes.notes);

    refreshAudioDevices();
    
    if (cfg.theme) {
      document.body.className = Array.from(document.body.classList).filter(c => !c.startsWith('theme-')).join(' ');
      document.body.classList.add(cfg.theme);
    }
    if (cfg.moveMode) {
      document.body.classList.add('move-active');
    } else {
      document.body.classList.remove('move-active');
    }
  };

  useEffect(() => {
    loadInitialData();

    const listeners = [];
    const addListener = (channel, cb) => {
      const handler = window.api.on(channel, cb);
      listeners.push({ channel, handler });
    };

    addListener('config-updated', (cfg) => {
      setConfig(prev => {
        const next = { ...prev, ...cfg };
        if (next.theme) {
          document.body.className = Array.from(document.body.classList).filter(c => !c.startsWith('theme-')).join(' ');
          document.body.classList.add(next.theme);
        }
        if (next.moveMode) document.body.classList.add('move-active');
        else document.body.classList.remove('move-active');
        return next;
      });
    });
    addListener('session-updated', (s) => setSession(s));
    addListener('tiktok-stats', (s) => {
      setTtStatus(prev => ({
        ...prev,
        stats: s,
        state: s.status,
        username: s.username,
        msg: s.status === 'connected' ? `✓ Conectado a @${s.username || ''}` : s.status === 'waiting' ? `⏳ Esperando live de @${s.username || ''}` : prev.msg
      }));
    });
    addListener('stream-alert', (data) => {
      if (!data) return;
      if (configRef.current.subathonMode && timerModeRef.current === 'countdown' && timerRunningRef.current) {
        let added = 0;
        if (data.type === 'follow') added = configRef.current.subathonFollow || 10;
        if (data.type === 'gift') added = (configRef.current.subathonGift || 30) * (data.count || 1);
        if (added > 0) {
          setTimerSeconds(ts => ts + added);
          setCountdownTarget(ct => ct + added);
        }
      }
    });
    addListener('queue-updated', (data) => {
      const current = data?.current;
      const queue = data?.queue || (Array.isArray(data) ? data : []);
      setQueueData({ current, queue });
    });
    addListener('tiktok-chat', (data) => {
      setChatHistory(prev => {
        const next = [...prev, data];
        if (next.length > 50) next.shift();
        return next;
      });
    });
    addListener('auto-toggle-social', (id) => {
      setConfig(prev => {
        const soc = [...prev.social];
        const idx = soc.findIndex(x => (x.uid || x.id) === id);
        if (idx > -1) {
          soc[idx] = { ...soc[idx], visible: !soc[idx].visible };
          window.api.saveConfig({ ...prev, social: soc });
        }
        return { ...prev, social: soc };
      });
    });

    return () => {
      listeners.forEach(({ channel, handler }) => {
        if (handler) window.api.off(channel, handler);
      });
    };
  }, []);

  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      setTimerSeconds(ts => {
        const next = timerMode === 'chrono' ? ts + 1 : Math.max(0, ts - 1);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timerMode]);

  // Timer Side-effects & Sync
  useEffect(() => {
    if (!timerRunning) return;

    // Check if countdown finished
    if (timerMode === 'countdown' && timerSeconds === 0) {
      setTimerRunning(false);
      setTimerDoneMsg(true);
      setTimeout(() => setTimerDoneMsg(false), 4000);
      window.api.emitTimer({ seconds: 0, mode: 'countdown', running: false });
      
      setSession(prevSession => {
        const newS = { ...prevSession, timerSeconds: 0, timerMode, countdownTarget };
        window.api.saveSession(newS);
        return newS;
      });
      return;
    }

    // Broadcast tick to overlay
    window.api.emitTimer({ seconds: timerSeconds, mode: timerMode, running: true });

    // Save session every 5 seconds
    if (timerSeconds % 5 === 0) {
      setSession(prevSession => {
        const newS = { ...prevSession, timerSeconds, timerMode, countdownTarget };
        window.api.saveSession(newS);
        return newS;
      });
    }
  }, [timerSeconds, timerRunning, timerMode, countdownTarget]);


  // Timer Actions
  const timerToggle = () => {
    const nextRunning = !timerRunning;
    setTimerRunning(nextRunning);
    window.api.emitTimer({ seconds: timerSeconds, mode: timerMode, running: nextRunning });
    
    setSession(prev => {
      const newS = { ...prev, timerSeconds, timerMode };
      window.api.saveSession(newS);
      return newS;
    });
  };

  const timerSwitchMode = () => {
    if (timerRunning) setTimerRunning(false);
    const newMode = timerMode === 'chrono' ? 'countdown' : 'chrono';
    const newSeconds = newMode === 'countdown' ? countdownTarget : 0;
    
    setTimerMode(newMode);
    setTimerSeconds(newSeconds);
    if (newMode === 'chrono') {
      setCountdownTarget(0);
    }
    
    window.api.emitTimer({ seconds: newSeconds, mode: newMode, running: false });
    
    setSession(prev => {
      const newS = { ...prev, timerSeconds: newSeconds, timerMode: newMode };
      window.api.saveSession(newS);
      return newS;
    });
  };

  const timerReset = () => {
    if (timerRunning) setTimerRunning(false);
    const newVal = timerMode === 'countdown' ? countdownTarget : 0;
    setTimerSeconds(newVal);
    window.api.emitTimer({ seconds: newVal, mode: timerMode, running: false });
    setSession(prev => {
      const newS = { ...prev, timerSeconds: newVal };
      window.api.saveSession(newS);
      return newS;
    });
  };

  const applyCountdown = () => {
    const mins = parseInt(countdownInput.mins) || 0;
    const secs = parseInt(countdownInput.secs) || 0;
    const target = mins * 60 + secs;
    setCountdownTarget(target);
    setTimerSeconds(target);
    window.api.emitTimer({ seconds: target, mode: timerMode, running: false });
    setSession(prev => {
      const newS = { ...prev, timerSeconds: target };
      window.api.saveSession(newS);
      return newS;
    });
  };

  // Rendering helpers
  const WIDGET_LABELS = { frame: 'Marco Live', user: 'Nombre/Live', socials: 'Redes', stats: 'Stats TikTok', topevents: 'Top Eventos', objs: 'Objetivos', timers: 'Reloj', game: 'Juego', chips: 'Datos Juego', chat: 'Caja Chat', 'pinned-chat': 'Mensaje Fijado', visualizer: 'Visualizador', spotify: 'Spotify / Web', media: 'Música Local', lyrics: 'Letras' };

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between mb-md">
        <h1 style={{ marginBottom: 0 }}>
          <div className={`status-dot ${ttStatus.state === 'connected' ? 'live' : (ttStatus.state === 'waiting' ? 'online' : '')}`} id="conn-dot"></div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8, marginRight: 8 }}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          Helminth's Overlay
        </h1>
        <div className="flex items-center gap-sm">
          <span className={`save-ind ${saveInd ? 'show' : ''}`} id="save-ind">Guardado</span>
          <button className="btn btn-ghost text-xs" onClick={async () => {
            const info = await window.api.getRemoteInfo();
            if (info && info.qrcodeDataUrl) setQrModal({ open: true, url: info.qrcodeDataUrl });
            else alert("Servidor remoto cargando o no disponible en modo móvil.");
          }}>📱 Remote</button>
        </div>
      </header>

      <div className="move-alert">⚠ MODO MOVIMIENTO ACTIVO</div>

      {qrModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card flex-col items-center" style={{ maxWidth: 300, textAlign: 'center' }}>
            <h3 className="mb-sm">Control Remoto</h3>
            <img src={qrModal.url} style={{ width: 200, height: 200, borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }} alt="QR" />
            <p className="text-xs text-secondary mb-md">Escanea para controlar desde tu celular. Asegúrate de estar en el mismo WiFi.</p>
            <button className="btn btn-ghost w-full" onClick={() => setQrModal({ open: false, url: '' })}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <nav className="tabs">
        <button className={`tab-btn ${activeTab === 'overlay' ? 'active' : ''}`} onClick={() => setActiveTab('overlay')}>Overlay</button>
        <button className={`tab-btn ${activeTab === 'objetivos' ? 'active' : ''}`} onClick={() => setActiveTab('objetivos')}>Objetivos</button>
        <button className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial</button>
        <button className={`tab-btn ${activeTab === 'tiktok' ? 'active' : ''}`} onClick={() => setActiveTab('tiktok')}>TikTok</button>
      </nav>

      {/* OVERLAY TAB */}
      <main className={`tab-view ${activeTab === 'overlay' ? 'active' : ''}`}>
        <nav className="sub-tabs">
          <button className={`sub-tab-btn ${activeSubTab === 'general' ? 'active' : ''}`} onClick={() => setActiveSubTab('general')}>General</button>
          <button className={`sub-tab-btn ${activeSubTab === 'juegos' ? 'active' : ''}`} onClick={() => setActiveSubTab('juegos')}>Videojuegos</button>
          <button className={`sub-tab-btn ${activeSubTab === 'alertas' ? 'active' : ''}`} onClick={() => setActiveSubTab('alertas')}>Alertas & Reloj</button>
        </nav>

        {activeSubTab === 'general' && (
          <section className="sub-view active">
            {/* Widget Visibility */}
            <div className="card highlight">
              <h2 className="flex items-center gap-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Visibilidad de Widgets
              </h2>
              <div className="flex-col gap-xs">
                {Object.keys(WIDGET_LABELS).map(id => {
                  const isOpen = widgetOptsOpen[id];
                  const wActive = config.widgets[id] !== false;
                  const gActive = config.glassWidgets[id] !== false;
                  const align = config.textAlign[id] || 'left';
                  return (
                    <div key={id} className="list-item flex-col" style={{ padding: 0 }}>
                      <div className="flex items-center justify-between" style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => setWidgetOptsOpen(p => ({ ...p, [id]: !p[id] }))}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{WIDGET_LABELS[id]}</span>
                        <div className="flex items-center gap-sm">
                          <button className="btn btn-ghost" title="Opciones" onClick={(e) => { e.stopPropagation(); setWidgetOptsOpen(p => ({ ...p, [id]: !p[id] })); }} style={{ padding: '4px 8px', fontSize: 11 }}>⚙️</button>
                          <button className={`toggle ${wActive ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); saveConfig({ widgets: { ...config.widgets, [id]: !wActive } }); }}></button>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 12px 12px 12px' }}>
                          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }} className="flex-col gap-sm">
                            <button className="btn btn-ghost w-full" onClick={() => {
                                const newLayout = { ...(config.layout || { modules: {} }) };
                                if (!newLayout.modules) newLayout.modules = {};
                                newLayout.modules['comp-' + id] = { l: '40vw', t: '40vh', w: '', h: '', z: '999' };
                                saveConfig({ layout: newLayout, widgets: { ...config.widgets, [id]: true } });
                            }} style={{ fontSize: 11 }}>⌖ Centrar en pantalla</button>
                            <div className="flex items-center justify-between mt-xs">
                              <div className="flex items-center gap-xs">
                                <span className="text-xs text-secondary">Fondo Glass</span>
                                <button className={`toggle ${gActive ? 'on' : ''}`} style={{ transform: 'scale(0.8)' }} onClick={() => saveConfig({ glassWidgets: { ...config.glassWidgets, [id]: !gActive } })}></button>
                              </div>
                              <div className="flex items-center gap-xs">
                                <span className="text-xs text-secondary">Alineación</span>
                                <div className="flex" style={{ background: 'var(--bg-input)', borderRadius: 4, padding: 2 }}>
                                  {['left', 'center', 'right'].map(a => (
                                    <button key={a} onClick={() => saveConfig({ textAlign: { ...config.textAlign, [id]: a } })} style={{ padding: '2px 8px', borderRadius: 3, border: 'none', background: align === a ? 'var(--accent)' : 'transparent', color: align === a ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }}>
                                      {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-md" style={{ paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-light)' }}>
                <span className="text-sm" style={{ fontWeight: 600 }}>Modo Movimiento (Editar Pantalla)</span>
                <button className={`toggle ${config.moveMode ? 'on' : ''}`} onClick={() => { window.api.setMoveMode(!config.moveMode); saveConfig({ moveMode: !config.moveMode }); }}></button>
              </div>
            </div>

            {/* Theme & HUD */}
            <div className="card">
              <h2 className="flex items-center gap-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                HUD y Diseño
              </h2>
              <div className="flex items-center justify-between mb-sm">
                <span className="text-sm text-secondary">Color Acento</span>
                <div className="flex items-center gap-sm">
                  <input type="color" value={config.accent || '#8b5cf6'} onChange={(e) => saveConfig({ accent: e.target.value })} style={{ width: 30, height: 30, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', padding: 0 }} />
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#10b981' })}>🟢</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#6366f1' })}>🔵</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#8b5cf6' })}>🟣</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#f59e0b' })}>🟡</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#ef4444' })}>🔴</button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-sm gap-md">
                <span className="text-sm text-secondary" style={{ minWidth: 90 }}>Transparencia</span>
                <input type="range" className="slider flex-1" min="0.1" max="1" step="0.05" value={config.opacity || 0.85} onChange={(e) => saveConfig({ opacity: parseFloat(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between mb-sm">
                <span className="text-sm">Fondo de escena</span>
                <button className={`toggle ${config.showSceneBg ? 'on' : ''}`} onClick={() => saveConfig({ showSceneBg: !config.showSceneBg })}></button>
              </div>
              <div className="flex items-center justify-between mb-sm">
                <span className="text-sm">Resplandor Neón (Glow)</span>
                <button className={`toggle ${config.neonGlow ? 'on' : ''}`} onClick={() => saveConfig({ neonGlow: !config.neonGlow })}></button>
              </div>
              <div className="flex items-center justify-between mb-sm gap-md">
                <span className="text-sm text-secondary" style={{ minWidth: 90 }}>Grosor Marco Live</span>
                <input type="range" className="slider flex-1" min="0" max="150" step="1" value={config.frameThickness ?? 4} onChange={(e) => saveConfig({ frameThickness: parseInt(e.target.value) })} />
              </div>
              <div className="flex-col gap-xs mt-sm">
                <label className="text-xs text-secondary">Tema del Overlay:</label>
                <select value={config.theme || 'theme-liquid-glass'} onChange={(e) => saveConfig({ theme: e.target.value })} className="inp">
                  <option value="theme-liquid-glass">Liquid Glass (Elegante y Cristalino)</option>
                  <option value="theme-liquid-glass-expanded">Liquid Glass Expanded (Refraction Style)</option>
                  <option value="theme-tokyo-night">Tokyo Night (Cyberpunk, Cuadrado)</option>
                  <option value="theme-clean-flat">Clean Flat (Minimalista, Profesional)</option>
                  <option value="theme-retro">Retro 8-Bit (Arcade Pixelado)</option>
                  <option value="theme-brutalist">Brutalist (Pesado, Táctico)</option>
                  <option value="theme-synthwave">Synthwave (Neón Retrowave)</option>
                  <option value="theme-obsidian">Obsidian Gold (Lujo Oscuro Premium)</option>
                  <option value="theme-holographic">Holographic (HUD Sci-Fi Avanzado)</option>
                </select>
              </div>
              <div className="flex-col gap-xs mt-sm">
                <label className="text-xs text-secondary">Fuente (Letra):</label>
                <select value={config.fontFamily || "'Inter', sans-serif"} onChange={(e) => saveConfig({ fontFamily: e.target.value })} className="inp">
                  <option value="'Inter', sans-serif">Inter (Moderno UI)</option>
                  <option value="'Rajdhani', sans-serif">Rajdhani (Gamer)</option>
                  <option value="'JetBrains Mono', monospace">JetBrains Mono (Código)</option>
                </select>
              </div>
              <div className="flex-col gap-xs mt-sm">
                <label className="text-xs text-secondary">Estilo Reproductor de Música:</label>
                <select value={config.musicWidgetStyle || 'music-style-glass'} onChange={(e) => saveConfig({ musicWidgetStyle: e.target.value })} className="inp">
                  <option value="music-style-glass">Tarjeta Premium (Glassmorphism)</option>
                  <option value="music-style-vinyl">Vinilo Giratorio (Dinámico)</option>
                  <option value="music-style-pill">Isla Dinámica (Píldora iOS)</option>
                </select>
              </div>
            </div>

            {/* Audio Config */}
            <div className="card">
              <h2 className="flex items-center gap-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                Configuración de Audio
              </h2>
              <div className="flex-col gap-xs mt-sm">
                <label className="text-xs text-secondary">Dispositivo de Audio (Visualizador):</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={config.audioDeviceId || 'desktop'} onChange={(e) => saveConfig({ audioDeviceId: e.target.value })} className="inp" style={{ flex: 1 }}>
                    <option value="desktop">Audio del Sistema (Mix Maestro)</option>
                    {audioDevices.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                  <button className="btn btn-ghost" onClick={refreshAudioDevices} title="Recargar Dispositivos">↻</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Si el visualizador se congela al cambiar de auriculares, selecciona tu dispositivo aquí en lugar del "Sistema".
                </div>
              </div>
            </div>

            {/* Scenes */}
            <div className="card highlight">
              <h2 className="flex items-center gap-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                Escenas Cinemáticas
              </h2>
              <div className="flex-col gap-sm">
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => saveConfig({ activeScene: 'starting' })}>▶ Empezando Stream</button>
                <button className="btn btn-ghost w-full" style={{ justifyContent: 'center', background: 'rgba(255, 204, 0, 0.2)', color: '#ffcc00' }} onClick={() => saveConfig({ activeScene: 'brb' })}>⏸ Ahorita Vuelvo</button>
                <button className="btn btn-ghost w-full" style={{ justifyContent: 'center', background: 'rgba(255, 50, 50, 0.2)', color: '#ff5555' }} onClick={() => saveConfig({ activeScene: 'ending' })}>⏹ Stream Finalizado</button>
                <button className="btn w-full" style={{ justifyContent: 'center', border: '1px solid var(--border-light)' }} onClick={() => saveConfig({ activeScene: 'none' })}>👁 Volver al Stream (En Vivo)</button>
              </div>
            </div>

            {/* Social */}
            <div className="card">
              <h2>Redes Sociales / Textos Libres</h2>
              <div className="flex-col gap-xs mb-sm">
                {config.social.map((s, i) => (
                  <div key={s.uid || s.id} className="list-item flex" style={{ alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                    <select className="inp" style={{ width: 110, fontSize: 11, padding: '4px 8px', height: 28 }} value={s.icon} onChange={(e) => {
                      const newSoc = [...config.social]; newSoc[i].icon = e.target.value; saveConfig({ social: newSoc });
                    }}>
                      <option value="tiktok">TikTok</option>
                      <option value="twitch">Twitch</option>
                      <option value="youtube">YouTube</option>
                      <option value="discord">Discord</option>
                      <option value="instagram">Instagram</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="facebook">Facebook</option>
                      <option value="globe">Personalizado</option>
                    </select>
                    <input className="inp flex-1" type="text" value={s.handle} placeholder="usuario / link..." style={{ fontSize: 12, height: 28, padding: '4px 8px' }} onChange={(e) => {
                      const newSoc = [...config.social]; newSoc[i].handle = e.target.value; saveConfig({ social: newSoc });
                    }} />
                    <button className={`toggle ${s.visible ? 'on' : ''}`} onClick={() => {
                      const newSoc = [...config.social]; newSoc[i].visible = !newSoc[i].visible; saveConfig({ social: newSoc });
                    }}></button>
                    <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12, height: 28 }} onClick={() => {
                      saveConfig({ social: config.social.filter(x => x !== s) });
                    }}>×</button>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost w-full" onClick={() => saveConfig({ social: [...config.social, { uid: uid(), icon: 'globe', handle: '', visible: true }] })}>+ Añadir Red Social</button>
            </div>

            {/* Spotify */}
            <div className="card">
              <h2>🎵 Widget Web Externo (Spotify)</h2>
              <div className="flex gap-sm mb-sm">
                <input className="inp" type="text" value={config.spotifyUrl || ''} placeholder="URL del widget..." onChange={(e) => saveConfig({ spotifyUrl: e.target.value })} />
              </div>
              <div className="flex gap-sm">
                <input className="inp" type="number" value={config.spotifyW || 400} placeholder="Ancho" style={{ width: 80 }} onChange={(e) => saveConfig({ spotifyW: parseInt(e.target.value) || 400 })} />
                <input className="inp" type="number" value={config.spotifyH || 150} placeholder="Alto" style={{ width: 80 }} onChange={(e) => saveConfig({ spotifyH: parseInt(e.target.value) || 150 })} />
              </div>
            </div>
          </section>
        )}

        {activeSubTab === 'juegos' && (
          <section className="sub-view active">
            <div className="card highlight" style={{ borderColor: 'var(--success)' }}>
              <h2 style={{ color: 'var(--success)' }}>Autodetector de Juego</h2>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary">El overlay detectará si juegas LOL, Valorant, etc. y cambiará su color.</span>
                <button className={`toggle ${config.autoDetectGame !== false ? 'on' : ''}`} onClick={() => {
                  const val = config.autoDetectGame === false;
                  window.api.toggleAutoDetect(val);
                  saveConfig({ autoDetectGame: val });
                }}></button>
              </div>
            </div>

            <div className="card">
              <h2>🎮 Datos de Juego (Widget Principal)</h2>
              <div className="flex-col gap-sm mb-sm">
                <input className="inp" type="text" value={config.gameImage || ''} placeholder="https://... o ruta local" onChange={(e) => saveConfig({ gameImage: e.target.value })} />
                <input className="inp" type="text" value={config.gameName || ''} placeholder="Minecraft, Dota 2..." onChange={(e) => saveConfig({ gameName: e.target.value })} />
              </div>
              <div className="flex items-center gap-sm mt-sm">
                <span className="text-xs text-secondary">Tamaño (px):</span>
                <input type="range" className="slider flex-1" min="10" max="100" step="1" value={config.gameFontSize || 24} onChange={(e) => saveConfig({ gameFontSize: parseInt(e.target.value) })} />
                <input type="number" className="inp" style={{ width: 65 }} min="10" max="100" value={config.gameFontSize || 24} onChange={(e) => saveConfig({ gameFontSize: parseInt(e.target.value) })} />
              </div>
            </div>

            <div className="card">
              <h2>Perfiles de Juego</h2>
              <div className="flex-col gap-sm mb-sm">
                {gameProfiles.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <input className="inp" style={{ width: 70, fontSize: 11 }} value={p.process} placeholder="proceso" onChange={e => {
                      const newP = [...gameProfiles]; newP[i].process = e.target.value; saveGameProfilesDebounced(newP);
                    }} />
                    <input className="inp" style={{ flex: 1, fontSize: 11 }} value={p.name} placeholder="Nombre" onChange={e => {
                      const newP = [...gameProfiles]; newP[i].name = e.target.value; saveGameProfilesDebounced(newP);
                    }} />
                    <div style={{ flex: 1.2, display: 'flex', gap: 4 }}>
                      <input className="inp" style={{ width: '100%', fontSize: 10 }} value={p.imageUrl || ''} placeholder="Imagen (opc)" onChange={e => {
                        const newP = [...gameProfiles]; newP[i].imageUrl = e.target.value; saveGameProfilesDebounced(newP);
                      }} />
                      <button className="btn btn-success" style={{ padding: '2px 6px' }} title="Buscar en PC" onClick={async () => {
                        const r = await window.api.selectImage();
                        if (r) {
                          const newP = [...gameProfiles]; newP[i].imageUrl = r; saveGameProfilesDebounced(newP);
                        }
                      }}>🖼</button>
                    </div>
                    <input type="color" value={p.accent || '#1D9E75'} style={{ width: 28, height: 28, border: 'none', borderRadius: 5, cursor: 'pointer', padding: 0 }} onChange={e => {
                      const newP = [...gameProfiles]; newP[i].accent = e.target.value; saveGameProfilesDebounced(newP);
                    }} />
                    <button className={`toggle ${p.enabled ? 'on' : ''}`} onClick={() => {
                      const newP = [...gameProfiles]; newP[i].enabled = !newP[i].enabled; saveGameProfilesDebounced(newP);
                    }}></button>
                    <button className="btn btn-danger" style={{ padding: '2px 7px' }} onClick={() => {
                      const newP = gameProfiles.filter((_, idx) => idx !== i); saveGameProfilesDebounced(newP);
                    }}>🗑</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-sm">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                  const newP = [...gameProfiles, { process: '', name: 'Nuevo juego', accent: '#10b981', imageUrl: '', enabled: true }];
                  saveGameProfilesDebounced(newP);
                }}>+ Agregar Perfil</button>
                <button className="btn btn-primary" style={{ flex: 1, background: 'var(--accent)', color: 'white' }} onClick={async (e) => {
                  const btn = e.target;
                  const originalText = btn.innerText;
                  btn.innerText = "⏳ Escaneando...";
                  btn.disabled = true;
                  const scanned = await window.api.scanPcGames();
                  btn.innerText = originalText;
                  btn.disabled = false;
                  if (scanned && scanned.length > 0) {
                    let added = 0;
                    const newP = [...gameProfiles];
                    scanned.forEach(game => {
                      if (!newP.some(p => p.process === game.process || p.name === game.name)) {
                        newP.push(game);
                        added++;
                      }
                    });
                    if (added > 0) {
                      saveGameProfilesDebounced(newP);
                      alert(`¡Se encontraron y agregaron ${added} juegos nuevos de Steam!`);
                    } else {
                      alert('Se escanearon los juegos pero todos ya estaban en la lista.');
                    }
                  } else {
                    alert('No se encontraron juegos de Steam (o Steam no está instalado).');
                  }
                }}>🔍 Escanear Steam</button>
              </div>
              <div className="flex gap-sm mt-sm">
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={async () => {
                  await window.api.forceGameDetect();
                  showSaved();
                }}>🕹️ Forzar Detección</button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => {
                  if (!window.confirm('¿Restaurar perfiles de juego a los valores por defecto?')) return;
                  const defProfiles = [
                    { process: 'javaw',      name: 'Minecraft',       accent: '#1D9E75', imageUrl: '', enabled: true },
                    { process: 'dota2',      name: 'Dota 2',           accent: '#c23b22', imageUrl: '', enabled: true },
                    { process: 're2',        name: 'Resident Evil 2',  accent: '#8b0000', imageUrl: '', enabled: true },
                    { process: 'MonsterHunterWorld', name: 'Monster Hunter', accent: '#e0a95c', imageUrl: '', enabled: true },
                    { process: 'StardewValley', name: 'Stardew Valley', accent: '#7ec850', imageUrl: '', enabled: true },
                  ];
                  saveGameProfilesDebounced(defProfiles);
                }}>🔄 Restaurar Defaults</button>
              </div>
            </div>

            <div className="card">
              <h2>Chips / Marcadores (Ej: IP, Server)</h2>
              <div className="flex-col gap-xs mb-sm">
                {config.game.map((chip, i) => (
                  <div key={chip.id || i} className="item-row" style={{ flexWrap: 'wrap', gap: 5, padding: '8px 0' }}>
                    <input className="inp" style={{ width: 32, textAlign: 'center', padding: 4 }} value={chip.icon || '🎮'} onChange={(e) => {
                      const newGame = [...config.game]; newGame[i].icon = e.target.value; saveConfig({ game: newGame });
                    }} />
                    <input className="inp" style={{ flex: 1, minWidth: 60 }} value={chip.label || ''} placeholder="Label (IP, Puerto...)" onChange={(e) => {
                      const newGame = [...config.game]; newGame[i].label = e.target.value; saveConfig({ game: newGame });
                    }} />
                    <input className="inp" style={{ flex: 1.4, minWidth: 80 }} value={chip.value || ''} placeholder="Valor" onChange={(e) => {
                      const newGame = [...config.game]; newGame[i].value = e.target.value; saveConfig({ game: newGame });
                    }} />
                    <button className={`toggle ${chip.visible ? 'on' : ''}`} title="Mostrar/ocultar" onClick={() => {
                      const newGame = [...config.game]; newGame[i].visible = !newGame[i].visible; saveConfig({ game: newGame });
                    }}></button>
                    <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => {
                      saveConfig({ game: config.game.filter((_, idx) => idx !== i) });
                    }}>×</button>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost w-full" onClick={() => saveConfig({ game: [...config.game, { id: uid(), icon: '🎮', label: '', value: '', visible: true }] })}>+ Añadir Dato</button>
            </div>
          </section>
        )}

        {activeSubTab === 'alertas' && (
          <section className="sub-view active">
            <div className="card">
              <h2>⏱ Temporizador</h2>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }}>{formatTime(timerSeconds)}</div>
              {timerDoneMsg && <div style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold', marginBottom: 'var(--space-sm)' }}>¡TIEMPO TERMINADO!</div>}
              
              <div className="flex gap-sm mt-md">
                <button className="btn btn-ghost flex-1" onClick={timerSwitchMode}>Modo: {timerMode === 'chrono' ? 'Crono' : 'Regresiva'}</button>
                <button className={`btn flex-1 ${timerRunning ? 'btn-danger' : 'btn-success'}`} onClick={timerToggle}>{timerRunning ? 'Pausar' : 'Iniciar'}</button>
                <button className="btn btn-danger" style={{ padding: 10 }} onClick={timerReset}>Reset</button>
              </div>

              {timerMode === 'countdown' && (
                <div className="flex gap-sm mt-sm">
                  <input className="inp" type="number" placeholder="min" min="0" value={countdownInput.mins} onChange={e => setCountdownInput({ ...countdownInput, mins: e.target.value })} />
                  <input className="inp" type="number" placeholder="seg" min="0" max="59" value={countdownInput.secs} onChange={e => setCountdownInput({ ...countdownInput, secs: e.target.value })} />
                  <button className="btn btn-primary" onClick={applyCountdown}>Fijar</button>
                </div>
              )}

              <div className="flex items-center justify-between mt-sm">
                <span className="text-sm">Modo Extensible (Subathon)</span>
                <button className={`toggle ${config.subathonMode ? 'on' : ''}`} onClick={() => saveConfig({ subathonMode: !config.subathonMode })}></button>
              </div>
              {config.subathonMode && (
                <div className="flex gap-sm mt-xs" style={{ background: 'var(--surface2)', padding: 10, borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                     <div className="text-xs text-secondary mb-xs">+ Seg por Follow</div>
                     <input type="number" className="inp" value={config.subathonFollow ?? 10} min="0" style={{ width: '100%' }} onChange={(e) => saveConfig({ subathonFollow: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div style={{ flex: 1 }}>
                     <div className="text-xs text-secondary mb-xs">+ Seg por Regalo</div>
                     <input type="number" className="inp" value={config.subathonGift ?? 30} min="0" style={{ width: '100%' }} onChange={(e) => saveConfig({ subathonGift: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h2>🔔 Ajustes de Alertas</h2>
              <div className="flex gap-sm mb-sm" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'follow', user: 'TestUser123', message: '¡@TestUser123 te siguió!' })}>🎉 Follow</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'gift', user: 'TestUser123', gift: 'Rosa', count: 5, message: '🎁 x5 Rosa' })}>🎁 Regalo</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'game', message: 'Valorant' })}>🎮 Juego</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'goal', message: '¡100 seguidores!' })}>🏆 Meta</button>
              </div>
              
              <div className="flex-col gap-xs mt-sm mb-sm" style={{ background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 8 }}>
                <h3 style={{ fontSize: 14, margin: '0 0 8px 0' }}>Sonidos Personalizados</h3>
                {['follow', 'gift', 'game', 'goal'].map(type => (
                  <div key={type} className="flex items-center justify-between mt-xs">
                    <span className="text-xs">{type === 'follow' ? '🎉 Follow' : type === 'gift' ? '🎁 Regalo' : type === 'game' ? '🎮 Juego' : '🏆 Meta'}</span>
                    <input type="file" accept="audio/*" className="inp text-xs" style={{ width: 160, padding: 2 }} onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        saveConfig({ customSounds: { ...config.customSounds, [type]: e.target.files[0].path } });
                      }
                    }} />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-sm mt-md">
                <span className="text-sm">Duración ({(config.alertDuration || 4000) / 1000}s)</span>
                <input type="range" className="slider" min="1" max="10" step="0.5" value={(config.alertDuration || 4000) / 1000} style={{ width: 150 }} onChange={(e) => saveConfig({ alertDuration: parseFloat(e.target.value) * 1000 })} />
              </div>
              <div className="flex items-center justify-between mb-sm">
                <span className="text-sm">Posición</span>
                <select className="inp" style={{ width: 'auto' }} value={config.alertPosition || 'bottom'} onChange={(e) => saveConfig({ alertPosition: e.target.value })}>
                  <option value="bottom">Abajo (Bottom)</option>
                  <option value="top">Arriba (Top)</option>
                  <option value="center">Centro (Center)</option>
                </select>
              </div>
              <div className="flex items-center justify-between mb-sm">
                <span className="text-sm">Sonido Activado</span>
                <button className={`toggle ${config.alertSounds !== false ? 'on' : ''}`} onClick={() => saveConfig({ alertSounds: config.alertSounds === false ? true : false })}></button>
              </div>
              <div className="flex items-center justify-between mb-sm">
                <span className="text-sm">Voz de IA (TTS) para Alertas</span>
                <button className={`toggle ${config.enableTTS ? 'on' : ''}`} onClick={() => saveConfig({ enableTTS: !config.enableTTS })}></button>
              </div>
              
              <div className="flex-col gap-xs mb-sm mt-md" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', padding: 12, borderRadius: 8 }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">💬 Prefijo para Chat TTS</span>
                  <div className="flex gap-xs items-center">
                    <input type="text" className="inp text-center font-bold" style={{ width: 50 }} maxLength="3" value={config.chatTtsPrefix || '.'} onChange={(e) => saveConfig({ chatTtsPrefix: e.target.value })} />
                    <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => {
                      const prefix = config.chatTtsPrefix || '.';
                      const customText = document.getElementById('custom-tts-test-input')?.value?.trim();
                      const msg = { user: 'TestUser', text: customText ? `${prefix}${customText}` : `${prefix}Hola, probando el TTS del chat!`, isFollower: true, isMod: false, isSub: false };
                      window.api.testChatTts(msg);
                    }}>Probar Voz</button>
                  </div>
                </div>
                <div className="flex gap-xs items-center mt-xs">
                  <input type="text" id="custom-tts-test-input" className="inp flex-1" placeholder="Ej. puta mierda (Prueba el filtro)" />
                </div>
                <span className="text-xs text-secondary">Los seguidores usarán este prefijo al inicio de sus mensajes para que la IA los lea (ej. <strong>.hola</strong>).</span>
              </div>

              <div className="flex-col gap-sm mb-md" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', padding: 12, borderRadius: 8 }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">🎵 Peticiones de Canciones (!play)</span>
                  <button className={`toggle ${config.enableSongRequests ? 'on' : ''}`} onClick={() => saveConfig({ enableSongRequests: !config.enableSongRequests })}></button>
                </div>
                <span className="text-xs text-secondary mb-xs">Permite que el chat pida música de YouTube con <strong>!play [canción]</strong>.</span>
                
                <div className="flex gap-xs items-center">
                  <input type="text" id="song-request-test-input" className="inp flex-1" placeholder="Ej. Rap God" defaultValue="Blinding Lights" />
                  <button className="btn btn-primary" style={{ padding: '8px 12px' }} onClick={() => {
                    if (!config.enableSongRequests) return alert("Activa la casilla primero para poder probarlo.");
                    const query = document.getElementById('song-request-test-input').value || 'blinding lights';
                    window.api.testChatTts({ user: 'Helminth', text: `!play ${query}`, isFollower: true, isMod: true, isSub: false });
                  }}>Probar Búsqueda</button>
                </div>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Cooldown por usuario (seg.):</span>
                  <input type="number" min="0" max="600" style={{ width: 70, background: 'var(--bg-input)', color: '#fff', border: '1px solid var(--border-light)', padding: 5, borderRadius: 4 }} value={config.songCooldown ?? 60} onChange={(e) => saveConfig({ songCooldown: parseInt(e.target.value) || 0 })} />
                </div>
                
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Duración máx. (minutos):</span>
                  <input type="number" min="1" max="120" style={{ width: 70, background: 'var(--bg-input)', color: '#fff', border: '1px solid var(--border-light)', padding: 5, borderRadius: 4 }} value={config.maxSongDuration ?? 25} onChange={(e) => saveConfig({ maxSongDuration: parseInt(e.target.value) || 25 })} />
                </div>

                <div className="flex gap-sm justify-center mt-xs" style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8 }}>
                  <button className="btn btn-ghost" title="Anterior" style={{ padding: '8px 16px' }} onClick={() => window.api.testChatTts({ user: 'Control', text: '!back', isMod: true })}>⏮️</button>
                  <button className="btn btn-ghost" title="Pausa" style={{ padding: '8px 16px' }} onClick={() => window.api.ytPause()}>⏸️</button>
                  <button className="btn btn-ghost" title="Play" style={{ padding: '8px 16px' }} onClick={() => window.api.ytResume()}>▶️</button>
                  <button className="btn btn-ghost" title="Stop" style={{ padding: '8px 16px' }} onClick={() => window.api.ytStop()}>⏹️</button>
                  <button className="btn btn-ghost" title="Siguiente" style={{ padding: '8px 16px' }} onClick={() => window.api.ytSkip()}>⏭️</button>
                </div>

                <div className="card mt-xs" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  <h4 style={{ margin: '8px 0' }}>Cola de Reproducción</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {!queueData.current && queueData.queue.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 10 }}>Cola vacía</div>
                    ) : (
                      <>
                        {queueData.current && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid var(--accent)', marginBottom: 4 }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold', minWidth: 24 }}>▶️</span>
                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{queueData.current.query || 'Desconocido'}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>@{queueData.current.user || '?'}</span>
                          </div>
                        )}
                        {queueData.queue.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderBottom: '1px solid var(--border-light)' }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold', minWidth: 24 }}>{idx + 1}.</span>
                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.query || 'Desconocido'}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>@{item.user || '?'}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <h3 className="mt-md mb-xs" style={{ fontSize: 14, color: 'var(--primary)' }}>Mezclador de Volumen</h3>
              <div className="flex items-center justify-between mb-xs">
                <span className="text-sm">Alertas ({Math.round((config.volAlerts ?? 1) * 100)}%)</span>
                <input type="range" className="slider" min="0" max="2" step="0.1" value={config.volAlerts ?? 1} style={{ width: 150 }} onChange={(e) => saveConfig({ volAlerts: parseFloat(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between mb-xs">
                <span className="text-sm">Soundboard ({Math.round((config.volSoundboard ?? 0.8) * 100)}%)</span>
                <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volSoundboard ?? 0.8} style={{ width: 150 }} onChange={(e) => saveConfig({ volSoundboard: parseFloat(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between mb-xs">
                <span className="text-sm">TTS/Voz ({Math.round((config.volTts ?? 1) * 100)}%)</span>
                <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volTts ?? 1} style={{ width: 150 }} onChange={(e) => saveConfig({ volTts: parseFloat(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between mb-xs">
                <span className="text-sm">Música (YouTube) ({Math.round((config.volMusic ?? 0.8) * 100)}%)</span>
                <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volMusic ?? 0.8} style={{ width: 150 }} onChange={(e) => saveConfig({ volMusic: parseFloat(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between mb-xs">
                <span className="text-sm">Sincro Letras (Offset: {(config.lyricsOffset ?? 0).toFixed(1)}s)</span>
                <input type="range" className="slider" min="-5" max="5" step="0.1" value={config.lyricsOffset ?? 0} style={{ width: 150 }} onChange={(e) => saveConfig({ lyricsOffset: parseFloat(e.target.value) })} />
              </div>
            </div>

            <div className="card">
              <h2>🤖 Bot del Chat (Overlay)</h2>
              <p className="text-sm text-secondary mb-xs">El bot responderá y enviará mensajes directamente en el chat visual de la pantalla.</p>
              <div className="flex items-center justify-between mb-sm">
                <span className="text-sm">Intervalo Automático (Minutos)</span>
                <input type="number" className="inp" style={{ width: 80 }} value={config.botInterval ?? 5} min="1" onChange={(e) => saveConfig({ botInterval: parseFloat(e.target.value) || 5 })} />
              </div>
              <div className="mb-sm">
                <span className="text-sm">Mensajes Automáticos (Uno por línea)</span>
                <textarea className="inp" rows="4" style={{ resize: 'vertical' }} value={config.botMessages ?? "¡Sígueme para más contenido!\n¡Comparte el directo!\n¡Pide canciones con !play!"} onChange={(e) => saveConfig({ botMessages: e.target.value })}></textarea>
              </div>
            </div>
            
            <div className="card">
              <h2>🎧 Panel de Sonidos (Soundboard)</h2>
              <div className="flex gap-sm mb-sm" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('applause')}>👏 Aplausos</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('laugh')}>😂 Risas</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('drumroll')}>🥁 Tambores</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('crickets')}>🦗 Grillos</button>
              </div>
              <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('bruh')}>🗿 Bruh</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('sad')}>🎻 Triste</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('wow')}>😲 Wow</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('fail')}>❌ Fail</button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* OBJETIVOS TAB */}
      <main className={`tab-view ${activeTab === 'objetivos' ? 'active' : ''}`}>
        <div className="card">
          <h2 className="flex items-center justify-between">NUEVA TAREA</h2>
          <div className="flex-col gap-sm">
            <input className="inp" type="text" placeholder="Nombre (Ej. Jugar 5 partidas)" value={newObjective.name} onChange={e => setNewObjective({ ...newObjective, name: e.target.value })} />
            <div className="flex gap-sm">
              <input className="inp text-center" type="number" placeholder="Actual" min="0" value={newObjective.cur} onChange={e => setNewObjective({ ...newObjective, cur: e.target.value })} />
              <input className="inp text-center" type="number" placeholder="Meta" min="0" value={newObjective.max} onChange={e => setNewObjective({ ...newObjective, max: e.target.value })} />
            </div>
            <div className="flex gap-sm">
              <input className="inp flex-1" type="text" placeholder="Subtítulo o descripción (opcional)" value={newObjective.sub} onChange={e => setNewObjective({ ...newObjective, sub: e.target.value })} />
              <select className="inp" style={{ width: 130 }} value={newObjective.prio} onChange={e => setNewObjective({ ...newObjective, prio: e.target.value })}>
                <option value="alto">Alto (Rojo)</option>
                <option value="medio">Medio (Naranja)</option>
                <option value="bajo">Bajo (Verde)</option>
                <option value="none">Ninguno (Gris)</option>
              </select>
            </div>
            <div className="flex gap-sm mt-sm">
              <select className="inp flex-1" value={newObjective.section} onChange={e => setNewObjective({ ...newObjective, section: e.target.value })}>
                {(session.sections || []).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <button className="btn btn-danger" title="Eliminar sección seleccionada" style={{ padding: '0 10px' }} onClick={() => {
                if (!newObjective.section) return;
                const sec = session.sections.find(s => s.id === newObjective.section);
                if (!sec) return;
                if (!window.confirm(`¿Estás seguro de eliminar la sección "${sec.label}" y TODOS sus objetivos?`)) return;
                const newS = { ...session, sections: session.sections.filter(s => s.id !== newObjective.section) };
                setSession(newS); window.api.saveSession(newS);
                if (newS.sections.length > 0) setNewObjective({ ...newObjective, section: newS.sections[0].id });
                else setNewObjective({ ...newObjective, section: '' });
              }}>🗑</button>
              <button className="btn btn-ghost" onClick={() => setNewSection({ ...newSection, show: !newSection.show })}>+ Sección</button>
            </div>
            {newSection.show && (
              <div className="flex gap-sm">
                <input className="inp flex-1" type="text" placeholder="Nombre de sección..." value={newSection.name} onChange={e => setNewSection({ ...newSection, name: e.target.value })} />
                <button className="btn btn-success" onClick={() => {
                  if (!newSection.name.trim()) return;
                  const newId = uid();
                  const newS = { ...session, sections: [...(session.sections || []), { id: newId, label: newSection.name.trim(), items: [] }] };
                  setSession(newS); window.api.saveSession(newS);
                  setNewSection({ name: '', show: false });
                  setNewObjective({ ...newObjective, section: newId });
                }}>Crear</button>
                <button className="btn btn-danger" onClick={() => setNewSection({ ...newSection, show: false })}>✕</button>
              </div>
            )}
            <button className="btn btn-primary mt-sm" onClick={() => {
              if (!newObjective.name.trim()) return;
              let secId = newObjective.section;
              if (!secId && session.sections && session.sections.length > 0) secId = session.sections[0].id;
              if (!secId) return;
              const newS = { ...session };
              const sec = newS.sections.find(s => s.id === secId);
              if (!sec) return;
              sec.items.push({ id: uid(), name: newObjective.name.trim(), cur: parseInt(newObjective.cur) || 0, max: parseInt(newObjective.max) || 0, sub: newObjective.sub.trim(), priority: newObjective.prio });
              setSession(newS); window.api.saveSession(newS);
              setNewObjective({ ...newObjective, name: '', cur: '', max: '', sub: '' });
            }}>Crear Objetivo</button>
          </div>
        </div>

        <div className="card">
          <h2 className="flex items-center justify-between">
            ACTIVOS
            <button className="btn btn-ghost text-xs" style={{ padding: '4px 8px' }} onClick={() => {
              if (!session.sections) return;
              if (!window.confirm('¿Seguro que quieres vaciar TODOS los objetivos actuales?')) return;
              const newS = { ...session, done: [] };
              newS.sections.forEach(s => s.items = []);
              setSession(newS); window.api.saveSession(newS);
            }}>Vaciar</button>
          </h2>
          <div className="flex-col gap-xs">
            {(session.sections || []).map(sec => {
              const pending = sec.items.filter(i => !(session.done || []).includes(i.id)).sort((a, b) => PRIO_ORDER[a.priority || 'none'] - PRIO_ORDER[b.priority || 'none']);
              if (!pending.length) return null;
              return (
                <React.Fragment key={sec.id}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '8px 0 4px' }}>{sec.label}</div>
                  {pending.map(item => {
                    const pct = item.max > 0 ? Math.round((item.cur / item.max) * 100) : 0;
                    const colors = { alto: '#f43f5e', medio: '#f59e0b', bajo: '#10b981', none: 'transparent' };
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: 8, marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors[item.priority || 'none'], flexShrink: 0 }}></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                          {item.max > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}><div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', background: 'var(--success)', width: pct + '%' }}></div></div><span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.cur}/{item.max}</span></div>}
                        </div>
                        <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => {
                          const newS = { ...session };
                          const sc = newS.sections.find(s => s.id === sec.id);
                          const it = sc.items.find(i => i.id === item.id);
                          it.cur = Math.max(0, Math.min(it.max || 9999, it.cur - 1));
                          setSession(newS); window.api.saveSession(newS);
                        }}>−</button>
                        <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => {
                          const newS = { ...session };
                          const sc = newS.sections.find(s => s.id === sec.id);
                          const it = sc.items.find(i => i.id === item.id);
                          it.cur = Math.max(0, Math.min(it.max || 9999, it.cur + 1));
                          if (it.max > 0 && it.cur >= it.max && !newS.done.includes(it.id)) {
                            newS.done.push(it.id);
                            window.api.itemCompleted({ itemId: it.id, itemName: it.name });
                          }
                          setSession(newS); window.api.saveSession(newS);
                        }}>+</button>
                        <button className="btn btn-success" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => {
                          const newS = { ...session };
                          if (!newS.done.includes(item.id)) {
                            newS.done.push(item.id);
                            window.api.itemCompleted({ itemId: item.id, itemName: item.name });
                          }
                          setSession(newS); window.api.saveSession(newS);
                        }}>✓</button>
                        <button className="btn btn-danger" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => {
                          const newS = { ...session };
                          const sc = newS.sections.find(s => s.id === sec.id);
                          sc.items = sc.items.filter(i => i.id !== item.id);
                          newS.done = newS.done.filter(id => id !== item.id);
                          setSession(newS); window.api.saveSession(newS);
                        }}>×</button>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2>COMPLETADOS</h2>
          <div className="flex-col gap-xs">
            {(() => {
              const doneItems = [];
              (session.sections || []).forEach(sec => sec.items.forEach(i => { if ((session.done || []).includes(i.id)) doneItems.push({ item: i, sec }); }));
              if (!doneItems.length) return <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: 4 }}>Ninguno aún.</div>;
              return doneItems.map(({ item }) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.12)', borderRadius: 7, marginBottom: 4, opacity: 0.7 }}>
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span style={{ flex: 1, fontSize: 12, textDecoration: 'line-through' }}>{item.name}</span>
                  <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 10 }} onClick={() => {
                    const newS = { ...session, done: session.done.filter(id => id !== item.id) };
                    setSession(newS); window.api.saveSession(newS);
                  }}>↩</button>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="card">
          <h2>📝 Notas para el Stream</h2>
          <textarea className="inp" rows="3" placeholder="Anota tus ideas aquí..." value={notes} onChange={e => {
            setNotes(e.target.value);
            if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
            notesTimerRef.current = setTimeout(() => window.api.saveNotes(e.target.value), 800);
          }}></textarea>
        </div>

        <div className="card">
          <h2>Plantillas</h2>
          <div className="flex-col gap-xs mb-sm">
            {plantillas.length === 0 ? <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No hay plantillas.</div> : plantillas.map((p, i) => {
              const total = p.sections.reduce((a, s) => a + s.items.length, 0);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ flex: 1, fontSize: 12 }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{total} obj</span>
                  <button className="btn btn-success" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => {
                    if (!window.confirm('¿Cargar esta plantilla?')) return;
                    const sections = JSON.parse(JSON.stringify(p.sections));
                    sections.forEach(s => { s.id = uid(); s.items.forEach(it => { it.id = uid(); it.cur = 0; }); });
                    const newS = { ...session, sections, done: [] };
                    setSession(newS); window.api.saveSession(newS);
                  }}>Cargar</button>
                  <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={async () => {
                    if (!window.confirm('¿Borrar?')) return;
                    const newP = [...plantillas];
                    newP.splice(i, 1);
                    setPlantillas(newP);
                    await window.api.savePlantillas({ plantillas: newP });
                  }}>×</button>
                </div>
              );
            })}
          </div>
          <div className="flex gap-sm mt-md">
            <input className="inp" type="text" placeholder="Guardar plantilla como..." value={plantillaName} onChange={e => setPlantillaName(e.target.value)} />
            <button className="btn btn-ghost" onClick={async () => {
              if (!plantillaName.trim()) return;
              const newP = [...plantillas, { name: plantillaName.trim(), sections: JSON.parse(JSON.stringify(session.sections)) }];
              setPlantillas(newP);
              await window.api.savePlantillas({ plantillas: newP });
              setPlantillaName('');
            }}>Guardar</button>
          </div>
        </div>
      </main>

      {/* HISTORIAL TAB */}
      <main className={`tab-view ${activeTab === 'historial' ? 'active' : ''}`}>
        <div className="flex items-center justify-between mb-md">
          <h2 style={{ margin: 0 }}>Registro de Sesiones</h2>
          <button className="btn btn-primary" onClick={async () => {
            if (!window.confirm('¿Cerrar sesión y guardar en el historial?')) return;
            await window.api.guardarSesion();
            const newS = await window.api.getSession();
            const newH = await window.api.getHistorial();
            setSession(newS); setHistorial(newH);
            showSaved();
            alert('✓ Sesión guardada.');
          }}>💾 Guardar Sesión Actual</button>
        </div>
        <div className="flex-col gap-sm">
          {historial.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>Sin sesiones guardadas.</div> : historial.map((entry, idx) => {
            const total = entry.sections.reduce((a, s) => a + s.items.length, 0);
            const done = entry.done?.length || 0;
            return (
              <div key={idx} className="hist-entry list-item" style={{ overflow: 'hidden' }}>
                <div className="hist-head list-item-header" onClick={(e) => {
                  if (e.target.tagName === 'BUTTON') return;
                  e.currentTarget.nextElementSibling.classList.toggle('open');
                }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{entry.fecha}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{entry.hora}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--success)' }}>✓{done}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/{total}</span>
                    <button className="btn btn-success" style={{ padding: '2px 8px', fontSize: 10 }} onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm('¿Continuar esta sesión?')) return;
                      await window.api.continuarSesion(idx);
                      const newS = await window.api.getSession();
                      setSession(newS);
                      setActiveTab('objetivos');
                    }}>▶</button>
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 10 }} onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm('¿Borrar esta sesión?')) return;
                      await window.api.deleteHistorial(idx);
                      const newH = await window.api.getHistorial();
                      setHistorial(newH);
                    }}>×</button>
                  </div>
                </div>
                <div className="hist-body list-item-body">
                  {entry.sections.map((s, i) => {
                    const pending = s.items.filter(it => !entry.done?.includes(it.id));
                    const doneItems = s.items.filter(it => entry.done?.includes(it.id));
                    return (
                      <div key={i}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '6px 0 3px' }}>{s.label}</div>
                        {doneItems.map(it => <div key={it.id} style={{ fontSize: 11, color: 'var(--success)', marginBottom: 2 }}>✓ {it.name}{it.max > 0 ? ` (${it.cur}/${it.max})` : ''}</div>)}
                        {pending.map(it => <div key={it.id} style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>○ {it.name}{it.max > 0 ? ` (${it.cur}/${it.max})` : ''}</div>)}
                      </div>
                    );
                  })}
                  {entry.notes && <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{entry.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* TIKTOK TAB */}
      <main className={`tab-view ${activeTab === 'tiktok' ? 'active' : ''}`}>
        <div className="card">
          <h2>Conectar al Live</h2>
          <div className="flex gap-sm">
            <input className="inp" type="text" placeholder="tu_usuario (sin @)" value={ttStatus.username} onChange={(e) => setTtStatus({ ...ttStatus, username: e.target.value })} />
            <button className="btn btn-primary" disabled={ttStatus.state === 'connecting'} onClick={async () => {
              const user = ttStatus.username.trim().replace('@', '');
              if (!user) return;
              setTtStatus(p => ({ ...p, state: 'connecting', msg: 'Conectando a @' + user + '...' }));
              try {
                const r = await window.api.tiktokConnect(user);
                if (r.waiting) setTtStatus(p => ({ ...p, state: 'waiting', msg: '⏳ Esperando que @' + user + ' inicie el live...' }));
                else if (!r.ok) setTtStatus(p => ({ ...p, state: 'error', msg: '❌ Error: ' + r.error }));
              } catch (e) {
                setTtStatus(p => ({ ...p, state: 'error', msg: '❌ Error: ' + e.message }));
              }
            }}>{ttStatus.state === 'connecting' ? 'Conectando...' : 'Conectar'}</button>
          </div>
          <div className="mt-sm flex items-center gap-sm" style={{ background: 'var(--bg-input)', padding: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: ttStatus.state !== 'disconnected' ? 'flex' : 'none' }}>
            <div className={`status-dot ${ttStatus.state === 'connected' ? 'live' : (ttStatus.state === 'waiting' ? 'online' : (ttStatus.state === 'error' ? 'error' : ''))}`} style={ttStatus.state === 'waiting' ? { background: '#e0a95c' } : (ttStatus.state === 'error' ? { background: '#e05c5c' } : {})}></div>
            <span className="text-sm text-secondary">{ttStatus.msg}</span>
          </div>
        </div>

        <div className="card">
          <h2>Meta de Seguidores</h2>
          <div className="flex gap-sm">
            <input className="inp" type="number" placeholder="Ej: 1000" min="1" value={config.followersGoal || ''} onChange={e => saveConfig({ followersGoal: parseInt(e.target.value) || 0 })} />
            <button className="btn btn-ghost" onClick={() => showSaved()}>Guardar</button>
          </div>
        </div>

        {ttStatus.stats && (
          <div className="card">
            <h2>Estadísticas en vivo</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
              {[
                { val: '+' + (ttStatus.stats.followers_gained || 0), lbl: 'Nuevos seguidores' },
                { val: ttStatus.stats.viewers || 0, lbl: 'Viewers' },
                { val: ttStatus.stats.likes || 0, lbl: 'Likes' },
                { val: ttStatus.stats.gifts || 0, lbl: 'Regalos' }
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-input)', padding: 10, borderRadius: 8, border: '1px solid var(--border-light)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.lbl}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost w-full mt-md" onClick={() => window.api.tiktokReset()}>Resetear stats</button>
          </div>
        )}

        <div className="card">
          <h2>🔥 Prueba de Combos (Simulador)</h2>
          <p className="text-sm text-secondary mb-sm">Simula recibir likes para probar el contador de combos en pantalla.</p>
          <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 1 })}>+1 Like</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 10 })}>+10 Likes</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 100 })}>+100 Likes</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 1000 })}>+1000 Likes</button>
          </div>
        </div>

        {/* Encuestas */}
        <div className="card">
          <h2>Encuesta Rápida (TikTok)</h2>
          <p className="text-sm text-secondary mb-sm">Los espectadores votan en el chat usando los números (1, 2, 3...).</p>
          <div className="flex-col gap-sm">
            <div>
              <label className="text-xs text-secondary font-bold uppercase block mb-xs">Pregunta</label>
              <input type="text" className="inp w-full" placeholder="Ej: ¿Qué juego transmitimos?" value={poll.question} onChange={e => setPoll({ ...poll, question: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-secondary font-bold uppercase block mb-xs">Duración (segundos)</label>
              <input type="number" className="inp w-full" value={poll.duration} min="0" onChange={e => setPoll({ ...poll, duration: parseInt(e.target.value) || 0 })} />
              <p className="text-xs text-secondary mt-xs">0 para votación manual (sin tiempo límite)</p>
            </div>
            <div>
              <label className="text-xs text-secondary font-bold uppercase block mb-xs">Opciones</label>
              <div className="flex-col gap-xs">
                {poll.options.map((opt, i) => (
                  <div key={i} className="flex gap-xs items-center poll-option-row">
                    <span className="text-primary font-bold">{i + 1}.</span>
                    <input type="text" className="inp flex-1 poll-opt-input" placeholder={`Opción ${i + 1}`} value={opt} onChange={e => {
                      const newOpts = [...poll.options]; newOpts[i] = e.target.value; setPoll({ ...poll, options: newOpts });
                    }} />
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost w-full mt-sm" onClick={() => {
                if (poll.options.length >= 6) return alert('Máximo 6 opciones recomendadas');
                setPoll({ ...poll, options: [...poll.options, ''] });
              }}>+ Añadir Opción</button>
            </div>
            <div className="flex gap-sm mt-sm">
              {!isPollActive ? (
                <button className="btn btn-primary flex-1" onClick={() => {
                  const validOpts = poll.options.map(o => o.trim()).filter(Boolean);
                  if (!poll.question.trim()) return alert('Escribe una pregunta.');
                  if (validOpts.length < 2) return alert('Necesitas al menos 2 opciones.');
                  setIsPollActive(true);
                  window.api.previewAlert({ type: 'start-poll', question: poll.question.trim(), options: validOpts, duration: poll.duration });
                }}>Iniciar Encuesta</button>
              ) : (
                <button className="btn btn-danger flex-1" onClick={() => {
                  setIsPollActive(false);
                  window.api.previewAlert({ type: 'stop-poll' });
                }}>Detener Encuesta</button>
              )}
            </div>
          </div>
        </div>

        {chatHistory.length > 0 && (
          <div className="card" id="tiktok-chat-card">
            <h2 className="mb-sm">Chat en vivo</h2>
            <div id="tt-chat-list" className="flex-col" style={{ maxHeight: 300, overflowY: 'auto' }}>
              {[...chatHistory].reverse().map((msg, idx) => (
                <div key={idx} className="flex items-center justify-between p-xs" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
                    {msg.isMod && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, padding: '2px 4px', borderRadius: 4, marginRight: 4 }}>MOD</span>}
                    {msg.isSub && <span style={{ background: '#8b5cf6', color: '#fff', fontSize: 10, padding: '2px 4px', borderRadius: 4, marginRight: 4 }}>SUB</span>}
                    <strong style={{ color: 'var(--text-main)' }}>{msg.user}:</strong>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{msg.text}</span>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => window.api.pinChatMessage(msg)}>📌 Pin</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
