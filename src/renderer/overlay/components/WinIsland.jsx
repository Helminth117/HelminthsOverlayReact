import React, { useEffect, useState, useRef } from 'react';
import '../styles/winisland.css';

export default function WinIsland() {
  const [mediaInfo, setMediaInfo] = useState({
    title: '', artist: '', requester: '', art: '', playing: false, duration: 0, current: 0
  });
  const [localActive, setLocalActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCurrent, setDragCurrent] = useState(0);

  const localActiveRef = useRef(false);
  const mediaInfoRef = useRef(mediaInfo);
  const autoCollapseTimeoutRef = useRef(null);

  useEffect(() => {
    mediaInfoRef.current = mediaInfo;
  }, [mediaInfo]);

  useEffect(() => {
    localActiveRef.current = localActive;
  }, [localActive]);

  useEffect(() => {
    if (!window.api) return;

    // Listen to system media updates
    const mediaUpdatedHandler = (data) => {
      if (localActiveRef.current) {
        console.log('[WinIsland] System media update ignored (local song playing)');
        return;
      }

      if (!data || !data.title) {
        setMediaInfo({
          title: '', artist: '', requester: '', art: '', playing: false, duration: 0, current: 0
        });
        return;
      }

      const title = data.title || 'Unknown';
      const artist = data.artist || 'Unknown';
      const art = data.albumArt || data.thumbnail || '';
      const duration = data.duration ? (data.duration / 1000) : 0; // ms to sec
      const current = data.start ? ((Date.now() - data.start) / 1000) : 0;

      setMediaInfo({
        title,
        artist,
        requester: '',
        art,
        playing: true,
        duration,
        current
      });
    };

    const handler = window.api.on('media-updated', mediaUpdatedHandler);

    return () => {
      window.api.off('media-updated', handler);
    };
  }, []);

  // Listen to local song request manager events via IPC
  useEffect(() => {
    const handleSongStarted = (detail) => {
      if (detail) {
        setLocalActive(true);
        setMediaInfo({
          title: detail.title,
          artist: detail.artist,
          requester: detail.requester ? `Pedida por: ${detail.requester}` : '',
          art: detail.thumbnail || '',
          playing: true,
          duration: detail.duration || 0,
          current: 0
        });
      } else {
        setLocalActive(false);
        setMediaInfo({
          title: '', artist: '', requester: '', art: '', playing: false, duration: 0, current: 0
        });
      }
    };

    const handleTimeUpdate = (detail) => {
      if (!localActiveRef.current) return;
      const { current, duration } = detail || {};
      setMediaInfo(prev => ({
        ...prev,
        current: current || 0,
        duration: duration || 0
      }));
    };

    const handleYtPause = () => {
      if (localActiveRef.current) {
        setMediaInfo(prev => ({ ...prev, playing: false }));
      }
    };

    const handleYtResume = () => {
      if (localActiveRef.current) {
        setMediaInfo(prev => ({ ...prev, playing: true }));
      }
    };

    let offSongStarted, offTimeUpdate, ipcPause, ipcResume;
    if (window.api) {
      offSongStarted = window.api.on('local-song-started', handleSongStarted);
      offTimeUpdate = window.api.on('local-media-time', handleTimeUpdate);
      ipcPause = window.api.on('yt-pause', handleYtPause);
      ipcResume = window.api.on('yt-resume', handleYtResume);
    }

    return () => {
      if (window.api) {
        window.api.off('local-song-started', offSongStarted);
        window.api.off('local-media-time', offTimeUpdate);
        window.api.off('yt-pause', ipcPause);
        window.api.off('yt-resume', ipcResume);
      }
    };
  }, []);

  // System media duration progress estimator ticks
  useEffect(() => {
    if (!mediaInfo.playing || mediaInfo.duration <= 0 || localActive || isDragging) return;

    const interval = setInterval(() => {
      setMediaInfo(prev => {
        if (prev.current >= prev.duration) {
          clearInterval(interval);
          return prev;
        }
        return {
          ...prev,
          current: Math.min(prev.duration, prev.current + 1)
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mediaInfo.playing, mediaInfo.duration, localActive, isDragging]);

  // Seekbar dragging events
  const handleSeekMouseDown = (e) => {
    if (mediaInfo.duration <= 0) return;
    setIsDragging(true);
    updateDragPosition(e);
  };

  const updateDragPosition = (e) => {
    const track = document.getElementById('winisland-seekbar-track');
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const newCurrent = pct * mediaInfo.duration;
    setDragCurrent(newCurrent);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      updateDragPosition(e);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (localActive) {
        window.dispatchEvent(new CustomEvent('media-seek-request', { detail: dragCurrent }));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragCurrent, localActive]);

  const formatTime = (sec) => {
    if (isNaN(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentSeconds = isDragging ? dragCurrent : mediaInfo.current;
  const pct = mediaInfo.duration > 0 ? (currentSeconds / mediaInfo.duration) * 100 : 0;

  const handlePlayPause = () => {
    if (localActive) {
      if (mediaInfo.playing) {
        if (window.api?.ytPause) window.api.ytPause();
      } else {
        if (window.api?.ytResume) window.api.ytResume();
      }
    }
  };


  // ── Wave path: 3x wide for seamless loop (18 periods × 150 units = 2700)
  // viewBox 0 0 900 24 | cy=12 | amp peaks at 0 and 24
  const WAVE_PATH = [
    'M 0 12',
    'C 37.5 0,75 0,75 12 C 112.5 24,150 24,150 12',
    'C 187.5 0,225 0,225 12 C 262.5 24,300 24,300 12',
    'C 337.5 0,375 0,375 12 C 412.5 24,450 24,450 12',
    'C 487.5 0,525 0,525 12 C 562.5 24,600 24,600 12',
    'C 637.5 0,675 0,675 12 C 712.5 24,750 24,750 12',
    'C 787.5 0,825 0,825 12 C 862.5 24,900 24,900 12',
    'C 937.5 0,975 0,975 12 C 1012.5 24,1050 24,1050 12',
    'C 1087.5 0,1125 0,1125 12 C 1162.5 24,1200 24,1200 12',
    'C 1237.5 0,1275 0,1275 12 C 1312.5 24,1350 24,1350 12',
    'C 1387.5 0,1425 0,1425 12 C 1462.5 24,1500 24,1500 12',
    'C 1537.5 0,1575 0,1575 12 C 1612.5 24,1650 24,1650 12',
    'C 1687.5 0,1725 0,1725 12 C 1762.5 24,1800 24,1800 12',
    'C 1837.5 0,1875 0,1875 12 C 1912.5 24,1950 24,1950 12',
    'C 1987.5 0,2025 0,2025 12 C 2062.5 24,2100 24,2100 12',
    'C 2137.5 0,2175 0,2175 12 C 2212.5 24,2250 24,2250 12',
    'C 2287.5 0,2325 0,2325 12 C 2362.5 24,2400 24,2400 12',
    'C 2437.5 0,2475 0,2475 12 C 2512.5 24,2550 24,2550 12',
    'C 2587.5 0,2625 0,2625 12 C 2662.5 24,2700 24,2700 12',
  ].join(' ');

  // Hide the widget completely if no media is loaded/playing
  if (!mediaInfo.title) {
    return <div id="winisland-container" style={{ display: 'none' }} />;
  }

  return (
    <div id="winisland-container" className="spoti-card-widget">
      {/* Blurred artwork backdrop */}
      {mediaInfo.art && (
        <div className="spoti-bg-blur" style={{ backgroundImage: `url(${mediaInfo.art})` }} />
      )}

      {/* Cover art — anchored left, nested rounded square */}
      <div className="spoti-cover-wrap">
        {mediaInfo.art ? (
          <img className="spoti-cover" src={mediaInfo.art} alt="" />
        ) : (
          <div className="spoti-cover-placeholder">
            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Center: title + artist + wave progress */}
      <div className="spoti-content">
        <div className="spoti-text-wrap">
          <span className="spoti-title">{mediaInfo.title}</span>
          <span className="spoti-artist">{mediaInfo.artist}</span>
          {mediaInfo.requester && (
            <span className="spoti-requester">{mediaInfo.requester}</span>
          )}
        </div>

        {/* Wave progress container */}
        <div className="spoti-wave-container">
          <div
            className="spoti-wave-wrap"
            onMouseDown={handleSeekMouseDown}
            id="winisland-seekbar-track"
          >
            {/* Background wave (dim, full width) */}
            <div className="spoti-wave-bg">
              <svg
                className={`spoti-wave-svg ${!mediaInfo.playing ? 'paused' : ''}`}
                viewBox="0 0 900 24"
                preserveAspectRatio="none"
              >
                <path d={WAVE_PATH} fill="rgba(255,255,255,0.12)" />
              </svg>
            </div>

            {/* Foreground wave (accent, masked by progress width) */}
            <div className="spoti-wave-fg" style={{ width: `${pct}%` }}>
              <svg
                className={`spoti-wave-svg ${!mediaInfo.playing ? 'paused' : ''}`}
                viewBox="0 0 900 24"
                preserveAspectRatio="none"
              >
                <path d={WAVE_PATH} fill="var(--accent)" fillOpacity="0.9" />
              </svg>
            </div>

            {/* Playhead dot */}
            {pct > 0 && pct < 100 && (
              <div className="spoti-wave-dot" style={{ left: `${pct}%` }} />
            )}
          </div>

          {/* Time labels below wave progress */}
          <div className="spoti-wave-time">
            <span>{formatTime(currentSeconds)}</span>
            {mediaInfo.duration > 0 ? (
              <span>{formatTime(mediaInfo.duration)}</span>
            ) : (
              <span className="spoti-live-badge">LIVE</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
