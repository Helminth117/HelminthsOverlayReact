const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ── Config ──
  getConfig:     ()      => ipcRenderer.invoke('get-config'),
  saveConfig:    (data)  => ipcRenderer.invoke('save-config', data),
  getRemoteInfo: ()      => ipcRenderer.invoke('get-remote-info'),
  activateLicense: (key) => ipcRenderer.invoke('activate-license', key),

  // ── Session / Objetivos ──
  getSession:    ()      => ipcRenderer.invoke('get-session'),
  saveSession:   (data)  => ipcRenderer.invoke('save-session', data),
  getDesktopAudioId: ()  => ipcRenderer.invoke('get-desktop-audio-id'),

  // ── Historial ──
  getHistorial:  ()           => ipcRenderer.invoke('get-historial'),
  guardarSesion: ()           => ipcRenderer.invoke('guardar-sesion'),
  continuarSesion: (idx)      => ipcRenderer.invoke('continuar-sesion', idx),
  deleteHistorial: (idx)      => ipcRenderer.invoke('delete-historial', idx),

  // ── Plantillas ──
  getPlantillas:   ()         => ipcRenderer.invoke('get-plantillas'),
  savePlantillas:  (data)     => ipcRenderer.invoke('save-plantillas', data),

  // ── Notas ──
  getNotes:    ()      => ipcRenderer.invoke('get-notes'),
  saveNotes:   (text)  => ipcRenderer.invoke('save-notes', text),

  // ── TikTok ──
  tiktokConnect: (user)  => ipcRenderer.invoke('tiktok-connect', user),
  tiktokReset:   ()      => ipcRenderer.invoke('tiktok-reset'),

  // ── Overlay move mode ──
  setMoveMode: (active) => ipcRenderer.send('set-move-mode', active),

  // ── Listen for push events from main ──
  on: (channel, cb) => {
    const allowed = [
      'session-updated', 'config-updated', 'tiktok-stats', 'tiktok-like',
      'item-completed', 'timer-tick', 'stream-alert', 'game-detected', 'tiktok-chat', 'media-updated', 'auto-toggle-social', 'play-soundboard', 'yt-ended', 'yt-time', 'highlight-chat',
      'yt-pause', 'yt-resume', 'yt-stop', 'yt-skip', 'yt-remove-song',
      'queue-updated', 'move-mode', 'pin-message', 'tunnel-status'
    ];
    if (allowed.includes(channel)) {
      const handler = (_e, ...args) => cb(...args);
      ipcRenderer.on(channel, handler);
      return handler;
    }
  },
  off: (channel, handler) => {
    if (handler) ipcRenderer.removeListener(channel, handler);
  },

  // ── Timer (control → overlay) ──
  emitTimer: (data) => ipcRenderer.send('timer-tick', data),
  timerTick: (data) => ipcRenderer.send('timer-tick', data),

  // ── Item completed ──
  itemCompleted: (data) => ipcRenderer.send('item-completed', data),
  emitItemCompleted: (data) => ipcRenderer.send('item-completed', data),

  // ── Alert preview ──
  previewAlert: (data) => ipcRenderer.send('preview-alert', data),

  // ── Background YT Player ──
  ytPlay: (videoId, volume) => ipcRenderer.send('yt-play', { videoId, volume }),
  ytClearHidden: () => ipcRenderer.send('yt-clear-hidden'),
  ytStop: () => ipcRenderer.send('yt-stop'),
  ytPause: () => ipcRenderer.send('yt-pause'),
  ytResume: () => ipcRenderer.send('yt-resume'),
  ytSetVolume: (volume) => ipcRenderer.send('yt-set-volume', volume),
  ytSkip: () => ipcRenderer.send('yt-skip'),
  ytRemoveSong: (index) => ipcRenderer.send('yt-remove-song', index),
  sendQueueUpdate: (queue) => ipcRenderer.send('queue-updated', queue),

  // ── YouTube Audio Stream (ad-free) ──
  getAudioStreamUrl: (videoId) => ipcRenderer.invoke('get-audio-stream-url', videoId),
  getLyrics: (query) => ipcRenderer.invoke('get-lyrics', query),
  getFallbackPlaylist: () => ipcRenderer.invoke('get-fallback-playlist'),

  // ── Chat TTS Test & Pin ──
  testChatTts: (msg) => ipcRenderer.send('test-chat-tts', msg),
  pinChatMessage: (data) => ipcRenderer.send('pin-chat-message', data),

  // ── Song Requests (YouTube) ──
  searchYoutube: (query, opts) => ipcRenderer.invoke('search-youtube', { query, opts }),

  // ── Soundboard ──
  playSoundboard: (id) => ipcRenderer.send('play-soundboard', id),

  // ── Game profiles ──
  getGameProfiles:    ()         => ipcRenderer.invoke('get-game-profiles'),
  saveGameProfiles:   (profiles) => ipcRenderer.invoke('save-game-profiles', profiles),
  scanPcGames:        ()         => ipcRenderer.invoke('scan-pc-games'),
  toggleAutoDetect:   (val)      => ipcRenderer.invoke('toggle-auto-detect', val),
  forceGameDetect:    ()         => ipcRenderer.invoke('force-game-detect'),
  selectImage:        ()         => ipcRenderer.invoke('select-image'),
  writeClipboard:     (text)     => clipboard.writeText(text),
});
