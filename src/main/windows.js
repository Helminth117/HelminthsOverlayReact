const { app, BrowserWindow, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let overlayWin = null;
let controlWin = null;
let activationWin = null;
let tray = null;

function broadcast(channel, data) {
  [overlayWin, controlWin].forEach(w => {
    if (w && !w.isDestroyed()) w.webContents.send(channel, data);
  });
  const remoteServer = require('./server');
  remoteServer.broadcastEvent(channel, data);
}

function createOverlay() {
  const display = screen.getPrimaryDisplay();
  // 9:16 vertical — 607×1080 (HD height, narrow width, good capture quality)
  const W = 607, H = 1080;
  overlayWin = new BrowserWindow({
    width: W, height: H,
    x: Math.max(0, Math.floor((display.bounds.width - W) / 2)), y: 0,
    transparent: true, frame: false,
    backgroundColor: '#00000000',
    alwaysOnTop: true, skipTaskbar: true,
    resizable: false, movable: true, focusable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required',
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });
  overlayWin.setAspectRatio(9 / 16);
  overlayWin.setIgnoreMouseEvents(true, { forward: true });
  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.setVisibleOnAllWorkspaces(true);
  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    overlayWin.loadURL(`${url}overlay.html`);
  } else {
    overlayWin.loadFile(path.join(__dirname, '../../dist/overlay.html'));
  }
  overlayWin.webContents.on('console-message', (e, l, m) => console.log('[Overlay]', m));
  
  require('./ytWindow').initYtPlayer(overlayWin);
}

function createControl() {
  controlWin = new BrowserWindow({
    width: 460, height: 860,
    title: 'HelminthsOverlay — Control',
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });
  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    controlWin.loadURL(`${url}control.html`);
  } else {
    controlWin.loadFile(path.join(__dirname, '../../dist/control.html'));
  }
  controlWin.webContents.on('console-message', (e, l, m) => console.log('[Control]', m));
  // Notify control window to auto-toggle social via IPC (replaces executeJavaScript)
  controlWin.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (controlWin && !controlWin.isDestroyed()) {
        controlWin.webContents.send('auto-toggle-social', 'tiktok');
      }
    }, 2000);
  });
  controlWin.on('closed', () => { app.quit(); });
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Control Panel', click: () => { if (!controlWin) createControl(); else controlWin.focus(); }},
    { label: 'Mostrar Overlay', click: () => overlayWin?.show() },
    { label: 'Ocultar Overlay', click: () => overlayWin?.hide() },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() },
  ]));
  tray.setToolTip('HelminthsOverlay Pro');
}

function createActivationWindow(onSuccess) {
  activationWin = new BrowserWindow({
    width: 400, height: 500,
    title: 'Activación - StreamOverlay Pro',
    resizable: false, frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });
  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    activationWin.loadURL(`${url}activation.html`);
  } else {
    activationWin.loadFile(path.join(__dirname, '../../dist/activation.html'));
  }
  activationWin.on('closed', () => { 
    activationWin = null; 
    // If not successful, quit app
    if (!controlWin) app.quit(); 
  });
}

module.exports = {
  broadcast,
  createOverlay,
  createControl,
  createTray,
  createActivationWindow,
  getActivationWin: () => activationWin,
  getOverlayWin: () => overlayWin,
  getControlWin: () => controlWin
};
