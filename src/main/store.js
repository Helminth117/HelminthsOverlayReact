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

module.exports = {
  readJSON,
  writeJSON,
  getConfig,
  updateConfig,
  setConfigChangeCallback
};
