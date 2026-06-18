import React, { useEffect, useState } from 'react';
import { useOverlayStore } from '../store';
import { SVGS, getGameEmoji } from './constants';
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

// ── CONFETTI ──
let confetiFrame;
function launchConfeti() {
  const canvas = document.getElementById('confeti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const p = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: canvas.height + Math.random() * 100,
    r: Math.random() * 6 + 4,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    vx: Math.random() * 4 - 2,
    vy: -Math.random() * 10 - 10,
    gravity: 0.2
  }));
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    p.forEach(q => {
      q.x += q.vx;
      q.y += q.vy;
      q.vy += q.gravity;
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
      ctx.fill();
    });
    if (p.some(q => q.y < canvas.height + 50)) {
      confetiFrame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  if (confetiFrame) cancelAnimationFrame(confetiFrame);
  draw();
}

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

  useEffect(() => {
    if (!window.api) return;

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

    let hideToolbarTimeout;
    window.hideMiniToolbar = () => {
      const tb = document.getElementById('edit-minitoolbar');
      if (tb) tb.style.display = 'none';
      window.activeWidgetForMenu = null;
    };

    window.resetToolbarTimeout = () => {
      clearTimeout(hideToolbarTimeout);
      hideToolbarTimeout = setTimeout(window.hideMiniToolbar, 3500);
    };

    window.showMiniToolbar = (el) => {
      window.activeWidgetForMenu = el;
      const tb = document.getElementById('edit-minitoolbar');
      if (!tb) return;
      tb.style.display = 'flex';
      const rect = el.getBoundingClientRect();
      tb.style.top = Math.max(0, rect.top - 40) + 'px';
      tb.style.left = rect.left + 'px';
      window.resetToolbarTimeout();
    };

    const tb = document.getElementById('edit-minitoolbar');
    if (tb) {
      tb.onmouseenter = () => clearTimeout(hideToolbarTimeout);
      tb.onmouseleave = () => window.resetToolbarTimeout();
    }

    const btnFront = document.getElementById('btn-bring-front');
    const btnBack = document.getElementById('btn-send-back');
    const btnLock = document.getElementById('btn-lock-widget');
    const btnHide = document.getElementById('btn-hide-widget');

    if (btnFront) btnFront.onclick = (e) => {
      e.stopPropagation();
      const el = window.activeWidgetForMenu;
      if (el) {
        window.highestZ = (window.highestZ || 350) + 1;
        el.style.zIndex = window.highestZ;
        window.saveLayout();
      }
    };

    if (btnBack) btnBack.onclick = (e) => {
      e.stopPropagation();
      const el = window.activeWidgetForMenu;
      if (el) {
        window.lowestZ = (window.lowestZ || 10) - 1;
        el.style.zIndex = window.lowestZ;
        window.saveLayout();
      }
    };

    if (btnLock) btnLock.onclick = (e) => {
      e.stopPropagation();
      const el = window.activeWidgetForMenu;
      if (el) {
        const isLocked = el.classList.contains('locked-widget');
        if (isLocked) {
          el.classList.remove('locked-widget');
          btnLock.textContent = '🔓';
        } else {
          el.classList.add('locked-widget');
          btnLock.textContent = '🔒';
        }
      }
    };

    if (btnHide) btnHide.onclick = async (e) => {
      e.stopPropagation();
      const el = window.activeWidgetForMenu;
      if (el) {
        const id = el.id.replace('comp-', '');
        if (window.api) {
          const cfg = await window.api.getConfig();
          if (cfg) {
            if (!cfg.widgets) cfg.widgets = {};
            cfg.widgets[id] = false;
            await window.api.saveConfig({ widgets: cfg.widgets });
            setConfig(cfg);
          }
        }
        el.style.display = 'none';
        const tb = document.getElementById('edit-minitoolbar');
        if (tb) tb.style.display = 'none';
        window.activeWidgetForMenu = null;
      }
    };

    const handleDocumentMouseDown = (e) => {
      if (!e.target.closest('.drag-item') && !e.target.closest('#edit-minitoolbar')) {
        window.hideMiniToolbar();
      }
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);

    const handlers = {
      'config-updated': (cfg) => {
        if (cfg) setConfig(cfg);
      },
      'move-mode': (val) => {
        setIsMoving(val);
      },
      'timer-tick': (data) => {
        if (data) setTimer(data);
      },
      'item-completed': (data) => {
        if (!data) return;
        const flash = document.getElementById('flash-overlay');
        const flashText = document.getElementById('flash-text');
        if (flash && flashText) {
          if (data.itemName) {
            flashText.textContent = '✓ ' + data.itemName.toUpperCase();
          }
          flash.classList.add('show');
          launchConfeti();
          setTimeout(() => {
            flash.classList.remove('show');
          }, 3000);
        }
      }
    };

    const registeredHandlers = {};
    Object.entries(handlers).forEach(([ch, cb]) => {
      registeredHandlers[ch] = window.api.on(ch, cb);
    });

    return () => {
      Object.entries(registeredHandlers).forEach(([ch, handler]) => {
        if (handler) window.api.off(ch, handler);
      });
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      clearTimeout(hideToolbarTimeout);
      clearTimeout(_saveLayoutTimeout);
      if (confetiFrame) cancelAnimationFrame(confetiFrame);
    };
  }, []);

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
    if (config?.gameImage) {
      setBgFading(true);
      const img = new Image();
      img.onload = () => {
        setBgImage(config.gameImage);
        setBgFading(false);
      };
      img.onerror = () => {
        if (config.gameImage.includes('library_600x900')) {
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
      img.src = config.gameImage;
    } else {
      setBgFading(true);
      setTimeout(() => {
        setBgImage('');
        setBgFading(false);
      }, 600);
    }
  }, [config?.gameImage]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!document.body.classList.contains('edit-mode') || !window.activeWidgetForMenu) return;
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
      
      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp') dy = -1;
      else if (e.key === 'ArrowDown') dy = 1;
      else if (e.key === 'ArrowLeft') dx = -1;
      else if (e.key === 'ArrowRight') dx = 1;
      
      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        const el = window.activeWidgetForMenu;
        if (el.classList.contains('locked-widget')) return;
        
        let currentLeft = parseFloat(el.style.left) || 0;
        let currentTop = parseFloat(el.style.top) || 0;
        
        let newLeft = currentLeft + dx;
        let newTop = currentTop + dy;

        newLeft = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, newLeft));
        newTop = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, newTop));

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';

        const rect = el.getBoundingClientRect();
        const SNAP_DIST = 1;
        let guideElX = document.getElementById('smart-guide-x');
        let guideElY = document.getElementById('smart-guide-y');

        let targetsX = [ { pos: 0, line: 0 }, { pos: window.innerWidth - rect.width, line: window.innerWidth - 1 }, { pos: window.innerWidth/2 - rect.width/2, line: window.innerWidth/2 } ];
        let targetsY = [ { pos: 0, line: 0 }, { pos: window.innerHeight - rect.height, line: window.innerHeight - 1 }, { pos: window.innerHeight/2 - rect.height/2, line: window.innerHeight/2 } ];
        
        document.querySelectorAll('.drag-item').forEach(other => {
          if (other === el || window.getComputedStyle(other).display === 'none') return;
          const o = other.getBoundingClientRect();
          targetsX.push({ pos: o.left, line: o.left }, { pos: o.right, line: o.right }, { pos: o.left - rect.width, line: o.left }, { pos: o.right - rect.width, line: o.right }, { pos: o.left + o.width/2 - rect.width/2, line: o.left + o.width/2 });
          targetsY.push({ pos: o.top, line: o.top }, { pos: o.bottom, line: o.bottom }, { pos: o.top - rect.height, line: o.top }, { pos: o.bottom - rect.height, line: o.bottom }, { pos: o.top + o.height/2 - rect.height/2, line: o.top + o.height/2 });
        });

        let bestX = targetsX.find(t => Math.abs(t.pos - rect.left) <= SNAP_DIST);
        if (bestX) { if (guideElX) { guideElX.style.left = bestX.line + 'px'; guideElX.style.display = 'block'; } }
        else { if (guideElX) guideElX.style.display = 'none'; }
        
        let bestY = targetsY.find(t => Math.abs(t.pos - rect.top) <= SNAP_DIST);
        if (bestY) { if (guideElY) { guideElY.style.top = bestY.line + 'px'; guideElY.style.display = 'block'; } }
        else { if (guideElY) guideElY.style.display = 'none'; }

        clearTimeout(window._hideGuidesTimeout);
        window._hideGuidesTimeout = setTimeout(() => {
          if (guideElX) guideElX.style.display = 'none';
          if (guideElY) guideElY.style.display = 'none';
        }, 1000);

        const id = el.id;
        window.api.getConfig().then(cfg => {
          if (!cfg) return;
          if (!cfg.layout) cfg.layout = { modules: {} };
          if (!cfg.layout.modules) cfg.layout.modules = {};
          cfg.layout.modules[id] = { ...cfg.layout.modules[id], t: el.style.top, l: el.style.left };
          window.api.saveConfig();
        });
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Socials carousel
  useEffect(() => {
    if (config?.socialList?.length > 1) {
      const timer = setInterval(() => {
        setSocialIndex(prev => (prev + 1) % config.socialList.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [config?.socialList]);

  // Cinematic Border Dragging
  useEffect(() => {
    if (!isMoving) return;
    
    const setupBorder = (id, type) => {
      const el = document.getElementById(id);
      if (!el) return;
      const bgT = document.getElementById('bg-top'), bgB = document.getElementById('bg-bottom');
      const gbT = document.getElementById('game-bg-top'), gbB = document.getElementById('game-bg-bottom');
      const gbM = document.getElementById('game-bg-middle');
      
      const onMouseDown = (e) => {
        if (!document.body.classList.contains('edit-mode')) return;
        e.preventDefault(); e.stopPropagation();
        const move = ev => {
          let v = type === 'top' ? ev.clientY : window.innerHeight - ev.clientY;
          v = Math.max(20, Math.round(v / 1) * 1);
          el.style[type] = v + 'px';
          if (type === 'top') {
            if (bgT) bgT.style.height = v + 'px'; 
            if (gbT) gbT.style.height = v + 'px';
            if (gbM) gbM.style.top = v + 'px';
          } else {
            if (bgB) bgB.style.height = v + 'px'; 
            if (gbB) gbB.style.height = v + 'px';
            if (gbM) gbM.style.bottom = v + 'px';
          }
          if (window.syncCorners) window.syncCorners();
        };
        const stop = () => {
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', stop);
          
          window.api.getConfig().then(cfg => {
            if (!cfg) return;
            if (!cfg.layout) cfg.layout = { modules: {}, borders: {} };
            if (!cfg.layout.borders) cfg.layout.borders = {};
            cfg.layout.borders[type] = el.style[type];
            window.api.saveConfig();
          });
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', stop);
      };
      
      el.addEventListener('mousedown', onMouseDown);
      return () => el.removeEventListener('mousedown', onMouseDown);
    };
    
    const cleanTop = setupBorder('line-top', 'top');
    const cleanBottom = setupBorder('line-bottom', 'bottom');
    
    return () => {
      if (cleanTop) cleanTop();
      if (cleanBottom) cleanBottom();
    };
  }, [isMoving]);

  const frameThickness = config?.frameThickness || 0;

  return (
    <>
      <div id="comp-frame" className={`drag-item lockable-widget locked-widget ${!config?.widgets?.frame && config?.widgets?.frame !== undefined ? 'hidden' : ''}`} data-title="Marco del Stream" style={{ pointerEvents: isMoving ? 'auto' : 'none' }}>
        <div className="widget-content frame-content" style={{ borderWidth: `${frameThickness}px`, borderColor: 'var(--accent)' }}></div>
      </div>

      <div id="game-bg-wrap">
        <div id="game-bg-top">
          <img className={`bg-img-layer ${!bgFading && bgImage ? 'loaded' : 'fade-out'}`} id="bg-img-top" src={bgImage || undefined} alt="" />
          <div className="bg-vignette"></div>
          {config?.showSceneBg && <div id="mesh-gradient-bg-top" style={{ position: 'absolute', inset: '-20%', background: 'linear-gradient(45deg, rgba(10,10,15,1), rgba(var(--accent-rgb),0.2), rgba(10,10,15,1))', backgroundSize: '400% 400%', animation: 'meshGradient 15s ease infinite', zIndex: -2 }}></div>}
        </div>
        <div id="game-bg-middle"></div>
        <div id="game-bg-bottom">
          <img className={`bg-img-layer ${!bgFading && bgImage ? 'loaded' : 'fade-out'}`} id="bg-img-bottom" src={bgImage || undefined} alt="" />
          <div className="bg-vignette"></div>
          {config?.showSceneBg && <div id="mesh-gradient-bg-bottom" style={{ position: 'absolute', inset: '-20%', background: 'linear-gradient(45deg, rgba(10,10,15,1), rgba(var(--accent-rgb),0.2), rgba(10,10,15,1))', backgroundSize: '400% 400%', animation: 'meshGradient 15s ease infinite', zIndex: -2 }}></div>}
        </div>
      </div>

      <div id="bg-top" className="bg-panel"></div>
      <div id="bg-bottom" className="bg-panel"></div>
      <div className="border-line" id="line-top"></div>
      <div className="border-line" id="line-bottom"></div>
      <div className="border-corner" id="corner-tl"></div>
      <div className="border-corner" id="corner-tr"></div>
      <div className="border-corner" id="corner-bl"></div>
      <div className="border-corner" id="corner-br"></div>

      <div id="ambilight-frame" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, pointerEvents: 'none', boxSizing: 'border-box', opacity: 0, transition: 'opacity 0.3s ease, box-shadow 0.3s ease', border: '4px solid transparent' }}></div>

      <DraggableWidget id="comp-user" title="Perfil de Usuario" isGlass={config?.glassWidgets?.user !== false} defaultPos={{ t: '20px', l: '20px' }}>
        <UserProfile />
      </DraggableWidget>

      <DraggableWidget id="comp-socials" title="Redes Sociales" isGlass={config?.glassWidgets?.socials !== false} defaultPos={{ t: '80px', l: '20px' }}>
        <div id="social-stack" className="social-row">
          {config?.social?.filter(s => s.visible && s.handle).map((s, idx) => {
            const iconKey = s.icon || s.id;
            return (
              <div key={idx} className="social-pill">
                <span dangerouslySetInnerHTML={{ __html: SVGS[iconKey] || '' }} />
                <b>{s.handle}</b>
              </div>
            );
          })}
        </div>
      </DraggableWidget>



      {config?.game?.filter(c => c.visible !== false).map((c, i) => (
        <DraggableWidget key={c.id} id={`comp-chip-${c.id}`} title={c.label} isGlass={config?.glassWidgets?.chips !== false} className="dynamic-chip" style={{ display: config?.widgets?.chips !== false ? 'flex' : 'none', top: `${250 + i * 45}px`, left: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', padding: '0 4px', whiteSpace: 'nowrap' }}>
            <span>{getGameEmoji(c.id, c.icon, config?.gameName)}</span>{c.label}: <b>{c.value}</b>
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

      <AlertManager />
      <AudioManager />
      
      <SceneManager />
      
      <canvas id="confeti-canvas"></canvas>

      {/* React handles alerts now */}
      <div className="flash-overlay" id="flash-overlay"><div className="flash-text" id="flash-text">✓ COMPLETADO</div></div>
      <div className="toast" id="toast">Notificación</div>

      {/* Edit Mode Mini Toolbar */}
      <div id="edit-minitoolbar" className="glass" style={{ display: 'none', position: 'absolute', zIndex: 10001, flexDirection: 'row', gap: '5px', padding: '5px', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
        <button id="btn-bring-front" className="btn" title="Traer al Frente" style={{ padding: '4px 8px', fontSize: '14px', background: 'transparent' }}>⬆️</button>
        <button id="btn-send-back" className="btn" title="Enviar al Fondo" style={{ padding: '4px 8px', fontSize: '14px', background: 'transparent' }}>⬇️</button>
        <button id="btn-lock-widget" className="btn" title="Bloquear Movimiento" style={{ padding: '4px 8px', fontSize: '14px', background: 'transparent' }}>🔓</button>
        <button id="btn-hide-widget" className="btn" title="Ocultar Widget" style={{ padding: '4px 8px', fontSize: '14px', background: 'transparent' }}>👁️</button>
      </div>

      {/* Smart Guides */}
      <div id="smart-guide-x" style={{ display: 'none', position: 'fixed', top: 0, bottom: 0, width: '1px', background: '#ffba50', zIndex: 9999, pointerEvents: 'none', boxShadow: '0 0 6px #ffba50' }}></div>
      <div id="smart-guide-y" style={{ display: 'none', position: 'fixed', left: 0, right: 0, height: '1px', background: '#ffba50', zIndex: 9999, pointerEvents: 'none', boxShadow: '0 0 6px #ffba50' }}></div>
    </>
  );
}
