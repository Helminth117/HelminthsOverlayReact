import React, { useEffect, useRef, useState } from 'react';
import { useOverlayStore } from '../../store';
import { textmode } from 'textmode.js';
import { DraggableWidget } from './DraggableWidget';
import { Film, User } from 'lucide-react';

const resolveFilePath = (url) => {
  if (!url) return '';
  let filePath = url;
  if (url.startsWith('local-file://')) {
    filePath = url.replace('local-file://', '');
  }

  const isLocalAbsolute = /^[a-zA-Z]:[\\\/]/.test(filePath) || filePath.startsWith('/') || filePath.startsWith('\\');

  if (url.startsWith('local-file://') || isLocalAbsolute) {
    if (window.location.protocol === 'file:') {
      return url.startsWith('local-file://') ? url : 'local-file://' + filePath.replace(/\\/g, '/');
    }
    const token = new URLSearchParams(window.location.search).get('token') || '';
    const apiBase = window.location.port === '5173' ? 'http://localhost:3030' : window.location.origin;
    return `${apiBase}/api/local-media?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;
  }
  return url;
};

export default function VideoReactionWidget() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textmodeRef = useRef(null);
  const videoSourceRef = useRef(null);
  const fallbackVideoRef = useRef(null);
  const lastTimeUpdateRef = useRef(0);

  const config = useOverlayStore(state => state.config);
  const isMoving = useOverlayStore(state => state.isMoving);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [title, setTitle] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [volume, setVolume] = useState(0.5);
  const [useFallbackVideo, setUseFallbackVideo] = useState(false);

  useEffect(() => {
    let t;
    try {
      if (!canvasRef.current) {
        if (useFallbackVideo) return;
        return;
      }

      // Inicializar textmode.js
      t = textmode.create({
        canvas: canvasRef.current,
        width: 480,
        height: 270,
        fontSize: 6,
        frameRate: 30
      });
      textmodeRef.current = t;
      setUseFallbackVideo(false);
    } catch (err) {
      console.error('[VideoReactionWidget] Error al inicializar textmode.js (WebGL2 no disponible o aceleración desactivada):', err);
      setUseFallbackVideo(true);
      return;
    }

    t.setup(() => {
      // Usar fuente por defecto
    });

    t.draw(() => {
      t.background(0);
      if (videoSourceRef.current && videoSourceRef.current.isPlaying) {
        // Renderizar el video frame
        t.image(videoSourceRef.current, t.grid.cols, t.grid.rows);
      } else {
        // Pantalla de espera o placeholder retro
        t.charColor(0, 255, 0, 255);
        t.printAlign('center', 'middle');
        t.print("[ AWAITING VIDEO REACTION ]", Math.floor(t.grid.cols / 2), Math.floor(t.grid.rows / 2));
      }
    });

    // ResizeObserver para adaptar el canvas
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          t.resizeCanvas(width, height);
        }
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (videoSourceRef.current) {
        try {
          videoSourceRef.current.stop();
          videoSourceRef.current.dispose();
        } catch (_) {}
      }
      try {
        t.destroy();
      } catch (_) {}
    };
  }, []);

  // Manejar eventos de control de reproducción vía IPC
  useEffect(() => {
    if (!window.api) return;

    const stopVideo = () => {
      lastTimeUpdateRef.current = 0;
      if (videoSourceRef.current) {
        try {
          videoSourceRef.current.stop();
          videoSourceRef.current.dispose();
        } catch (_) {}
        videoSourceRef.current = null;
      }
      if (fallbackVideoRef.current) {
        try {
          fallbackVideoRef.current.pause();
          fallbackVideoRef.current.src = '';
        } catch (_) {}
      }
      setIsPlaying(false);
      setCurrentId('');
      setTitle('');
      setRequestedBy('');
      if (window.api) {
        window.api.sendVideoReactionTime({ currentTime: 0, duration: 0 });
      }
    };

    const handlePlay = async (data) => {
      if (!data || !data.filePath) return;
      stopVideo();

      const resolved = resolveFilePath(data.filePath);

      // MODO FALLBACK VIDEO ESTÁNDAR
      if (useFallbackVideo) {
        try {
          const videoElement = fallbackVideoRef.current;
          if (!videoElement) return;

          videoElement.src = resolved;
          videoElement.volume = data.volume !== undefined ? data.volume : volume;

          const endedHandler = async () => {
            if (window.api) {
              await window.api.markVideoPlayed(data.id);
            }
            stopVideo();
            videoElement.removeEventListener('ended', endedHandler);
          };
          videoElement.addEventListener('ended', endedHandler);

          setCurrentId(data.id);
          setTitle(data.title || 'Video Reacción');
          setRequestedBy(data.requestedBy || 'Anónimo');
          setIsPlaying(true);

          await videoElement.play();
        } catch (err) {
          console.error('[VideoReactionWidget] Error al reproducir video (fallback HTML5):', err);
          stopVideo();
        }
        return;
      }

      // MODO TEXTMODE.JS (ASCII)
      const t = textmodeRef.current;
      if (!t) return;

      try {
        const video = await t.loadVideo(resolved);
        videoSourceRef.current = video;

        // Configuración de estilo ASCII
        video
          .characters(" .:-=+*#%@")
          .charColorMode('sampled')
          .cellColorMode('fixed')
          .cellColor(0, 0, 0, 255)
          .loop(false)
          .volume(data.volume !== undefined ? data.volume : volume);

        // Reportar progreso de reproducción de video en tiempo real
        const timeupdateHandler = () => {
          if (window.api && video.videoElement) {
            const now = Date.now();
            if (now - lastTimeUpdateRef.current >= 500) {
              window.api.sendVideoReactionTime({
                currentTime: video.videoElement.currentTime,
                duration: video.videoElement.duration || 0
              });
              lastTimeUpdateRef.current = now;
            }
          }
        };
        video.videoElement.addEventListener('timeupdate', timeupdateHandler);
        video.videoElement.addEventListener('durationchange', timeupdateHandler);

        // Evento fin de video
        video.videoElement.addEventListener('ended', async () => {
          if (window.api) {
            await window.api.markVideoPlayed(data.id);
          }
          stopVideo();
        });

        setCurrentId(data.id);
        setTitle(data.title || 'Video Reacción');
        setRequestedBy(data.requestedBy || 'Anónimo');
        setIsPlaying(true);

        await video.play();
      } catch (err) {
        console.error('[VideoReactionWidget] Error al reproducir video:', err);
        stopVideo();
      }
    };

    const handlePause = () => {
      if (useFallbackVideo) {
        if (fallbackVideoRef.current) fallbackVideoRef.current.pause();
      } else {
        if (videoSourceRef.current) videoSourceRef.current.pause();
      }
    };

    const handleResume = () => {
      if (useFallbackVideo) {
        if (fallbackVideoRef.current) fallbackVideoRef.current.play().catch(e => console.error(e));
      } else {
        if (videoSourceRef.current) videoSourceRef.current.play().catch(e => console.error(e));
      }
    };

    const handleStop = () => {
      stopVideo();
    };

    const handleSeek = (secs) => {
      if (useFallbackVideo) {
        if (fallbackVideoRef.current) fallbackVideoRef.current.currentTime = secs;
      } else {
        if (videoSourceRef.current) videoSourceRef.current.time(secs);
      }
    };

    const handleVolume = (level) => {
      setVolume(level);
      if (useFallbackVideo) {
        if (fallbackVideoRef.current) fallbackVideoRef.current.volume = level;
      } else {
        if (videoSourceRef.current) videoSourceRef.current.volume(level);
      }
    };

    const unsubPlay = window.api.on('video-reaction-play', handlePlay);
    const unsubPause = window.api.on('video-reaction-pause', handlePause);
    const unsubResume = window.api.on('video-reaction-resume', handleResume);
    const unsubStop = window.api.on('video-reaction-stop', handleStop);
    const unsubSeek = window.api.on('video-reaction-seek', handleSeek);
    const unsubVolume = window.api.on('video-reaction-volume', handleVolume);

    return () => {
      if (unsubPlay) window.api.off('video-reaction-play', unsubPlay);
      if (unsubPause) window.api.off('video-reaction-pause', unsubPause);
      if (unsubResume) window.api.off('video-reaction-resume', unsubResume);
      if (unsubStop) window.api.off('video-reaction-stop', unsubStop);
      if (unsubSeek) window.api.off('video-reaction-seek', unsubSeek);
      if (unsubVolume) window.api.off('video-reaction-volume', unsubVolume);
    };
  }, [volume, useFallbackVideo]);

  // Si no está reproduciendo y no estamos en modo edición, no se renderiza nada
  const isVisible = isPlaying || isMoving;

  return (
    <DraggableWidget
      id="comp-video-reaction"
      title="Video Reacciones"
      isGlass={config?.glassWidgets?.['video-reaction'] !== false}
      noContainer={true}
      defaultPos={{ t: '200px', r: '20px', w: '480px', h: '290px' }}
      visible={isVisible}
      style={{ display: isVisible ? 'block' : 'none' }}
    >
      <div 
        ref={containerRef} 
        className="comp-video-reaction-wrapper"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000',
          border: '2px solid var(--accent)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 15px rgba(var(--accent-rgb), 0.3)'
        }}
      >
        {/* Canvas de renderizado ASCII o Fallback Video */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {useFallbackVideo ? (
            <video 
              ref={fallbackVideoRef} 
              style={{ 
                width: '100%', 
                height: '100%', 
                display: 'block',
                objectFit: 'contain',
                backgroundColor: '#000'
              }}
              playsInline
              onTimeUpdate={(e) => {
                if (window.api) {
                  const now = Date.now();
                  if (now - lastTimeUpdateRef.current >= 500) {
                    window.api.sendVideoReactionTime({
                      currentTime: e.target.currentTime,
                      duration: e.target.duration || 0
                    });
                    lastTimeUpdateRef.current = now;
                  }
                }
              }}
              onDurationChange={(e) => {
                if (window.api) {
                  const now = Date.now();
                  window.api.sendVideoReactionTime({
                    currentTime: e.target.currentTime,
                    duration: e.target.duration || 0
                  });
                  lastTimeUpdateRef.current = now;
                }
              }}
            />
          ) : (
            <canvas 
              ref={canvasRef} 
              style={{ 
                width: '100%', 
                height: '100%', 
                display: 'block' 
              }} 
            />
          )}
          {/* CRT Scanline Scan Overlays */}
          <div className="crt-overlay" />
        </div>

        {/* Barra de info inferior */}
        <div 
          className="reaction-info-bar"
          style={{
            height: '42px',
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            color: '#fff',
            fontSize: '12px',
            fontFamily: 'system-ui, sans-serif'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Film size={14} className="animate-pulse" style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: '500' }}>{title || 'ESPERANDO VIDEO...'}</span>
          </div>
          {requestedBy && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.9 }}>
              <User size={13} style={{ color: 'var(--accent)' }} />
              <span>Por: <b>{requestedBy}</b></span>
            </div>
          )}
        </div>
      </div>
    </DraggableWidget>
  );
}
