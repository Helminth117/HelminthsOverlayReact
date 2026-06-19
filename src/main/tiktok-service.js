const { WebcastPushConnection } = require('tiktok-live-connector');
const fs = require('fs');
const path = require('path');

class TikTokService {
  constructor(broadcast, getConfig) {
    this.broadcast = broadcast;
    this.getConfig = getConfig;
    this.connection = null;
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
    this.loadBanlist();
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
    for (const [user, count] of Object.entries(this.likeBuffer)) {
      this.userLikes[user] = (this.userLikes[user] || 0) + count;
      if (this.userLikes[user] > this.stats.topLikerCount) {
        this.stats.topLiker = user;
        this.stats.topLikerCount = this.userLikes[user];
      }
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
      this.connection = new WebcastPushConnection(username, { enableExtendedGiftInfo: true });

      if (this.flushInterval) clearInterval(this.flushInterval);
      this.flushInterval = setInterval(() => this.flushBufferedEvents(), 1000);

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
        this.stats.latestFollower = user;
        this.statsDirty = true;
        this.broadcast('stream-alert', { type: 'follow', user, message: `¡@${user} te siguió!` });
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
        this.broadcast('stream-alert', { type: 'gift', user, gift, count });
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

        if (text) this.broadcast('tiktok-chat', { user, text, isMod, isSub, isFollower });
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
}

module.exports = TikTokService;
