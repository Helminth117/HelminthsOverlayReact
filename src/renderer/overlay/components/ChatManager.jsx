import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { DraggableWidget } from './DraggableWidget';
import { speakText } from '../utils/speech';

export default function ChatManager() {
  const [messages, setMessages] = useState([]);
  const [pinned, setPinned] = useState(null);
  const config = useOverlayStore(s => s.config) || {};

  // Auto-visibility: show chat only on Just Chatting, hide when a game is running
  const gameName = config.gameName || 'Just Chatting';
  const isJustChatting = gameName.trim().toLowerCase() === 'just chatting';
  const chatVisible = config.autoHideChatOnGame !== false ? isJustChatting : true;

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
      if (cfg.enableTTS && data.isFollower && data.text && data.text.startsWith(ttsPrefix)) {
        const textToSpeak = data.text.slice(ttsPrefix.length).trim();
        if (textToSpeak) {
          speakText(`${data.user} dice: ${textToSpeak}`, cfg);
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

  if (!chatVisible) return null;

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

            const platformIcon = msg.platform === 'twitch' ? (
              <span className="platform-badge twitch" title="Twitch">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                </svg>
              </span>
            ) : (
              <span className="platform-badge tiktok" title="TikTok">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.81-.74-3.94-1.69-.22-.19-.42-.38-.62-.59v7.02c0 2.54-.74 5.24-2.88 6.78-2.28 1.69-5.6 1.77-8 0-2.42-1.73-3.02-5.18-2.24-7.97.74-2.73 3.38-4.7 6.22-4.5v4.02c-1.39-.17-2.92.51-3.5 1.83-.75 1.63.14 3.82 1.85 4.38 1.67.57 3.7-.36 4.14-2.1.14-.54.12-1.1.12-1.66V0h.23z"/>
                </svg>
              </span>
            );

            return (
              <div key={msg.id} className={`chat-msg ${msg.highlighted ? 'highlighted' : ''}`}>
                <span className={`u ${colorClass}`} style={msg.color ? { color: msg.color } : {}}>
                  {platformIcon}{badge}{msg.user}: 
                </span>
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
