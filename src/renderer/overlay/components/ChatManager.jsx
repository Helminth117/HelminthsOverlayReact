import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { DraggableWidget } from './DraggableWidget';

const TTSFilter = (() => {
  const BLOCKED_WORDS = [
    "pendejo","pinche","chingada","chingar","cabrón","cabron","puta","puto",
    "culero","culo","verga","mamón","mamada","wey","güey","hijo de puta",
    "gilipollas","imbécil","subnormal","idiota","coño","joder","mierda",
    "marica","maricon","maricón","retrasado","mongolo","pelotudo","boludo",
    "forro","perra","zorra","putona","ramera","bastardo","hdp","ctm",
    "ojete","naco","mamon","chinga tu madre","vete a la chingada",
    "me cago","hostia","capullo","estupido","tarado","baboso","menso",
    "bruto","inútil","inutil","cagon","desgraciado","maldito",
    "fuck","fucking","fucker","motherfucker","shit","bullshit","asshole",
    "bitch","bastard","crap","dick","cock","pussy","cunt","whore","slut",
    "nigga","nigger","faggot","fag","retard","moron","dumbass","jackass",
    "dipshit","douchebag","prick","twat","wanker","tosser","bollocks",
    "arse","arsehole","kys","kill yourself","scumbag","piece of shit",
    "gemido","gimiendo","moan","moaning","orgasmo","orgasm","porno",
    "hentai","rule34","sex","sexo","xxx","porn","nude","naked","horny",
    "erotico","fetish","fetiche","onlyfans","only fans",
    "te voy a matar","te voy a golpear","muerte","matar","kill","murder",
    "bomb","bomba","shoot","apuñalar","gore","mutilación",
    "suicidio","suicidate","suicide","autolesión","cortarse","self harm",
    "self-harm","overdose","sobredosis",
    "aaaa","aaaaaa","jajajajajaja","lolololol","xdxdxd",
    "contraseña","password","dox","doxxing","doxear","hackeo",
    "sé donde vives","i know where you live","datos personales",
    "skibidi","chupapi","muñaño","mi bebito fiu fiu","gyat","rizz",
    "fanum tax","looksmaxxing","brainrot","sigma male"
  ];

  const normalize = (text) => text.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').replace(/(\b\w)\s(?=\w\b)/g, '$1');

  const clean = (text) => {
    if (!text) return '';
    let result = text;
    const normalized = normalize(text);

    for (const word of BLOCKED_WORDS) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\W)${escaped}(?:\\W|$)`, 'gi');
      if (regex.test(normalized)) {
        const wordRegex = new RegExp(escaped, 'gi');
        result = result.replace(wordRegex, (match) => '*'.repeat(match.length));
      }
    }
    return result;
  };

  return { clean };
})();

export default function ChatManager() {
  const [messages, setMessages] = useState([]);
  const [pinned, setPinned] = useState(null);
  const config = useOverlayStore(s => s.config) || {};

  const configRef = useRef(config);
  const userSongRequestsRef = useRef({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const spawnParticles = () => {
    const container = document.getElementById('comp-chat');
    if (!container) return;

    for (let i = 0; i < 15; i++) {
      const p = document.createElement('div');
      p.className = 'chat-particle';
      p.textContent = '✨';
      p.style.position = 'absolute';
      p.style.left = Math.random() * 80 + 10 + '%';
      p.style.top = Math.random() * 80 + 10 + '%';
      p.style.pointerEvents = 'none';
      p.style.animation = 'particleFade 1.2s forwards';
      p.style.animationDelay = Math.random() * 0.3 + 's';
      p.style.zIndex = '99';
      container.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  };

  useEffect(() => {
    if (!window.api) return;

    const chatHandler = window.api.on('tiktok-chat', (data) => {
      if (!data) return;

      setMessages(prev => {
        const newMsgs = [...prev, { ...data, id: Date.now() + Math.random(), highlighted: false }];
        if (newMsgs.length > 50) newMsgs.shift();
        return newMsgs;
      });

      // TTS
      const cfg = configRef.current;
      const ttsPrefix = cfg.chatTtsPrefix || '.';
      if (cfg.enableTTS && window.speechSynthesis && data.isFollower && data.text && data.text.startsWith(ttsPrefix)) {
        const textToSpeak = data.text.slice(ttsPrefix.length).trim();
        if (textToSpeak) {
          const cleanText = TTSFilter.clean(textToSpeak);
          const u = new SpeechSynthesisUtterance(`${data.user} dice: ${cleanText}`);
          u.lang = 'es-ES';
          u.volume = cfg.volTts !== undefined ? cfg.volTts : 1.0;
          window.speechSynthesis.speak(u);
        }
      }

      // Song Requests
      if (cfg.enableSongRequests && data.text) {
        const keyword = cfg.songKeyword || '!play';
        if (data.text.toLowerCase().startsWith(keyword.toLowerCase() + ' ')) {
          const query = data.text.slice(keyword.length).trim();
          if (query) {
            const now = Date.now();
            const cooldownSec = cfg.songCooldown !== undefined ? cfg.songCooldown : 60;
            const lastRequest = userSongRequestsRef.current[data.user] || 0;
            if (now - lastRequest >= cooldownSec * 1000) {
              userSongRequestsRef.current[data.user] = now;
              window.dispatchEvent(new CustomEvent('play-song-request', { detail: { query, user: data.user } }));
            } else {
              console.warn(`[ChatManager] User ${data.user} on cooldown.`);
            }
          }
        }
      }

      // Chat Interactive Soundboard Commands
      if (data.text) {
        const textLower = data.text.trim().toLowerCase();
        const sbCommands = {
          '!aplausos': './sounds/aplausos.mp3',
          '!bonk': './sounds/bonk.mp3',
          '!suspenso': './sounds/suspenso.mp3'
        };
        if (sbCommands[textLower]) {
          const audio = new Audio(sbCommands[textLower]);
          audio.volume = 0.5;
          audio.play().catch(e => console.log('Audio command play error:', e));
        }
      }

      // Mod Commands
      if (data.text && (data.isModerator || data.isMod || data.isOwner)) {
        const textLower = data.text.trim().toLowerCase();
        if (textLower === '!skip' && window.api?.ytSkip) {
          window.api.ytSkip();
        } else if (textLower === '!pause' && window.api?.ytPause) {
          window.api.ytPause();
        } else if (textLower === '!resume' && window.api?.ytResume) {
          window.api.ytResume();
        } else if (textLower === '!stop' && window.api?.ytStop) {
          window.api.ytStop();
        }
      }
    });

    const pinHandler = window.api.on('pin-message', (data) => {
      setPinned(data);
    });

    const highlightHandler = window.api.on('highlight-chat', (data) => {
      setPinned(data);
      if (!data) return;

      setMessages(prev => prev.map(m => {
        if (m.user === data.user && m.text === data.text) {
          return { ...m, highlighted: true };
        }
        return m;
      }));

      spawnParticles();
    });

    return () => {
      window.api.off('tiktok-chat', chatHandler);
      window.api.off('pin-message', pinHandler);
      window.api.off('highlight-chat', highlightHandler);
    };
  }, []);

  return (
    <>
      <DraggableWidget id="comp-chat" title="Chat de TikTok" isGlass={config.glassWidgets?.chat !== false} style={{ flexDirection: 'column' }}>
        <div className="chat-header">💬 CHAT EN VIVO</div>
        <div id="chat-messages" className="chat-messages">
          {messages.map(msg => {
            let colorClass = 'default';
            let badge = '';
            if (msg.isMod || msg.isModerator) { colorClass = 'mod'; badge = '🛡️ '; }
            else if (msg.isSub) { colorClass = 'sub'; badge = '⭐ '; }
            else if (msg.isFollower) { colorClass = 'follower'; }

            return (
              <div key={msg.id} className={`chat-msg ${msg.highlighted ? 'highlighted' : ''}`}>
                <span className={`u ${colorClass}`} style={msg.color ? { color: msg.color } : {}}>{badge}{msg.user}: </span>
                <span className="t">{msg.text}</span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </DraggableWidget>

      <DraggableWidget id="comp-pinned-chat" title="Mensaje Fijado" isGlass={config.glassWidgets?.['pinned-chat'] !== false} style={{ display: pinned ? 'flex' : 'none', width: '350px', flexDirection: 'column', borderColor: 'var(--accent)', borderWidth: '2px' }}>
        <div className="chat-header" style={{ background: 'rgba(var(--accent-rgb), 0.2)', color: 'var(--accent)', paddingBottom: '5px' }}>📌 MENSAJE FIJADO</div>
        <div id="pinned-chat-content" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {pinned && (
            <>
              <div style={{ fontWeight: 'bold' }}>{pinned.user}</div>
              <div>{pinned.text}</div>
            </>
          )}
        </div>
      </DraggableWidget>
    </>
  );
}
