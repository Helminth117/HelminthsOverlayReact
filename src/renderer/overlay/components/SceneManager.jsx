import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';

function AnimatedCountdown({ value }) {
  const spansRef = useRef([]);
  const digits = value.split('');

  useEffect(() => {
    digits.forEach((char, idx) => {
      const el = spansRef.current[idx];
      if (el) {
        const prevVal = el.getAttribute('data-val');
        if (prevVal !== char) {
          el.setAttribute('data-val', char);
          el.animate([
            { transform: 'translateY(12px) scale(0.9)', opacity: 0 },
            { transform: 'translateY(0) scale(1)', opacity: 1 }
          ], { duration: 400, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
        }
      }
    });
  }, [value]);

  return (
    <div style={{ display: 'inline-block' }}>
      {digits.map((char, idx) => (
        <span
          key={idx}
          ref={el => { spansRef.current[idx] = el; }}
          style={{ display: 'inline-block' }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}

export default function SceneManager() {
  const activeScene = useOverlayStore(s => s.config?.activeScene) || 'none';
  const theme = useOverlayStore(s => {
    const config = s.config;
    const urlParams = new URLSearchParams(window.location.search);
    const isHorizontal = urlParams.get('type') === 'horizontal';
    return isHorizontal
      ? (config?.themeHorizontal || 'theme-luna-cosmic')
      : (config?.theme || 'theme-liquid-glass');
  });
  const [displayedScene, setDisplayedScene] = useState('none');
  const [particles, setParticles] = useState([]);
  const [countdown, setCountdown] = useState('05:00');
  const [stats, setStats] = useState({ follows: '0', mvp: 'Nadie' });
  const timerRef = useRef(null);

  const isCosmic = theme === 'theme-luna-cosmic';

  useEffect(() => {
    if (activeScene !== 'none') {
      setDisplayedScene(activeScene);
    }
  }, [activeScene]);

  useEffect(() => {
    if (activeScene && activeScene !== 'none') {
      // Generate 30 particles
      const newParticles = Array.from({ length: 30 }).map((_, i) => {
        const size = Math.random() * 8 + 4;
        return {
          id: i,
          width: `${size}px`,
          height: `${size}px`,
          left: `${Math.random() * 100}vw`,
          animationDuration: `${Math.random() * 10 + 5}s`,
          animationDelay: `${Math.random() * 5}s`
        };
      });
      setParticles(newParticles);

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (activeScene === 'starting') {
        setCountdown('05:00');
        let timeLeft = 300; // 5 mins
        timerRef.current = setInterval(() => {
          timeLeft--;
          if (timeLeft <= 0) {
            clearInterval(timerRef.current);
            setCountdown('00:00');
          } else {
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            setCountdown(`${m}:${s}`);
          }
        }, 1000);
      } else if (activeScene === 'ending') {
        // Grab stats from DOM
        const followsText = document.getElementById('stat-followers')?.textContent || '0';
        const mvpText = document.getElementById('top-gifter')?.textContent || 'Nadie';
        setStats({
          follows: followsText.replace('+', '').trim(),
          mvp: mvpText.split('(')[0].trim() || 'Nadie'
        });
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeScene]);

  // Determine texts based on displayedScene (to prevent layout change during fade out)
  let title = 'TITULO DE ESCENA';
  let subtitle = 'Subtítulo de escena';
  let showStats = false;
  let showCountdown = false;

  let bgStyle = {};

  if (displayedScene === 'starting') {
    title = 'EMPEZANDO STREAM';
    subtitle = 'PREPARANDO MOTORES...';
    showCountdown = true;
    bgStyle = {};
  } else if (displayedScene === 'brb') {
    title = 'AHORITA VUELVO';
    subtitle = 'BUSCANDO SNACKS...';
    bgStyle = {};
  } else if (displayedScene === 'ending') {
    title = 'TRANSMISIÓN FINALIZADA';
    subtitle = '¡GRACIAS POR VER!';
    showStats = true;
    bgStyle = {};
  }

  return (
    <div id="scene-container" className={activeScene !== 'none' ? 'scene-active' : 'scene-hidden'}>
      <div className="scene-glass-bg" id="scene-bg" style={bgStyle}></div>
      <div className="scene-particles" id="scene-particles" style={{ display: isCosmic ? 'none' : 'block' }}>
        {particles.map(p => (
          <div
            key={p.id}
            className="scene-particle"
            style={{
              width: p.width,
              height: p.height,
              left: p.left,
              animationDuration: p.animationDuration,
              animationDelay: p.animationDelay
            }}
          />
        ))}
      </div>
      <div className="scene-content" style={isCosmic ? { top: '65%' } : {}}>
        {!isCosmic && <h1 id="scene-title" className="scene-styled-text">{title}</h1>}
        {!isCosmic && <h2 id="scene-subtitle">{subtitle}</h2>}
        <div id="scene-countdown" style={{ display: showCountdown ? 'block' : 'none', transform: isCosmic ? 'scale(1.3)' : 'none' }}>
          <AnimatedCountdown value={countdown} />
        </div>
        
        <div 
          id="scene-stats" 
          className="scene-stats-grid" 
          style={{ 
            display: showStats ? 'flex' : 'none', 
            background: isCosmic ? 'rgba(12, 10, 24, 0.85)' : 'rgba(255,255,255,0.03)',
            border: isCosmic ? '1px solid #ffd700' : '1px solid var(--border-light)',
            boxShadow: isCosmic ? '0 0 15px rgba(255, 215, 0, 0.15)' : 'none',
            borderRadius: isCosmic ? '12px' : '8px',
            padding: '16px'
          }}
        >
          <div className="scene-stat-box">
            <div className="scene-stat-lbl" style={isCosmic ? { color: '#ffd700', fontWeight: 'bold' } : {}}>Nuevos Seguidores</div>
            <div className="scene-stat-val scene-styled-text" id="scene-stat-follows" style={isCosmic ? { color: '#fff' } : {}}>{stats.follows}</div>
          </div>
          <div className="scene-stat-box">
            <div className="scene-stat-lbl" style={isCosmic ? { color: '#ffd700', fontWeight: 'bold' } : {}}>Mayor Donador</div>
            <div className="scene-stat-val scene-styled-text" id="scene-stat-mvp" style={isCosmic ? { color: '#fff' } : {}}>{stats.mvp}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
