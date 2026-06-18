import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { getGemSVG } from '../constants';

const COMBO_TIERS = [
  { min: 5,    title: 'NOTABLE',      class: 'tier-5',    gemTier: 1, c1: '#9ca3af', c2: '#4b5563' },
  { min: 25,   title: 'FANTÁSTICO',   class: 'tier-25',   gemTier: 1, c1: '#38bdf8', c2: '#0284c7' },
  { min: 50,   title: 'ESPECTACULAR', class: 'tier-50',   gemTier: 2, c1: '#4ade80', c2: '#16a34a' },
  { min: 8000, title: 'ABSOLUTO',     class: 'tier-8000', gemTier: 5, c1: '#ffffff', c2: '#000000' }
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
  const timerRef = useRef(null);

  useEffect(() => {
    if (!window.api) return;

    const handler = window.api.on('tiktok-like', (data) => {
      setComboCount(prev => {
        const newCount = prev + (data.count || 1);
        const newTier = getComboTier(newCount);
        if (newTier) setTier(newTier);
        
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setComboCount(0);
          setTier(null);
        }, 6000);
        
        return newCount;
      });
    });

    return () => window.api.off('tiktok-like', handler);
  }, []);

  if (!tier || comboCount === 0) return null;

  return (
    <div id="combo-meter" className={`${tier.class} ${comboCount >= 1000 ? 'hype-quake' : ''}`} style={{ opacity: 1, transform: 'translateX(-50%) scale(1)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
        <div id="combo-gem-container" style={{ width: '28px', height: '28px', animation: 'float3d 3s ease-in-out infinite' }} dangerouslySetInnerHTML={{ __html: getGemSVG(tier.gemTier, tier.c1, tier.c2) }}>
        </div>
        <div id="combo-title" className="combo-styled-text">{tier.title}</div>
      </div>
      <div id="combo-count-wrap">
        <span style={{ fontSize: '1.2rem', marginTop: '2px' }} className="combo-styled-text">x</span>
        <span id="combo-count" className="combo-styled-text" key={comboCount} style={{ animation: 'comboPop 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)', fontSize: '1.8rem' }}>{comboCount}</span>
      </div>
      <div id="combo-decay-track">
        <div id="combo-decay-bar" className="combo-styled-bar" key={comboCount} style={{ animation: 'comboDecay 6s linear forwards' }}></div>
      </div>
    </div>
  );
}
