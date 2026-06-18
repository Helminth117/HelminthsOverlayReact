import React, { useEffect, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { playAlertSound } from '../utils/synthTone';
import { useSongManager } from '../hooks/useSongManager';

export default function AudioManager() {
  const config = useOverlayStore(s => s.config) || {};
  const configRef = useRef(config);
  const audioRef = useRef(null);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Hook handles YouTube player playback, preloading, queue and lyrics syncing.
  const { ytVideoId } = useSongManager();

  useEffect(() => {
    if (!window.api) return;

    // Register global alert sound player
    window.playAlertSound = (type) => {
      playAlertSound(type, configRef.current);
    };

    // System-wide non-queue audio effects playback
    const handlerPlayAudio = window.api.on('play-audio', (data) => {
      if (!data || !data.url) return;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(data.url);
      audio.volume = data.volume !== undefined ? data.volume : 1.0;
      audio.play().catch(e => console.warn('Audio play error:', e));
      audioRef.current = audio;
    });

    // Soundboard sound playback
    const ipcSoundboard = window.api.on('play-soundboard', (id) => {
      try {
        const audio = new Audio(`assets/sounds/${id}.mp3`);
        audio.volume = configRef.current.volSoundboard !== undefined ? configRef.current.volSoundboard : 0.8;
        audio.play().catch(err => console.warn('Soundboard play error:', err));
      } catch (e) {
        console.error('Error playing soundboard:', e);
      }
    });

    return () => {
      window.api.off('play-audio', handlerPlayAudio);
      window.api.off('play-soundboard', ipcSoundboard);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  return (
    <div style={{ display: 'none' }}>
      {ytVideoId && (
        <iframe 
          width="1" 
          height="1" 
          src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&enablejsapi=1`} 
          frameBorder="0" 
          allow="autoplay"
        ></iframe>
      )}
    </div>
  );
}
