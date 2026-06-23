const { app, ipcMain, desktopCapturer, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { FILES, DEFAULT_SESSION, DEFAULT_CONFIG } = require('./constants');
const store = require('./store');
const { broadcast, getOverlayWin } = require('./windows');
const { scanSteamGames } = require('./game-scanner');
const filter = require('./filter');
const economyService = require('./economy-service');
const videoReactionService = require('./video-reaction-service');

function getBlacklist() {
  let baseList = [];
  try {
    const blData = require('./blacklist.json');
    baseList = Object.values(blData).filter(Array.isArray).flat();
  } catch (e) {
    console.error("Error requiring blacklist.json", e);
  }
  const custom = store.getConfig()?.customBlacklist || [];
  return [...baseList, ...custom];
}

function getYtDlpPath() {
  // 1. Intentar buscar en la carpeta de recursos de la build en producción
  const prodPath = path.join(process.resourcesPath, 'yt-dlp.exe');
  if (fs.existsSync(prodPath)) return prodPath;

  // 2. Intentar buscar en la carpeta bin/ del proyecto
  const localBinPath = path.join(app.getAppPath(), 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localBinPath)) return localBinPath;

  // 3. Fallback de desarrollo dinámico
  if (process.platform === 'win32' && process.env.USERPROFILE) {
    const devFallback = path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Python', 'pythoncore-3.14-64', 'Scripts', 'yt-dlp.exe');
    if (fs.existsSync(devFallback)) return devFallback;
  }

  // 4. Intentar usar la PATH de Windows
  return 'yt-dlp';
}

let qrData = null;
let ytmusicInstance = null;
function setQrData(data) { qrData = data; }

function createSharedActions(tiktokService, gameDetector) {
  const { readJSON, writeJSON, getConfig, updateConfig } = store;
  return {
    async saveSession(data) {
      await writeJSON(FILES.session, data);
      broadcast('session-updated', data);
      return true;
    },
    async guardarSesion() {
      const session = readJSON(FILES.session, DEFAULT_SESSION);
      const notes   = readJSON(FILES.notes, { notes: '' });
      const history = readJSON(FILES.historial, []);
      const now = new Date();
      history.unshift({
        fecha: now.toISOString().split('T')[0],
        hora: now.toTimeString().slice(0, 5),
        timestamp: now.toISOString(),
        sections: session.sections || [],
        done: session.done || [],
        notes: notes.notes || '',
      });
      await writeJSON(FILES.historial, history);
      await writeJSON(FILES.notes, { notes: '' });
      await writeJSON(FILES.session, DEFAULT_SESSION);
      broadcast('session-updated', DEFAULT_SESSION);
      tiktokService.resetStats();
      return true;
    },
    async continuarSesion(idx) {
      const history = readJSON(FILES.historial, []);
      if (idx >= 0 && idx < history.length) {
        const entry = history[idx];
        const data = { sections: entry.sections || [], done: entry.done || [] };
        await writeJSON(FILES.session, data);
        broadcast('session-updated', data);
      }
      return true;
    },
    async deleteHistorial(idx) {
      const history = readJSON(FILES.historial, []);
      if (idx >= 0 && idx < history.length) history.splice(idx, 1);
      await writeJSON(FILES.historial, history);
      return true;
    },
    async savePlantillas(data) {
      await writeJSON(FILES.plantillas, data);
      return true;
    },
    async saveNotes(text) {
      await writeJSON(FILES.notes, { notes: text });
      return true;
    },
    async saveGameProfiles(profiles) {
      const cfg = getConfig();
      cfg.gameProfiles = profiles;
      updateConfig(cfg);
      try {
        await writeJSON(FILES.gameProfiles, profiles);
      } catch (_) {}
      return true;
    },
    toggleAutoDetect(val) {
      updateConfig({ autoDetectGame: val });
      if (val) gameDetector.start();
      else gameDetector.stop();
      return true;
    }
  };
}

