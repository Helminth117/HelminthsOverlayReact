import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameProfilesCard from './components/GameProfilesCard';
import TikTokManager from './components/TikTokManager';
import ObjectivesManager from './components/ObjectivesManager';
import AlertsTimerManager from './components/AlertsTimerManager';
import GeneralSettingsManager from './components/GeneralSettingsManager';
import AppearanceSettingsManager from './components/AppearanceSettingsManager';
import HistoryManager from './components/HistoryManager';

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

const copyToClipboard = async (text) => {
  try {
    if (window.api && typeof window.api.writeClipboard === 'function') {
      window.api.writeClipboard(text);
      return true;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn("Fallback to execCommand copy due to error:", e);
  }
  const input = document.createElement('textarea');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  return true;
};

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
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [tunnelStatus, setTunnelStatus] = useState('connecting'); // 'connecting' | 'online' | 'error'
  
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

  // Objectives State
  const [notes, setNotes] = useState('');

  // Queue State
  const [queueData, setQueueData] = useState({ current: null, queue: [] });

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
    
    // Fetch initial tunnel info
    try {
      const info = await window.api.getRemoteInfo();
      if (info) {
        if (info.tunnelUrl) {
          setTunnelUrl(info.tunnelUrl);
          setTunnelStatus('online');
        } else {
          setTunnelStatus('connecting');
        }
      }
    } catch (e) {
      console.error("Error al obtener info remota inicial:", e);
    }
    
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

    addListener('tunnel-status', (data) => {
      if (data) {
        setTunnelStatus(data.status);
        if (data.status === 'online' && data.url) {
          setTunnelUrl(data.url);
        } else if (data.status === 'error') {
          setTunnelUrl('');
        }
      }
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
  const WIDGET_LABELS = { frame: 'Marco Live', user: 'Nombre/Live', socials: 'Redes', stats: 'Stats TikTok', topevents: 'Top Eventos', objs: 'Objetivos', timers: 'Reloj', game: 'Juego', chips: 'Datos Juego', chat: 'Caja Chat', 'pinned-chat': 'Mensaje Fijado', visualizer: 'Visualizador', spotify: 'Spotify / Web', media: 'Música Local', lyrics: 'Letras', 'chat-avatars': 'Avatares Chat', combo: 'Combos de Likes' };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span className="brand-title">STREAM OVERLAY</span>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`sidebar-btn ${activeTab === 'overlay' ? 'active' : ''}`} onClick={() => setActiveTab('overlay')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1"></rect>
              <rect x="14" y="3" width="7" height="5" rx="1"></rect>
              <rect x="14" y="12" width="7" height="9" rx="1"></rect>
              <rect x="3" y="16" width="7" height="5" rx="1"></rect>
            </svg>
            Overlay
          </button>
          <button className={`sidebar-btn ${activeTab === 'objetivos' ? 'active' : ''}`} onClick={() => setActiveTab('objetivos')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
            Objetivos
          </button>
          <button className={`sidebar-btn ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Historial
          </button>
          <button className={`sidebar-btn ${activeTab === 'tiktok' ? 'active' : ''}`} onClick={() => setActiveTab('tiktok')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
            </svg>
            TikTok Live
          </button>
        </nav>
      </aside>

      {/* Main Content Pane */}
      <div className="content-area">
        {/* Header */}
        <header className="flex items-center justify-between mb-md">
          <h1 style={{ marginBottom: 0 }}>
            <div className={`status-dot ${ttStatus.state === 'connected' ? 'live' : (ttStatus.state === 'waiting' ? 'online' : '')}`} id="conn-dot"></div>
            <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', background: 'none', WebkitTextFillColor: 'var(--text-primary)' }}>
              {ttStatus.state === 'connected' ? `LIVE: @${ttStatus.username}` : (ttStatus.state === 'waiting' ? `ESPERANDO LIVE: @${ttStatus.username}` : 'MODO SIN CONEXIÓN')}
            </span>
          </h1>
          <div className="flex items-center gap-sm">
            <span className={`save-ind ${saveInd ? 'show' : ''}`} id="save-ind">Guardado</span>
            
            {tunnelStatus === 'connecting' && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: '4px' }}>⏳ Creando enlace seguro...</span>}
            {tunnelStatus === 'online' && <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>✓ Enlace Seguro Listo</span>}
            {tunnelStatus === 'error' && <span style={{ fontSize: '11px', color: '#f59e0b', marginRight: '4px' }}>⚠ Enlace Local (Sin Internet)</span>}

            <button className="btn btn-ghost text-xs" onClick={async () => {
              try {
                const info = await window.api.getRemoteInfo();
                if (info) {
                  let overlayUrl = '';
                  const activeUrl = info.tunnelUrl || tunnelUrl;
                  if (activeUrl) {
                    overlayUrl = `${activeUrl}/overlay.html?token=${info.token || ''}`;
                  } else if (info.url) {
                    const urlObj = new URL(info.url);
                    const hostname = urlObj.hostname;
                    if (hostname === 'localhost' || hostname === '127.0.0.1') {
                      urlObj.hostname = '127.0.0.1.nip.io';
                    } else if (/^[0-9.]+$/.test(hostname)) {
                      urlObj.hostname = `${hostname}.nip.io`;
                    }
                    overlayUrl = urlObj.toString().replace('/control.html', '/overlay.html');
                  }
                  
                  if (overlayUrl) {
                    await copyToClipboard(overlayUrl);
                    alert("¡Enlace del overlay copiado al portapapeles! Agrégalo en TikTok Studio como fuente de Enlace.");
                  } else {
                    alert("No se pudo obtener el enlace del overlay.");
                  }
                } else {
                  alert("No se pudo obtener el enlace del overlay.");
                }
              } catch (e) {
                console.error(e);
                alert("Error al copiar el enlace.");
              }
            }}>🔗 Copiar URL OBS/TikTok</button>
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

        {/* OVERLAY TAB */}
        <main className={`tab-view ${activeTab === 'overlay' ? 'active' : ''}`}>
          <nav className="sub-tabs">
            <button className={`sub-tab-btn ${activeSubTab === 'general' ? 'active' : ''}`} onClick={() => setActiveSubTab('general')}>General</button>
            <button className={`sub-tab-btn ${activeSubTab === 'apariencia' ? 'active' : ''}`} onClick={() => setActiveSubTab('apariencia')}>Apariencia</button>
            <button className={`sub-tab-btn ${activeSubTab === 'juegos' ? 'active' : ''}`} onClick={() => setActiveSubTab('juegos')}>Videojuegos</button>
            <button className={`sub-tab-btn ${activeSubTab === 'alertas' ? 'active' : ''}`} onClick={() => setActiveSubTab('alertas')}>Alertas & Reloj</button>
          </nav>

          <GeneralSettingsManager
            activeSubTab={activeSubTab}
            config={config}
            saveConfig={saveConfig}
            WIDGET_LABELS={WIDGET_LABELS}
          />

          <AppearanceSettingsManager
            activeSubTab={activeSubTab}
            config={config}
            saveConfig={saveConfig}
            audioDevices={audioDevices}
            refreshAudioDevices={refreshAudioDevices}
          />

          <GameProfilesCard
            activeSubTab={activeSubTab}
            gameProfiles={gameProfiles}
            saveGameProfilesDebounced={saveGameProfilesDebounced}
            config={config}
            saveConfig={saveConfig}
            showSaved={showSaved}
          />

          <AlertsTimerManager
            activeSubTab={activeSubTab}
            config={config}
            saveConfig={saveConfig}
            timerSeconds={timerSeconds}
            timerMode={timerMode}
            timerRunning={timerRunning}
            timerDoneMsg={timerDoneMsg}
            countdownInput={countdownInput}
            setCountdownInput={setCountdownInput}
            timerToggle={timerToggle}
            timerSwitchMode={timerSwitchMode}
            timerReset={timerReset}
            applyCountdown={applyCountdown}
          />
        </main>

        {/* OBJETIVOS TAB */}
        <ObjectivesManager
          activeTab={activeTab}
          session={session}
          setSession={setSession}
          notes={notes}
          setNotes={setNotes}
          plantillas={plantillas}
          setPlantillas={setPlantillas}
        />

        {/* HISTORIAL TAB */}
        <HistoryManager
          activeTab={activeTab}
          historial={historial}
          setHistorial={setHistorial}
          setSession={setSession}
          setActiveTab={setActiveTab}
          showSaved={showSaved}
        />

        {/* TIKTOK TAB */}
        <TikTokManager
          activeTab={activeTab}
          ttStatus={ttStatus}
          setTtStatus={setTtStatus}
          config={config}
          saveConfig={saveConfig}
          showSaved={showSaved}
          poll={poll}
          setPoll={setPoll}
          isPollActive={isPollActive}
          setIsPollActive={setIsPollActive}
          chatHistory={chatHistory}
          queueData={queueData}
        />
      </div>
    </div>
  );
}
