const { ipcRenderer } = require('electron');

let targetVolume = null;

// Query current volume immediately on startup
ipcRenderer.invoke('yt-get-volume').then(vol => {
  targetVolume = vol;
}).catch(err => {
  console.error('Failed to get yt-volume from main:', err);
});

window.addEventListener('DOMContentLoaded', () => {
  let ytAdTimer = setInterval(() => {
    const adBlockDialog = document.querySelector('ytd-enforcement-message-renderer, yt-playability-error-supported-renderers');
    if (adBlockDialog) {
      adBlockDialog.remove();
    }
    const backdrops = document.querySelectorAll('tp-yt-iron-overlay-backdrop, ytd-popup-container');
    backdrops.forEach(el => el.remove());

    const video = document.querySelector('video');
    if (video) {
      // Force user-configured volume if targetVolume is loaded
      if (targetVolume !== null) {
        const expectedVol = targetVolume / 100;
        if (Math.abs(video.volume - expectedVol) > 0.01) {
          video.volume = expectedVol;
        }
      }

      if (video.paused && !video.ended && !document.querySelector('.ad-showing, .ad-interrupting')) {
        video.play().catch(()=>{});
      }
    }

    const isAd = document.querySelector('.ad-showing, .ad-interrupting');
    if (isAd && video) {
      video.muted = true;
      video.playbackRate = 16;
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot, .ytp-ad-skip-button-text');
      if (skipBtn) {
        skipBtn.click();
      } else if (!isNaN(video.duration)) {
        video.currentTime = video.duration - 0.1;
      }
    } else if (video) {
      if (video.playbackRate === 16) {
        video.playbackRate = 1;
        // Restore volume based on targetVolume instead of setting muted = false/100%
        if (targetVolume !== null) {
          video.volume = targetVolume / 100;
          video.muted = false;
        } else {
          video.muted = false;
        }
      }
    }
  }, 100);

  let ytTimer = setInterval(() => {
    const v = document.querySelector('video');
    if (v && !isNaN(v.duration)) {
      if (!document.querySelector('.ad-showing')) {
        ipcRenderer.send('yt-time-internal', { current: v.currentTime, total: v.duration });
      }
    }
  }, 250);

  const checkVideo = setInterval(() => {
    const v = document.querySelector('video');
    if (v) {
      clearInterval(checkVideo);
      v.onended = () => {
        if (!document.querySelector('.ad-showing')) {
          ipcRenderer.send('yt-ended-internal');
        }
      };
    }
  }, 500);
});

ipcRenderer.on('yt-control', (event, action) => {
  if (action.type === 'volume') {
    targetVolume = action.value;
  }
  const v = document.querySelector('video');
  if (!v) return;
  if (action.type === 'pause') {
    v.pause();
  } else if (action.type === 'resume') {
    v.play().catch(()=>{});
  } else if (action.type === 'volume') {
    v.volume = action.value / 100;
  }
});
