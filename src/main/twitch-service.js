const WebSocket = require('ws');
const filter = require('./filter');

class TwitchService {
  constructor(broadcast) {
    this.broadcast = broadcast;
    this.ws = null;
    this.channel = '';
    this.connected = false;
    this.reconnectTimeout = null;
    this.retryCount = 0;
  }

  stop() {
    this.connected = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.broadcast('twitch-status', { connected: false, channel: this.channel });
  }

  connect(channelName) {
    channelName = channelName.trim().toLowerCase().replace('@', '').replace('#', '');
    if (!channelName) return { ok: false, error: 'Twitch channel name required' };

    this.stop();
    this.channel = channelName;
    this.retryCount = 0;
    this.tryConnect();
    return { ok: true };
  }

  tryConnect() {
    if (!this.channel) return;

    console.log(`[Twitch] Connecting to channel #${this.channel}...`);
    this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    this.ws.on('open', () => {
      console.log('[Twitch] WebSocket connected, sending credentials...');
      const randNum = Math.floor(Math.random() * 900000) + 100000;
      const nick = `justinfan${randNum}`;
      this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      this.ws.send(`PASS oauth:anonymous`);
      this.ws.send(`NICK ${nick}`);
      this.ws.send(`JOIN #${this.channel}`);
      this.connected = true;
      this.retryCount = 0;
      this.broadcast('twitch-status', { connected: true, channel: this.channel });
    });

    this.ws.on('message', (rawData) => {
      const data = rawData.toString();
      const lines = data.split('\r\n');
      for (const line of lines) {
        if (!line) continue;

        // PING/PONG keep-alive
        if (line.startsWith('PING')) {
          this.ws.send('PONG :tmi.twitch.tv');
          continue;
        }

        const msg = this.parseTwitchMessage(line);
        if (msg) {
          // Broadcast unified chat message
          this.broadcast('tiktok-chat', {
            user: filter.cleanText(msg.user),
            text: filter.cleanText(msg.text),
            isMod: msg.isMod,
            isSub: msg.isSub,
            isFollower: msg.isFollower,
            platform: 'twitch'
          });
        }
      }
    });

    this.ws.on('close', () => {
      console.log('[Twitch] WebSocket closed.');
      this.connected = false;
      this.broadcast('twitch-status', { connected: false, channel: this.channel });
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[Twitch] WebSocket error:', err.message);
      this.connected = false;
      this.broadcast('twitch-status', { connected: false, channel: this.channel, error: err.message });
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.retryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000); // Exponential backoff max 30s
    console.log(`[Twitch] Reconnecting in ${delay / 1000}s (Attempt ${this.retryCount})...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.tryConnect();
    }, delay);
  }

  parseTwitchMessage(line) {
    if (!line.includes('PRIVMSG')) return null;

    const parts = line.split(' ');
    const privmsgIdx = parts.findIndex(p => p === 'PRIVMSG');
    if (privmsgIdx === -1) return null;

    const channelName = parts[privmsgIdx + 1];

    // Reconstruct message text (can contain spaces, starts with :)
    // e.g., parts = [..., ':hello', 'world', 'here']
    // We join the parts starting from privmsgIdx + 2
    let text = parts.slice(privmsgIdx + 2).join(' ');
    if (text.startsWith(':')) {
      text = text.substring(1);
    }

    // Parse tags
    let tags = {};
    if (line.startsWith('@')) {
      const tagsPart = parts[0].substring(1); // remove '@'
      const tagList = tagsPart.split(';');
      for (const tag of tagList) {
        const [key, val] = tag.split('=');
        tags[key] = val || '';
      }
    }

    // Get username
    let user = tags['display-name'];
    if (!user) {
      const prefix = parts[1];
      if (prefix && prefix.startsWith(':') && prefix.includes('!')) {
        user = prefix.split('!')[0].substring(1);
      }
    }
    if (!user) user = 'alguien';

    // Role check
    const isBroadcaster = channelName.replace('#', '').toLowerCase() === user.toLowerCase();
    const isMod = tags['mod'] === '1' || tags['user-type'] === 'mod' || tags['user-type'] === 'global_mod' || tags['user-type'] === 'admin' || tags['user-type'] === 'staff' || isBroadcaster;
    const isSub = tags['subscriber'] === '1' || (tags['badges'] && tags['badges'].includes('subscriber'));
    const isFollower = true;

    return {
      user,
      text,
      isMod,
      isSub,
      isFollower,
      platform: 'twitch'
    };
  }
}

module.exports = TwitchService;
