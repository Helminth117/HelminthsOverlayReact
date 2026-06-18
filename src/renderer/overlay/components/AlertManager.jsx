import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';

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

function getGemSVG(tier = 1, primaryColor = '#4facfe', secondaryColor = '#00f2fe') {
  let paths = '';
  if (tier === 1) {
    paths = `<polygon points="12,2 22,20 2,20" fill="url(#gem-grad)"/><polygon points="12,2 12,20 2,20" fill="rgba(255,255,255,0.3)"/>`;
  } else if (tier === 2) {
    paths = `<polygon points="12,2 20,12 12,22 4,12" fill="url(#gem-grad)"/><polygon points="12,2 12,22 4,12" fill="rgba(255,255,255,0.3)"/>`;
  } else if (tier === 3) {
    paths = `<polygon points="12,2 20,6 20,18 12,22 4,18 4,6" fill="url(#gem-grad)"/><polygon points="12,2 20,6 12,12 4,6" fill="rgba(255,255,255,0.4)"/><polygon points="12,12 20,6 20,18 12,22" fill="rgba(0,0,0,0.1)"/><polygon points="4,6 12,12 12,22 4,18" fill="rgba(255,255,255,0.2)"/>`;
  } else if (tier === 4) {
    paths = `<polygon points="12,22 22,8 18,2 6,2 2,8" fill="url(#gem-grad)"/><polygon points="6,2 18,2 12,8" fill="rgba(255,255,255,0.5)"/><polygon points="2,8 12,8 6,2" fill="rgba(255,255,255,0.3)"/><polygon points="22,8 12,8 18,2" fill="rgba(255,255,255,0.1)"/><polygon points="12,22 2,8 12,8" fill="rgba(255,255,255,0.2)"/><polygon points="12,22 22,8 12,8" fill="rgba(0,0,0,0.15)"/>`;
  } else {
    paths = `<polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" fill="url(#gem-grad)"/><polygon points="12,0 15,9 12,12 9,9" fill="rgba(255,255,255,0.5)"/><polygon points="24,12 15,15 12,12 15,9" fill="rgba(255,255,255,0.3)"/><polygon points="12,24 9,15 12,12 15,15" fill="rgba(0,0,0,0.2)"/><polygon points="0,12 9,9 12,12 9,15" fill="rgba(255,255,255,0.1)"/>`;
  }

  const id = Math.random().toString(36).substr(2, 9);
  return `<svg class="gem-svg gem-tier-${tier}" width="100%" height="100%" viewBox="0 0 24 24" style="filter: drop-shadow(0 0 8px ${primaryColor}80);"><defs><linearGradient id="gem-grad-${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${primaryColor}" /><stop offset="100%" stop-color="${secondaryColor}" /></linearGradient></defs><g fill="url(#gem-grad-${id})">${paths.replace(/gem-grad/g, 'gem-grad-' + id)}</g></svg>`;
}

function launchAlertConfeti(color) {
  const duration = 2000;
  const end = Date.now() + duration;
  (function frame() {
    if (typeof window.confetti !== 'function') return;
    window.confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: [color, '#ffffff'] });
    window.confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: [color, '#ffffff'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}

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
