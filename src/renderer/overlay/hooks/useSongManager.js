import { useState, useEffect, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { parseLRC } from '../utils/lrcParser';

export function useSongManager() {
  const config = useOverlayStore(s => s.config) || {};
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

  useEffect(() => {
    if (!window.api) return;

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
      if (newConfig) {
        const vol = newConfig.volMusic !== undefined ? newConfig.volMusic : 0.8;
        if (currentAudio.current) {
          currentAudio.current.volume = vol;
        }
        if (window.api?.ytSetVolume) {
          window.api.ytSetVolume(vol * 100);
        }
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

    return () => {
      window.api.off('play-yt', handlerPlayYt);
      window.api.off('yt-pause', ipcPause);
      window.api.off('yt-resume', ipcResume);
      window.api.off('yt-stop', ipcStop);
      window.api.off('yt-skip', ipcSkip);
      window.api.off('yt-ended', ipcEnded);
      window.api.off('yt-time', ipcTime);
      window.api.off('config-updated', ipcConfig);
      window.removeEventListener('play-song-request', songRequestHandler);
      window.removeEventListener('media-seek-request', seekRequestHandler);
      stopCurrentAudio();
      clearLyrics();
    };
  }, []);

  return { ytVideoId };
}
