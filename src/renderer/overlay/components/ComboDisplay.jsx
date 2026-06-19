import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { getGemSVG } from '../constants';
import { DraggableWidget } from './DraggableWidget';

const COMBO_TIERS = [
  { min: 5,    title: 'NOTABLE',      class: 'tier-5',    gemTier: 1, c1: '#ffffff', c2: '#cccccc' },
  { min: 25,   title: 'FANTÁSTICO',   class: 'tier-25',   gemTier: 1, c1: '#a8ff78', c2: '#78ffd6' },
  { min: 50,   title: 'ESPECTACULAR', class: 'tier-50',   gemTier: 2, c1: '#4facfe', c2: '#00f2fe' },
  { min: 100,  title: 'GRANDIOSO',    class: 'tier-100',  gemTier: 2, c1: '#fdfc47', c2: '#24fe41' },
  { min: 200,  title: 'BRUTAL',       class: 'tier-200',  gemTier: 3, c1: '#f83600', c2: '#f9d423' },
  { min: 500,  title: 'IMPARABLE',    class: 'tier-500',  gemTier: 3, c1: '#ff0844', c2: '#ffb199' },
  { min: 1000, title: 'LEGENDARIO',   class: 'tier-1000', gemTier: 4, c1: '#c471ed', c2: '#f64f59' },
  { min: 2000, title: 'MÍTICO',       class: 'tier-2000', gemTier: 4, c1: '#00c6ff', c2: '#0072ff' },
  { min: 5000, title: 'DIVINO',       class: 'tier-5000', gemTier: 5, c1: '#f12711', c2: '#f5af19' },
  { min: 8000, title: 'ABSOLUTO',     class: 'tier-8000', gemTier: 5, c1: '#ee0979', c2: '#ff6a00' }
];

function getComboTier(count) {
  let currentTier = null;
  for (const tier of COMBO_TIERS) {
    if (count >= tier.min) currentTier = tier;
  }
  return currentTier;
}