function registerIpcHandlers(tiktokService, twitchService, gameDetector, createTikTokAuthWindow) {
  const { readJSON, writeJSON, getConfig, updateConfig } = store;
  const actions = createSharedActions(tiktokService, gameDetector);

  ipcMain.handle('open-tiktok-auth', () => createTikTokAuthWindow());
  ipcMain.handle('get-tiktok-auth', () => getConfig().tiktokAuth || null);
  ipcMain.handle('clear-tiktok-auth', () => {
    const config = getConfig();
    delete config.tiktokAuth;
    updateConfig(config);
    tiktokService.setAuth(null, null);
    return true;
  });

  ipcMain.handle('test-bot-command', async (_e, { user, text }) => {
    const username = (user || 'Tester').trim();
    if (!username) return false;
    economyService.addPoints(username, 100000);
    const dbUser = economyService.getUser(username);
    broadcast('economy-update', { username, ...dbUser });
    await tiktokService.processBotCommand(username, text);
    return true;
  });

  ipcMain.handle('get-user-economy', (_e, username) => economyService.getUser(username));
  ipcMain.handle('get-leaderboard', (_e, limit) => economyService.getLeaderboard(limit));
  ipcMain.handle('admin-set-points', (_e, username, points) => {
    const user = economyService.getUser(username);
    if (user) {
      user.points = points;
      economyService.save();
      broadcast('economy-update', { username, ...user });
      return user;
    }
    return null;
  });
  ipcMain.handle('admin-give-points', (_e, username, amount) => {
    economyService.addPoints(username, amount);
    const user = economyService.getUser(username);
    if (user) {
      broadcast('economy-update', { username, ...user });
      return user;
    }
    return null;
  });

  ipcMain.handle('get-video-queue', () => videoReactionService.getQueue());
  ipcMain.handle('mark-video-played', (_e, id) => videoReactionService.markPlayed(id));
  ipcMain.handle('remove-video-queue', (_e, id) => videoReactionService.removeFromQueue(id));
  ipcMain.handle('update-video-reaction-settings', (_e, settings) => videoReactionService.updateSettings(settings));

  ipcMain.handle('get-remote-info', () => qrData);

  ipcMain.handle('get-config', () => getConfig());
  ipcMain.handle('save-config', (_e, data) => updateConfig(data));

  ipcMain.handle('get-fallback-playlist', async () => {
    try {
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      const { DATA_DIR } = require('./constants');

      const possiblePaths = [
        path.join(DATA_DIR, 'canciones.txt'),
        path.join(app.getPath('userData'), 'canciones.txt'),
        path.join(app.getAppPath(), 'canciones.txt')
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf8');
          const lines = content
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));
          return lines;
        }
      }
      return [];
    } catch (err) {
      console.error('get-fallback-playlist error:', err);
      return [];
    }
  });

  ipcMain.handle('activate-license', async (_e, key) => {
    const license = require('./license');
    const result = await license.validateLicense(key);
    if (result.valid) {
      const windows = require('./windows');
      windows.createOverlay();
      windows.createControl();
      windows.createTray();
      gameDetector.start();
      const win = windows.getActivationWin();
      if (win) win.close();
    }
    return result;
  });

  ipcMain.handle('get-session', () => readJSON(FILES.session, DEFAULT_SESSION));
  ipcMain.handle('save-session', async (_e, data) => await actions.saveSession(data));

  ipcMain.handle('get-historial', () => readJSON(FILES.historial, []));
  ipcMain.handle('guardar-sesion', async () => await actions.guardarSesion());
  ipcMain.handle('continuar-sesion', async (_e, idx) => await actions.continuarSesion(idx));
  ipcMain.handle('delete-historial', async (_e, idx) => await actions.deleteHistorial(idx));

  ipcMain.handle('get-plantillas',  () => readJSON(FILES.plantillas, { plantillas: [] }));
  ipcMain.handle('save-plantillas', async (_e, data) => await actions.savePlantillas(data));

  ipcMain.handle('get-notes',  () => readJSON(FILES.notes, { notes: '' }));
  ipcMain.handle('save-notes', async (_e, text) => await actions.saveNotes(text));

  ipcMain.handle('get-desktop-audio-id', async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      return sources[0]?.id || null;
    } catch (err) {
      return null;
    }
  });

  ipcMain.on('set-move-mode', (_e, active) => {
    const windows = require('./windows');
    const overlayWin = windows.getOverlayWin();
    
    [overlayWin].forEach(win => {
      if (!win || win.isDestroyed()) return;
      if (active) {
        win.setIgnoreMouseEvents(false);
        win.setFocusable(true);
      } else {
        win.setIgnoreMouseEvents(true, { forward: true });
        win.setFocusable(false);
      }
    });

    if (active && overlayWin && !overlayWin.isDestroyed()) {
      overlayWin.focus();
    }
  });

  ipcMain.on('timer-tick', (_e, data) => broadcast('timer-tick', data));

  ipcMain.on('video-reaction-play', (_e, data) => broadcast('video-reaction-play', data));
  ipcMain.on('video-reaction-pause', () => broadcast('video-reaction-pause'));
  ipcMain.on('video-reaction-resume', () => broadcast('video-reaction-resume'));
  ipcMain.on('video-reaction-stop', () => broadcast('video-reaction-stop'));
  ipcMain.on('video-reaction-seek', (_e, seconds) => broadcast('video-reaction-seek', seconds));
  ipcMain.on('video-reaction-volume', (_e, level) => broadcast('video-reaction-volume', level));
  ipcMain.on('video-reaction-time', (_e, data) => broadcast('video-reaction-time', data));

  ipcMain.on('local-song-started', (_e, data) => broadcast('local-song-started', data));
  ipcMain.on('local-media-time', (_e, data) => broadcast('local-media-time', data));
  ipcMain.on('local-lyrics-update', (_e, data) => broadcast('local-lyrics-update', data));

  ipcMain.on('item-completed', (_e, data) => {
    let itemName = data.itemId;
    const sessionData = readJSON(FILES.session, DEFAULT_SESSION);
    for (const sec of sessionData.sections || []) {
      for (const item of sec.items || []) {
        if (item.id === data.itemId) { itemName = item.name; break; }
      }
    }
    broadcast('item-completed', { ...data, itemName });
  });

  ipcMain.handle('tiktok-connect', async (_e, username) => tiktokService.connect(username));
  ipcMain.handle('tiktok-reset', () => { tiktokService.resetStats(); return true; });
  ipcMain.handle('twitch-connect', async (_e, channel) => twitchService.connect(channel));
  ipcMain.handle('twitch-disconnect', () => { twitchService.stop(); return true; });

  ipcMain.handle('toggle-auto-detect', (_e, val) => actions.toggleAutoDetect(val));
  ipcMain.handle('force-game-detect', () => { gameDetector.forceDetect(); return true; });

  ipcMain.handle('get-game-profiles', () => {
    const raw = readJSON(FILES.gameProfiles, null);
    if (Array.isArray(raw)) return raw;
    const fallback = getConfig().gameProfiles;
    if (Array.isArray(fallback)) {
      try { writeJSON(FILES.gameProfiles, fallback); } catch (_) {}
      return fallback;
    }
    return [];
  });
  ipcMain.handle('save-game-profiles', async (_e, profiles) => await actions.saveGameProfiles(profiles));

  ipcMain.handle('scan-pc-games', async () => {
    try {
      return scanSteamGames();
    } catch (e) {
      console.error('Failed to scan PC games:', e);
      return [];
    }
  });

  ipcMain.handle('select-image', () => {
    const { dialog } = require('electron');
    const res = dialog.showOpenDialogSync({
      title: 'Seleccionar imagen de fondo',
      filters: [ { name: 'Imágenes', extensions: ['jpg', 'png', 'jpeg', 'webp', 'gif'] } ],
      properties: ['openFile']
    });
    if (res && res.length > 0) {
      const filePath = res[0];
      store.addTempAllowedPath(filePath);
      return 'local-file://' + filePath.replace(/\\\\/g, '/');
    }
    return null;
  });

  ipcMain.on('preview-alert', (_e, data) => {
    if (data && data.type === 'combo') {
      const amt = data.count || 1;
      tiktokService.stats.likes += amt;
      const user = 'Tester';
      tiktokService.userLikes[user] = (tiktokService.userLikes[user] || 0) + amt;
      if (tiktokService.userLikes[user] > tiktokService.stats.topLikerCount) {
        tiktokService.stats.topLiker = user;
        tiktokService.stats.topLikerCount = tiktokService.userLikes[user];
      }
      broadcast('tiktok-stats', tiktokService.stats);
      broadcast('tiktok-like', { user, count: amt });
    } else {
      broadcast('stream-alert', data);
    }
  });

  ipcMain.on('play-soundboard', (_e, id) => broadcast('play-soundboard', id));
  ipcMain.on('test-chat-tts', (_e, msg) => {
    if (msg) {
      msg.text = filter.cleanText(msg.text);
      msg.user = filter.cleanText(msg.user);
    }
    broadcast('tiktok-chat', msg);
  });
  ipcMain.on('pin-chat-message', (_e, data) => broadcast('highlight-chat', data));

  ipcMain.on('yt-pause', () => { console.log('[Main] RUTA: yt-pause recibido -> broadcast al overlay'); broadcast('yt-pause'); });
  ipcMain.on('yt-resume', () => { console.log('[Main] RUTA: yt-resume recibido -> broadcast al overlay'); broadcast('yt-resume'); });
  ipcMain.on('yt-stop', () => { console.log('[Main] RUTA: yt-stop recibido -> broadcast al overlay'); broadcast('yt-stop'); });
  ipcMain.on('yt-skip', () => { console.log('[Main] RUTA: yt-skip recibido -> broadcast al overlay'); broadcast('yt-skip'); });
  ipcMain.on('yt-remove-song', (_e, index) => { console.log('[Main] RUTA: yt-remove-song recibido -> broadcast al overlay', index); broadcast('yt-remove-song', index); });

  ipcMain.on('queue-updated', (_e, queue) => broadcast('queue-updated', queue));

  ipcMain.handle('search-youtube', async (_e, payload) => await searchYoutubeHelper(payload));

  ipcMain.handle('get-audio-stream-url', async (_e, videoId) => {
    try {
      const ytDlpPath = getYtDlpPath();
      const args = [
        '--no-warnings',
        '-f', 'bestaudio[ext=webm]/bestaudio',
        '--get-url',
        '--socket-timeout', '15',
        '--retries', '2',
        `https://www.youtube.com/watch?v=${videoId}`
      ];
      return await new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const child = spawn(ytDlpPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
          try { child.kill('SIGTERM'); } catch (_) {}
          reject(new Error('yt-dlp timeout'));
        }, 20000);
        child.stdout.on('data', chunk => { stdout += chunk.toString(); });
        child.stderr.on('data', chunk => { stderr += chunk.toString(); });
        child.on('close', code => {
          clearTimeout(timer);
          if (code === 0 && stdout.trim().startsWith('http')) resolve({ url: stdout.trim(), format: 'stream' });
          else reject(new Error(`yt-dlp failed with code ${code}: ${stderr.slice(0, 200)}`));
        });
        child.on('error', err => {
          clearTimeout(timer);
          reject(err);
        });
      });
    } catch (err) {
      console.error('get-audio-stream-url error:', err);
      return null;
    }
  });

  ipcMain.handle('get-lyrics', async (_e, payload) => {
    try {
      if (!payload) return null;
      let url = '';
      if (typeof payload === 'string') {
        url = `https://lrclib.net/api/search?q=${encodeURIComponent(payload)}`;
      } else {
        url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(payload.track_name || '')}&artist_name=${encodeURIComponent(payload.artist_name || '')}`;
      }
      let res = await net.fetch(url);
      if (!res.ok) return null;
      let data = await res.json();
      
      // Fallback: Si no hay resultados con busqueda exacta, intentar con fuzzy (q=)
      if ((!Array.isArray(data) || data.length === 0) && typeof payload !== 'string') {
        const fuzzyUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(payload.track_name + ' ' + payload.artist_name)}`;
        res = await net.fetch(fuzzyUrl);
        if (res.ok) {
          data = await res.json();
        }
      }

      if (!Array.isArray(data) || data.length === 0) return null;
      
      let track = data[0];
      if (typeof payload === 'object' && payload.duration && payload.duration > 0) {
        let bestDiff = Infinity;
        for (const t of data) {
           if (t.duration && t.syncedLyrics) {
              const diff = Math.abs(t.duration - payload.duration);
              if (diff < bestDiff) {
                 bestDiff = diff;
                 track = t;
              }
           }
        }
      }

      // Si el mejor match no tiene syncedLyrics, forzar a buscar uno que sí tenga
      if (!track.syncedLyrics) {
         const withSynced = data.find(t => t.syncedLyrics);
         if (withSynced) track = withSynced;
      }

      return {
        syncedLyrics: track.syncedLyrics || null,
        plainLyrics: track.plainLyrics || null,
        title: track.trackName || '',
        artist: track.artistName || '',
        duration: track.duration || 0
      };
    } catch (err) {
      console.error('get-lyrics error:', err);
      return null;
    }
  });
}

