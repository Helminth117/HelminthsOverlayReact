import React, { useEffect, useState } from 'react';
import { useOverlayStore } from '../../store';
import { getGameAlertIconUrl } from '../constants';

export default function TopEventsCarousel() {
  const [index, setIndex] = useState(0);
  const [events, setEvents] = useState({ follower: 'Nadie', liker: 'Nadie', gifter: 'Nadie' });

  useEffect(() => {
    if (!window.api) return;

    const statsHandler = window.api.on('tiktok-stats', (stats) => {
      setEvents({
        follower: (stats.latestFollower || 'Nadie').toUpperCase(),
        liker: stats.topLiker ? `${stats.topLiker.toUpperCase()} (${stats.topLikerCount})` : 'Nadie',
        gifter: stats.topGifter ? `${stats.topGifter.toUpperCase()} (${stats.topGifterCount})` : 'Nadie'
      });
    });

    return () => {
      window.api.off('tiktok-stats', statsHandler);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const config = useOverlayStore(s => s.config);
  
  const slides = [
    { type: 'follower', label: 'ÚLTIMO\nSEGUIDOR', value: events.follower, icon: getGameAlertIconUrl('follow', {}, config?.gameName) || 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Crown/3D/crown_3d.png' },
    { type: 'liker', label: 'DONADOR DE\nLIKES', value: events.liker, icon: getGameAlertIconUrl('liker', {}, config?.gameName) || 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Sparkling%20heart/3D/sparkling_heart_3d.png' },
    { type: 'gifter', label: 'MAYOR DONADOR\nREGALOS', value: events.gifter, icon: getGameAlertIconUrl('gift', {}, config?.gameName) || 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Gem%20stone/3D/gem_stone_3d.png' }
  ];

  return (
    <div id="topevents-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)', transform: `translateY(-${index * 100}%)` }}>
      <style>{`
        @keyframes float3d {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-4px) scale(1.05); }
        }
        .top-icon-3d {
          width: 42px;
          height: 42px;
          margin-bottom: 2px;
          filter: drop-shadow(0 6px 8px rgba(0,0,0,0.4));
          animation: float3d 3s ease-in-out infinite;
        }
      `}</style>
      
      {slides.map((s, i) => (
        <div key={i} className="topevent-slide" style={{ flex: '0 0 100%', width: '100%', height: '100%', boxSizing: 'border-box', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', textAlign: 'center' }}>
          <div id={`top-icon-${s.type}-container`}>
            <img className="top-icon-3d" src={s.icon || undefined} alt="" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 800, lineHeight: 1.1, whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'center', whiteSpace: 'pre-line' }}>{s.label}</span>
            <span id={`top-${s.type}`} style={{ fontWeight: 900, fontSize: '14px', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', marginTop: '2px', width: '100%', textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
