const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const oldDataDir = path.join(app.getPath('appData'), 'stream-overlay-pro', 'data');
const DATA_DIR = path.join(app.getPath('userData'), 'data');

if (fs.existsSync(oldDataDir) && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.readdirSync(oldDataDir).forEach(file => {
    fs.copyFileSync(path.join(oldDataDir, file), path.join(DATA_DIR, file));
  });
} else if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  session:      path.join(DATA_DIR, 'session.json'),
  historial:    path.join(DATA_DIR, 'historial.json'),
  notes:        path.join(DATA_DIR, 'notes.json'),
  plantillas:   path.join(DATA_DIR, 'plantillas.json'),
  config:       path.join(DATA_DIR, 'overlay_config.json'),
  gameProfiles: path.join(DATA_DIR, 'game_profiles.json'),
};

const DEFAULT_SESSION = {
  sections: [
    { id: 's1', label: 'Rankup', items: [
      { id: 'i1', name: 'Champivacas', cur: 31, max: 50 },
      { id: 'i2', name: 'Camellos',    cur: 0,  max: 50 },
    ]},
  ],
  done: [],
};

const DEFAULT_CONFIG = {
  social: [
    { id: 'tiktok',  handle: 'Helminth117', visible: true },
    { id: 'twitch',  handle: 'Helminth117', visible: true },
    { id: 'youtube', handle: 'Helminth117', visible: true },
    { id: 'discord', handle: 'Helminth117', visible: true },
  ],
  game: [],
  gameName: 'MINECRAFT',
  gameFontSize: 24,
  accent: '#1D9E75',
  opacity: 0.85,
  showSceneBg: true,
  moveMode: false,
  gameProfiles: [
    { process: 'javaw',      name: 'Minecraft',       accent: '#1D9E75', imageUrl: '', enabled: true },
    { process: 'dota2',      name: 'Dota 2',           accent: '#c23b22', imageUrl: '', enabled: true },
    { process: 're2',        name: 'Resident Evil 2',  accent: '#8b0000', imageUrl: '', enabled: true },
    { process: 'MonsterHunterWorld', name: 'Monster Hunter', accent: '#e0a95c', imageUrl: '', enabled: true },
    { process: 'StardewValley', name: 'Stardew Valley', accent: '#7ec850', imageUrl: '', enabled: true },
  ],
  autoDetectGame: true,
  widgets: { user: true, socials: true, stats: true, objs: true, timers: true, game: true, chips: true },
  layout: {},
  alertTop: 40,
  alertDuration: 4000,
};

module.exports = {
  DATA_DIR,
  FILES,
  DEFAULT_SESSION,
  DEFAULT_CONFIG,
};
