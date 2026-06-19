const { Tunnel, install, use } = require('cloudflared');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function test() {
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
  const writableBinDir = path.join(appData, 'StreamOverlayReactTest', 'bin');
  
  if (!fs.existsSync(writableBinDir)) {
    fs.mkdirSync(writableBinDir, { recursive: true });
  }
  
  const customBinPath = path.join(writableBinDir, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
  console.log("Setting custom binary path to:", customBinPath);
  
  // Configure library to use this path
  use(customBinPath);
  
  if (!fs.existsSync(customBinPath)) {
    console.log("Binary not found at custom path. Installing...");
    await install(customBinPath);
    console.log("Installation complete!");
  } else {
    console.log("Binary already exists at custom path.");
  }
  
  console.log("Starting quick tunnel...");
  const tunnel = Tunnel.quick("http://localhost:3030");
  
  tunnel.on('url', (url) => {
    console.log("Tunnel is online! URL:", url);
  });
  
  tunnel.on('error', (err) => {
    console.error("Tunnel error:", err);
  });
  
  setTimeout(() => {
    console.log("Closing tunnel...");
    tunnel.stop();
    console.log("Done!");
    process.exit(0);
  }, 10000);
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
