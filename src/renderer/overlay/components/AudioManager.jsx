import React, { useEffect, useRef, useState } from 'react';
import { useOverlayStore } from '../../store';

let audioCtx = null;

export default function AudioManager() {
  const config = useOverlayStore(s => s.config) || {};
  const audioRef = useRef(null);
  const [ytVideoId, setYtVideoId] = useState(null);

  // Refs for Song Requests & Playback state
  const songQueue = useRef([]);
  const historyQueue = useRef([]);
  const currentSong = useRef(null);
  const currentAudio = useRef(null);
  const isPlayingYt = useRef(false);
  const ytIsPaused = useRef(false);
  const currentLyrics = useRef([]);
  const configRef = useRef(config);
  const isPreloadingQueue = useRef(false);
  const lastSyncedIndexRef = useRef(-1);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const sanitizeSong = (song) => {
    if (!song) return null;
    try {
      return {
        query: song.query,
        user: song.user,
        title: song.title || (song.video ? song.video.title : undefined),
        artist: song.artist || (song.video && song.video.author ? (typeof song.video.author === 'string' ? song.video.author : song.video.author.name) : undefined),
        thumbnail: song.video && song.video.thumbnails && song.video.thumbnails.length > 0 ? song.video.thumbnails[song.video.thumbnails.length - 1].url : undefined,
        preloaded: !!song.preloaded
      };
    } catch (e) {
      console.error('[Cola] Error en sanitizeSong:', e);
      return { query: song.query, user: song.user, preloaded: false };
    }
  };

  const clearLyrics = () => {
    currentLyrics.current = [];
    lastSyncedIndexRef.current = -1;
    if (window.api?.saveNotes) {
      window.api.saveNotes(`[AUDIO-LOG] clearLyrics() called`);
    }
    window.dispatchEvent(new CustomEvent('lyrics-update', {
      detail: {
        prev: '',
        current: ''
      }
    }));
  };

  const stopCurrentAudio = () => {
    if (window.api?.ytClearHidden) {
      try { window.api.ytClearHidden(); } catch (e) {}
    }
    if (currentAudio.current) {
      try { currentAudio.current.pause(); } catch (e) {}
      try { currentAudio.current.src = ''; } catch (e) {}
      currentAudio.current = null;
    }
  };

  const broadcastQueue = () => {
    if (window.api?.sendQueueUpdate) {
      try {
        const cleanCurrent = sanitizeSong(currentSong.current);
        const cleanQueue = songQueue.current.map(s => sanitizeSong(s));
        window.api.sendQueueUpdate({ current: cleanCurrent, queue: cleanQueue });
      } catch (err) {
        console.error('[Cola] Error en broadcastQueue:', err);
      }
    }
  };

  const parseLRC = (lrcText) => {
    if (!lrcText) return [];
    const lines = lrcText.split('\n');
    const parsed = [];
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.+)/;
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
        const time = min * 60 + sec + ms / 1000;
        const text = match[4].trim();
        if (text) parsed.push({ time, text });
      }
    }
    parsed.sort((a, b) => a.time - b.time);
    return parsed;
  };

  const syncLyrics = (ct) => {
    if (currentLyrics.current.length === 0) return;
    const offset = configRef.current?.lyricsOffset !== undefined ? configRef.current.lyricsOffset : 0;
    const adjustedTime = ct + offset;

    let currentIndex = -1;
    for (let i = 0; i < currentLyrics.current.length; i++) {
      if (currentLyrics.current[i].time <= adjustedTime) {
        currentIndex = i;
      } else {
        break;
      }
    }

    if (currentIndex !== lastSyncedIndexRef.current) {
      lastSyncedIndexRef.current = currentIndex;
      const currentText = currentIndex >= 0 ? currentLyrics.current[currentIndex].text : '';
      const prevText = currentIndex > 0 ? currentLyrics.current[currentIndex - 1].text : '';
      if (window.api?.saveNotes) {
        window.api.saveNotes(`[AUDIO-LOG] syncLyrics: current="${currentText}", prev="${prevText}", time=${ct}`);
      }
      window.dispatchEvent(new CustomEvent('lyrics-update', {
        detail: {
          prev: prevText,
          current: currentText
        }
      }));
    }
  };

  const addSongToQueue = (query, user) => {
    console.log('[Cola] Intentando añadir canción:', query, user);
    songQueue.current.push({ query, user, preloaded: false, isPreloading: false });
    if (songQueue.current.length > 50) songQueue.current.shift();

    const queuePos = isPlayingYt.current ? songQueue.current.length : 1;

    try {
      playNextSong();
      preloadNextSong();
      broadcastQueue();
      window.dispatchEvent(new CustomEvent('enqueue-alert', {
        detail: {
          type: 'bot',
          message: `🎵 Añadido a la cola (#${queuePos})`,
          ttsMessage: `¡Claro que sí, ${user}! Añadí tu canción a la cola.`
        }
      }));
    } catch (err) {
      console.error('[Cola] Error en addSongToQueue:', err);
    }
  };

  const preloadNextSong = async () => {
    if (isPreloadingQueue.current) return;
    const songToPreload = songQueue.current.find(s => !s.preloaded && !s.isPreloading);
    if (!songToPreload) return;

    isPreloadingQueue.current = true;
    songToPreload.isPreloading = true;

    try {
      let lyricsData = null;
      let video = null;

      // 1. Intentar buscar letras primero para obtener el título, artista y duración oficiales
      if (window.api?.getLyrics) {
        try {
          const queryStr = songToPreload.query.trim();
          if (queryStr.includes('-')) {
            const parts = queryStr.split('-');
            lyricsData = await window.api.getLyrics({
              track_name: parts.slice(1).join('-').trim(),
              artist_name: parts[0].trim()
            });
          } else {
            lyricsData = await window.api.getLyrics(queryStr);
          }
        } catch (e) {
          console.error('[Cola] Error pre-fetching lyrics:', e);
        }
      }

      // 2. Buscar video en YouTube con el filtro de duración si tenemos letras
      if (window.api?.searchYoutube) {
        if (lyricsData && lyricsData.title && lyricsData.duration) {
          const searchQ = `${lyricsData.artist} - ${lyricsData.title}`;
          video = await window.api.searchYoutube({
            query: searchQ,
            opts: { targetDuration: lyricsData.duration }
          });
          if (video && video.videoId) {
            songToPreload.lyrics = lyricsData.syncedLyrics;
          }
        }

        // Fallback: Si la búsqueda anterior falló o no encontramos letras iniciales, hacer la búsqueda normal
        if (!video) {
          video = await window.api.searchYoutube(songToPreload.query);
        }

        if (video && video.videoId) {
          songToPreload.video = video;

          // Si no pudimos conseguir las letras en el paso 1, intentar buscarlas usando el título del video
          if (!songToPreload.lyrics && window.api.getLyrics) {
            try {
              let cleanTitle = video.title.replace(/\[.*?\]|\(.*?\)|【.*?】|'|".*?"/g, '').split('|')[0].replace(/(official|music video|lyric video|audio|lyrics|video)/gi, '').replace(/\s+/g, ' ').replace(/\s+-\s*$/, '').trim();
              let cleanArtist = (typeof video.author === 'string' ? video.author : (video.author?.name || '')).replace(/VEVO$/i, '').replace(/ - Topic$/i, '').trim();

              const secondaryLyrics = await window.api.getLyrics({ track_name: cleanTitle, artist_name: cleanArtist, duration: video.seconds });
              if (secondaryLyrics && secondaryLyrics.syncedLyrics) {
                songToPreload.lyrics = secondaryLyrics.syncedLyrics;
              }
            } catch (e) {}
          }

          // Obtener stream URL
          if (window.api.getAudioStreamUrl) {
            const result = await window.api.getAudioStreamUrl(video.videoId);
            if (result && result.url) songToPreload.streamUrl = result.url;
          }
        }
      }
    } catch (err) {
      console.error('[Cola] Preload error:', err);
    }

    songToPreload.isPreloading = false;
    songToPreload.preloaded = true;
    isPreloadingQueue.current = false;

    broadcastQueue();
    preloadNextSong();
  };

  const playNextSong = async () => {
    console.log('[Cola] Avanzando. Canciones restantes:', songQueue.current.length);
    if (isPlayingYt.current) return;
    if (songQueue.current.length === 0) {
      stopCurrentAudio();
      isPlayingYt.current = false;
      currentSong.current = null;
      currentLyrics.current = [];
      window.dispatchEvent(new CustomEvent('song-started', { detail: null }));
      if (window.api?.ytStop) window.api.ytStop();
      clearLyrics();
      return;
    }

    clearLyrics();

    isPlayingYt.current = true;
    const next = songQueue.current.shift();
    currentSong.current = next;
    broadcastQueue();

    try {
      while (next.isPreloading) {
        await new Promise(r => setTimeout(r, 100));
      }

      let video = next.video;
      if (!video && window.api?.searchYoutube) {
        let lyricsData = null;
        if (window.api.getLyrics) {
          try {
            const queryStr = next.query.trim();
            if (queryStr.includes('-')) {
              const parts = queryStr.split('-');
              lyricsData = await window.api.getLyrics({
                track_name: parts.slice(1).join('-').trim(),
                artist_name: parts[0].trim()
              });
            } else {
              lyricsData = await window.api.getLyrics(queryStr);
            }
          } catch (e) {}
        }

        if (lyricsData && lyricsData.title && lyricsData.duration) {
          const searchQ = `${lyricsData.artist} - ${lyricsData.title}`;
          video = await window.api.searchYoutube({
            query: searchQ,
            opts: { targetDuration: lyricsData.duration }
          });
          if (video && video.videoId) {
            next.lyrics = lyricsData.syncedLyrics;
          }
        }

        if (!video) {
          video = await window.api.searchYoutube(next.query);
        }
      }

      if (video && video.videoId) {
        next.video = video;
        next.title = video.title;
        next.artist = video.author ? (typeof video.author === 'string' ? video.author : video.author.name).replace(/ - Topic$/i, '').replace(/VEVO$/i, '').trim() : 'YouTube';
        const artSrc = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
        next.thumbnail = artSrc;

        const vol = configRef.current.volMusic !== undefined ? configRef.current.volMusic : 0.8;
        let streamUrl = next.streamUrl || null;
        if (!streamUrl && window.api?.getAudioStreamUrl) {
          const result = await window.api.getAudioStreamUrl(video.videoId);
          if (result && result.url) streamUrl = result.url;
        }

        // Lyrics
        currentLyrics.current = [];
        lastSyncedIndexRef.current = -1;
        if (next.lyrics) {
          currentLyrics.current = parseLRC(next.lyrics);
          if (window.api?.saveNotes) {
            window.api.saveNotes(`[AUDIO-LOG] Loaded preloaded lyrics, count=${currentLyrics.current.length}`);
          }
        } else if (window.api?.getLyrics) {
          try {
            let cleanTitle = video.title.replace(/\[.*?\]|\(.*?\)|【.*?】|'|".*?"/g, '').split('|')[0].replace(/(official|music video|lyric video|audio|lyrics|video)/gi, '').replace(/\s+/g, ' ').replace(/\s+-\s*$/, '').trim();
            let cleanArtist = (typeof video.author === 'string' ? video.author : (video.author?.name || '')).replace(/VEVO$/i, '').replace(/ - Topic$/i, '').trim();

            const lyricsData = await window.api.getLyrics({ track_name: cleanTitle, artist_name: cleanArtist, duration: video.seconds });
            if (lyricsData && lyricsData.syncedLyrics) {
              currentLyrics.current = parseLRC(lyricsData.syncedLyrics);
              if (window.api?.saveNotes) {
                window.api.saveNotes(`[AUDIO-LOG] Fetched API lyrics, count=${currentLyrics.current.length}`);
              }
            } else {
              if (window.api?.saveNotes) {
                window.api.saveNotes(`[AUDIO-LOG] No synced lyrics found for: Title="${cleanTitle}", Artist="${cleanArtist}"`);
              }
            }
          } catch (e) {
            if (window.api?.saveNotes) {
              window.api.saveNotes(`[AUDIO-LOG] Error fetching lyrics: ${e.message}`);
            }
          }
        }

        window.dispatchEvent(new CustomEvent('song-started', {
          detail: {
            title: next.title,
            artist: next.artist,
            requester: next.user,
            thumbnail: artSrc,
            duration: video.seconds || 0
          }
        }));

        if (streamUrl) {
          stopCurrentAudio();
          const audio = new Audio(streamUrl);
          audio.volume = vol;
          audio.onended = () => {
            isPlayingYt.current = false;
            if (currentSong.current) {
              historyQueue.current.push(currentSong.current);
              if (historyQueue.current.length > 50) historyQueue.current.shift();
              currentSong.current = null;
            }
            clearLyrics();
            playNextSong();
          };
          audio.ontimeupdate = () => {
            window.dispatchEvent(new CustomEvent('media-time-update', {
              detail: {
                current: audio.currentTime,
                duration: audio.duration
              }
            }));
            syncLyrics(audio.currentTime);
          };

          currentAudio.current = audio;
          audio.play().catch(err => {
            console.error('Native play failed, fallback to ytPlay:', err);
            if (window.api?.ytPlay) {
              window.api.ytPlay(video.videoId, vol * 100);
            }
          });
        } else if (window.api?.ytPlay) {
          stopCurrentAudio();
          window.api.ytPlay(video.videoId, vol * 100);
        }

        if (window.api?.ytSetVolume) window.api.ytSetVolume(vol * 100);
      } else {
        isPlayingYt.current = false;
        playNextSong();
      }
    } catch (err) {
      console.error('YT search error:', err);
      isPlayingYt.current = false;
      playNextSong();
    }
  };

  useEffect(() => {
    if (!window.api) return;

    window.playAlertSound = (type) => {
      const vol = configRef.current.volAlerts !== undefined ? configRef.current.volAlerts : 1.0;
      let soundUrl = '';
      if (configRef.current.customSounds && configRef.current.customSounds[type]) {
        soundUrl = configRef.current.customSounds[type];
      } else {
        if (type === 'follow') soundUrl = './sounds/follow.mp3';
        else if (type === 'gift') soundUrl = './sounds/gift.mp3';
        else if (type === 'goal') soundUrl = './sounds/level-up.mp3';
      }
      
      if (soundUrl) {
        const audio = new Audio(soundUrl);
        audio.volume = vol;
        audio.play().catch(e => {
          console.warn('Could not play alert sound, falling back to synth:', e);
          playSynthTone(type, vol, configRef.current);
        });
      } else {
        playSynthTone(type, vol, configRef.current);
      }
    };

    const playSynthTone = (type, masterVol, cfg) => {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
      } catch (e) {
        console.warn('AudioContext not supported');
        return;
      }
      
      const now = audioCtx.currentTime;
      const gameName = (cfg.gameName || '').toUpperCase();
      const is8Bit = gameName.includes('MINECRAFT') || gameName.includes('RETRO') || gameName.includes('TERRARIA') || gameName.includes('ROBLOX') || gameName.includes('FALL GUYS') || gameName.includes('STARDEW') || gameName.includes('HOLLOW KNIGHT');
      const isShooter = gameName.includes('VALORANT') || gameName.includes('CS') || gameName.includes('CALL OF DUTY') || gameName.includes('APEX') || gameName.includes('OVERWATCH') || gameName.includes('GTA') || gameName.includes('FORTNITE') || gameName.includes('WARFRAME') || gameName.includes('HALO') || gameName.includes('CYBERPUNK') || gameName.includes('DEEP ROCK');
      const isMagic = gameName.includes('LEAGUE') || gameName.includes('GENSHIN') || gameName.includes('ELDEN') || gameName.includes('ZELDA') || gameName.includes('WOW') || gameName.includes('MONSTER HUNTER') || gameName.includes('DOTA');
      const isHorror = gameName.includes('RESIDENT') || gameName.includes('OUTLAST') || gameName.includes('SILENT') || gameName.includes('FNAF') || gameName.includes('PHASMOPHOBIA') || gameName.includes('AMONG US') || gameName.includes('LEFT 4 DEAD') || gameName.includes('ZOMBOID') || gameName.includes('ARK');

      const playTone = (freq, typeStr, volMultiplier, startTime, duration, freqSlideTo = null) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = typeStr;
        
        const finalVol = volMultiplier * masterVol;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(finalVol, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.frequency.setValueAtTime(freq, startTime);
        if (freqSlideTo) {
          osc.frequency.exponentialRampToValueAtTime(freqSlideTo, startTime + duration);
        }
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      let baseFreq = 440;
      if (type === 'follow') baseFreq = 523.25; // C5
      if (type === 'gift') baseFreq = 880; // A5
      if (type === 'goal') baseFreq = 440; // A4
      if (type === 'game') baseFreq = 600; 

      if (is8Bit) {
        playTone(baseFreq, 'square', 0.15, now, 0.15);
        playTone(baseFreq * 1.25, 'square', 0.15, now + 0.1, 0.15);
        playTone(baseFreq * 1.5, 'square', 0.15, now + 0.2, 0.4);
      } else if (isShooter) {
        playTone(baseFreq * 2, 'sawtooth', 0.1, now, 0.3, baseFreq * 0.5);
        if (type === 'gift' || type === 'goal') {
          playTone(baseFreq * 2.5, 'sawtooth', 0.1, now + 0.1, 0.4, baseFreq * 0.5);
        }
      } else if (isMagic) {
        playTone(baseFreq, 'sine', 0.3, now, 0.8);
        playTone(baseFreq * 2, 'sine', 0.1, now, 1.2); 
        if (type === 'gift' || type === 'goal') {
          playTone(baseFreq * 1.5, 'triangle', 0.15, now + 0.15, 1.0);
        }
      } else if (isHorror) {
        const lowFreq = baseFreq * 0.25;
        playTone(lowFreq, 'triangle', 0.4, now, 2.0);
        playTone(lowFreq * 1.05, 'sine', 0.3, now, 2.0); 
        if (type === 'gift' || type === 'goal') {
          playTone(lowFreq * 2, 'sawtooth', 0.05, now + 0.5, 1.5);
        }
      } else {
        playTone(baseFreq, 'sine', 0.2, now, 0.4);
        playTone(baseFreq * 1.25, 'sine', 0.15, now + 0.1, 0.5);
        if (type === 'goal') playTone(baseFreq * 1.5, 'sine', 0.15, now + 0.2, 0.6);
      }
    };

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

    const handlerPlayYt = window.api.on('play-yt', (data) => {
      if (data && data.videoId) {
        setYtVideoId(data.videoId);
      } else {
        setYtVideoId(null);
      }
    });

    // Control handlers
    const handlerYtPause = () => {
      ytIsPaused.current = true;
      if (currentAudio.current && !currentAudio.current.paused) {
        currentAudio.current.pause();
      }
    };

    const handlerYtResume = () => {
      ytIsPaused.current = false;
      if (currentAudio.current && currentAudio.current.paused) {
        currentAudio.current.play().catch(() => {});
      }
    };

    const handlerYtStop = () => {
      songQueue.current = [];
      historyQueue.current = [];
      isPlayingYt.current = false;
      currentSong.current = null;
      ytIsPaused.current = true;
      stopCurrentAudio();
      window.dispatchEvent(new CustomEvent('song-started', { detail: null }));
      broadcastQueue();
      clearLyrics();
    };

    const handlerYtSkip = () => {
      if (isPlayingYt.current) {
        stopCurrentAudio();
        isPlayingYt.current = false;
        playNextSong();
      }
    };

    const handlerYtEnded = () => {
      isPlayingYt.current = false;
      ytIsPaused.current = true;
      if (currentSong.current) {
        historyQueue.current.push(currentSong.current);
        if (historyQueue.current.length > 50) historyQueue.current.shift();
        currentSong.current = null;
      }
      clearLyrics();
      playNextSong();
    };

    const handlerYtTime = (data) => {
      const { current, total } = data || {};
      window.dispatchEvent(new CustomEvent('media-time-update', {
        detail: {
          current: current || 0,
          duration: total || 0
        }
      }));
      syncLyrics(current || 0);
    };

    const handlerConfigUpdated = (newConfig) => {
      if (newConfig) configRef.current = newConfig;
      const vol = configRef.current.volMusic !== undefined ? configRef.current.volMusic : 0.8;
      if (currentAudio.current) {
        currentAudio.current.volume = vol;
      }
      if (window.api?.ytSetVolume) {
        window.api.ytSetVolume(vol * 100);
      }
    };

    const ipcPause = window.api.on('yt-pause', handlerYtPause);
    const ipcResume = window.api.on('yt-resume', handlerYtResume);
    const ipcStop = window.api.on('yt-stop', handlerYtStop);
    const ipcSkip = window.api.on('yt-skip', handlerYtSkip);
    const ipcEnded = window.api.on('yt-ended', handlerYtEnded);
    const ipcTime = window.api.on('yt-time', handlerYtTime);
    const ipcConfig = window.api.on('config-updated', handlerConfigUpdated);

    // Event listener for song request from ChatManager
    const songRequestHandler = (e) => {
      const { query, user } = e.detail || {};
      if (query && user) {
        addSongToQueue(query, user);
      }
    };
    window.addEventListener('play-song-request', songRequestHandler);

    // Event listener for seek request from WinIsland
    const seekRequestHandler = (e) => {
      const newTime = e.detail;
      if (currentAudio.current) {
        currentAudio.current.currentTime = newTime;
      }
    };
    window.addEventListener('media-seek-request', seekRequestHandler);

    // Event listener for soundboard trigger
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
      window.api.off('play-yt', handlerPlayYt);
      window.api.off('yt-pause', ipcPause);
      window.api.off('yt-resume', ipcResume);
      window.api.off('yt-stop', ipcStop);
      window.api.off('yt-skip', ipcSkip);
      window.api.off('yt-ended', ipcEnded);
      window.api.off('yt-time', ipcTime);
      window.api.off('config-updated', ipcConfig);
      window.api.off('play-soundboard', ipcSoundboard);
      window.removeEventListener('play-song-request', songRequestHandler);
      window.removeEventListener('media-seek-request', seekRequestHandler);
      if (audioRef.current) audioRef.current.pause();
      stopCurrentAudio();
      clearLyrics();
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
