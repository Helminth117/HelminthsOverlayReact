import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';
import '../styles/winisland.css';

export default function WinIsland() {
  const [mediaInfo, setMediaInfo] = useState({
    title: '', artist: '', requester: '', art: '', playing: false, duration: 0, current: 0
  });
  const [localActive, setLocalActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCurrent, setDragCurrent] = useState(0);

  const config = useOverlayStore(s => s.config) || {};

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

  // Listen to local song request manager events
  useEffect(() => {
    const handleSongStarted = (e) => {
      const detail = e.detail;
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

    const handleTimeUpdate = (e) => {
      if (!localActiveRef.current) return;
      const { current, duration } = e.detail || {};
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

    window.addEventListener('song-started', handleSongStarted);
    window.addEventListener('media-time-update', handleTimeUpdate);
    
    // Listen to player window IPC broadcasts forwarders
    let ipcPause, ipcResume;
    if (window.api) {
      ipcPause = window.api.on('yt-pause', handleYtPause);
      ipcResume = window.api.on('yt-resume', handleYtResume);
    }

    return () => {
      window.removeEventListener('song-started', handleSongStarted);
      window.removeEventListener('media-time-update', handleTimeUpdate);
      if (window.api) {
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
      
      <div className="spoti-content">
        <div className="spoti-cover-wrap">
          <img className="spoti-cover" src={mediaInfo.art || undefined} alt="" style={{ display: mediaInfo.art ? 'block' : 'none' }} />
          {!mediaInfo.art && (
            <div className="spoti-cover-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15.5h-2v-2h2v2zm0-4h-2v-6h2v6z"/></svg>
            </div>
          )}
        </div>
        
        <div className="spoti-info">
          <div className="spoti-text-wrap">
            <span className="spoti-title">{mediaInfo.title}</span>
            <span className="spoti-artist">{mediaInfo.artist}</span>
            {mediaInfo.requester && (
              <span className="spoti-requester">{mediaInfo.requester}</span>
            )}
          </div>
          
          <div className="spoti-controls">
            <button className="spoti-btn" onClick={() => { if (window.api?.ytSkip) window.api.ytSkip(); }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>
            <button className="spoti-btn spoti-btn-play" onClick={handlePlayPause}>
              {mediaInfo.playing ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button className="spoti-btn" onClick={() => { if (window.api?.ytSkip) window.api.ytSkip(); }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="spoti-progress-wrap">
        <div id="winisland-seekbar-track" className="spoti-seekbar" onMouseDown={handleSeekMouseDown}>
          <div id="winisland-seekbar-fill" className="spoti-seekbar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="spoti-time">
          <span>{formatTime(currentSeconds)}</span>
          <span>{mediaInfo.duration > 0 ? formatTime(mediaInfo.duration) : 'LIVE'}</span>
        </div>
      </div>
    </div>
  );
}
