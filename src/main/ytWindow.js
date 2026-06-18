const { BrowserWindow, ipcMain } = require('electron');

let ytWin = null;
let overlayWebContents = null;

function initYtPlayer(overlayWin) {
  overlayWebContents = overlayWin.webContents;
  
  ipcMain.on('yt-play', (event, { videoId, volume }) => {
    if (!ytWin) {
      ytWin = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          backgroundThrottling: false
        }
      });
      
      // Block Ad Domains natively
      ytWin.webContents.session.webRequest.onBeforeRequest({
        urls: [
          '*://*.doubleclick.net/*',
          '*://*.googlesyndication.com/*',
          '*://*.googleads.g.doubleclick.net/*',
          '*://*.googleadservices.com/*',
          '*://pubads.g.doubleclick.net/*',
          '*://adservice.google.com/*',
          '*://*.youtube.com/api/stats/ads*',
          '*://*.youtube.com/pagead/*',
          '*://*.youtube.com/ptracking/*',
          '*://*.youtube.com/get_midroll_info*',
          '*://*.youtube.com/youtubei/v1/player/ad_break*'
        ]
      }, (details, callback) => {
        callback({ cancel: true });
      });
      // Mute the window initially
      ytWin.webContents.setAudioMuted(true);

      // Detect when title changes to YT_ENDED or YT_TIME
      ytWin.on('page-title-updated', (e, title) => {
        if (title === 'YT_ENDED' && overlayWebContents) {
          overlayWebContents.send('yt-ended');
        } else if (title.startsWith('YT_TIME|') && overlayWebContents) {
          const parts = title.split('|');
          overlayWebContents.send('yt-time', { current: parseFloat(parts[1]), total: parseFloat(parts[2]) });
        }
      });
    }

    ytWin.webContents.setAudioMuted(true); // Always mute before loading new url
    ytWin.loadURL(`https://www.youtube.com/watch?v=${videoId}`);
    
    ytWin.webContents.once('did-finish-load', () => {
      ytWin.webContents.executeJavaScript(`
        if (window.__ytAdTimer) clearInterval(window.__ytAdTimer);
        window.__ytAdTimer = setInterval(() => {
          // Remove ad blocker warning overlay/modal if it appears
          const adBlockDialog = document.querySelector('ytd-enforcement-message-renderer, yt-playability-error-supported-renderers');
          if (adBlockDialog) {
            adBlockDialog.remove();
          }
          
          // Remove popups and backdrops that block the UI
          const backdrops = document.querySelectorAll('tp-yt-iron-overlay-backdrop, ytd-popup-container');
          backdrops.forEach(el => el.remove());

          const video = document.querySelector('video');
          if (video && video.paused && !video.ended && !document.querySelector('.ad-showing, .ad-interrupting')) {
            // Auto-resume if it was paused by an adblock detector overlay
            video.play().catch(()=>{});
          }

          // Speed up, mute, and skip ads instantly
          const isAd = document.querySelector('.ad-showing, .ad-interrupting');
          if (isAd && video) {
            video.muted = true;
            video.playbackRate = 16;
            const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot, .ytp-ad-skip-button-text');
            if (skipBtn) {
              skipBtn.click();
            } else if (!isNaN(video.duration)) {
              video.currentTime = video.duration - 0.1;
            }
          } else if (video) {
            if (video.playbackRate === 16) {
              video.playbackRate = 1;
              video.muted = false;
            }
          }
        }, 100);

        if (window.__ytTimer) clearInterval(window.__ytTimer);
        window.__ytTimer = setInterval(() => {
          const v = document.querySelector('video');
          if (v && !isNaN(v.duration)) {
            // Update title to communicate time: YT_TIME|currentTime|duration
            if (!document.querySelector('.ad-showing')) {
              window.document.title = 'YT_TIME|' + v.currentTime + '|' + v.duration;
            }
          }
        }, 250);

        new Promise((resolve) => {
          const v = document.querySelector('video');
          if (v) {
            v.volume = ${volume / 100};
            v.play().catch(()=>{});
            
            v.onended = () => {
              if (!document.querySelector('.ad-showing')) {
                window.document.title = 'YT_ENDED';
              }
            };
            resolve(true);
          } else {
            resolve(false);
          }
        })
      `).then(() => {
        // Unmute once setup is done
        setTimeout(() => {
          if (ytWin && !ytWin.isDestroyed()) ytWin.webContents.setAudioMuted(false);
        }, 500);
      }).catch(() => {});
    });


  });

  ipcMain.on('yt-stop', () => {
    if (!ytWin || ytWin.isDestroyed()) return;
    ytWin.loadURL('about:blank');
  });
  ipcMain.on('yt-clear-hidden', () => {
    if (!ytWin || ytWin.isDestroyed()) return;
    ytWin.loadURL('about:blank');
  });

  // ZOMBIE HANDLERS REMOVIDOS: ahora maneja ipc-handlers.js + overlay nativo
  ipcMain.on('yt-pause', () => {
    if (ytWin && !ytWin.isDestroyed()) ytWin.webContents.executeJavaScript('document.querySelector("video")?.pause()').catch(()=>{});
  });
  ipcMain.on('yt-resume', () => {
    if (ytWin && !ytWin.isDestroyed()) ytWin.webContents.executeJavaScript('document.querySelector("video")?.play()').catch(()=>{});
  });
  // ipcMain.on('yt-stop', () => { ... });

  ipcMain.on('yt-set-volume', (event, vol) => {
    if (!ytWin || ytWin.isDestroyed()) return;
    ytWin.webContents.executeJavaScript(`
      if (document.querySelector('video')) {
        document.querySelector('video').volume = ${vol / 100};
      }
    `).catch(() => {});
  });
}

module.exports = { initYtPlayer };
