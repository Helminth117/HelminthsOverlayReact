const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');
const qrcode = require('qrcode');
const crypto = require('crypto');

const SESSION_TOKEN = crypto.randomBytes(24).toString('hex');

let io;
let currentConfig = {};

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

async function startServer(config, onConfigUpdate, rpcHandler) {
  currentConfig = config;
  const app = express();
  const server = http.createServer(app);
  io = new Server(server, { 
    cors: { 
      origin: (origin, callback) => {
        // Restrict to local network or undefined origin
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      } 
    } 
  });

  // Token Auth for Security
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token === SESSION_TOKEN) {
      next();
    } else {
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

  // Serve the control panel files
  app.use(express.static(path.join(__dirname, '../../dist')));

  io.on('connection', (socket) => {
    console.log('[Server] Mobile client connected:', socket.id);
    
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

  let currentPort = 3030;
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
      resolve({ url, qrcodeDataUrl: await qrcode.toDataURL(url) });
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
