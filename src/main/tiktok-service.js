const { WebcastPushConnection } = require('tiktok-live-connector');
const fs = require('fs');
const path = require('path');
const filter = require('./filter');
const economyService = require('./economy-service');
const videoReactionService = require('./video-reaction-service');

class TikTokService {
  constructor(broadcast, getConfig) {
    this.broadcast = broadcast;
    this.getConfig = getConfig;
    this.connection = null;
    this.sessionId = null;
    this.ttTargetIdc = null;
    this.stats = { 
      followers_gained: 0, likes: 0, viewers: 0, gifts: 0, connected: false, username: '',
      latestFollower: '', topLiker: '', topLikerCount: 0, topGifter: '', topGifterCount: 0 
    };
    this.userLikes = {};
    this.userGifts = {};
    this.retryInterval = null;
    this.reconnectTimeout = null;
    this.flushInterval = null;
    this.likeBuffer = {};
    this.statsDirty = false;
    this.username = '';
    this.banlist = [];
    this.chatCooldown = new Map();
    this.loadBanlist();

    videoReactionService.on('video-reaction-ready', (data) => {
      if (this.stats.connected) {
        this.sendMessage(`@${data.requestedBy} ¡Tu video está listo! 🎬🎬 El streamer lo verá pronto.`);
      }
    });
  }

  loadBanlist() {
    try {
      const blPath = path.join(__dirname, 'user-banlist.json');
      if (fs.existsSync(blPath)) {
        const blData = JSON.parse(fs.readFileSync(blPath, 'utf8'));
        if (Array.isArray(blData)) {
          this.banlist = blData.map(u => u.toLowerCase().trim());
        }
      }
    } catch (e) {
      console.error('[TikTokService] Error reading user-banlist.json:', e);
      this.banlist = [];
    }
  }

  stop() {
    if (this.reconnectTimeout) { clearTimeout(this.reconnectTimeout); this.reconnectTimeout = null; }
    if (this.retryInterval) { clearInterval(this.retryInterval); this.retryInterval = null; }
    if (this.flushInterval) { clearInterval(this.flushInterval); this.flushInterval = null; }
    if (this.connection) {
      this.connection.removeAllListeners();
      try { this.connection.disconnect(); } catch(e) {}
      this.connection = null;
    }
    this.stats.connected = false;
  }

  flushBufferedEvents() {
    let likesUpdated = false;
    const eco = this.getConfig()?.economy || {};
    const likesThreshold = eco.likesThreshold !== undefined ? eco.likesThreshold : 50;
    const pointsPerLikesThreshold = eco.pointsPerLikesThreshold !== undefined ? eco.pointsPerLikesThreshold : 5;

    for (const [user, count] of Object.entries(this.likeBuffer)) {
      // Acumular likes por usuario en economyService
      const prevTotal = economyService.getUser(user).likes || 0;
      const newTotal = prevTotal + count;
      const prevBrackets = Math.floor(prevTotal / likesThreshold);
      const newBrackets = Math.floor(newTotal / likesThreshold);
      const pointsToAdd = (newBrackets - prevBrackets) * pointsPerLikesThreshold;
      if (pointsToAdd > 0) {
        economyService.addPoints(user, pointsToAdd);
      }
      economyService.updateLikes(user, count);
      
      const dbUser = economyService.getUser(user);
      this.broadcast('economy-update', { username: user, ...dbUser });

      this.broadcast('tiktok-like', { user, count });
      likesUpdated = true;
    }
    this.likeBuffer = {};

    if (likesUpdated) {
      // Prevent memory leak by keeping only top 100 if we exceed 500 users
      const likeKeys = Object.keys(this.userLikes);
      if (likeKeys.length > 500) {
        const sorted = likeKeys.sort((a,b) => this.userLikes[b] - this.userLikes[a]);
        const newLikes = {};
        for(let i=0; i<100; i++) newLikes[sorted[i]] = this.userLikes[sorted[i]];
        this.userLikes = newLikes;
      }
      this.statsDirty = true;
    }

    if (this.statsDirty) {
      this.broadcast('tiktok-stats', this.stats);
      this.statsDirty = false;
    }
  }

