import React, { useEffect, useState, useRef } from 'react';

function AnimatedNumber({ value, prefix = '' }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const start = prevValueRef.current;
    const end = value;
    if (start === end) return;

    const duration = 800; // ms
    const startTime = performance.now();

    let animationFrameId;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = progress * (2 - progress);
      const current = Math.floor(start + (end - start) * ease);
      
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = end;
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <span>{prefix}{displayValue}</span>;
}

export default function StatsDisplay() {
  const [stats, setStats] = useState({ followers: 0, viewers: 0 });

  useEffect(() => {
    if (!window.api) return;
    const handler = window.api.on('tiktok-stats', (data) => {
      if (data) {
        setStats({
          followers: data.followers_gained || 0,
          viewers: data.viewers || 0
        });
      }
    });
    return () => window.api.off('tiktok-stats', handler);
  }, []);

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <div className="stat-card">
        <div className="val" id="stat-followers">
          <AnimatedNumber value={stats.followers} prefix="+" />
        </div>
        <div className="lbl">FOLLOWS</div>
      </div>
      <div className="stat-card">
        <div className="val" id="stat-viewers">
          <AnimatedNumber value={stats.viewers} />
        </div>
        <div className="lbl">VIEWERS</div>
      </div>
    </div>
  );
}
