let audioCtx = null;

/**
 * Synthesizes a tone using Web Audio API based on active game profile style.
 */
export function playSynthTone(type, masterVol, cfg) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {
    console.warn('AudioContext not supported');
    return;
  }
  
  const now = audioCtx.currentTime;
  const gameName = (cfg.gameName || '').toUpperCase();
  const is8Bit = gameName.includes('MINECRAFT') || gameName.includes('RETRO') || gameName.includes('TERRARIA') || gameName.includes('ROBLOX') || gameName.includes('FALL GUYS') || gameName.includes('STARDEW') || gameName.includes('HOLLOW KNIGHT');
  const isShooter = gameName.includes('VALORANT') || gameName.includes('CS') || gameName.includes('CALL OF DUTY') || gameName.includes('APEX') || gameName.includes('OVERWATCH') || gameName.includes('GTA') || gameName.includes('FORTNITE') || gameName.includes('WARFRAME') || gameName.includes('HALO') || gameName.includes('CYBERPUNK') || gameName.includes('DEEP ROCK');
  const isMagic = gameName.includes('LEAGUE') || gameName.includes('GENSHIN') || gameName.includes('ELDEN') || gameName.includes('ZELDA') || gameName.includes('WOW') || gameName.includes('MONSTER HUNTER') || gameName.includes('DOTA');
  const isHorror = gameName.includes('RESIDENT') || gameName.includes('OUTLAST') || gameName.includes('SILENT') || gameName.includes('FNAF') || gameName.includes('PHASMOPHOBIA') || gameName.includes('AMONG US') || gameName.includes('LEFT 4 DEAD') || gameName.includes('ZOMBOID') || gameName.includes('ARK');

  const playTone = (freq, typeStr, volMultiplier, startTime, duration, freqSlideTo = null) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = typeStr;
    
    const finalVol = volMultiplier * masterVol;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(finalVol, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.frequency.setValueAtTime(freq, startTime);
    if (freqSlideTo) {
      osc.frequency.exponentialRampToValueAtTime(freqSlideTo, startTime + duration);
    }
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  let baseFreq = 440;
  if (type === 'follow') baseFreq = 523.25; // C5
  if (type === 'gift') baseFreq = 880; // A5
  if (type === 'goal') baseFreq = 440; // A4
  if (type === 'game') baseFreq = 600; 

  if (is8Bit) {
    playTone(baseFreq, 'square', 0.15, now, 0.15);
    playTone(baseFreq * 1.25, 'square', 0.15, now + 0.1, 0.15);
    playTone(baseFreq * 1.5, 'square', 0.15, now + 0.2, 0.4);
  } else if (isShooter) {
    playTone(baseFreq * 2, 'sawtooth', 0.1, now, 0.3, baseFreq * 0.5);
    if (type === 'gift' || type === 'goal') {
      playTone(baseFreq * 2.5, 'sawtooth', 0.1, now + 0.1, 0.4, baseFreq * 0.5);
    }
  } else if (isMagic) {
    playTone(baseFreq, 'sine', 0.3, now, 0.8);
    playTone(baseFreq * 2, 'sine', 0.1, now, 1.2); 
    if (type === 'gift' || type === 'goal') {
      playTone(baseFreq * 1.5, 'triangle', 0.15, now + 0.15, 1.0);
    }
  } else if (isHorror) {
    const lowFreq = baseFreq * 0.25;
    playTone(lowFreq, 'triangle', 0.4, now, 2.0);
    playTone(lowFreq * 1.05, 'sine', 0.3, now, 2.0); 
    if (type === 'gift' || type === 'goal') {
      playTone(lowFreq * 2, 'sawtooth', 0.05, now + 0.5, 1.5);
    }
  } else {
    playTone(baseFreq, 'sine', 0.2, now, 0.4);
    playTone(baseFreq * 1.25, 'sine', 0.15, now + 0.1, 0.5);
    if (type === 'goal') playTone(baseFreq * 1.5, 'sine', 0.15, now + 0.2, 0.6);
  }
}

/**
 * Triggers alert sound playing (native file or tone synth fallback).
 */
export function playAlertSound(type, config) {
  const vol = config.volAlerts !== undefined ? config.volAlerts : 1.0;
  let soundUrl = '';
  if (config.customSounds && config.customSounds[type]) {
    soundUrl = config.customSounds[type];
  } else {
    if (type === 'follow') soundUrl = './sounds/follow.mp3';
    else if (type === 'gift') soundUrl = './sounds/gift.mp3';
    else if (type === 'goal') soundUrl = './sounds/level-up.mp3';
  }
  
  if (soundUrl) {
    const audio = new Audio(soundUrl);
    audio.volume = vol;
    audio.play().catch(e => {
      console.warn('Could not play alert sound, falling back to synth:', e);
      playSynthTone(type, vol, config);
    });
  } else {
    playSynthTone(type, vol, config);
  }
}