  async tryConnect(username) {
    try {
      if (this.connection) { this.connection.removeAllListeners(); try { this.connection.disconnect(); } catch(e) {} this.connection = null; }
      
      const options = { enableExtendedGiftInfo: true };
      if (this.sessionId) {
        options.sessionId = this.sessionId;
        options.ttTargetIdc = this.ttTargetIdc;
        options.authenticateWs = true;
      }
      this.connection = new WebcastPushConnection(username, options);

      if (this.flushInterval) clearInterval(this.flushInterval);
      this.flushInterval = setInterval(() => this.flushBufferedEvents(), 100);

      this.connection.on('disconnected', () => {
        console.log('[TikTok] Disconnected, retrying...');
        this.stats.connected = false;
        this.broadcast('tiktok-stats', this.stats);
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => { this.reconnectTimeout = null; if (this.username) this.tryConnect(this.username); }, 10000);
      });
      this.connection.on('roomUser', d => {
        this.stats.viewers = d?.viewerCount || d?.viewer_count || 0;
        this.statsDirty = true;
      });
      this.connection.on('like', d => {
        const amt = d?.likeCount || d?.like_count || 1;
        this.stats.likes += amt;
        const user = d?.uniqueId || d?.user?.uniqueId || d?.nickname || 'alguien';
        
        this.likeBuffer[user] = (this.likeBuffer[user] || 0) + amt;
        this.statsDirty = true;
      });
      this.connection.on('follow', d => {
        this.stats.followers_gained++;
        const user = d?.uniqueId || d?.user?.uniqueId || d?.nickname || 'alguien';
        
        // Award follow points
        const eco = this.getConfig()?.economy || {};
        const pointsPerFollow = eco.pointsPerFollow !== undefined ? eco.pointsPerFollow : 25;
        economyService.addPoints(user, pointsPerFollow);
        const dbUser = economyService.getUser(user);
        this.broadcast('economy-update', { username: user, ...dbUser });

        this.stats.latestFollower = user;
        this.statsDirty = true;
        const cleanUser = filter.cleanText(user);
        this.broadcast('stream-alert', { type: 'follow', user: cleanUser, message: `¡@${cleanUser} te siguió!` });
        const cfg = this.getConfig();
        if (cfg.followersGoal && this.stats.followers_gained >= cfg.followersGoal) {
          this.broadcast('stream-alert', { type: 'goal', message: `¡${cfg.followersGoal} seguidores!` });
        }
      });
      this.connection.on('gift', d => {
        this.stats.gifts++;
        const user = d?.uniqueId || d?.user?.uniqueId || d?.nickname || 'alguien';
        const gift = d?.giftName || d?.gift?.name || d?.gift_name || 'regalo';
        const count = d?.repeatCount || d?.combo_count || d?.count || 1;
        const diamonds = d?.diamondCount || d?.gift?.diamond_count || 1;
        const amt = count * diamonds;
        this.userGifts[user] = (this.userGifts[user] || 0) + amt;
        if (this.userGifts[user] > this.stats.topGifterCount) {
          this.stats.topGifter = user;
          this.stats.topGifterCount = this.userGifts[user];
        }

        // Prevent memory leak by keeping only top 100 if we exceed 500 users
        const giftKeys = Object.keys(this.userGifts);
        if (giftKeys.length > 500) {
          const sorted = giftKeys.sort((a,b) => this.userGifts[b] - this.userGifts[a]);
          const newGifts = {};
          for(let i=0; i<100; i++) newGifts[sorted[i]] = this.userGifts[sorted[i]];
          this.userGifts = newGifts;
        }
        this.statsDirty = true;

        // Skip intermediate streak events to prevent flooding the alert queue
        if (d?.giftType === 1 && !d?.repeatEnd) {
          return;
        }

        // Exponent points formula: diamonds = diamondCount * count (repeatCount)
        const eco = this.getConfig()?.economy || {};
        const giftExponent = eco.giftExponent !== undefined ? eco.giftExponent : 1.4;
        const diamondsVal = (d?.diamondCount || d?.gift?.diamond_count || 1) * count;
        const points = Math.floor(Math.pow(diamondsVal, giftExponent));
        economyService.addPoints(user, points);

        // Update totalGifted
        const dbUser = economyService.getUser(user);
        dbUser.totalGifted = (dbUser.totalGifted || 0) + diamondsVal;

        // Auto-unlock special skins
        const cleanGift = gift.toLowerCase();
        let autoUnlocked = false;
        if (cleanGift.includes('rose') || cleanGift.includes('rosa')) {
          economyService.addToInventory(user, 'halo');
          economyService.equip(user, 'halo');
          autoUnlocked = true;
        } else if (cleanGift.includes('cap') || cleanGift.includes('gorra') || cleanGift.includes('sombrero')) {
          economyService.addToInventory(user, 'gorra');
          economyService.equip(user, 'gorra');
          autoUnlocked = true;
        } else if (cleanGift.includes('crown') || cleanGift.includes('corona')) {
          economyService.addToInventory(user, 'corona');
          economyService.equip(user, 'corona');
          autoUnlocked = true;
        }
        
        economyService.save();
        this.broadcast('economy-update', { username: user, ...dbUser });

        this.broadcast('stream-alert', { type: 'gift', user: filter.cleanText(user), gift: filter.cleanText(gift), count });
      });
      this.connection.on('member', d => {
        this.stats.viewers = Math.max(this.stats.viewers, 1);
        this.statsDirty = true;
      });
      this.connection.on('chat', d => {
        const user = d?.uniqueId || d?.user?.uniqueId || d?.nickname || 'alguien';
        const text = d?.comment || d?.text || '';
        const isMod = !!d?.isModerator;
        const isSub = !!d?.isSubscriber;
        const followRole = d?.followRole || d?.user?.followRole || d?.followInfo?.followStatus || d?.user?.followInfo?.followStatus || 0;
        const isFollower = followRole > 0 || isSub || isMod;
        
        // --- Bloqueo de Bots ---
        if (this.banlist.includes(user.toLowerCase())) {
          return; // Modo Fantasma: ignoramos este mensaje
        }
        // -----------------------

        if (text && text.trim().startsWith('!')) {
          this.processBotCommand(user, text);
        }

        // Award chat points with cooldown
        const eco = this.getConfig()?.economy || {};
        const pointsPerChat = eco.pointsPerChat !== undefined ? eco.pointsPerChat : 1;
        const chatCooldownMs = eco.chatCooldownMs !== undefined ? eco.chatCooldownMs : 30000;

        const userKey = user.toLowerCase().trim();
        const lastMessage = this.chatCooldown.get(userKey) || 0;
        const now = Date.now();
        if (now - lastMessage > chatCooldownMs) {
          this.chatCooldown.set(userKey, now);
          economyService.addPoints(user, pointsPerChat);
          
          const dbUser = economyService.getUser(user);
          this.broadcast('economy-update', { username: user, ...dbUser });
        }

        if (text) this.broadcast('tiktok-chat', { user: filter.cleanText(user), text: filter.cleanText(text), isMod, isSub, isFollower });
      });

      await this.connection.connect();
      this.stats.connected = true;
      this.broadcast('tiktok-stats', { ...this.stats, status: 'connected' });
      this.broadcast('stream-alert', null);
      console.log('[TikTok] Connected to @' + username);
      return { ok: true };
    } catch(err) {
      this.stats.connected = false;
      const isOffline = err?.constructor?.name?.includes('Live') || err?.constructor?.name?.includes('Offline') || err?.message?.includes('live') || err?.message?.includes('offline') || err?.message === '';
      console.log('[TikTok] Connect error:', err?.constructor?.name, err?.message || '(no message)');
      this.broadcast('tiktok-stats', { ...this.stats, status: isOffline ? 'waiting' : 'error', error: err?.message });
      return { ok: false, error: isOffline ? 'no_live' : err?.message, isOffline };
    }
  }

  async connect(username) {
    username = username.trim().replace('@', '');
    if (!username) return { ok: false, error: 'Username requerido' };
    this.stop();
    this.username = username;
    this.stats.username = username;
    this.loadBanlist();

    const result = await this.tryConnect(username);

    if (!result.ok && result.isOffline) {
      this.broadcast('tiktok-stats', { ...this.stats, status: 'waiting' });
      this.retryInterval = setInterval(async () => {
        console.log('[TikTok] Retrying connection to @' + username);
        const r = await this.tryConnect(username);
        if (r.ok) { clearInterval(this.retryInterval); this.retryInterval = null; }
      }, 15000);
      return { ok: true, waiting: true };
    }
    return result;
  }

  resetStats() {
    this.stats.followers_gained = 0;
    this.stats.likes = 0;
    this.stats.gifts = 0;
    this.stats.latestFollower = '';
    this.stats.topLiker = '';
    this.stats.topLikerCount = 0;
    this.stats.topGifter = '';
    this.stats.topGifterCount = 0;
    this.userLikes = {};
    this.userGifts = {};
    this.broadcast('tiktok-stats', this.stats);
  }

  setAuth(sessionId, ttTargetIdc) {
    this.sessionId = sessionId || null;
    this.ttTargetIdc = ttTargetIdc || null;
    console.log('[TikTokService] Credentials set:', this.sessionId ? 'Active' : 'Cleared');
  }

  async sendMessage(text) {
    if (this.connection && this.stats.connected && this.sessionId) {
      try {
        await this.connection.sendMessage(text);
        console.log(`[TikTokService] Bot message sent: ${text}`);
      } catch (e) {
        console.error('[TikTokService] Error sending message (ignored):', e.message);
      }
    }
  }

  async processBotCommand(user, text) {
    const trimmed = text.trim();
    if (!trimmed.startsWith('!')) return;

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (command === '!puntos' || command === '!points') {
      const dbUser = economyService.getUser(user);
      await this.sendMessage(`@${user} tienes ${dbUser.points} puntos 💰💰`);
    } 
    else if (command === '!top') {
      const top = economyService.getLeaderboard(3);
      let resp = '🏆🏆 Top 3: ';
      if (top.length === 0) {
        resp += 'Nadie aún';
      } else {
        resp += top.map((u, i) => `${i + 1}. @${u.username} (${u.points}pts)`).join(' ');
      }
      await this.sendMessage(resp);
    } 
    else if (command === '!tienda' || command === '!shop') {
      await this.sendMessage(`Tienda: lentes (150), gorra (250), audifonos (300), mascara (400), escudo (500), halo (600), espada (850), alas (1200), corona (2000), aura (3500). Usa !comprar <nombre>`);
    } 
    else if (command === '!comprar' || command === '!buy') {
      let itemKey = args[0]?.toLowerCase();
      if (!itemKey) {
        await this.sendMessage(`@${user} Especifica accesorio. Ej: !comprar gorra`);
        return;
      }
      if (itemKey === 'audis' || itemKey === 'audifonos' || itemKey === 'auris') itemKey = 'auriculares';
      if (itemKey === 'shield') itemKey = 'escudo';

      const SHOP_ITEMS = {
        lentes: { name: 'Lentes Oscuros', cost: 150 },
        gorra: { name: 'Gorra Flama', cost: 250 },
        audifonos: { name: 'Audífonos Gamer', cost: 300 },
        auriculares: { name: 'Audífonos Gamer', cost: 300 },
        mascara: { name: 'Máscara Ninja', cost: 400 },
        escudo: { name: 'Escudo Vikingo', cost: 500 },
        halo: { name: 'Halo de Ángel', cost: 600 },
        espada: { name: 'Espada de Luz', cost: 850 },
        alas: { name: 'Alas de Fénix', cost: 1200 },
        corona: { name: 'Corona Real', cost: 2000 },
        aura: { name: 'Aura Cósmica', cost: 3500 }
      };

      const item = SHOP_ITEMS[itemKey];
      if (!item) {
        await this.sendMessage(`@${user} Ese accesorio no existe en tienda.`);
        return;
      }

      const dbKey = itemKey === 'audifonos' ? 'auriculares' : itemKey;
      const dbUser = economyService.getUser(user);
      if (dbUser.inventory.includes(dbKey)) {
        await this.sendMessage(`@${user} Ya tienes ${item.name}! Equípalo con !equipar ${itemKey}`);
      } else if (dbUser.points < item.cost) {
        await this.sendMessage(`@${user} no tienes suficientes puntos. Necesitas ${item.cost} pts, tienes ${dbUser.points}.`);
      } else {
        economyService.deductPoints(user, item.cost);
        economyService.addToInventory(user, dbKey);
        economyService.equip(user, dbKey);
        
        const updatedUser = economyService.getUser(user);
        this.broadcast('economy-update', { username: user, ...updatedUser });
        await this.sendMessage(`@${user} ¡Comprado y equipado: ${item.name}! 🛍️`);
      }
    } 
    else if (command === '!equipar' || command === '!equip') {
      let itemKey = args[0]?.toLowerCase();
      if (!itemKey) {
        await this.sendMessage(`@${user} Especifica accesorio a equipar.`);
        return;
      }
      if (itemKey === 'audis' || itemKey === 'audifonos' || itemKey === 'auris') itemKey = 'auriculares';
      if (itemKey === 'shield') itemKey = 'escudo';

      const dbUser = economyService.getUser(user);
      if (!dbUser.inventory.includes(itemKey)) {
        await this.sendMessage(`@${user} No tienes el accesorio ${itemKey}. Cómpralo con !comprar ${itemKey}`);
      } else if (dbUser.equipped.includes(itemKey)) {
        await this.sendMessage(`@${user} Ya tienes equipado ${itemKey}.`);
      } else {
        economyService.equip(user, itemKey);
        const updatedUser = economyService.getUser(user);
        this.broadcast('economy-update', { username: user, ...updatedUser });
        await this.sendMessage(`@${user} Equipado: ${itemKey}! ✨`);
      }
    } 
    else if (command === '!desequipar' || command === '!unequip') {
      let itemKey = args[0]?.toLowerCase();
      if (!itemKey) {
        await this.sendMessage(`@${user} Especifica accesorio a desequipar.`);
        return;
      }
      if (itemKey === 'audis' || itemKey === 'audifonos' || itemKey === 'auris') itemKey = 'auriculares';
      if (itemKey === 'shield') itemKey = 'escudo';

      const dbUser = economyService.getUser(user);
      if (!dbUser.equipped.includes(itemKey)) {
        await this.sendMessage(`@${user} No tienes equipado ${itemKey}.`);
      } else {
        economyService.unequip(user, itemKey);
        const updatedUser = economyService.getUser(user);
        this.broadcast('economy-update', { username: user, ...updatedUser });
        await this.sendMessage(`@${user} Me quité: ${itemKey}.`);
      }
    }
    else if (command === '!videor') {
      const url = args[0];
      if (!url) {
        await this.sendMessage(`@${user} Especifica URL de YouTube.`);
        return;
      }
      const cost = videoReactionService.settings.cost || 1000;
      const dbUser = economyService.getUser(user);
      if (dbUser.points < cost) {
        await this.sendMessage(`@${user} no tienes suficientes puntos. Necesitas ${cost} pts, tienes ${dbUser.points}.`);
      } else {
        try {
          await videoReactionService.addToQueue(user, url);
          await this.sendMessage(`@${user} ¡Video Reacción canjeada! 🎬🎬 Descargando en segundo plano...`);
        } catch (e) {
          await this.sendMessage(`@${user} ${e.message}`);
        }
      }
    }
  }
}

module.exports = TikTokService;
