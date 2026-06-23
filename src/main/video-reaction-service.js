const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { app } = require('electron');
const { DATA_DIR } = require('./constants');
const { broadcast } = require('./windows');
const economyService = require('./economy-service');
const EventEmitter = require('events');

function getYtDlpPath() {
  const prodPath = path.join(process.resourcesPath, 'yt-dlp.exe');
  if (fs.existsSync(prodPath)) return prodPath;

  const localBinPath = path.join(app.getAppPath(), 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localBinPath)) return localBinPath;

  if (process.platform === 'win32' && process.env.USERPROFILE) {
    const devFallback = path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Python', 'pythoncore-3.14-64', 'Scripts', 'yt-dlp.exe');
    if (fs.existsSync(devFallback)) return devFallback;
  }
  return 'yt-dlp';
}

class VideoReactionService extends EventEmitter {
  constructor() {
    super();
    this.queueFilePath = path.join(DATA_DIR, 'video-queue.json');
    this.queue = [];
    this.settings = {
      cost: 1000,
      enabled: true
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.queueFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.queueFilePath, 'utf8'));
        this.queue = data.queue || [];
        this.settings = { ...this.settings, ...(data.settings || {}) };
        console.log('[VideoReaction] Cola cargada. Items:', this.queue.length);
      } else {
        this.save();
      }
    } catch (e) {
      console.error('[VideoReaction] Error loading queue:', e);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.queueFilePath, JSON.stringify({
        queue: this.queue,
        settings: this.settings
      }, null, 2), 'utf8');
    } catch (e) {
      console.error('[VideoReaction] Error saving queue:', e);
    }
  }

  async addToQueue(username, url) {
    if (!this.settings.enabled) {
      throw new Error('Sistema de video reacciones desactivado.');
    }

    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!ytRegex.test(url)) {
      throw new Error('URL de YouTube no válida.');
    }

    const cost = this.settings.cost || 1000;
    const user = economyService.getUser(username);
    if (user.points < cost) {
      throw new Error(`Puntos insuficientes. Requieres ${cost} pts, tienes ${user.points}.`);
    }

    economyService.deductPoints(username, cost);

    const item = {
      id: require('crypto').randomUUID(),
      requestedBy: username,
      url,
      title: null,
      filePath: null,
      status: 'pending',
      requestedAt: Date.now(),
      streamDate: new Date().toISOString().split('T')[0]
    };

    this.queue.push(item);
    this.save();

    broadcast('video-reaction-queued', item);
    broadcast('economy-update', { username, ...economyService.getUser(username) });

    // Iniciar descarga asíncrona
    this.downloadVideo(item);

    return item;
  }

  async downloadVideo(item) {
    item.status = 'downloading';
    this.save();
    broadcast('video-reaction-updated', item);

    const ytDlpPath = getYtDlpPath();
    const outputFolder = path.join(DATA_DIR, 'reactions');
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }
    const outputFilePath = path.join(outputFolder, `${item.id}.mp4`);

    // Obtener título primero
    exec(`"${ytDlpPath}" --print title "${item.url}"`, (err, stdout, stderr) => {
      let title = item.url;
      if (!err && stdout) {
        title = stdout.trim();
      }
      item.title = title;
      this.save();

      // Descargar video
      const cmd = `"${ytDlpPath}" -f "best[ext=mp4]/best" -o "${outputFilePath}" "${item.url}"`;
      exec(cmd, (dlErr, dlStdout, dlStderr) => {
        if (dlErr) {
          console.error('[VideoReaction] Error en descarga yt-dlp:', dlErr, dlStderr);
          item.status = 'error';
          this.save();
          broadcast('video-reaction-updated', item);
          return;
        }

        item.status = 'ready';
        item.filePath = outputFilePath;
        this.save();

        const eventData = {
          id: item.id,
          title: item.title,
          requestedBy: item.requestedBy,
          filePath: item.filePath
        };

        this.emit('video-reaction-ready', eventData);

        broadcast('video-reaction-ready', eventData);
        broadcast('video-reaction-updated', item);
      });
    });
  }

  getQueue() {
    return this.queue;
  }

  getPendingQueue() {
    return this.queue.filter(item => item.status === 'pending' || item.status === 'ready' || item.status === 'downloading');
  }

  markPlayed(id) {
    const item = this.queue.find(x => x.id === id);
    if (item) {
      item.status = 'played';
      this.save();
      broadcast('video-reaction-updated', item);
      return true;
    }
    return false;
  }

  removeFromQueue(id) {
    const idx = this.queue.findIndex(x => x.id === id);
    if (idx !== -1) {
      const item = this.queue[idx];
      // Si tiene archivo descargado, limpiarlo para liberar espacio
      if (item.filePath && fs.existsSync(item.filePath)) {
        try {
          fs.unlinkSync(item.filePath);
        } catch (_) {}
      }
      this.queue.splice(idx, 1);
      this.save();
      broadcast('video-reaction-removed', id);
      return true;
    }
    return false;
  }

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.save();
    broadcast('video-reaction-settings-updated', this.settings);
    return this.settings;
  }
}

module.exports = new VideoReactionService();
