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

function SplitText({ text }) {
  return (
    <h1 id="scene-title">
      {text.split('').map((char, idx) => {
        if (char === '\n') return <br key={idx} />;
        return (
          <span key={idx} style={{ animationDelay: `${idx * 0.04}s` }}>
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </h1>
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
  const [animPhase, setAnimPhase] = useState('idle');
  const [particles, setParticles] = useState([]);
  const [countdown, setCountdown] = useState('05:00');
  const [stats, setStats] = useState({ follows: '0', mvp: 'Nadie' });
  const timerRef = useRef(null);

  const isCosmic = theme === 'theme-luna-cosmic';

  useEffect(() => {
    let phaseTimeout;

    if (activeScene !== 'none') {
      // Transition IN
      setDisplayedScene(activeScene);
      setAnimPhase('entering');

      phaseTimeout = setTimeout(() => {
        setAnimPhase('idle');
      }, 900);

      // Generate particles based on activeScene
      let newParticles = [];
      if (activeScene === 'starting') {
        // starting: partículas pequeñas (4-8px), color var(--accent) con glow, suben rápido (5-8s)
        newParticles = Array.from({ length: 30 }).map((_, i) => {
          const size = Math.random() * 4 + 4; // 4-8px
          const dur = Math.random() * 3 + 5; // 5-8s
          const delay = Math.random() * 5;
          return {
            id: i,
            width: `${size}px`,
            height: `${size}px`,
            left: `${Math.random() * 100}vw`,
            color: 'var(--accent)',
            glow: true,
            shape: 'circle',
            rotation: 0,
            dur: `${dur}s`,
            delay: `${delay}s`
          };
        });
      } else if (activeScene === 'brb') {
        // brb: partículas medianas (6-12px), colores pastel aleatorios (#ff9a9e, #a1c4fd, #ffecd2), flotan lento y zigzaguean
        const pastelColors = ['#ff9a9e', '#a1c4fd', '#ffecd2'];
        newParticles = Array.from({ length: 30 }).map((_, i) => {
          const size = Math.random() * 6 + 6; // 6-12px
          const dur = Math.random() * 8 + 8; // 8-16s
          const delay = Math.random() * 5;
          const color = pastelColors[Math.floor(Math.random() * pastelColors.length)];
          return {
            id: i,
            width: `${size}px`,
            height: `${size}px`,
            left: `${Math.random() * 100}vw`,
            color: color,
            glow: false,
            shape: 'circle',
            rotation: 0,
            dur: `${dur}s`,
            delay: `${delay}s`
          };
        });
      } else if (activeScene === 'ending') {
        // ending: partículas tipo confetti — rectangulares (width: 6-10px, height: 3-5px), rotación aleatoria, colores variados, caen desde arriba
        const confettiColors = ['#ffd700', '#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#eccc68', '#ff6b81', '#70a1ff'];
        newParticles = Array.from({ length: 40 }).map((_, i) => {
          const w = Math.random() * 4 + 6; // 6-10px
          const h = Math.random() * 2 + 3; // 3-5px
          const dur = Math.random() * 3 + 3; // 3-6s
          const delay = Math.random() * 4;
          const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
          const rotation = Math.random() * 360;
          return {
            id: i,
            width: `${w}px`,
            height: `${h}px`,
            left: `${Math.random() * 100}vw`,
            color: color,
            glow: false,
            shape: 'rect',
            rotation: rotation,
            dur: `${dur}s`,
            delay: `${delay}s`
          };
        });
      }
      setParticles(newParticles);

      // Handle specific starting countdown
      if (activeScene === 'starting') {
        setCountdown('05:00');
        let timeLeft = 300;
        if (timerRef.current) clearInterval(timerRef.current);
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
        const followsText = document.getElementById('stat-followers')?.textContent || '0';
        const mvpText = document.getElementById('top-gifter')?.textContent || 'Nadie';
        setStats({
          follows: followsText.replace('+', '').trim(),
          mvp: mvpText.split('(')[0].trim() || 'Nadie'
        });
      }
    } else {
      // Transition OUT (activeScene === 'none')
      if (displayedScene !== 'none') {
        setAnimPhase('leaving');
        phaseTimeout = setTimeout(() => {
          setDisplayedScene('none');
          setAnimPhase('idle');
        }, 800);
      }
    }

    return () => {
      if (phaseTimeout) clearTimeout(phaseTimeout);
    };
  }, [activeScene]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Determine texts based on displayedScene (to prevent layout change during fade out)
  let title = 'TITULO DE ESCENA';
  let subtitle = 'Subtítulo de escena';
  let showStats = false;
  let showCountdown = false;

  if (displayedScene === 'starting') {
    title = 'EMPEZANDO\nSTREAM';
    subtitle = 'PREPARANDO MOTORES...';
    showCountdown = true;
  } else if (displayedScene === 'brb') {
    title = 'AHORITA\nVUELVO';
    subtitle = 'BUSCANDO SNACKS...';
  } else if (displayedScene === 'ending') {
    title = 'TRANSMISIÓN\nFINALIZADA';
    subtitle = '¡GRACIAS POR VER\nEL STREAM!';
    showStats = true;
  }

  return (
    <div
      id="scene-container"
      className={[
        activeScene !== 'none' ? 'scene-active' : 'scene-hidden',
        displayedScene !== 'none' ? `scene-${displayedScene}` : '',
        `scene-phase-${animPhase}`
      ].join(' ')}
    >
      <div className="scene-glass-bg" id="scene-bg"></div>
      <div className="scene-particles" id="scene-particles" style={{ display: isCosmic ? 'none' : 'block' }}>
        {particles.map(p => (
          <div
            key={p.id}
            className="scene-particle"
            style={{
              width: p.width,
              height: p.height,
              left: p.left,
              background: p.color || '#fff',
              borderRadius: p.shape === 'rect' ? '2px' : '50%',
              transform: `rotate(${p.rotation}deg)`,
              boxShadow: p.glow ? '0 0 8px var(--accent)' : 'none',
              '--dur': p.dur,
              '--delay': p.delay
            }}
          />
        ))}
      </div>
      <div className="scene-content" style={isCosmic ? { top: '65%' } : {}}>
        {!isCosmic && <SplitText text={title} />}
        {!isCosmic && (
          displayedScene === 'ending' ? (
            <h2 id="scene-subtitle">
              {subtitle.split('').map((char, idx) => {
                if (char === '\n') return <br key={idx} />;
                return (
                  <span key={idx} style={{ animationDelay: `${idx * 0.08}s` }}>
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                );
              })}
            </h2>
          ) : (
            <h2 id="scene-subtitle" className={displayedScene === 'starting' ? 'scene-typewriter' : ''}>
              {subtitle}
            </h2>
          )
        )}
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
