const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let YT_DLP_PATH = 'yt-dlp';
const devFallback = 'C:\\Users\\Helminth\\AppData\\Local\\Python\\pythoncore-3.14-64\\Scripts\\yt-dlp.exe';
if (fs.existsSync(devFallback)) {
  YT_DLP_PATH = devFallback;
}

function getAudioStreamUrl(videoId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      '--no-warnings',
      '-f', 'bestaudio',
      '--get-url',
      '--socket-timeout', '15',
      '--retries', '2',
      url
    ];

    let stdout = '';
    let stderr = '';

    const child = spawn(YT_DLP_PATH, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('yt-dlp timeout'));
    }, 20000);

    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });

    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim().startsWith('http')) {
        resolve(stdout.trim());
      } else {
        console.error('[yt-dlp] stderr:', stderr);
        reject(new Error(`yt-dlp failed with code ${code}: ${stderr.slice(0, 200)}`));
      }
    });

    child.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

module.exports = { getAudioStreamUrl };
