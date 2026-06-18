import React, { useEffect, useState } from 'react';
import { useOverlayStore } from '../../store';

export default function UserProfile() {
  const config = useOverlayStore(s => s.config) || {};
  const [username, setUsername] = useState(config.username || 'USUARIO');

  useEffect(() => {
    if (config.username) setUsername(config.username);
  }, [config.username]);

  useEffect(() => {
    if (!window.api) return;
    const handler = window.api.on('tiktok-stats', (stats) => {
      if (stats && stats.username) {
        setUsername(stats.username.toUpperCase());
      }
    });
    return () => window.api.off('tiktok-stats', handler);
  }, []);

  return (
    <>
      <div className="live-badge">● LIVE</div>
      <h1 id="user-display">{username}</h1>
    </>
  );
}
