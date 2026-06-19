import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { TTSFilter } from '../utils/ttsFilter';
import { launchAlertConfeti } from '../utils/confettiHelper';
import { UserPlus, Gift, Gamepad2, Trophy, Bot, Bell } from 'lucide-react';

const getOverlayImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('local-file://')) {
    const filePath = url.replace('local-file://', '');
    if (window.location.protocol === 'file:') {
      return url;
    }
    const token = new URLSearchParams(window.location.search).get('token') || '';
    const apiBase = window.location.port === '5173' ? 'http://localhost:3030' : window.location.origin;
    return `${apiBase}/api/local-media?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;
  }
  return url;
};

export default function AlertManager() {
  const [currentAlert, setCurrentAlert] = useState(null);
  const [fadingOut, setFadingOut] = useState(false);
  const config = useOverlayStore(s => s.config) || {};
  const alertQueueRef = useRef([]);
  const alertRunningRef = useRef(false);

  const processAlertQueue = () => {
    if (!alertQueueRef.current.length) {
      alertRunningRef.current = false;
      return;
    }
    alertRunningRef.current = true;
    const data = alertQueueRef.current.shift();
    
    setCurrentAlert({ ...data, id: Date.now() + Math.random() });
    setFadingOut(false);
    
    if (window.playAlertSound) window.playAlertSound(data.type || 'follow');

    if (config.enableTTS && window.speechSynthesis && !data.disableTts && data.type !== 'game') {
      let ttsText = '';
      if (data.type === 'follow') ttsText = `Nuevo seguidor, gracias ${data.user}`;
      else if (data.type === 'gift') ttsText = `${data.user} ha regalado ${data.count} ${data.gift}`;
      else if (data.type === 'goal') ttsText = data.message;
      else if (data.type === 'bot') ttsText = data.ttsMessage || data.message;
      
      if (ttsText) {
        ttsText = TTSFilter.clean(ttsText);
        const u = new SpeechSynthesisUtterance(ttsText);
        u.lang = 'es-ES';
        u.volume = config.volTts !== undefined ? config.volTts : 1.0;
        window.speechSynthesis.speak(u);
      }
    }

    if (data.type === 'follow') launchAlertConfeti(config.accent || '#1D9E75');
    else if (data.type === 'gift') launchAlertConfeti('#f59e0b');
    else if (data.type === 'goal') launchAlertConfeti('#a855f7');

    const duration = data.duration || config.alertDuration || 4000;
    
    // Start fading out 1000ms before removing the alert to let the Xbox exit animations play fully
    setTimeout(() => {
      setFadingOut(true);
    }, Math.max(0, duration - 1000));

    setTimeout(() => {
      setCurrentAlert(null);
      setTimeout(() => processAlertQueue(), 300);
    }, duration);
  };

  useEffect(() => {
    if (!window.api) return;

    const handler = window.api.on('stream-alert', (data) => {
      if (!data || data.type === 'scene' || data.type === 'start-poll' || data.type === 'stop-poll') return;
      alertQueueRef.current.push(data);
      if (alertQueueRef.current.length > 50) alertQueueRef.current.shift();
      if (!alertRunningRef.current) processAlertQueue();
    });

    const handleEnqueueAlert = (e) => {
      const data = e.detail;
      if (!data) return;
      alertQueueRef.current.push(data);
      if (alertQueueRef.current.length > 50) alertQueueRef.current.shift();
      if (!alertRunningRef.current) processAlertQueue();
    };
    window.addEventListener('enqueue-alert', handleEnqueueAlert);

    // Bot Auto-Messages Interval
    let botIntervalId = null;
    if (config.enableBot && config.botMessages) {
      const messages = config.botMessages.split('\n').map(m => m.trim()).filter(m => m);
      if (messages.length > 0) {
        const intervalMins = config.botInterval || 5;
        botIntervalId = setInterval(() => {
          const randMsg = messages[Math.floor(Math.random() * messages.length)];
          alertQueueRef.current.push({
            type: 'bot',
            message: randMsg,
            disableTts: true,
            duration: 4000
          });
          if (!alertRunningRef.current) processAlertQueue();
        }, intervalMins * 60 * 1000);
      }
    }

    return () => {
      window.api.off('stream-alert', handler);
      window.removeEventListener('enqueue-alert', handleEnqueueAlert);
      if (botIntervalId) clearInterval(botIntervalId);
    };
  }, [config]);

  if (!currentAlert) return null;

  let typeLabel = 'LOGRO DESBLOQUEADO';
  let nameText = '';
  let IconComponent = Trophy;
  let accentColor = config.accent || '#107c11';
  
  const data = currentAlert;
  if (data.type === 'follow') {
    typeLabel = 'SEGUIDOR NUEVO';
    nameText = data.user || 'Usuario';
    IconComponent = UserPlus;
    accentColor = config.accent || '#107c11';
  } else if (data.type === 'gift') {
    typeLabel = 'REGALO RECIBIDO';
    nameText = `${data.count || 1}x ${data.gift || 'Regalo'} de ${data.user || 'Usuario'}`;
    IconComponent = Gift;
    accentColor = '#f59e0b';
  } else if (data.type === 'goal') {
    typeLabel = 'META COMPLETADA';
    nameText = data.message || '¡Felicidades!';
    IconComponent = Trophy;
    accentColor = '#a855f7';
  } else if (data.type === 'bot') {
    typeLabel = 'NOTIFICACIÓN BOT';
    nameText = data.message || '';
    IconComponent = Bot;
    accentColor = config.accent || '#107c11';
  } else if (data.type === 'game') {
    typeLabel = 'JUGANDO AHORA';
    nameText = data.message || 'Juego detectado';
    IconComponent = Gamepad2;
    accentColor = config.accent || '#107c11';
  } else {
    typeLabel = data.title || 'LOGRO DESBLOQUEADO';
    nameText = data.message || data.user || '';
    IconComponent = Bell;
    accentColor = config.accent || '#107c11';
  }

  const alertImageUrl = data.imageUrl || (data.type === 'game' ? config.gameImage : null);
  const resolvedImageUrl = alertImageUrl ? getOverlayImageUrl(alertImageUrl) : null;

  const pillStyle = resolvedImageUrl ? {
    backgroundImage: `linear-gradient(90deg, rgba(16, 16, 22, 0.9) 0%, rgba(16, 16, 22, 0.7) 100%), url(${resolvedImageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : {};

  return (
    <div id="alert-container" style={{ position: 'fixed', top: `${config.alertTop !== undefined ? config.alertTop : 40}px`, bottom: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
      <div key={currentAlert.id} className={`xbox-alert ${data.type || 'follow'} ${fadingOut ? 'hide' : 'show'}`} style={{ '--xbox-accent': accentColor }}>
        <div className="xbox-circle-wrap">
          <div className="xbox-circle">
            <span className="xbox-pixel-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor }}>
              <IconComponent size={26} strokeWidth={2.2} />
            </span>
          </div>
        </div>
        <div className="xbox-pill" style={pillStyle}>
          <div className="xbox-text-container">
            <span className="xbox-type-label">{typeLabel}</span>
            <span className="xbox-name-text">{nameText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
