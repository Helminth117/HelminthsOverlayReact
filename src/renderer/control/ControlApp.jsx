import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import GameProfilesCard from './components/GameProfilesCard';
import ObjectivesManager from './components/ObjectivesManager';
import HistoryManager from './components/HistoryManager';
import LiveDashboard from './components/LiveDashboard';
import OverlaySettings from './components/OverlaySettings';
import PollsManager from './components/PollsManager';
import VideoReactionPlayer from './components/VideoReactionPlayer';
import EconomyManager from './components/EconomyManager';
import Sidebar from './components/Sidebar';
import styles from './ControlApp.module.css';


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

// Stable empty-state defaults to avoid re-creating objects on every render
const EMPTY_QUEUE = { current: null, queue: [] };
const EMPTY_CHAT = [];

export default function ControlApp() {
  const [activeTab, setActiveTab] = useState('live');

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
  
  // Poll State
  const [poll, setPoll] = useState({ question: '', duration: 60, options: ['Sí', 'No'] });
  const [isPollActive, setIsPollActive] = useState(false);

  // Objectives State
  const [notes, setNotes] = useState('');

  // Queue State
  const [queueData, setQueueData] = useState({ current: null, queue: [] });



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

  const saveConfig = useCallback((partialOrFn) => {
    setConfig(prev => {
      const partial = typeof partialOrFn === 'function' ? partialOrFn(prev) : partialOrFn;
      const newConfig = { ...prev, ...partial };
      if (configTimerRef.current) clearTimeout(configTimerRef.current);
      configTimerRef.current = setTimeout(() => {
        window.api.saveConfig(newConfig).catch(e => console.error('saveConfig error:', e));
      }, 200);
      return newConfig;
    });
    showSaved();
  }, []);

  const saveGameProfilesDebounced = useCallback((updateFnOrNewP) => {
    setGameProfiles(prev => {
      const next = typeof updateFnOrNewP === 'function' ? updateFnOrNewP(prev) : updateFnOrNewP;
      if (profilesTimerRef.current) clearTimeout(profilesTimerRef.current);
      profilesTimerRef.current = setTimeout(() => {
        window.api.saveGameProfiles(next);
      }, 500);
      return next;
    });
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
    addListener('queue-updated', (data) => {
      const current = data?.current;
      const queue = data?.queue || (Array.isArray(data) ? data : []);
      setQueueData({ current, queue });
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

  const WIDGET_LABELS = { frame: 'Marco Live', user: 'Nombre/Live', socials: 'Redes', stats: 'Stats TikTok', topevents: 'Top Eventos', objs: 'Objetivos', timers: 'Reloj', game: 'Juego', chips: 'Datos Juego', chat: 'Caja Chat', 'pinned-chat': 'Mensaje Fijado', visualizer: 'Visualizador', spotify: 'Spotify / Web', media: 'Música Local', lyrics: 'Letras', 'chat-avatars': 'Avatares Chat', combo: 'Combos de Likes', poll: 'Encuestas', webcam: 'Marco Webcam' };

  return (
    <div className={styles.appContainer}>
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Pane */}
      <div className={styles.contentArea}>
        {/* Header */}
        <header className="flex items-center justify-between mb-md">
          <h1 style={{ marginBottom: 0 }}>
            <div className={`${styles.statusDot} ${ttStatus.state === 'connected' ? styles.live : (ttStatus.state === 'waiting' ? styles.online : '')}`} id="conn-dot"></div>
            <span className="status-text-header" style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', background: 'none', WebkitTextFillColor: 'var(--text-primary)' }}>
              {ttStatus.state === 'connected' ? `LIVE: @${ttStatus.username}` : (ttStatus.state === 'waiting' ? `ESPERANDO LIVE: @${ttStatus.username}` : 'MODO SIN CONEXIÓN')}
            </span>
          </h1>
          <div className="flex items-center gap-sm">
            <span className={`${styles.saveInd} ${saveInd ? styles.show : ''}`} id="save-ind">Guardado</span>
            
            {tunnelStatus === 'connecting' && <span className="tunnel-status-text" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: '4px' }}>⏳ Creando enlace seguro...</span>}
            {tunnelStatus === 'online' && <span className="tunnel-status-text" style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>✓ Enlace Seguro Listo</span>}
            {tunnelStatus === 'error' && <span className="tunnel-status-text" style={{ fontSize: '11px', color: '#f59e0b', marginRight: '4px' }}>⚠ Enlace Local (Sin Internet)</span>}

            <button className="btn btn-ghost text-xs desktop-only" onClick={async () => {
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

        {config.moveMode && <div className={styles.moveAlert}>⚠ MODO MOVIMIENTO ACTIVO</div>}

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
        {/* LIVE DASHBOARD */}
        <LiveDashboard
          activeTab={activeTab}
          config={config}
          saveConfig={saveConfig}
          showSaved={showSaved}
          ttStatus={ttStatus}
          setTtStatus={setTtStatus}
          poll={poll}
          setPoll={setPoll}
          isPollActive={isPollActive}
          setIsPollActive={setIsPollActive}
          queueData={queueData}
          initialSession={session}
          setSession={setSession}
        />

        {/* ENCUESTAS TAB */}
        <PollsManager
          activeTab={activeTab}
          poll={poll}
          setPoll={setPoll}
          isPollActive={isPollActive}
          setIsPollActive={setIsPollActive}
        />

        {/* SETTINGS TAB */}
        <OverlaySettings
          activeTab={activeTab}
          config={config}
          saveConfig={saveConfig}
          showSaved={showSaved}
          audioDevices={audioDevices}
          refreshAudioDevices={refreshAudioDevices}
        />

        {/* VIDEOJUEGOS TAB */}
        <main className={`tab-view ${activeTab === 'juegos' ? 'active' : ''}`}>
          <GameProfilesCard
            config={config}
            saveConfig={saveConfig}
            gameProfiles={gameProfiles}
            saveGameProfilesDebounced={saveGameProfilesDebounced}
            showSaved={showSaved}
          />
        </main>

        {/* REACCIONES TAB */}
        <VideoReactionPlayer
          activeTab={activeTab}
        />

        {/* ECONOMÍA TAB */}
        <EconomyManager
          activeTab={activeTab}
          config={config}
          saveConfig={saveConfig}
          showSaved={showSaved}
        />

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
      </div>
    </div>
  );
}
