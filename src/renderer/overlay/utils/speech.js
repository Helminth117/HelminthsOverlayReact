import { TTSFilter } from './ttsFilter';

export function speakText(text, config) {
  if (!text) return;
  const cleaned = TTSFilter.clean(text);
  if (!cleaned) return;

  const volume = config.volTts !== undefined ? config.volTts : 1.0;
  const rate = config.ttsRate !== undefined ? config.ttsRate : 1.0;
  const pitch = config.ttsPitch !== undefined ? config.ttsPitch : 1.0;
  const provider = config.ttsProvider || 'browser'; // 'browser' or 'google'

  if (provider === 'google') {
    try {
      // Limit text length to 190 characters to avoid URL length errors for Google Translate TTS
      const truncated = cleaned.slice(0, 190);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodeURIComponent(truncated)}`;
      const audio = new Audio(url);
      audio.volume = volume;
      audio.playbackRate = rate;
      audio.play().catch(err => {
        console.warn('[TTS] Google Translate TTS failed, falling back to local Browser TTS:', err);
        speakLocal(cleaned, config, volume, rate, pitch);
      });
    } catch (e) {
      console.warn('[TTS] Error initializing Google Translate audio, falling back to local Browser TTS:', e);
      speakLocal(cleaned, config, volume, rate, pitch);
    }
  } else {
    speakLocal(cleaned, config, volume, rate, pitch);
  }
}

function speakLocal(text, config, volume, rate, pitch) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-ES';
  if (config.ttsVoiceURI) {
    const selectedVoice = window.speechSynthesis.getVoices().find(v => v.voiceURI === config.ttsVoiceURI);
    if (selectedVoice) u.voice = selectedVoice;
  }
  u.volume = volume;
  u.rate = rate;
  u.pitch = pitch;
  window.speechSynthesis.speak(u);
}
