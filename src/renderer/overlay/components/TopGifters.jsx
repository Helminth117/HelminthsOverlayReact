import React, { useState, useEffect } from 'react';
import { useOverlayStore } from '../../store';

export default function TopGifters() {
  const [gifters, setGifters] = useState([]);
  const config = useOverlayStore(s => s.config) || {};

  useEffect(() => {
    if (window.api) {
      const removeListener = window.api.on('tiktok-top', (data) => {
        if (Array.isArray(data)) {
          setGifters(data);
        }
      });
      return () => { window.api.off('tiktok-top', removeListener); };
    }
  }, []);

  if (gifters.length === 0) return null;

  return (
    <div className="glass" style={{ position: 'absolute', top: '20px', right: '20px', width: '250px', padding: '15px', borderRadius: '12px', zIndex: 10 }}>
      <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '10px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>👑 Top Gifters</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {gifters.map((g, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '8px' }}>
            <span style={{ color: '#fff', fontWeight: 'bold' }}>{g.user}</span>
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{g.coins}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
