const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let YT_DLP_PATH = 'yt-dlp';
if (process.platform === 'win32' && process.env.USERPROFILE) {
  const devFallback = path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Python', 'pythoncore-3.14-64', 'Scripts', 'yt-dlp.exe');
  if (fs.existsSync(devFallback)) {
    YT_DLP_PATH = devFallback;
  }
}

function getPlaylistVideos(playlistUrl) {
  return new Promise((resolve, reject) => {
    const args = [
      '--no-warnings',
      '--flat-playlist',
      '-J',
      playlistUrl
    ];

    let stdout = '';
    let stderr = '';

    const child = spawn(YT_DLP_PATH, args);

    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });

    child.on('close', code => {
      if (code === 0) {
        try {
          const data = JSON.parse(stdout);
          if (data && Array.isArray(data.entries)) {
            const list = data.entries.map(e => ({
              videoId: e.id,
              title: e.title,
              author: e.uploader || e.channel || 'Unknown',
              seconds: e.duration || 0
            }));
            resolve(list);
          } else {
            resolve([]);
          }
        } catch(e) {
          reject(e);
        }
      } else {
        reject(new Error(`yt-dlp failed: ${stderr}`));
      }
    });

    child.on('error', err => reject(err));
  });
}

async function test() {
  try {
    const url = 'https://www.youtube.com/playlist?list=PL3oW2tjiIxvQ1tZ0XSG1y2pD74nU1ZtH9';
    console.log('Obteniendo videos de playlist con yt-dlp:', url);
    const vids = await getPlaylistVideos(url);
    console.log('Videos obtenidos:', vids.length);
    if (vids.length > 0) {
      console.log('Primer video:', vids[0]);
    }
  } catch(e) {
    console.error('Error:', e);
  }
}

test();
