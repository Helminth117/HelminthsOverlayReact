const { app, ipcMain, session, desktopCapturer, protocol, net, BrowserWindow } = require('electron');
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

// Enable hardware acceleration for WebGL2 rendering in development
// if (!app.isPackaged) {
//   app.disableHardwareAcceleration();
// }

// Force hardware acceleration and ignore GPU blacklist for WebGL2 stability
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-webgl2-compute-context');

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

// ── Single Instance Lock to prevent multiple concurrent background processes of the app ──
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Another instance of StreamOverlay is already running. Quitting this instance.');
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    const controlWindow = windows.getControlWin ? windows.getControlWin() : null;
    if (controlWindow) {
      if (controlWindow.isMinimized()) controlWindow.restore();
      controlWindow.focus();
    }
  });
}

store.setConfigChangeCallback((newConfig) => {
  broadcast('config-updated', newConfig);
  remoteServer.broadcastConfig(newConfig);
});
const ipcHandlers = require('./ipc-handlers');

const GameDetector = require('./game-detector');
const gameDetector = new GameDetector(broadcast, getConfig, updateConfig);

const MediaDetector = require('./media-detector');
const mediaDetector = new MediaDetector(broadcast, getConfig);

const TikTokService = require('./tiktok-service');
const tiktokService = new TikTokService(broadcast, getConfig);
const initialCfg = getConfig();
if (initialCfg && initialCfg.tiktokAuth) {
  tiktokService.setAuth(initialCfg.tiktokAuth.sessionId, initialCfg.tiktokAuth.ttTargetIdc);
}

const TwitchService = require('./twitch-service');
const twitchService = new TwitchService(broadcast);

const MinecraftService = require('./minecraft-service');
const minecraftService = new MinecraftService(broadcast, getConfig, updateConfig);

let tiktokAuthWin = null;
function createTikTokAuthWindow() {
  if (tiktokAuthWin) {
    tiktokAuthWin.focus();
    return;
  }
  
  tiktokAuthWin = new BrowserWindow({
    width: 480,
    height: 720,
    title: 'TikTok Login',
    webPreferences: {
      partition: 'persist:tiktok',
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  tiktokAuthWin.loadURL('https://www.tiktok.com/login');

  const ses = tiktokAuthWin.webContents.session;
  let authChecked = false;

  const cookieInterval = setInterval(async () => {
    if (!tiktokAuthWin || tiktokAuthWin.isDestroyed()) {
      clearInterval(cookieInterval);
      return;
    }
    try {
      const cookies = await ses.cookies.get({ domain: 'tiktok.com' });
      const sessionIdCookie = cookies.find(c => c.name === 'sessionid');
      const ttTargetIdcCookie = cookies.find(c => c.name === 'tt-target-idc');

      if (sessionIdCookie && ttTargetIdcCookie) {
        clearInterval(cookieInterval);
        authChecked = true;
        
        const sessionId = sessionIdCookie.value;
        const ttTargetIdc = ttTargetIdcCookie.value;

        // Guardamos en config.json bajo tiktokAuth
        const config = store.getConfig();
        config.tiktokAuth = { sessionId, ttTargetIdc };
        store.updateConfig(config);

        // Emit tiktok-auth-saved to renderer
        broadcast('tiktok-auth-saved', { sessionId, ttTargetIdc });

        // set auth in service
        tiktokService.setAuth(sessionId, ttTargetIdc);

        if (tiktokAuthWin && !tiktokAuthWin.isDestroyed()) {
          tiktokAuthWin.close();
        }
      }
    } catch (e) {
      console.error('[TikTokAuth] Error checking cookies:', e);
    }
  }, 2000);

  tiktokAuthWin.on('closed', () => {
    tiktokAuthWin = null;
    clearInterval(cookieInterval);
    if (!authChecked) {
      broadcast('tiktok-auth-cancelled');
    }
  });
}

ipcHandlers.registerIpcHandlers(tiktokService, twitchService, gameDetector, createTikTokAuthWindow);

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

  // ── MINECRAFT WORLD WATCHER ──
  minecraftService.start();

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
