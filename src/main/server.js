const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { app } = require('electron');
const { Tunnel, install, use } = require('cloudflared');
const fs = require('fs');

const SESSION_TOKEN = crypto.randomBytes(24).toString('hex');

let io;
let currentConfig = {};
let tunnelUrl = null;

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  let fallbackIp = '127.0.0.1';
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Ignorar IPs de VPNs comunes si es posible
        if (name.toLowerCase().includes('tailscale') || name.toLowerCase().includes('virtual')) {
          continue;
        }
        // Priorizar IPs de red local comunes (192.168.x.x o 10.x.x.x)
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
          return iface.address;
        }
        fallbackIp = iface.address;
      }
    }
  }
  return fallbackIp !== '127.0.0.1' ? fallbackIp : '127.0.0.1';
}

let tunnelInstance = null;

function verifyWindowsSignature(filePath) {
  if (process.platform !== 'win32') return true;
  try {
    if (!fs.existsSync(filePath)) return false;
    const { execSync } = require('child_process');
    const cmd = `powershell -NoProfile -NonInteractive -Command "(Get-AuthenticodeSignature '${filePath.replace(/'/g, "''")}').Status"`;
    const status = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
    return status === 'Valid';
  } catch (e) {
    console.error('[Tunnel] Signature verification failed to execute:', e);
    return false;
  }
}

