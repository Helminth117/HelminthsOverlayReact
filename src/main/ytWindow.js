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
          backgroundThrottling: false,
          preload: require('path').join(__dirname, '../preload/yt-preload.js')
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
    }

    ytWin.webContents.setAudioMuted(true); // Always mute before loading new url
    ytWin.loadURL(`https://www.youtube.com/watch?v=${videoId}`);
    
    ytWin.webContents.once('did-finish-load', () => {
      ytWin.webContents.send('yt-control', { type: 'volume', value: volume });
      ytWin.webContents.send('yt-control', { type: 'resume' });
      
      setTimeout(() => {
        if (ytWin && !ytWin.isDestroyed()) ytWin.webContents.setAudioMuted(false);
      }, 500);
    });
  });

  ipcMain.on('yt-ended-internal', () => {
    if (overlayWebContents) overlayWebContents.send('yt-ended');
  });

  ipcMain.on('yt-time-internal', (event, data) => {
    if (overlayWebContents) overlayWebContents.send('yt-time', data);
  });

  ipcMain.on('yt-stop', () => {
    if (!ytWin || ytWin.isDestroyed()) return;
    ytWin.loadURL('about:blank');
  });
  ipcMain.on('yt-clear-hidden', () => {
    if (!ytWin || ytWin.isDestroyed()) return;
    ytWin.loadURL('about:blank');
  });

  ipcMain.on('yt-pause', () => {
    if (ytWin && !ytWin.isDestroyed()) ytWin.webContents.send('yt-control', { type: 'pause' });
  });
  ipcMain.on('yt-resume', () => {
    if (ytWin && !ytWin.isDestroyed()) ytWin.webContents.send('yt-control', { type: 'resume' });
  });

  ipcMain.on('yt-set-volume', (event, vol) => {
    if (ytWin && !ytWin.isDestroyed()) ytWin.webContents.send('yt-control', { type: 'volume', value: vol });
  });
}

module.exports = { initYtPlayer };
