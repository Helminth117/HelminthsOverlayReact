const { Tunnel, bin, install } = require('cloudflared');
const fs = require('fs');
const path = require('path');

async function test() {
  console.log("Checking if cloudflared binary exists...");
  console.log("Expected binary path:", bin);
  
  if (!fs.existsSync(bin)) {
    console.log("Binary not found. Running programmatic installer...");
    await install(bin);
    console.log("Installation finished!");
  } else {
    console.log("Binary already exists.");
  }
  
  console.log("Starting Quick Tunnel to port 3030...");
  const tunnel = Tunnel.quick({ port: 3030 });
  
  tunnel.on('url', (url) => {
    console.log("Tunnel is online! Public URL is:", url);
  });
  
  tunnel.on('error', (err) => {
    console.error("Tunnel error:", err);
  });
  
  tunnel.on('exit', (code) => {
    console.log("Tunnel exited with code:", code);
  });
  
  // Wait 15 seconds then close
  setTimeout(() => {
    console.log("Closing tunnel...");
    tunnel.close();
    process.exit(0);
  }, 15000);
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
