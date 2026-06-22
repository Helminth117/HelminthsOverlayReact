const { app, ipcMain, session, desktopCapturer, protocol, net } = require('electron');
const { exec } = require('child_process');
const https = require('https');
const path = require('path');
const fs = require('fs');

// Redirect stdout/stderr to a file for troubleshooting
const logFilePath = path.join(app.getPath('userData'), 'app.log');
try {
  if (fs.existsSync(logFilePath)) {
    const stats = fs.statSync(logFilePath);
    if (stats.size > 5 * 1024 * 1024) { // 5MB limit
      if (fs.existsSync(logFilePath + '.old')) {
        fs.unlinkSync(logFilePath + '.old');
      }
      fs.renameSync(logFilePath, logFilePath + '.old');
    }
  }
} catch (e) {
  // Ignore filesystem errors during boot
}
const logFile = fs.createWriteStream(logFilePath, { flags: 'a' });
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
  const msg = `[${new Date().toLocaleTimeString()}] ` + args.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' ');
  logFile.write(msg + '\n');
  originalLog.apply(console, args);
};

console.error = function(...args) {
  const msg = `[${new Date().toLocaleTimeString()}] [ERROR] ` + args.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' ');
  logFile.write(msg + '\n');
  originalError.apply(console, args);
};

console.log('--- SESSION STARTED ---');
console.log('UserData Path:', app.getPath('userData'));

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

if (!app.isPackaged) {
  app.disableHardwareAcceleration();
}

const { FILES, DEFAULT_SESSION, DEFAULT_CONFIG } = require('./constants');
const store = require('./store');

// ── Secure protocol for local images (must be before app.ready) ──
protocol.registerSchemesAsPrivileged([{
  scheme: 'local-file',
  privileges: { standard: false, secure: true, supportFetchAPI: true, corsEnabled: false, stream: true }
}]);

const remoteServer = require('./server');

// Helpers de store locales
const { getConfig, updateConfig } = store;

const windows = require('./windows');
const { createOverlay, createControl, createTray, broadcast } = windows;

store.setConfigChangeCallback((newConfig) => {
  broadcast('config-updated', newConfig);
  remoteServer.broadcastConfig(newConfig);
});
const ipcHandlers = require('./ipc-handlers');

const GameDetector = require('./game-detector');
const gameDetector = new GameDetector(broadcast, getConfig, updateConfig);

const MediaDetector = require('./media-detector');
const mediaDetector = new MediaDetector(broadcast);

const TikTokService = require('./tiktok-service');
const tiktokService = new TikTokService(broadcast, getConfig);

const TwitchService = require('./twitch-service');
const twitchService = new TwitchService(broadcast);

ipcHandlers.registerIpcHandlers(tiktokService, twitchService, gameDetector);

// ── App lifecycle ──
app.whenReady().then(() => {
  // ── Register secure protocol handler for local images ──
  protocol.handle('local-file', (request) => {
    const rawPath = decodeURIComponent(request.url.replace('local-file://', ''));
    if (rawPath.includes('..') || rawPath.toLowerCase().includes('%2e%2e')) {
      return new Response('Forbidden: directory traversal not allowed', { status: 403 });
    }
    const filePath = path.resolve(rawPath);
    
    // Restrict access to whitelisted paths or app files
    const appPath = path.resolve(app.getAppPath());
    const userDataPath = path.resolve(app.getPath('userData'));
    
    const isAppFile = filePath.startsWith(appPath) || filePath.startsWith(userDataPath);
    const isAllowed = isAppFile || store.isPathAllowed(filePath);
    
    if (!isAllowed) {
      return new Response('Forbidden: path not whitelisted', { status: 403 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.ico', '.webm', '.mp4'];
    if (!allowedExts.includes(ext)) {
      return new Response('Forbidden: only media files allowed', { status: 403 });
    }
    return net.fetch('file:///' + filePath);
  });

  // ── LOCAL MEDIA DETECTION ──
  mediaDetector.start();

  // Whitelist permissions: only allow media and display-capture (for audio visualizer)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const ALLOWED_PERMISSIONS = ['media', 'display-capture', 'mediaKeySystem'];
    callback(ALLOWED_PERMISSIONS.includes(permission));
  });
  // Start the remote server FIRST to serve overlay via HTTP
  remoteServer.startServer(getConfig(), (newCfg) => {
    updateConfig(newCfg);
  }, ipcHandlers.createRpcHandler(tiktokService, gameDetector)).then(res => {
    ipcHandlers.setQrData(res);
    console.log('[Remote] QR Code Ready');
    
    const license = require('./license');
    if (!license.checkActivation()) {
      windows.createActivationWindow();
      return;
    }

    // Now create windows so they can load from http://127.0.0.1:3030 if needed
    createOverlay();
    createControl();
    createTray();
    
    // start game detector
    gameDetector.start();

    // start twitch service auto-connect if channel is configured
    const twitchChannel = getConfig().twitchChannel;
    if (twitchChannel) {
      twitchService.connect(twitchChannel);
    }
  });
});

app.on('window-all-closed', () => app.quit());