async function searchYoutubeHelper(payload) {
  try {
    let query = '';
    let maxDuration = 25 * 60; // 25 minutes default
    let targetDuration = null;

    if (typeof payload === 'string') {
      query = payload;
    } else if (payload && typeof payload === 'object') {
      query = payload.query || '';
      if (payload.opts && typeof payload.opts.maxDuration === 'number') {
        maxDuration = payload.opts.maxDuration * 60;
      }
      if (payload.opts && typeof payload.opts.targetDuration === 'number') {
        targetDuration = payload.opts.targetDuration;
      }
    }

    if (!query || typeof query !== 'string') return null;
    query = query.substring(0, 200).trim();

    const ytSearch = require('yt-search');
    
    // Blacklist definitions (Using module-level cache)
    const blacklist = getBlacklist();
    
    // Filter query through filter.cleanText containing normalizations (use non-strict check for searches)
    const cleanQuery = filter.cleanText(query, false);
    if (cleanQuery.includes('*') || cleanQuery === '') {
      console.log('[SearchYT] Query blocked by filter:', query);
      return null;
    }
    
    // 1. Direct URL check (Keep using yt-search for direct links)
    const urlMatch = query.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (urlMatch) {
       const videoId = urlMatch[1];
       const v = await ytSearch({ videoId: videoId });
       if (v) {
          if (v.seconds > maxDuration) return null;
          const titleLower = v.title.toLowerCase();
          const authorLower = v.author.name.toLowerCase();
          if (blacklist.some(bw => titleLower.includes(bw) || authorLower.includes(bw))) return null;
          return { videoId: v.videoId, title: v.title, author: v.author.name, duration: v.timestamp, seconds: v.seconds };
       }
    }

    // 2. YouTube Music API Search
    if (!ytmusicInstance) {
      const YTMusic = require('ytmusic-api');
      ytmusicInstance = new YTMusic();
      await ytmusicInstance.initialize();
    }

    const r = await ytmusicInstance.searchSongs(query);

    if (r && r.length > 0) {
      let bestVideo = null;
      let bestDiff = Infinity;
      
      const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const blacklistRegexes = blacklist.map(bw => new RegExp(`(?:^|\\W)${escapeRegExp(bw)}(?:\\W|$)`, 'i'));

      for (let i = 0; i < Math.min(r.length, 10); i++) {
         const v = r[i];
         const titleLower = v.name.toLowerCase();
         const authorLower = v.artist ? v.artist.name.toLowerCase() : '';
         
         // Check blacklist con filter.cleanText y regex
         if (blacklistRegexes.some(regex => regex.test(titleLower) || regex.test(authorLower)) ||
             filter.cleanText(titleLower).includes('*') ||
             filter.cleanText(authorLower).includes('*')) {
           continue;
         }
         
         // Check duration limit (v.duration is in seconds)
         if (v.duration > maxDuration) continue;
         
         // Check for hidden loops
         if (v.duration > 600 && (titleLower.includes('1 hour') || titleLower.includes('10 hour') || titleLower.includes('loop'))) {
            continue;
         }

         if (targetDuration) {
           const diff = Math.abs(v.duration - targetDuration);
           if (diff < bestDiff) {
             bestDiff = diff;
             bestVideo = v;
           }
         } else {
           bestVideo = v;
           break;
         }
      }
      
      // Si usamos targetDuration y la mejor diferencia es demasiado alta (ej: mayor a 12 segundos),
      // relajamos el filtro de duración y tomamos la primera coincidencia válida.
      if (targetDuration && bestDiff > 12) {
        for (let i = 0; i < Math.min(r.length, 10); i++) {
           const v = r[i];
           const titleLower = v.name.toLowerCase();
           const authorLower = v.artist ? v.artist.name.toLowerCase() : '';
            if (blacklistRegexes.some(regex => regex.test(titleLower) || regex.test(authorLower)) ||
                filter.cleanText(titleLower).includes('*') ||
                filter.cleanText(authorLower).includes('*')) {
              continue;
            }
           if (v.duration > maxDuration) continue;
           if (v.duration > 600 && (titleLower.includes('1 hour') || titleLower.includes('10 hour') || titleLower.includes('loop'))) continue;
           bestVideo = v;
           break;
        }
      }
      
      if (bestVideo) {
        const v = bestVideo;
        const m = Math.floor(v.duration / 60);
        const s = (v.duration % 60).toString().padStart(2, '0');
        const timestamp = `${m}:${s}`;
        return {
          videoId: v.videoId,
          title: v.name,
          author: v.artist ? v.artist.name : 'Unknown',
          duration: timestamp,
          seconds: v.duration
        };
      }
    }
    return null;
  } catch (err) {
    console.error('searchYoutubeHelper error:', err);
    return null;
  }
}

