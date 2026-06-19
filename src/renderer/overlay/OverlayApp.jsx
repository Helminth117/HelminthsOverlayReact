import React, { useEffect, useState } from 'react';
import { useOverlayStore } from '../store';
import { SVGS } from './constants';
import { Eye, Heart, Share2, LogIn, Crown, Trophy, Bot, Gamepad2, UserPlus, Gift, Bell, HelpCircle } from 'lucide-react';

const ChipIcon = ({ id, fallbackIcon }) => {
  const map = {
    view: Eye,
    viewers: Eye,
    like: Heart,
    likes: Heart,
    share: Share2,
    shares: Share2,
    join: LogIn,
    joins: LogIn,
    follow: UserPlus,
    follower: UserPlus,
    sub: Crown,
    subscription: Crown,
    gift: Gift,
    goal: Trophy,
    bot: Bot,
    game: Gamepad2,
    bell: Bell
  };
  const Icon = map[id];
  if (Icon) {
    return <Icon size={14} strokeWidth={2.2} style={{ color: 'var(--accent)' }} />;
  }
  return <span style={{ fontSize: '12px' }}>{fallbackIcon || '🎮'}</span>;
};
import { DraggableWidget } from './components/DraggableWidget';
import AlertManager from './components/AlertManager';
import ChatManager from './components/ChatManager';
import Visualizer from './components/Visualizer';
import AudioManager from './components/AudioManager';
import SceneManager from './components/SceneManager';
import PollDisplay from './components/PollDisplay';
import GoalsList from './components/GoalsList';
import TopEventsCarousel from './components/TopEventsCarousel';
import WinIsland from './components/WinIsland';
import ComboDisplay from './components/ComboDisplay';
import UserProfile from './components/UserProfile';
import StatsDisplay from './components/StatsDisplay';
import LyricsDisplay from './components/LyricsDisplay';
import TimerDisplay from './components/TimerDisplay';
import OverlayBackground from './components/OverlayBackground';
import OverlayControls from './components/OverlayControls';
import ChatAvatars from './components/ChatAvatars';
const getOverlayImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('local-file://')) {
    const filePath = url.replace('local-file://', '');
    if (window.location.protocol === 'file:') {
      return url;
    }
    const token = new URLSearchParams(window.location.search).get('token') || '';
    const apiBase = window.location.port === '5173' ? 'http://localhost:3030' : window.location.origin;
    return `${apiBase}/api/local-media?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;
  }
  return url;
};

export default function OverlayApp() {
  const { config, setConfig, setIsMoving, isMoving, setGameName, setTimer } = useOverlayStore();
  const [socials, setSocials] = useState([]);
  const [socialIndex, setSocialIndex] = useState(0);
  const [bgImage, setBgImage] = useState('');
  const [bgFading, setBgFading] = useState(false);
  const [activeWidget, setActiveWidget] = useState(null);

  useEffect(() => {
    window.isolateWidgetsAbs = () => {
      let changed = false;
      document.querySelectorAll('.drag-item').forEach(el => {
        const computed = window.getComputedStyle(el);
        if (computed.display === 'none') return;
        
        const rightStr = computed.right;
        const bottomStr = computed.bottom;
        const leftStr = computed.left;
        const topStr = computed.top;
        
        let newLeft = parseFloat(leftStr);
        let newTop = parseFloat(topStr);
        
        if (isNaN(newLeft) || leftStr === 'auto') {
          const r = parseFloat(rightStr) || 0;
          newLeft = window.innerWidth - r - el.offsetWidth;
        }
        if (isNaN(newTop) || topStr === 'auto') {
          const b = parseFloat(bottomStr) || 0;
          newTop = window.innerHeight - b - el.offsetHeight;
        }

        el.style.left = (isNaN(newLeft) ? 0 : newLeft) + 'px';
        el.style.top = (isNaN(newTop) ? 0 : newTop) + 'px';
        el.style.setProperty('right', 'auto', 'important');
        el.style.setProperty('bottom', 'auto', 'important');
        changed = true;
      });
    };

    window.syncCorners = () => {
      requestAnimationFrame(() => {
        const lt = document.getElementById('line-top');
        const lb = document.getElementById('line-bottom');
        if (!lt || !lb) return;
        const tR = lt.getBoundingClientRect();
        const bR = lb.getBoundingClientRect();
        const o = 5;
        [
          ['corner-tl', tR.top - o, tR.left - o],
          ['corner-tr', tR.top - o, tR.right - o],
          ['corner-bl', bR.top - o, bR.left - o],
          ['corner-br', bR.top - o, bR.right - o]
        ].forEach(([id, top, left]) => {
          const el = document.getElementById(id);
          if (el) {
            el.style.top = top + 'px';
            el.style.left = left + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
          }
        });
      });
    };
    
    window.addEventListener('resize', window.syncCorners);
    return () => window.removeEventListener('resize', window.syncCorners);
  }, []);

  const [apiReady, setApiReady] = useState(!!window.api);

  useEffect(() => {
    if (window.api) {
      setApiReady(true);
      return;
    }
    const handleReady = () => setApiReady(true);
    window.addEventListener('api-ready', handleReady);
    return () => window.removeEventListener('api-ready', handleReady);
  }, []);

  useEffect(() => {
    if (!apiReady) return;

    const fetchConfig = () => {
      window.api.getConfig().then(cfg => {
        if (cfg) setConfig(cfg);
      });
      window.api.getSession().then(session => {
        if (session && session.timerSeconds !== undefined) {
          setTimer({
            seconds: session.timerSeconds,
            mode: session.timerMode || 'chrono',
            running: false
          });
        }
      });
    };

    fetchConfig();
    window.addEventListener('api-connected', fetchConfig);

    let _saveLayoutTimeout;
    window.saveLayout = () => {
      clearTimeout(_saveLayoutTimeout);
      _saveLayoutTimeout = setTimeout(async () => {
        if (!window.api) return;
        const cfg = await window.api.getConfig();
        if (!cfg) return;
        
        const layout = cfg.layout || { modules: {}, borders: {} };
        if (!layout.modules) layout.modules = {};
        if (!layout.borders) layout.borders = {};
        
        document.querySelectorAll('.drag-item').forEach(el => {
          if (!el.id) return;
          const d = {
            w: el.style.width,
            h: el.style.height,
            z: el.style.zIndex || ''
          };
          
          const computed = window.getComputedStyle(el);
          const exactTop = parseFloat(computed.top);
          const exactLeft = parseFloat(computed.left);
          
          if (!isNaN(exactTop) && !isNaN(exactLeft)) {
            d.t = exactTop + 'px';
            d.l = exactLeft + 'px';
            
            el.style.left = d.l;
            el.style.setProperty('right', 'auto', 'important');
            el.style.top = d.t;
            el.style.setProperty('bottom', 'auto', 'important');
          } else if (layout.modules[el.id]) {
            const prev = layout.modules[el.id];
            if (prev.t !== undefined) d.t = prev.t;
            if (prev.l !== undefined) d.l = prev.l;
            if (prev.b !== undefined) d.b = prev.b;
            if (prev.r !== undefined) d.r = prev.r;
          }
          
          layout.modules[el.id] = d;
        });
        
        const lt = document.getElementById('line-top');
        const lb = document.getElementById('line-bottom');
        if (lt) layout.borders.top = lt.style.top;
        if (lb) layout.borders.bottom = lb.style.bottom;
        
        await window.api.saveConfig({ layout });
        setConfig({ ...cfg, layout });
      }, 500);
    };

    const handlers = {
      'config-updated': (cfg) => {
        if (cfg) setConfig(cfg);
      },
      'move-mode': (val) => {
        setIsMoving(val);
      },
      'timer-tick': (data) => {
        if (data) setTimer(data);
      }
    };

    const registeredHandlers = {};
    Object.entries(handlers).forEach(([ch, cb]) => {
      registeredHandlers[ch] = window.api.on(ch, cb);
    });

    return () => {
      window.removeEventListener('api-connected', fetchConfig);
      Object.entries(registeredHandlers).forEach(([ch, handler]) => {
        if (handler) window.api.off(ch, handler);
      });
      clearTimeout(_saveLayoutTimeout);
    };
  }, [apiReady]);

  // Theme logic
  useEffect(() => {
    if (config) {
      document.documentElement.style.setProperty('--accent', config.accent || '#1D9E75');
      if (config.accent) {
        const r = parseInt(config.accent.slice(1, 3), 16);
        const g = parseInt(config.accent.slice(3, 5), 16);
        const b = parseInt(config.accent.slice(5, 7), 16);
        document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
      }
      document.documentElement.style.setProperty('--panel-opacity', config.opacity || 0.85);
      document.documentElement.style.setProperty('--game-font-size', (config.gameFontSize || 24) + 'px');
      if (config.fontFamily) document.documentElement.style.setProperty('--font-ui', config.fontFamily);
      
      document.body.className = Array.from(document.body.classList).filter(c => !c.startsWith('theme-')).join(' ');
      document.body.classList.add(config.theme || 'theme-liquid-glass');

      if (config.moveMode !== undefined) {
        const wasEditMode = document.body.classList.contains('edit-mode');
        document.body.classList.toggle('edit-mode', !!config.moveMode);
        setIsMoving(!!config.moveMode);
        if (!wasEditMode && config.moveMode && window.isolateWidgetsAbs) {
          window.isolateWidgetsAbs();
        }
      }
      
      if (config.textAlign) {
        Object.keys(config.textAlign).forEach(id => {
          const el = document.getElementById(`comp-${id}`) || document.getElementById(id);
          if (el) {
            const align = config.textAlign[id] || 'left';
            el.style.textAlign = align;
            el.querySelectorAll('h1, h2, h3, p, div, span, .val, .obj-name, .section-lbl, .live-badge, .timer-box').forEach(child => {
              child.style.textAlign = align;
            });
          }
        });
      }

      if (config.layout && config.layout.borders) {
        const lt = config.layout.borders.top;
        const lb = config.layout.borders.bottom;
        if (lt) {
          const el = document.getElementById('line-top'); if (el) el.style.top = lt;
          const bgT = document.getElementById('bg-top'); if (bgT) bgT.style.height = lt;
          const gbT = document.getElementById('game-bg-top'); if (gbT) gbT.style.height = lt;
          const gbM = document.getElementById('game-bg-middle'); if (gbM) gbM.style.top = lt;
        }
        if (lb) {
          const el = document.getElementById('line-bottom'); if (el) el.style.bottom = lb;
          const bgB = document.getElementById('bg-bottom'); if (bgB) bgB.style.height = lb;
          const gbB = document.getElementById('game-bg-bottom'); if (gbB) gbB.style.height = lb;
          const gbM = document.getElementById('game-bg-middle'); if (gbM) gbM.style.bottom = lb;
        }
        if (window.syncCorners) window.syncCorners();
      }
    }
  }, [config]);

  useEffect(() => {
    const imageUrl = getOverlayImageUrl(config?.gameImage);
    if (imageUrl) {
      setBgFading(true);
      const img = new Image();
      img.onload = () => {
        setBgImage(imageUrl);
        setBgFading(false);
      };
      img.onerror = () => {
        // Fallback: If it's a local-file cache path that failed, retrieve the appId and try Steam CDN library art
        if (config.gameImage && config.gameImage.startsWith('local-file://')) {
          const match = config.gameImage.match(/(\d+)_(?:upscaled|2x)/);
          if (match) {
            const appId = match[1];
            const fallbackUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
            const altImg = new Image();
            altImg.onload = () => {
              setBgImage(fallbackUrl);
              setBgFading(false);
            };
            altImg.onerror = () => {
              setBgImage('');
              setBgFading(false);
            };
            altImg.src = fallbackUrl;
            return;
          }
        }

        if (config.gameImage && config.gameImage.includes('library_600x900')) {
          const altImg = new Image();
          const altUrl = config.gameImage.replace('library_600x900', 'header');
          altImg.onload = () => {
            setBgImage(altUrl);
            setBgFading(false);
          };
          altImg.src = altUrl;
        } else {
          setBgImage('');
          setBgFading(false);
        }
      };
      img.src = imageUrl;
    } else {
      setBgFading(true);
      setTimeout(() => {
        setBgImage('');
        setBgFading(false);
      }, 600);
    }
  }, [config?.gameImage]);



  // Socials carousel
  useEffect(() => {
    if (config?.socialList?.length > 1) {
      const timer = setInterval(() => {
        setSocialIndex(prev => (prev + 1) % config.socialList.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [config?.socialList]);



  const frameThickness = config?.frameThickness || 0;

  return (
    <>
      <div id="comp-frame" className={`drag-item lockable-widget locked-widget ${!config?.widgets?.frame && config?.widgets?.frame !== undefined ? 'hidden' : ''}`} data-title="Marco del Stream" style={{ pointerEvents: isMoving ? 'auto' : 'none' }}>
        <div className="widget-content frame-content" style={{ borderWidth: `${frameThickness}px`, borderColor: 'var(--accent)' }}></div>
      </div>

      <OverlayBackground
        isMoving={isMoving}
        config={config}
        bgImage={bgImage}
        bgFading={bgFading}
      />

      <div id="ambilight-frame" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, pointerEvents: 'none', boxSizing: 'border-box', opacity: 0, transition: 'opacity 0.3s ease, box-shadow 0.3s ease', border: '4px solid transparent' }}></div>

      <DraggableWidget id="comp-user" title="Perfil de Usuario" isGlass={config?.glassWidgets?.user !== false} defaultPos={{ t: '20px', l: '20px' }}>
        <UserProfile />
      </DraggableWidget>

      <DraggableWidget id="comp-socials" title="Redes Sociales" isGlass={config?.glassWidgets?.socials !== false} defaultPos={{ t: '80px', l: '20px' }}>
        <div id="social-stack" className="social-row">
          {config?.social?.filter(s => s.visible && s.handle).map((s, idx) => {
            const iconKey = (s.icon || s.id || '').toLowerCase();
            const svgContent = SVGS[iconKey] || SVGS[s.id?.toLowerCase()] || '';
            return (
              <div key={idx} className="social-pill">
                <span dangerouslySetInnerHTML={{ __html: svgContent }} />
                <b>{s.handle}</b>
              </div>
            );
          })}
        </div>
      </DraggableWidget>



      {config?.game?.filter(c => c.visible !== false).map((c, i) => (
        <DraggableWidget key={c.id} id={`comp-chip-${c.id}`} title={c.label} isGlass={config?.glassWidgets?.chips !== false} className="dynamic-chip" style={{ display: config?.widgets?.chips !== false ? 'flex' : 'none', top: `${250 + i * 45}px`, left: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', padding: '0 4px', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChipIcon id={c.id} fallbackIcon={c.icon} />
            </span>
            {c.label}: <b>{c.value}</b>
          </div>
        </DraggableWidget>
      ))}

      <DraggableWidget id="comp-topevents" title="Últimos Eventos" isGlass={config?.glassWidgets?.topevents !== false} style={{ overflow: 'hidden', width: '140px', height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <TopEventsCarousel />
      </DraggableWidget>

      <ComboDisplay />

      <DraggableWidget id="comp-stats" title="Estadísticas" isGlass={config?.glassWidgets?.stats !== false}>
        <StatsDisplay />
      </DraggableWidget>

      <DraggableWidget id="comp-objs" title="Objetivos" isGlass={config?.glassWidgets?.objs !== false}>
        <GoalsList />
      </DraggableWidget>

      <PollDisplay />

      <DraggableWidget id="comp-timers" title="Temporizador" isGlass={config?.glassWidgets?.timers !== false}>
        <div className="timer-box">
          <TimerDisplay />
        </div>
      </DraggableWidget>

      <DraggableWidget id="comp-game" title="Juego Actual" isGlass={config?.glassWidgets?.game !== false} className="text-right">
        <div className="val" id="game-name">{config?.gameName?.toUpperCase() || 'MINECRAFT'}</div>
      </DraggableWidget>

      <ChatManager />

      <DraggableWidget id="comp-visualizer" title="Visualizador de Audio" isGlass={false} noContainer={true} style={{ minWidth: '150px', minHeight: '50px', position: 'relative', overflow: 'visible' }}>
        <Visualizer />
      </DraggableWidget>

      <LyricsDisplay />

      <DraggableWidget id="comp-spotify" title="Spotify Iframe" isGlass={false} noContainer={true}>
        <div className="glass" style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <iframe id="spotify-frame" src={config?.spotifyUrl || 'about:blank'} sandbox="allow-scripts allow-same-origin" style={{ border: 'none', pointerEvents: 'none', width: `${config?.spotifyW || 400}px`, height: `${config?.spotifyH || 150}px` }}></iframe>
        </div>
      </DraggableWidget>

      <DraggableWidget id="comp-local-media" title="Música Local" isGlass={false} noContainer={true}>
        <WinIsland />
      </DraggableWidget>

      <ChatAvatars />

      <AlertManager />
      <AudioManager />
      
      <SceneManager />
      
      <OverlayControls
        isMoving={isMoving}
        setConfig={setConfig}
      />
    </>
  );
}
