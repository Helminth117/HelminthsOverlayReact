const { exec, execFile } = require('child_process');
const https = require('https');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const STEAM_APP_IDS = {
  'minecraft':    '1672970',
  'javaw':        '1672970',
  'dota2':        '570',
  'dota 2':       '570',
  're2':          '883710',
  'resident evil 2': '883710',
  'monster hunter world': '582010',
  'monsterhunterworld': '582010',
  'stardew valley': '413150',
  'stardewvalley': '413150',
  'monster hunter': '582010',
};

class GameDetector {
  constructor(broadcast, getConfig, updateConfig) {
    this.broadcast = broadcast;
    this.getConfig = getConfig;
    this.updateConfig = updateConfig;

    this.imageCache = {};
    this.lastDetectedGame = null;
    this.gameDetectInterval = null;
    this.gameDetectRunning = false;
  }

  normalizeProfileName(name) {
    return String(name || '')
      .replace(/\.exe$/i, '')
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      .trim();
  }

  parseTasklistOutput(stdout) {
    const names = [];
    stdout.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const firstComma = trimmed.indexOf(',');
      let token = firstComma === -1 ? trimmed : trimmed.slice(0, firstComma);
      token = token.trim().replace(/^"+|"+$/g, '');
      const base = this.normalizeProfileName(token);
      if (!base) return;
      names.push(base.toLowerCase());
    });
    const unique = Array.from(new Set(names));
    return unique;
  }

  async detectGame() {
    if (this.gameDetectRunning) return;
    const cfg = this.getConfig();
    if (!cfg || !cfg.autoDetectGame || !(cfg.gameProfiles && cfg.gameProfiles.length)) {
      return;
    }

    this.gameDetectRunning = true;

    await new Promise(resolve => {
      const callback = (err, stdout) => {
        this.gameDetectRunning = false;
        if (err) {
          console.error('[GameDetect] exec error:', err && err.message ? err.message : String(err));
          resolve();
          return;
        }

        const processes = this.parseTasklistOutput(stdout);
        const candidates = cfg.gameProfiles
          .filter(p => p && p.enabled !== false)
          .map(p => ({ profile: p, key: this.normalizeProfileName(p.process).toLowerCase() }));

        let matched = null;
        for (const item of candidates) {
          if (processes.includes(item.key)) { matched = item.profile; break; }
        }

        console.log('[GameDetect] processes:', processes.length, 'candidates:', candidates.length, 'matched:', matched ? matched.name : 'none');

        const nextName = matched ? matched.name : null;
        if (nextName !== this.lastDetectedGame) {
          this.lastDetectedGame = nextName;
          if (!matched) {
            if (this.updateConfig) {
              this.updateConfig({ gameName: 'Just Chatting', accent: '#FF5E8E', gameImage: null });
            }
          } else if (matched.imageUrl) {
            if (this.updateConfig) {
              this.updateConfig({ gameName: matched.name, accent: matched.accent, gameImage: matched.imageUrl });
            }
            if (this.broadcast) {
              this.broadcast('stream-alert', { type: 'game', message: matched.name, accent: matched.accent, imageUrl: matched.imageUrl });
            }
          } else {
            this.fetchGameImage(matched.name).then(imageUrl => {
              if (this.updateConfig) {
                this.updateConfig({ gameName: matched.name, accent: matched.accent, gameImage: imageUrl || null });
              }
              if (this.broadcast) {
                this.broadcast('stream-alert', { type: 'game', message: matched.name, accent: matched.accent, imageUrl: imageUrl || null });
              }
            }).catch(() => {
              if (this.updateConfig) {
                this.updateConfig({ gameName: matched.name, accent: matched.accent, gameImage: null });
              }
            });
          }
        }
        resolve();
      };

      if (process.platform === 'win32') {
        execFile('tasklist.exe', ['/FO', 'CSV', '/NH'], { timeout: 5000 }, callback);
      } else {
        execFile('ps', ['-e', '-o', 'comm='], { timeout: 5000 }, callback);
      }
    });
  }

  fetchJSON(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { timeout: 4000 }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
      }).on('error', reject).on('timeout', reject);
    });
  }

  checkUrl(url) {
    return new Promise(resolve => {
      const req = https.request(url, { method: 'HEAD', timeout: 3000 }, res => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    });
  }

  async upscaleAndCacheImage(url, appId) {
    try {
      const cacheDir = path.join(app.getPath('userData'), 'cache', 'game-images');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      const is2x = url.includes('_2x');
      const cachePath = path.join(cacheDir, is2x ? `${appId}_2x.jpg` : `${appId}_upscaled.jpg`);
      const fileUrl = 'local-file://' + cachePath.replace(/\\/g, '/');

      if (fs.existsSync(cachePath)) {
        return fileUrl;
      }

      console.log(`[GameImage] Downloading game image: ${url}`);
      const buffer = await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download image: ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
      });

      // If it is already a native 2x high-resolution image, write buffer directly (saves CPU/time)
      if (url.includes('_2x')) {
        fs.writeFileSync(cachePath, buffer);
        console.log(`[GameImage] Success caching native 2x high-res game image ID ${appId}`);
        return fileUrl;
      }

      // Read and resize using Jimp (pure JS, non-native dependency) for lower-resolution fallback covers
      const image = await Jimp.read(buffer);
      // Upscale 600x900 to 1200x1800 for high quality on 1080p outputs
      await image
        .resize(1200, 1800, Jimp.RESIZE_LANCZOS3)
        .quality(85)
        .writeAsync(cachePath);

      console.log(`[GameImage] Success upscaling and caching game ID ${appId}`);
      return fileUrl;
    } catch (err) {
      console.error('[GameImage] Caching/upscaling cover art failed, falling back to original url:', err);
      return url;
    }
  }

  async fetchGameImage(gameName) {
    const key = gameName.toLowerCase();
    if (this.imageCache[key]) return this.imageCache[key];

    const appId = STEAM_APP_IDS[key] || STEAM_APP_IDS[key.replace(/\s+/g,'')];
    if (appId) {
      // 1. Try native 2x high resolution grid first (1200x1800 px)
      const url2x = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`;
      const exists2x = await this.checkUrl(url2x);
      if (exists2x) {
        const cached = await this.upscaleAndCacheImage(url2x, appId);
        this.imageCache[key] = cached;
        return cached;
      }

      // 2. Fallback to standard 600x900 grid (and upscale with Jimp)
      const url = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
      const exists = await this.checkUrl(url);
      if (exists) {
        const upscaled = await this.upscaleAndCacheImage(url, appId);
        this.imageCache[key] = upscaled;
        return upscaled;
      }

      // 3. Fallback to header image
      const urlHeader = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
      const existsHeader = await this.checkUrl(urlHeader);
      if (existsHeader) {
        const upscaled = await this.upscaleAndCacheImage(urlHeader, appId);
        this.imageCache[key] = upscaled;
        return upscaled;
      }
    }

    try {
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=english&cc=US`;
      const data = await this.fetchJSON(searchUrl);
      const items = data?.items;
      if (items?.length) {
        const first = items[0];
        
        // Try native 2x first
        const url2x = `https://cdn.cloudflare.steamstatic.com/steam/apps/${first.id}/library_600x900_2x.jpg`;
        const exists2x = await this.checkUrl(url2x);
        if (exists2x) {
          const cached = await this.upscaleAndCacheImage(url2x, first.id);
          this.imageCache[key] = cached;
          return cached;
        }

        // Try standard grid
        const imgUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${first.id}/library_600x900.jpg`;
        const exists = await this.checkUrl(imgUrl);
        if (exists) {
          const upscaled = await this.upscaleAndCacheImage(imgUrl, first.id);
          this.imageCache[key] = upscaled;
          return upscaled;
        }

        // Try header
        const imgUrlHeader = `https://cdn.cloudflare.steamstatic.com/steam/apps/${first.id}/header.jpg`;
        const existsHeader = await this.checkUrl(imgUrlHeader);
        if (existsHeader) {
          const upscaled = await this.upscaleAndCacheImage(imgUrlHeader, first.id);
          this.imageCache[key] = upscaled;
          return upscaled;
        }
      }
    } catch(e) { console.log('[GameImage] Steam search failed:', e.message); }

    return null;
  }

  start() {
    if (this.gameDetectInterval) clearInterval(this.gameDetectInterval);
    this.gameDetectInterval = setInterval(() => this.detectGame(), 30000); // 30 seconds interval
    this.detectGame();
  }

  stop() {
    if (this.gameDetectInterval) {
      clearInterval(this.gameDetectInterval);
      this.gameDetectInterval = null;
    }
  }

  forceDetect() {
    this.lastDetectedGame = null;
    this.detectGame();
  }
}

module.exports = GameDetector;