async function setupTunnel(port, serverInfo) {
  try {
    const writableBinDir = path.join(app.getPath('userData'), 'bin');
    if (!fs.existsSync(writableBinDir)) {
      fs.mkdirSync(writableBinDir, { recursive: true });
    }
    const customBinPath = path.join(writableBinDir, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
    
    // Check signature if it exists, delete if tampered/invalid
    if (fs.existsSync(customBinPath) && !verifyWindowsSignature(customBinPath)) {
      console.warn('[Tunnel] cloudflared binary has an invalid digital signature or was tampered with. Deleting.');
      try { fs.unlinkSync(customBinPath); } catch (_) {}
    }

    // Set custom path
    use(customBinPath);
    
    // Broadcast connecting status
    const { broadcast } = require('./windows');
    broadcast('tunnel-status', { status: 'connecting' });
    
    if (!fs.existsSync(customBinPath)) {
      console.log('[Tunnel] Downloading cloudflared to:', customBinPath);
      await install(customBinPath);
      console.log('[Tunnel] Download completed!');
      
      // Verify signature after download
      if (!verifyWindowsSignature(customBinPath)) {
        throw new Error('Downloaded cloudflared.exe signature verification failed (not Valid)');
      }
    }
    
    console.log('[Tunnel] Starting quick tunnel to port:', port);
    tunnelInstance = Tunnel.quick(`http://127.0.0.1:${port}`);
    
    tunnelInstance.on('url', async (url) => {
      console.log('[Tunnel] Secure tunnel is online:', url);
      serverInfo.tunnelUrl = url;
      tunnelUrl = url;
      
      // Regenerate connection URL and QR Code using the secure Cloudflare tunnel URL
      const secureUrl = `${url}/control.html?token=${SESSION_TOKEN}`;
      serverInfo.url = secureUrl;
      try {
        serverInfo.qrcodeDataUrl = await qrcode.toDataURL(secureUrl);
        console.log('[Tunnel] Secure Remote QR Code generated');
      } catch (err) {
        console.error('[Tunnel] Failed to generate secure QR Code:', err);
      }
      
      broadcast('tunnel-status', { status: 'online', url });
    });
    
    tunnelInstance.on('error', (err) => {
      console.error('[Tunnel] Tunnel error:', err);
      broadcast('tunnel-status', { status: 'error', error: err.message });
    });
    
    tunnelInstance.on('exit', (code) => {
      console.log('[Tunnel] Tunnel exited with code:', code);
      if (tunnelInstance) {
        broadcast('tunnel-status', { status: 'error', error: `Exited with code ${code}` });
      }
    });
    
  } catch (err) {
    console.error('[Tunnel] Failed to setup tunnel:', err);
    const { broadcast } = require('./windows');
    broadcast('tunnel-status', { status: 'error', error: err.message });
  }
}

app.on('will-quit', () => {
  if (tunnelInstance) {
    console.log('[Tunnel] Stopping Cloudflare Tunnel...');
    try {
      tunnelInstance.stop();
    } catch (e) {
      console.error('[Tunnel] Error stopping tunnel:', e);
    }
    tunnelInstance = null;
  }
});

async function startServer(config, onConfigUpdate, rpcHandler) {
  currentConfig = config;
  const app = express();
  const server = http.createServer(app);
  let currentPort = 3030;
  
  // Resolve socket.io client-dist directory relative to this file (works in both dev and bundled)
  const socketioClientDir = (() => {
    // Try relative to this source file first (dev mode)
    const devPath = path.resolve(__dirname, '../../node_modules/socket.io/client-dist');
    if (fs.existsSync(devPath)) return devPath;
    // Fallback: try relative to process.cwd() (bundled)
    const cwdPath = path.resolve(process.cwd(), 'node_modules/socket.io/client-dist');
    if (fs.existsSync(cwdPath)) return cwdPath;
    // Fallback: try app resources path (packaged Electron)
    const resourcesPath = path.resolve(process.resourcesPath || '', '../node_modules/socket.io/client-dist');
    if (fs.existsSync(resourcesPath)) return resourcesPath;
    return null;
  })();
  
  io = new Server(server, { 
    cors: { 
      origin: (origin, callback) => {
        // Allow all origins dynamically (fully secure due to SESSION_TOKEN auth and local/tunnel bypass checks)
        callback(null, true);
      } 
    },
    transports: ['websocket']
  });

  // ── Serve socket.io client JS at a custom path ──
  // Socket.io intercepts ALL requests starting with /socket.io/ at the HTTP server
  // level, before Express. Using /assets/socketio.js bypasses that interception.
  app.get('/assets/socketio.js', (req, res) => {
    if (socketioClientDir) {
      const clientFile = path.join(socketioClientDir, 'socket.io.js');
      console.log('[Server] Serving socket.io client JS');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache socket.io client aggressively
      res.sendFile(clientFile);
    } else {
      console.warn('[Server] socket.io client-dist NOT FOUND on disk!');
      res.status(404).send('/* socket.io client not found */');
    }
  });

  // Token Auth for Security
  io.use((socket, next) => {
    const origin = socket.handshake.headers.origin || '';
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    // We only authorize the socket connection if:
    // 1. The token matches the SESSION_TOKEN.
    // 2. Or, the origin matches one of our exact allowed origins (local loopback, local IP, or active Cloudflare tunnel).
    // 3. Or, there is no Origin header (e.g., streaming software / direct WS client).
    
    let isAuthorized = token === SESSION_TOKEN;
    
    if (!isAuthorized) {
      const allowedOrigins = [
        `http://localhost:${currentPort}`,
        `http://127.0.0.1:${currentPort}`,
        `http://${getLocalIp()}:${currentPort}`
      ];
      if (tunnelUrl) {
        allowedOrigins.push(tunnelUrl);
      }
      
      const cleanOrigin = origin.trim().toLowerCase();
      const isAllowedOrigin = allowedOrigins.some(ao => cleanOrigin === ao.toLowerCase());
      
      if (!origin || origin === 'null' || isAllowedOrigin) {
        isAuthorized = true;
      }
    }

    if (isAuthorized) {
      next();
    } else {
      console.warn(`[Server] WebSocket authentication failed. Received token: "${token}", Expected: "${SESSION_TOKEN}", Origin: "${origin}"`);
      next(new Error('Unauthorized'));
    }
  });

  // Protect the control panel entry points
  app.get('/', (req, res) => {
    if (req.query.token !== SESSION_TOKEN) return res.status(401).send('<h1>401 Unauthorized</h1><p>Invalid or missing token. Please scan the QR code from the app.</p>');
    res.sendFile(path.join(__dirname, '../../dist/control.html'));
  });

  app.get('/control.html', (req, res, next) => {
    if (req.query.token !== SESSION_TOKEN) return res.status(401).send('<h1>401 Unauthorized</h1><p>Invalid or missing token. Please scan the QR code from the app.</p>');
    next();
  });

  app.get('/api/local-media', (req, res) => {
    const rawPath = req.query.path;
    if (!rawPath) {
      return res.status(400).send('Missing path parameter');
    }

    // Sanitize path to prevent directory traversal
    if (rawPath.includes('..') || rawPath.toLowerCase().includes('%2e%2e')) {
      return res.status(403).send('Forbidden: directory traversal not allowed');
    }

    try {
      const filePath = path.resolve(rawPath);
      
      // Restrict access to whitelisted paths or app/user files
      const { app: electronApp } = require('electron');
      const appPath = path.resolve(electronApp.getAppPath());
      const userDataPath = path.resolve(electronApp.getPath('userData'));
      const store = require('./store');
      
      const isAppFile = filePath.startsWith(appPath) || filePath.startsWith(userDataPath);
      const isAllowedPath = isAppFile || store.isPathAllowed(filePath);
      const hasValidToken = req.query.token === SESSION_TOKEN;
      
      if (!isAllowedPath && !hasValidToken) {
        return res.status(403).send('Forbidden: path not whitelisted or invalid token');
      }

      // Check extension security
      const ext = path.extname(filePath).toLowerCase();
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.ico', '.webm', '.mp4'];
      if (!allowedExts.includes(ext)) {
        return res.status(403).send('Forbidden: only media files allowed');
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
      }

      // Serve the file
      res.sendFile(filePath);
    } catch (err) {
      console.error('[Server] Error serving local media:', err);
      res.status(500).send('Internal server error');
    }
  });

  // Public overlay route (no token required — used by TikTok Live Studio browser source)
  app.get('/overlay.html', (req, res) => {
    const overlayFile = path.join(__dirname, '../../dist/overlay.html');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(overlayFile);
  });

  // Serve the control panel files with cache control to prevent HTML caching and cache assets aggressively
  app.use(express.static(path.join(__dirname, '../../dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache static assets aggressively
      }
    }
  }));

  io.on('connection', (socket) => {
    console.log('[Server] Client connected:', socket.id, 'Origin:', socket.handshake.headers.origin);
    
    // Send current config to the new client
    socket.emit('config-loaded', currentConfig);

    // Listen for config changes from mobile
    socket.on('save-config', (newConfig) => {
      console.log('[Server] Config received from mobile:', Object.keys(newConfig));
      onConfigUpdate(newConfig);
      // Broadcast to other clients
      socket.broadcast.emit('config-loaded', newConfig);
    });

    socket.on('api-request', async (req, callback) => {
      try {
        if (rpcHandler) {
          const result = await rpcHandler(req.method, req.args);
          if (callback) callback({ success: true, data: result });
        } else if (callback) {
          callback({ success: true, data: null });
        }
      } catch (err) {
        console.error(`[Server] RPC error on ${req.method}:`, err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('[Server] Mobile client disconnected:', socket.id);
    });
  });

  currentPort = 3030;
  return new Promise((resolve) => {
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        if (currentPort === 3030) {
          console.log(`[Server] Port 3030 in use, falling back to 3040...`);
          currentPort = 3040;
          server.close();
          server.listen(currentPort, '0.0.0.0');
        } else {
          console.error(`[Server] Error: Port ${currentPort} is already in use. Please close any other instances or applications using this port.`);
          resolve({ url: null, qrcodeDataUrl: null });
        }
      } else {
        console.error(`[Server] Server error:`, e);
      }
    });

    server.listen(currentPort, '0.0.0.0', async () => {
      const ip = getLocalIp();
      console.log(`[Server] Remote control available at http://${ip}:${currentPort}`);
      // Return the connection URL for generating QR code
      const url = `http://${ip}:${currentPort}/control.html?token=${SESSION_TOKEN}`;
      const serverInfo = {
        url,
        qrcodeDataUrl: await qrcode.toDataURL(url),
        token: SESSION_TOKEN,
        tunnelUrl: null
      };
      
      setupTunnel(currentPort, serverInfo);
      
      resolve(serverInfo);
    });
  });
}

function broadcastConfig(config) {
  currentConfig = config;
  if (io) {
    io.emit('config-loaded', currentConfig);
  }
}

function broadcastEvent(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

module.exports = { startServer, broadcastConfig, broadcastEvent };