export default function ComboDisplay() {
  const [comboCount, setComboCount] = useState(0);
  const [tier, setTier] = useState(null);
  const [visible, setVisible] = useState(false);
  const [sparks, setSparks] = useState([]);
  const [shockwaves, setShockwaves] = useState([]);
  const [tierUpActive, setTierUpActive] = useState(false);

  const isMoving = useOverlayStore(state => state.isMoving);
  const config = useOverlayStore(state => state.config) || {};
  
  // Settings from the control panel submenu
  const isGlass = config.glassWidgets ? (config.glassWidgets.combo !== false) : true;
  const align = config.textAlign ? (config.textAlign.combo || 'center') : 'center';
  
  const fadeTimerRef = useRef(null);
  const resetTimerRef = useRef(null);
  const lastTierClassRef = useRef(null);
  
  // Queue to buffer incoming likes at high frequency
  const incomingLikesRef = useRef(0);
  const drainTimerRef = useRef(null);
  const comboActiveRef = useRef(false);

  useEffect(() => {
    if (!window.api) return;

    const processQueue = () => {
      if (incomingLikesRef.current > 0) {
        const added = incomingLikesRef.current;
        incomingLikesRef.current = 0;

        setComboCount(prev => {
          const newCount = prev + added;
          const newTier = getComboTier(newCount);
          if (newTier) setTier(newTier);
          setVisible(true);
          comboActiveRef.current = true;

          // Clear previous fade-out timers
          if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

          // Schedule new fade-out
          fadeTimerRef.current = setTimeout(() => {
            setVisible(false);
            resetTimerRef.current = setTimeout(() => {
              setComboCount(0);
              setTier(null);
              comboActiveRef.current = false;
            }, 300);
          }, 6000);

          return newCount;
        });
      }
    };

    const handler = window.api.on('tiktok-like', (data) => {
      incomingLikesRef.current += (data.count || 1);
      
      // If combo is currently inactive, process immediately for instant feedback
      if (!comboActiveRef.current) {
        processQueue();
      }
      
      // Keep drain interval running to handle spams
      if (!drainTimerRef.current) {
        drainTimerRef.current = setInterval(processQueue, 180); // process batches every 180ms
      }
    });

    return () => {
      window.api.off('tiktok-like', handler);
      if (drainTimerRef.current) clearInterval(drainTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const triggerSparks = (activeTier, isTierUp = false) => {
    if (!activeTier) return;
    const newSparks = [];
    const count = isTierUp ? 20 : 8; // compact count for size/performance
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
      const speed = isTierUp ? (35 + Math.random() * 65) : (18 + Math.random() * 32); // tighter splash radius
      const tx = Math.cos(angle) * speed;
      const ty = Math.sin(angle) * speed;
      const rot = angle * (180 / Math.PI) + 90;
      const size = Math.random() > 0.6 ? 'large' : (Math.random() > 0.4 ? 'small' : 'medium');
      const duration = 0.4 + Math.random() * 0.3;
      const shape = Math.random() > 0.7 ? 'circle' : (Math.random() > 0.4 ? 'diamond' : 'line');
      const color = Math.random() > 0.4 ? activeTier.c1 : activeTier.c2;
      
      newSparks.push({
        id: Math.random(),
        tx: `${tx}px`,
        ty: `${ty}px`,
        rot: `${rot}deg`,
        size,
        duration: `${duration}s`,
        shape,
        color
      });
    }
    setSparks(prev => {
      const combined = [...prev, ...newSparks];
      if (combined.length > 40) return combined.slice(combined.length - 40); // cap total active sparks
      return combined;
    });
    
    setTimeout(() => {
      setSparks(prev => prev.filter(s => newSparks.every(ns => ns.id !== s.id)));
    }, 800);
  };

  const triggerShockwave = () => {
    const id = Math.random();
    setShockwaves(prev => {
      const combined = [...prev, { id }];
      if (combined.length > 2) return combined.slice(combined.length - 2); // cap total active shockwaves
      return combined;
    });
    setTimeout(() => {
      setShockwaves(prev => prev.filter(w => w.id !== id));
    }, 600);
  };

  useEffect(() => {
    if (comboCount === 0 || !tier) {
      lastTierClassRef.current = null;
      return;
    }

    const oldTierClass = lastTierClassRef.current;
    const isTierUp = oldTierClass && oldTierClass !== tier.class;

    if (isTierUp) {
      setTierUpActive(true);
      triggerSparks(tier, true);
      triggerShockwave();
      
      const timer = setTimeout(() => {
        setTierUpActive(false);
      }, 600);
      
      lastTierClassRef.current = tier.class;
      return () => clearTimeout(timer);
    } else {
      triggerSparks(tier, false);
      triggerShockwave();
      lastTierClassRef.current = tier.class;
    }
  }, [comboCount, tier]);

  // Determine if we should render the widget (always visible in Edit mode)
  const shouldRender = isMoving || (comboCount > 0 && tier);
  if (!shouldRender) return null;

  // Edit-mode preview configurations
  const displayCount = (comboCount === 0 && isMoving) ? 99 : comboCount;
  const displayTier = (comboCount === 0 && isMoving) ? COMBO_TIERS[2] : tier; // default preview Espectacular (tier-50)
  const displayVisible = isMoving ? true : visible;

  return (
    <DraggableWidget
      id="comp-combo"
      title="Combos de Likes"
      isGlass={isGlass}
      noContainer={true}
      defaultPos={{ t: '180px', l: 'calc(50vw - 80px)' }} // Center coordinate (80px is half the 160px width)
      visible={displayVisible}
      style={{
        opacity: displayVisible ? 1 : 0
      }}
      className="combo-widget-drag"
    >
      <div
        id="combo-meter"
        className={`combo-card ${displayTier.class} ${isGlass ? 'glass' : 'solid'} ${displayVisible ? 'visible' : ''} ${tierUpActive ? 'tier-up-pulse' : ''} ${displayCount >= 1000 ? 'hype-quake' : ''}`}
        style={{
          '--tier-color-1': displayTier.c1,
          '--tier-color-2': displayTier.c2
        }}
      >
        {/* Tier Up Banner */}
        {tierUpActive && (
          <div className="combo-tier-up-banner">
            ¡NUEVO RANGO!
          </div>
        )}

        {/* Expanding shockwaves */}
        {shockwaves.map(w => (
          <div
            key={w.id}
            className="combo-shockwave"
            style={{
              borderColor: displayTier.c1,
              boxShadow: `0 0 12px ${displayTier.c1}, inset 0 0 8px ${displayTier.c1}`
            }}
          />
        ))}

        {/* Card Content Row */}
        <div className={`combo-content align-${align}`}>
          {/* Animated Gem Icon */}
          <div className="combo-gem-wrapper">
            <div
              id="combo-gem-container"
              className={`gem-tier-container ${displayCount >= 500 ? 'gem-hyper-spin' : ''}`}
              dangerouslySetInnerHTML={{ __html: getGemSVG(displayTier.gemTier, displayTier.c1, displayTier.c2) }}
            />
          </div>

          {/* Labels & Pop Numbers */}
          <div className="combo-text-group">
            <div id="combo-title" className="combo-styled-text">{displayTier.title}</div>
            <div id="combo-count-wrap">
              <span className="combo-styled-x combo-styled-text">x</span>
              <span
                id="combo-count"
                className="combo-styled-text"
                key={displayCount}
                style={{
                  animation: 'comboPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  display: 'inline-block',
                  '--rand': Math.random()
                }}
              >
                {displayCount}
              </span>
            </div>
          </div>
        </div>

        {/* Floating Sparks */}
        {sparks.map(s => (
          <div
            key={s.id}
            className={`combo-spark ${s.size} ${s.shape}`}
            style={{
              '--tx': s.tx,
              '--ty': s.ty,
              '--rot': s.rot,
              '--duration': s.duration,
              left: '50%',
              top: '50%',
              background: s.color,
              boxShadow: `0 0 8px ${s.color}`
            }}
          />
        ))}

        {/* Decay Timer Line (hidden in edit-mode preview) */}
        {!isMoving && (
          <div id="combo-decay-track">
            <div
              id="combo-decay-bar"
              className="combo-styled-bar"
              key={displayCount}
              style={{ animation: 'comboDecay 6s linear forwards' }}
            />
          </div>
        )}
      </div>
    </DraggableWidget>
  );
}

