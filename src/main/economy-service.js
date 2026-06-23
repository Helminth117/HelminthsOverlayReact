const fs = require('fs');
const { FILES } = require('./constants');

class EconomyService {
  constructor() {
    this.db = {};
    this.saveTimeout = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(FILES.economy)) {
        this.db = JSON.parse(fs.readFileSync(FILES.economy, 'utf8'));
        console.log('[Economy] DB cargada. Usuarios:', Object.keys(this.db).length);
      } else {
        this.db = {};
        console.log('[Economy] Archivo no existe, inicializando DB vacía.');
      }
    } catch (e) {
      console.error('[Economy] Error al cargar economy.json:', e);
      this.db = {};
    }
  }

  save() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        fs.writeFileSync(FILES.economy, JSON.stringify(this.db, null, 2), 'utf8');
        console.log('[Economy] Cambios guardados en economy.json.');
      } catch (e) {
        console.error('[Economy] Error al guardar economy.json:', e);
      }
    }, 2000);
  }

  getUser(username) {
    if (!username) return null;
    const userKey = username.toLowerCase().trim();
    if (!this.db[userKey]) {
      this.db[userKey] = {
        points: 0,
        likes: 0,
        inventory: [],
        equipped: [],
        totalGifted: 0,
        lastSeen: Date.now()
      };
      this.save();
    } else {
      this.db[userKey].lastSeen = Date.now();
    }
    return this.db[userKey];
  }

  addPoints(username, amount) {
    if (!username || amount <= 0) return;
    const user = this.getUser(username);
    user.points += Math.floor(amount);
    this.save();
  }

  deductPoints(username, amount) {
    if (!username || amount <= 0) return false;
    const user = this.getUser(username);
    if (user.points < amount) return false;
    user.points -= Math.floor(amount);
    this.save();
    return true;
  }

  updateLikes(username, count) {
    if (!username || count <= 0) return;
    const user = this.getUser(username);
    user.likes = (user.likes || 0) + count;
    this.save();
  }

  addToInventory(username, itemId) {
    if (!username || !itemId) return;
    const user = this.getUser(username);
    if (!user.inventory) user.inventory = [];
    if (!user.inventory.includes(itemId)) {
      user.inventory.push(itemId);
      this.save();
    }
  }

  equip(username, itemId) {
    if (!username || !itemId) return false;
    const user = this.getUser(username);
    if (!user.inventory || !user.inventory.includes(itemId)) return false;
    if (!user.equipped) user.equipped = [];
    if (!user.equipped.includes(itemId)) {
      user.equipped.push(itemId);
      this.save();
    }
    return true;
  }

  unequip(username, itemId) {
    if (!username || !itemId) return false;
    const user = this.getUser(username);
    if (!user.equipped) return false;
    const index = user.equipped.indexOf(itemId);
    if (index !== -1) {
      user.equipped.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  getLeaderboard(limit = 10) {
    const list = Object.entries(this.db).map(([username, data]) => ({
      username,
      points: data.points || 0,
      likes: data.likes || 0,
      totalGifted: data.totalGifted || 0,
      inventory: data.inventory || [],
      equipped: data.equipped || []
    }));
    list.sort((a, b) => b.points - a.points);
    return list.slice(0, limit);
  }
}

module.exports = new EconomyService();
