const fs = require('fs');
const { FILES, DEFAULT_CONFIG } = require('./constants');

let cachedConfig = null;
let onConfigChangeCallbacks = [];

function readJSON(file, def) {
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      // Deep merge: fill in any missing top-level keys from defaults
      if (def && typeof def === 'object' && !Array.isArray(def)) {
        for (const key of Object.keys(def)) {
          if (data[key] === undefined) data[key] = JSON.parse(JSON.stringify(def[key]));
        }
      }
      return data;
    }
  } catch(e) {
    console.error(`[Storage] Error reading ${file}:`, e.message);
    try { if (fs.existsSync(file)) fs.copyFileSync(file, file + '.corrupted.' + Date.now()); } catch(_) {}
  }
  return JSON.parse(JSON.stringify(def));
}

const fsp = require('fs').promises;

let writePromise = Promise.resolve();

async function writeJSON(file, data) {
  const currentWrite = writePromise.then(async () => {
    const tmp = file + '.tmp';
    try {
      await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await fsp.rename(tmp, file);
    } catch(e) { console.error('Write error', e); }
  });
  writePromise = currentWrite;
  return currentWrite;
}

function getConfig() {
  if (!cachedConfig) cachedConfig = readJSON(FILES.config, DEFAULT_CONFIG);
  return cachedConfig;
}

function setConfigChangeCallback(cb) {
  onConfigChangeCallbacks.push(cb);
}

function updateConfig(partial) {
  cachedConfig = { ...getConfig(), ...partial };
  writeJSON(FILES.config, cachedConfig);
  onConfigChangeCallbacks.forEach(cb => cb(cachedConfig));
  return cachedConfig;
}

const tempAllowedPaths = new Set();

function addTempAllowedPath(filePath) {
  try {
    tempAllowedPaths.add(require('path').resolve(filePath));
  } catch (_) {}
}

function isPathAllowed(filePath) {
  try {
    const resolved = require('path').resolve(filePath);
    if (tempAllowedPaths.has(resolved)) return true;
    
    const config = getConfig();
    if (config) {
      if (config.gameImage && require('path').resolve(config.gameImage.replace('local-file://', '')) === resolved) {
        return true;
      }
      if (Array.isArray(config.gameProfiles)) {
        for (const p of config.gameProfiles) {
          if (p.imageUrl && require('path').resolve(p.imageUrl.replace('local-file://', '')) === resolved) {
            return true;
          }
        }
      }
    }
  } catch (_) {}
  return false;
}

module.exports = {
  readJSON,
  writeJSON,
  getConfig,
  updateConfig,
  setConfigChangeCallback,
  addTempAllowedPath,
  isPathAllowed
};
