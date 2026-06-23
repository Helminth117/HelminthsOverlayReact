import React, { useEffect, useContext } from 'react';
import { LayoutContext } from '../LayoutContext';

export default function OverlayBackground({
  isMoving,
  config,
  bgImage,
  bgFading
}) {
  const { syncCorners } = useContext(LayoutContext) || {};

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
          if (syncCorners) syncCorners();
        };
        const stop = () => {
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', stop);
          
          window.api.getConfig().then(cfg => {
            if (!cfg) return;
            if (!cfg.layout) cfg.layout = { modules: {}, borders: {} };
            if (!cfg.layout.borders) cfg.layout.borders = {};
            cfg.layout.borders[type] = el.style[type];
            window.api.saveConfig({ layout: cfg.layout });
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

  return (
    <>
      <div id="game-bg-wrap">
        <div id="game-bg-top">
          <img className={`bg-img-layer ${!bgFading && bgImage ? 'loaded' : 'fade-out'}`} id="bg-img-top" src={bgImage || undefined} alt="" />
          <div className="bg-vignette"></div>
          {config?.showSceneBg && (
            <div id="mesh-gradient-bg-top" style={{ position: 'absolute', inset: '-20%', background: 'linear-gradient(45deg, rgba(10,10,15,1), rgba(var(--accent-rgb),0.2), rgba(10,10,15,1))', backgroundSize: '400% 400%', animation: 'meshGradient 15s ease infinite', zIndex: -2 }}></div>
          )}
        </div>
        <div id="game-bg-middle"></div>
        <div id="game-bg-bottom">
          <img className={`bg-img-layer ${!bgFading && bgImage ? 'loaded' : 'fade-out'}`} id="bg-img-bottom" src={bgImage || undefined} alt="" />
          <div className="bg-vignette"></div>
          {config?.showSceneBg && (
            <div id="mesh-gradient-bg-bottom" style={{ position: 'absolute', inset: '-20%', background: 'linear-gradient(45deg, rgba(10,10,15,1), rgba(var(--accent-rgb),0.2), rgba(10,10,15,1))', backgroundSize: '400% 400%', animation: 'meshGradient 15s ease infinite', zIndex: -2 }}></div>
          )}
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
    </>
  );
}
