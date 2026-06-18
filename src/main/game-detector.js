const { exec } = require('child_process');
const https = require('https');

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
    const cmd = process.platform === 'win32' ? 'tasklist /FO CSV /NH' : 'ps -e -o comm=';

    await new Promise(resolve => {
      exec(cmd, { timeout: 5000 }, (err, stdout) => {
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
      });
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

  async fetchGameImage(gameName) {
    const key = gameName.toLowerCase();
    if (this.imageCache[key]) return this.imageCache[key];

    const appId = STEAM_APP_IDS[key] || STEAM_APP_IDS[key.replace(/\s+/g,'')];
    if (appId) {
      const url = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
      const exists = await this.checkUrl(url);
      if (exists) { this.imageCache[key] = url; return url; }
      const url2 = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
      const exists2 = await this.checkUrl(url2);
      if (exists2) { this.imageCache[key] = url2; return url2; }
    }

    try {
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=english&cc=US`;
      const data = await this.fetchJSON(searchUrl);
      const items = data?.items;
      if (items?.length) {
        const first = items[0];
        const imgUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${first.id}/library_600x900.jpg`;
        const exists = await this.checkUrl(imgUrl);
        if (exists) { this.imageCache[key] = imgUrl; return imgUrl; }
        const imgUrl2 = `https://cdn.cloudflare.steamstatic.com/steam/apps/${first.id}/header.jpg`;
        this.imageCache[key] = imgUrl2; return imgUrl2;
      }
    } catch(e) { console.log('[GameImage] Steam search failed:', e.message); }

    return null;
  }

  start() {
    if (this.gameDetectInterval) clearInterval(this.gameDetectInterval);
    this.gameDetectInterval = setInterval(() => this.detectGame(), 10000);
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
