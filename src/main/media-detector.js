const { spawn } = require('child_process');

class MediaDetector {
  constructor(broadcast) {
    this.broadcast = broadcast;
    this.lastMedia = null;
    this.interval = null;
    this.ps = null;
    this.buffer = '';
  }

  start() {
    if (this.interval) clearInterval(this.interval);
    
    if (!this.ps && process.platform === 'win32') {
      this.ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', '-']);
      
      this.ps.stdout.on('data', (data) => {
        this.buffer += data.toString('utf8');
        let idx = this.buffer.indexOf('---END---');
        while (idx !== -1) {
          const chunk = this.buffer.slice(0, idx);
          const jsonStr = chunk.replace('---START---', '').trim();
          this.processOutput(jsonStr);
          const remainder = this.buffer.slice(idx + '---END---'.length);
          this.buffer = remainder;
          idx = this.buffer.indexOf('---END---');
        }
        if (this.buffer.length > 1_000_000) {
          console.warn('[MediaDetect] Output buffer too large, resetting to avoid memory growth');
          this.buffer = '';
        }
      });
      
      this.ps.stderr.on('data', (err) => console.error('[MediaDetect PS Error]', err.toString()));
      this.ps.on('close', () => { this.ps = null; });
    }

    this.interval = setInterval(() => this.detectMedia(), 3000); // 3 seconds interval
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    if (this.ps) {
      this.ps.stdin.end();
      this.ps.kill();
      this.ps = null;
    }
  }

  detectMedia() {
    if (process.platform === 'win32') {
      if (!this.ps) {
        console.log('[MediaDetect] PowerShell process crashed or not running. Restarting...');
        this.start();
      }
      if (this.ps && this.ps.stdin.writable) {
        const script = `
$OutputEncoding = [console]::InputEncoding = [console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$procs = @(Get-Process Spotify, chrome, msedge, firefox, opera, brave, zen -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle }) | Select-Object Name, MainWindowTitle | ConvertTo-Json -Compress
Write-Host "---START---"
Write-Host $procs
Write-Host "---END---"
`;
        this.ps.stdin.write(script + '\n');
      }
    }
  }

  processOutput(stdout) {
    if (!stdout || stdout === 'null') return;
    try {
      let procs = JSON.parse(stdout.trim());
      if (!Array.isArray(procs)) procs = [procs];
      let media = null;
      if (Array.isArray(procs)) {
        for (const p of procs) {
          if (!p || !p.Name || !p.MainWindowTitle) continue;
          const name = p.Name.toLowerCase();
          const title = p.MainWindowTitle;
          if (name === 'spotify' && title !== 'Spotify' && title !== 'Spotify Premium' && title !== 'Spotify Free') {
            const parts = title.split(' - ');
            if (parts.length >= 2) {
              media = { artist: parts[0], title: parts.slice(1).join(' - '), source: 'spotify' };
            } else {
              media = { artist: 'Spotify', title: title, source: 'spotify' };
            }
            break;
          }
          if ((name === 'chrome' || name === 'msedge' || name === 'firefox' || name === 'opera' || name === 'brave' || name === 'zen') && title.includes('- YouTube')) {
            const clean = title.replace(/ - YouTube.*/, '').replace(/^\(\d+\)\s+/, '');
            media = { artist: 'YouTube', title: clean, source: 'youtube' };
            break;
          }
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
    } catch(e) { console.error('[MediaDetect] Parse error:', e.message); }
  }
}

module.exports = MediaDetector;

