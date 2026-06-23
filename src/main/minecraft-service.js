const fs = require('fs');
const path = require('path');
const nbt = require('nbt');
const os = require('os');

class MinecraftService {
  constructor(broadcast, getConfig, updateConfig) {
    this.broadcast = broadcast;
    this.getConfig = getConfig;
    this.updateConfig = updateConfig;
    this.pollInterval = null;
    this.lastMtime = 0;
    this.lastDay = -1;
    this.isWatching = false;
    console.log('[Minecraft] Service initialized.');
  }

  start() {
    console.log('[Minecraft] Watcher service started.');
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.check(), 5000);
    this.check();
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.lastMtime = 0;
    this.lastDay = -1;
  }

  async check() {
    const config = this.getConfig();
    const enabled = config.minecraftEnabled;
    const worldName = config.minecraftWorldName;

    // We only need savesPath or worldName to construct a path
    if (!enabled || (!worldName && !config.minecraftSavePath)) {
      if (this.isWatching) {
        this.isWatching = false;
        console.log('[Minecraft] Stopped watching (disabled or missing world config).');
      }
      return;
    }

    this.isWatching = true;

    // Resolve level.dat path robustly
    let levelDatPath = '';
    
    // 1. If savePath is directly to level.dat
    if (config.minecraftSavePath && config.minecraftSavePath.endsWith('level.dat')) {
      levelDatPath = config.minecraftSavePath;
    }
    // 2. If savePath points directly to the world folder (contains level.dat)
    else if (config.minecraftSavePath && fs.existsSync(path.join(config.minecraftSavePath, 'level.dat'))) {
      levelDatPath = path.join(config.minecraftSavePath, 'level.dat');
    }
    // 3. Fallback: savesPath/worldName/level.dat
    else {
      const home = os.homedir();
      const defaultMinecraft = process.env.APPDATA 
        ? path.join(process.env.APPDATA, '.minecraft', 'saves')
        : path.join(home, '.minecraft', 'saves');
      const savesDir = config.minecraftSavePath || defaultMinecraft;
      levelDatPath = path.join(savesDir, worldName || '', 'level.dat');
    }

    try {
      if (!fs.existsSync(levelDatPath)) {
        return;
      }

      const stats = fs.statSync(levelDatPath);
      const mtime = stats.mtimeMs;

      // Only parse if file has been modified
      if (mtime !== this.lastMtime) {
        this.lastMtime = mtime;
        const day = await this.readDay(levelDatPath);
        
        if (day !== this.lastDay) {
          this.lastDay = day;
          console.log(`[Minecraft] Day updated: ${day} (Path: ${levelDatPath})`);
          this.broadcast('minecraft-day-updated', { day, worldName: worldName || path.basename(path.dirname(levelDatPath)) });
        }
      }
    } catch (e) {
      console.error('[Minecraft] Error watching world:', e.message);
    }
  }

  readDay(levelDatPath) {
    return new Promise((resolve, reject) => {
      fs.readFile(levelDatPath, (err, data) => {
        if (err) return reject(err);
        nbt.parse(data, (error, parsed) => {
          if (error) return reject(error);
          try {
            const rootKeys = Object.keys(parsed.value || {});
            const dataObj = parsed.value?.Data || parsed.value?.data;
            if (!dataObj) {
              return reject(new Error(`NBT lacks Data field. Root keys: ${rootKeys.join(', ')}`));
            }

            const dataVal = dataObj.value;
            const dataKeys = Object.keys(dataVal || {});

            // Check DayTime or fallback to Time
            const timeField = dataVal.DayTime || dataVal.Time || dataVal.dayTime || dataVal.time;
            if (!timeField) {
              return reject(new Error(`NBT lacks Time or DayTime field. Data keys: ${dataKeys.join(', ')}`));
            }

            const rawVal = timeField.value;
            let ticks = 0;
            if (Array.isArray(rawVal)) {
              const high = rawVal[0];
              const low = rawVal[1];
              ticks = (high * 4294967296) + (low >>> 0);
            } else if (typeof rawVal === 'object' && rawVal !== null) {
              ticks = Number(rawVal.low || 0) + (Number(rawVal.high || 0) * 4294967296);
            } else {
              ticks = Number(rawVal);
            }

            const day = Math.floor(ticks / 24000);
            resolve(day);
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  }
}

module.exports = MinecraftService;
