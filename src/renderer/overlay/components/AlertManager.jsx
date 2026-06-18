import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { TTSFilter } from '../utils/ttsFilter';
import { getGemSVG } from '../utils/gemIcons';
import { launchAlertConfeti } from '../utils/confettiHelper';

export default function AlertManager() {
  const [currentAlert, setCurrentAlert] = useState(null);
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

    if (data.type === 'follow') launchAlertConfeti('#1D9E75');
    else if (data.type === 'gift') launchAlertConfeti('#e0a95c');
    else if (data.type === 'goal') launchAlertConfeti('#a78bfa');

    setTimeout(() => {
      setCurrentAlert(null);
      setTimeout(() => processAlertQueue(), 300);
    }, data.duration || 4000);
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

  const renderAlertContent = () => {
    const data = currentAlert;
    if (data.type === 'bot') {
      return (
        <>
          <div className="alert-icon" style={{ width: '50px', height: '50px', animation: 'float3d 3s ease-in-out infinite' }} dangerouslySetInnerHTML={{ __html: getGemSVG(1, '#8b5cf6', '#4c1d95') }} />
          <div>
            <div className="alert-title" style={{ color: '#fff', WebkitTextStroke: '0.5px var(--accent)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>🤖 Bot del Stream</div>
            <div className="alert-name" style={{ fontSize: '14px', whiteSpace: 'normal', lineHeight: '1.2', color: '#fff', WebkitTextStroke: '0.5px var(--accent)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{data.message}</div>
          </div>
        </>
      );
    } else if (data.type === 'follow') {
      return (
        <>
          <div className="alert-icon" style={{ width: '50px', height: '50px', animation: 'float3d 3s ease-in-out infinite' }} dangerouslySetInnerHTML={{ __html: getGemSVG(2, '#10b981', '#047857') }} />
          <div>
            <div className="alert-title">Nuevo seguidor</div>
            <div className="alert-name">{data.user || 'usuario'}</div>
          </div>
        </>
      );
    } else if (data.type === 'gift') {
      return (
        <>
          <div className="alert-icon" style={{ width: '50px', height: '50px', animation: 'float3d 3s ease-in-out infinite' }} dangerouslySetInnerHTML={{ __html: getGemSVG(4, '#f59e0b', '#b45309') }} />
          <div>
            <div className="alert-title">{data.user || 'usuario'} ha regalado</div>
            <div className="alert-name">{data.count || 1} de {data.gift || 'regalo'}</div>
          </div>
        </>
      );
    } else if (data.type === 'goal') {
      return (
        <>
          <div className="alert-icon" style={{ width: '50px', height: '50px', animation: 'float3d 3s ease-in-out infinite' }} dangerouslySetInnerHTML={{ __html: getGemSVG(3, '#a855f7', '#7e22ce') }} />
          <div>
            <div className="alert-title">¡Meta alcanzada!</div>
            <div className="alert-name">{data.message || '¡Felicidades!'}</div>
          </div>
        </>
      );
    } else if (data.type === 'game') {
      if (data.imageUrl) {
        return (
          <div style={{ zIndex: 2, flex: 1, textAlign: 'right' }}>
            <div className="alert-title" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)', color: 'rgba(255,255,255,0.9)' }}>Jugando ahora</div>
            <div className="alert-name" style={{ textShadow: '0 2px 6px rgba(0,0,0,1)', fontSize: '1.1em' }}>{data.message || 'Juego detectado'}</div>
          </div>
        );
      } else {
        return (
          <>
            <div className="alert-icon" style={{ width: '50px', height: '50px', animation: 'float3d 3s ease-in-out infinite' }} dangerouslySetInnerHTML={{ __html: getGemSVG(1, 'var(--accent)', '#fff') }} />
            <div>
              <div className="alert-title">Jugando ahora</div>
              <div className="alert-name">{data.message || 'Juego detectado'}</div>
            </div>
          </>
        );
      }
    } else {
      return (
        <>
          <div className="alert-icon" style={{ width: '50px', height: '50px', animation: 'float3d 3s ease-in-out infinite' }} dangerouslySetInnerHTML={{ __html: getGemSVG(2, '#10b981', '#047857') }} />
          <div>
            <div className="alert-title">{data.title || 'Alerta'}</div>
            <div className="alert-name">{data.message || data.user || ''}</div>
          </div>
        </>
      );
    }
  };

  const isGameImage = currentAlert.type === 'game' && currentAlert.imageUrl;
  const containerStyle = isGameImage ? {
    background: `linear-gradient(to right, rgba(15,23,42,0) 0%, rgba(15,23,42,0.9) 60%, rgba(15,23,42,1) 100%), url('${currentAlert.imageUrl}') left center / cover no-repeat`,
    borderColor: 'var(--accent)',
    padding: '14px 20px 14px 100px'
  } : currentAlert.type === 'bot' ? { borderColor: 'var(--accent)' } : currentAlert.type === 'game' ? { background: 'rgba(var(--accent-rgb),0.2)', borderColor: 'var(--accent)' } : {};

  return (
    <div id="alert-container" style={{ position: 'fixed', top: '15%', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
      <div key={currentAlert.id} className={`stream-alert show ${currentAlert.type || 'follow'}`} style={containerStyle}>
        {renderAlertContent()}
      </div>
    </div>
  );
}
