import React from 'react';
import { useOverlayStore } from '../../store';

export default function MinecraftWidget() {
  const day = useOverlayStore(s => s.minecraftDay || 0);
  const config = useOverlayStore(s => s.config) || {};
  const isMoving = useOverlayStore(s => s.isMoving);

  // If not enabled, or not playing Minecraft (unless moving in layout mode), don't render
  const enabled = config.minecraftEnabled;
  const isPlayingMinecraft = (config.gameName || '').toLowerCase() === 'minecraft';

  if (!enabled || (!isPlayingMinecraft && !isMoving)) return null;

  const fontColor = config.accent || 'var(--accent, #1D9E75)';

  return (
    <div 
      className="minecraft-widget-container" 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        fontFamily: "'Rajdhani', 'Outfit', sans-serif",
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        minWidth: '150px'
      }}
    >
      <div 
        className="minecraft-icon"
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
        }}
      >
        ⛏️
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mundo Minecraft</span>
        <span style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>
          DÍA <span style={{ color: fontColor }}>{day}</span>
        </span>
      </div>
    </div>
  );
}
