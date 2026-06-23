import { useEffect, useState, useContext } from 'react';
import { useOverlayStore } from '../../store';
import { LayoutContext } from '../LayoutContext';

export function useDraggable(id, elRef, defaultPos) {
  const layoutCtx = useContext(LayoutContext) || {};
  const { saveLayout, isolateWidgetsAbs } = layoutCtx;

  const isMoving = useOverlayStore(state => state.isMoving);
  const config = useOverlayStore(state => state.config) || {};

  const urlParams = new URLSearchParams(window.location.search);
  const isHorizontal = urlParams.get('type') === 'horizontal';
  const layoutKey = isHorizontal ? 'layoutHorizontal' : 'layout';
  const widgetsKey = isHorizontal ? 'widgetsHorizontal' : 'widgets';

  const layout = config[layoutKey];
  const widgets = config[widgetsKey];
  const textAlign = config.textAlign;

  const [localPos, setLocalPos] = useState(null);

  // Sync position from config when not moving locally
  useEffect(() => {
    if (layout && layout.modules && layout.modules[id]) {
      setLocalPos(layout.modules[id]);
    }
  }, [layout, id]);

  const rawPos = localPos || defaultPos;
  const pos = { ...rawPos };

  if (id === 'comp-chat-avatars') {
    const topMargin = window.innerHeight * 0.2323;
    const bottomMargin = window.innerHeight * (1 - 0.2323);
    const widgetHeight = parseFloat(pos.h) || 110;
    const maxTop = topMargin - widgetHeight;
    const minBottom = bottomMargin;

    if (pos.t !== undefined) {
      let tVal = parseFloat(pos.t);
      if (tVal > maxTop && tVal < minBottom) {
        const middle = (maxTop + minBottom) / 2;
        tVal = tVal < middle ? maxTop : minBottom;
      }
      tVal = Math.max(0, Math.min(window.innerHeight - widgetHeight, tVal));
      pos.t = `${tVal}px`;
      delete pos.b;
    } else if (pos.b !== undefined) {
      let bVal = parseFloat(pos.b);
      let tVal = window.innerHeight - widgetHeight - bVal;
      if (tVal > maxTop && tVal < minBottom) {
        const middle = (maxTop + minBottom) / 2;
        tVal = tVal < middle ? maxTop : minBottom;
        pos.t = `${tVal}px`;
        delete pos.b;
      }
    }
  }
  let widgetKey = id.replace('comp-', '');
  if (widgetKey.startsWith('chip-')) {
    widgetKey = 'chips';
  }
  const isVis = widgets ? (widgets[widgetKey] !== false) : true;

  // Dragging event handlers
  useEffect(() => {
    if (!isMoving || !elRef.current) return;

    const el = elRef.current;
    let sX, sY, sT, sL;
    window.highestZ = window.highestZ || 100;

    const handleMouseDown = (e) => {
      if (e.target.closest('.resizer') || e.target.closest('#edit-minitoolbar')) return;
      
      if (el.classList.contains('locked-widget')) {
        if (window.showMiniToolbar) window.showMiniToolbar(el);
        const btnLock = document.getElementById('btn-lock-widget');
        if (btnLock) btnLock.textContent = '🔒';
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (isolateWidgetsAbs) isolateWidgetsAbs();

      window.highestZ = window.highestZ || 100;
      window.highestZ++;
      el.style.zIndex = window.highestZ;
      window.activeWidgetForMenu = el;
      
      if (window.showMiniToolbar) window.showMiniToolbar(el);
      const btnLock = document.getElementById('btn-lock-widget');
      if (btnLock) btnLock.textContent = '🔓';
      
      const comp = window.getComputedStyle(el);
      sT = parseFloat(comp.top) || 0;
      sL = parseFloat(comp.left) || 0;
      sX = e.clientX;
      sY = e.clientY;

      el.style.left = sL + 'px'; el.style.right = 'auto';
      el.style.top = sT + 'px'; el.style.bottom = 'auto';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
      let nT = sT + (e.clientY - sY);
      let nL = sL + (e.clientX - sX);
      
      const SNAP_DIST = 15;
      const rect = el.getBoundingClientRect();
      let guideElX = document.getElementById('smart-guide-x');
      let guideElY = document.getElementById('smart-guide-y');

      if (e.shiftKey) {
        if (guideElX) guideElX.style.display = 'none';
        if (guideElY) guideElY.style.display = 'none';
      } else {
        let targetsX = [ { pos: 0, line: 0 }, { pos: window.innerWidth - rect.width, line: window.innerWidth - 1 }, { pos: window.innerWidth/2 - rect.width/2, line: window.innerWidth/2 } ];
        let targetsY = [ { pos: 0, line: 0 }, { pos: window.innerHeight - rect.height, line: window.innerHeight - 1 }, { pos: window.innerHeight/2 - rect.height/2, line: window.innerHeight/2 } ];
        
        document.querySelectorAll('.drag-item').forEach(other => {
          if (other === el || window.getComputedStyle(other).display === 'none') return;
          const o = other.getBoundingClientRect();
          targetsX.push({ pos: o.left, line: o.left }, { pos: o.right, line: o.right }, { pos: o.left - rect.width, line: o.left }, { pos: o.right - rect.width, line: o.right }, { pos: o.left + o.width/2 - rect.width/2, line: o.left + o.width/2 });
          targetsY.push({ pos: o.top, line: o.top }, { pos: o.bottom, line: o.bottom }, { pos: o.top - rect.height, line: o.top }, { pos: o.bottom - rect.height, line: o.bottom }, { pos: o.top + o.height/2 - rect.height/2, line: o.top + o.height/2 });
        });

        let bestX = targetsX.find(t => Math.abs(t.pos - nL) < SNAP_DIST);
        if (bestX) { if (guideElX) { guideElX.style.left = bestX.line + 'px'; guideElX.style.display = 'block'; } nL = bestX.pos; }
        else { if (guideElX) guideElX.style.display = 'none'; }
        
        let bestY = targetsY.find(t => Math.abs(t.pos - nT) < SNAP_DIST);
        if (bestY) { if (guideElY) { guideElY.style.top = bestY.line + 'px'; guideElY.style.display = 'block'; } nT = bestY.pos; }
        else { if (guideElY) guideElY.style.display = 'none'; }
      }

      if (id === 'comp-chat-avatars') {
        const topMargin = window.innerHeight * 0.2323;
        const bottomMargin = window.innerHeight * (1 - 0.2323);
        const widgetHeight = rect.height || 110;
        const maxTop = topMargin - widgetHeight;
        const minBottom = bottomMargin;

        if (nT > maxTop && nT < minBottom) {
          const middle = (maxTop + minBottom) / 2;
          nT = nT < middle ? maxTop : minBottom;
        }
        nT = Math.max(0, Math.min(window.innerHeight - widgetHeight, nT));
      }

      el.style.top = `${nT}px`;
      el.style.left = `${nL}px`;
      el.style.bottom = 'auto';
      el.style.right = 'auto';

      if (window.showMiniToolbar) window.showMiniToolbar(el);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      let guideElX = document.getElementById('smart-guide-x');
      let guideElY = document.getElementById('smart-guide-y');
      if (guideElX) guideElX.style.display = 'none';
      if (guideElY) guideElY.style.display = 'none';

      const comp = window.getComputedStyle(el);
      const newPos = {
        t: comp.top,
        l: comp.left,
        z: el.style.zIndex
      };
      if (comp.width && comp.width !== 'auto') newPos.w = comp.width;
      if (comp.height && comp.height !== 'auto') newPos.h = comp.height;

      setLocalPos(prev => ({ ...prev, ...newPos }));
      
      if (saveLayout) {
        saveLayout();
      } else {
        window.api.getConfig().then(cfg => {
          if (!cfg) return;
          const key = isHorizontal ? 'layoutHorizontal' : 'layout';
          if (!cfg[key]) cfg[key] = { modules: {}, borders: {} };
          if (!cfg[key].modules) cfg[key].modules = {};
          cfg[key].modules[id] = { ...cfg[key].modules[id], ...newPos };
          window.api.saveConfig({ [key]: cfg[key] });
        });
      }
    };

    el.addEventListener('mousedown', handleMouseDown);
    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMoving, id, saveLayout, isolateWidgetsAbs]);

  // Resizing event handlers
  const handleResizerPointerDown = (e) => {
    if (elRef.current && elRef.current.classList.contains('locked-widget')) return;

    e.preventDefault();
    e.stopPropagation();

    if (isolateWidgetsAbs) isolateWidgetsAbs();

    const el = elRef.current;
    if (!el) return;

    window.activeWidgetForMenu = el;
    window.highestZ = window.highestZ || 100;
    window.highestZ++;
    el.style.zIndex = window.highestZ;

    if (window.showMiniToolbar) window.showMiniToolbar(el);
    const btnLock = document.getElementById('btn-lock-widget');
    if (btnLock) btnLock.textContent = '🔓';

    const computed = window.getComputedStyle(el);
    const sW = parseFloat(computed.width) || el.offsetWidth;
    const sH = parseFloat(computed.height) || el.offsetHeight;
    const sX = e.clientX;
    const sY = e.clientY;

    let currentTop = parseFloat(computed.top) || 0;
    let currentLeft = parseFloat(computed.left) || 0;
    el.style.left = currentLeft + 'px'; el.style.right = 'auto';
    el.style.top = currentTop + 'px'; el.style.bottom = 'auto';

    e.target.setPointerCapture(e.pointerId);

    const move = ev => {
      let newW = Math.max(100, sW + ev.clientX - sX);
      let newH = Math.max(40, sH + ev.clientY - sY);
      el.style.width = newW + 'px';
      el.style.height = newH + 'px';
      if (window.showMiniToolbar) window.showMiniToolbar(el);
    };

    const stop = (ev) => {
      try { ev.target.releasePointerCapture(ev.pointerId); } catch(err) {}
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);

      const comp = window.getComputedStyle(el);
      const newPos = {
        t: comp.top,
        l: comp.left,
        w: comp.width,
        h: comp.height,
        z: el.style.zIndex
      };
      setLocalPos(prev => ({ ...prev, ...newPos }));

      if (saveLayout) {
        saveLayout();
      } else {
        window.api.getConfig().then(cfg => {
          if (!cfg) return;
          const key = isHorizontal ? 'layoutHorizontal' : 'layout';
          if (!cfg[key]) cfg[key] = { modules: {}, borders: {} };
          if (!cfg[key].modules) cfg[key].modules = {};
          cfg[key].modules[id] = { ...cfg[key].modules[id], ...newPos };
          window.api.saveConfig({ [key]: cfg[key] });
        });
      }
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
  };

  let defaultAlign = 'left';
  if (widgetKey === 'user' || widgetKey === 'game') {
    defaultAlign = 'right';
  }
  const align = textAlign ? (textAlign[widgetKey] || defaultAlign) : defaultAlign;

  return { pos, isVis, align, handleResizerPointerDown };
}