function createRpcHandler(tiktokService, gameDetector) {
  const { readJSON, getConfig, updateConfig } = store;
  const actions = createSharedActions(tiktokService, gameDetector);

  return async (method, args) => {
    try {
      switch (method) {
        case 'getConfig': return getConfig();
        case 'saveConfig': return updateConfig(args[0]);
        case 'getSession': return readJSON(FILES.session, DEFAULT_SESSION);
        case 'saveSession': return await actions.saveSession(args[0]);
        case 'getHistorial': return readJSON(FILES.historial, []);
        case 'getPlantillas': return readJSON(FILES.plantillas, { plantillas: [] });
        case 'savePlantillas': return await actions.savePlantillas(args[0]);
        case 'getNotes': return readJSON(FILES.notes, { notes: '' });
        case 'saveNotes': return await actions.saveNotes(args[0]);
        case 'tiktokConnect': return await tiktokService.connect(args[0]);
        case 'tiktokReset': { tiktokService.resetStats(); return true; }
        case 'getGameProfiles': {
          const raw = readJSON(FILES.gameProfiles, null);
          if (Array.isArray(raw)) return raw;
          const fallback = getConfig().gameProfiles;
          if (Array.isArray(fallback)) return fallback;
          return [];
        }
        case 'saveGameProfiles': return await actions.saveGameProfiles(args[0]);
        case 'scanPcGames': {
          const { scanSteamGames } = require('./game-scanner');
          return scanSteamGames();
        }
        case 'emitTimer': { broadcast('timer-tick', args[0]); return true; }
        case 'emitItemCompleted': { broadcast('item-completed', args[0]); return true; }
        case 'setMoveMode': { broadcast('move-mode', args[0]); return true; }
        case 'previewAlert': {
          if (args[0] && args[0].type === 'combo') {
            const amt = args[0].count || 1;
            tiktokService.stats.likes += amt;
            const user = 'Tester';
            tiktokService.userLikes[user] = (tiktokService.userLikes[user] || 0) + amt;
            if (tiktokService.userLikes[user] > tiktokService.stats.topLikerCount) {
              tiktokService.stats.topLiker = user;
              tiktokService.stats.topLikerCount = tiktokService.userLikes[user];
            }
            broadcast('tiktok-stats', tiktokService.stats);
            broadcast('tiktok-like', { user, count: amt });
          } else {
            broadcast('stream-alert', args[0]);
          }
          return true;
        }
        case 'testChatTts': {
          const msg = args[0];
          if (msg) {
            msg.text = filter.cleanText(msg.text);
            msg.user = filter.cleanText(msg.user);
          }
          const text = (msg && msg.text || '').trim().toLowerCase();
          if (text === '!pause') { console.log('[Server] RUTA: Móvil envía !pause -> broadcast yt-pause al overlay'); broadcast('yt-pause'); return true; }
          if (text === '!resume' || text === '!play') { console.log('[Server] RUTA: Móvil envía !resume -> broadcast yt-resume al overlay'); broadcast('yt-resume'); return true; }
          if (text === '!stop') { console.log('[Server] RUTA: Móvil envía !stop -> broadcast yt-stop al overlay'); broadcast('yt-stop'); return true; }
          if (text === '!skip' || text === '!back') { console.log('[Server] RUTA: Móvil envía !skip -> broadcast yt-skip al overlay'); broadcast('yt-skip'); return true; }
          broadcast('tiktok-chat', msg);
          return true;
        }
        case 'playSoundboard': { broadcast('play-soundboard', args[0]); return true; }
        case 'guardarSesion': return await actions.guardarSesion();
        case 'continuarSesion': return await actions.continuarSesion(args[0]);
        case 'deleteHistorial': return await actions.deleteHistorial(args[0]);
        case 'toggleAutoDetect': return actions.toggleAutoDetect(args[0]);
        case 'forceGameDetect': { gameDetector.forceDetect(); return true; }
        case 'selectImage': return null;
        case 'getRemoteInfo': return qrData;
        case 'ytPause': { broadcast('yt-pause'); return true; }
        case 'ytResume': { broadcast('yt-resume'); return true; }
        case 'ytStop': { broadcast('yt-stop'); return true; }
        case 'ytSkip': { broadcast('yt-skip'); return true; }
        case 'ytSetVolume': { broadcast('yt-set-volume', args[0]); return true; }
        case 'ytRemoveSong': { broadcast('yt-remove-song', args[0]); return true; }
        case 'searchYoutube': return await searchYoutubeHelper(args[0]);
        case 'sendQueueUpdate': { broadcast('queue-updated', args[0]); return true; }
        default: return null;
      }
    } catch (e) { console.error('RPC Error:', e); throw e; }
  };
}

module.exports = {
  registerIpcHandlers,
  createRpcHandler,
  setQrData
};
