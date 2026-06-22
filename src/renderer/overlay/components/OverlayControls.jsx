import React, { useEffect } from 'react';

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

export default function OverlayControls({
  isMoving,
  setConfig
}) {
  useEffect(() => {
    if (!window.api) return;

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
        if (window.saveLayout) window.saveLayout();
      }
    };

    if (btnBack) btnBack.onclick = (e) => {
      e.stopPropagation();
      const el = window.activeWidgetForMenu;
      if (el) {
        window.lowestZ = (window.lowestZ || 10) - 1;
        el.style.zIndex = window.lowestZ;
        if (window.saveLayout) window.saveLayout();
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
        const cfg = await window.api.getConfig();
        if (cfg) {
          const urlParams = new URLSearchParams(window.location.search);
          const isHorizontal = urlParams.get('type') === 'horizontal';
          const widgetsKey = isHorizontal ? 'widgetsHorizontal' : 'widgets';

          if (!cfg[widgetsKey]) cfg[widgetsKey] = {};
          cfg[widgetsKey][id] = false;
          await window.api.saveConfig({ [widgetsKey]: cfg[widgetsKey] });
          setConfig(cfg);
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

    const handler = window.api.on('item-completed', (data) => {
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
    });

    return () => {
      window.api.off('item-completed', handler);
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      clearTimeout(hideToolbarTimeout);
      if (confetiFrame) cancelAnimationFrame(confetiFrame);
    };
  }, [setConfig]);

  // Keydown nudging & smart guides
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!document.body.classList.contains('edit-mode') || !window.activeWidgetForMenu) return;
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      
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

  return (
    <>
      <canvas id="confeti-canvas"></canvas>

      {/* Completion Alerts */}
      <div className="flash-overlay" id="flash-overlay">
        <div className="flash-text" id="flash-text">✓ COMPLETADO</div>
      </div>
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
