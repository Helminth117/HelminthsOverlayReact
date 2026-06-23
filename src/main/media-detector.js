const { exec } = require('child_process');

class MediaDetector {
  constructor(broadcast, getConfig) {
    this.broadcast = broadcast;
    this.getConfig = getConfig;
    this.lastMedia = null;
    this.interval = null;
  }

  start() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.detectMedia(), 10000); // Poll every 10 seconds (reduced from 3s)
    this.detectMedia();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  detectMedia() {
    if (this.getConfig) {
      const cfg = this.getConfig();
      if (!cfg || cfg.autoDetectMedia === false) {
        if (this.lastMedia !== null) {
          this.lastMedia = null;
          this.broadcast('media-updated', null);
        }
        return;
      }
    }

    if (process.platform === 'win32') {
      // Query process window titles using a targeted PowerShell command
      // It only inspects Spotify and browsers (extremely lightweight, avoids 200+ tasklist scans, no CP65001 crashes)
      const cmd = 'powershell -NoProfile -NonInteractive -Command "Get-Process -Name Spotify, chrome, msedge, firefox, brave, zen -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object Name, MainWindowTitle | ConvertTo-Json -Compress"';
      exec(cmd, { timeout: 6000 }, (err, stdout) => {
        if (stdout && stdout.trim()) {
          this.processOutput(stdout);
        } else {
          // If stdout is empty, it means no targeted processes are running, clear media
          this.processOutput('[]');
        }
      });
    }
  }

  processOutput(stdout) {
    if (!stdout) return;
    try {
      let procs = [];
      const trimmed = stdout.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        procs = JSON.parse(trimmed);
        if (!Array.isArray(procs)) procs = [procs];
      }

      let media = null;
      for (const p of procs) {
        if (!p || !p.Name || !p.MainWindowTitle) continue;
        const name = p.Name.toLowerCase();
        const title = p.MainWindowTitle;
        
        // Match Spotify
        if (name === 'spotify' && title !== 'Spotify' && title !== 'Spotify Premium' && title !== 'Spotify Free') {
          const parts = title.split(' - ');
          if (parts.length >= 2) {
            media = { artist: parts[0], title: parts.slice(1).join(' - '), source: 'spotify' };
          } else {
            media = { artist: 'Spotify', title: title, source: 'spotify' };
          }
          break;
        }
        
        // Match browser processes with YouTube
        if ((name === 'chrome' || name === 'msedge' || name === 'firefox' || name === 'brave' || name === 'zen') && title.includes('- YouTube')) {
          const clean = title.replace(/ - YouTube.*/, '').replace(/^\(\d+\)\s+/, '');
          media = { artist: 'YouTube', title: clean, source: 'youtube' };
          break;
        }
      }
      
      const mediaStr = media ? `${media.artist}-${media.title}` : null;
      if (mediaStr !== this.lastMedia) {
        this.lastMedia = mediaStr;
        
        if (media) {
          // Fetch album art and duration from iTunes API
          const query = encodeURIComponent(`${media.artist} ${media.title}`);
          fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`)
            .then(r => r.json())
            .then(data => {
              if (data.results && data.results.length > 0) {
                const res = data.results[0];
                if (res.artworkUrl100) {
                  media.albumArt = res.artworkUrl100.replace('100x100bb', '600x600bb');
                }
                if (res.trackTimeMillis) {
                  media.duration = res.trackTimeMillis;
                }
              } else if (media.source === 'youtube') {
                media.albumArt = 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg';
              }
              this.broadcast('media-updated', media);
            })
            .catch(() => {
              if (media.source === 'youtube') {
                media.albumArt = 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg';
              }
              this.broadcast('media-updated', media);
            });
        } else {
          this.broadcast('media-updated', null);
        }
      }
    } catch (e) {
      console.error('[MediaDetect] Parse error:', e.message);
    }
  }
}

module.exports = MediaDetector;

