import React from 'react';

function uid() {
  return 'x' + Date.now() + Math.random().toString(36).substr(2, 9);
}

export default function AppearanceSettingsManager({
  activeSubTab,
  config,
  saveConfig,
  audioDevices,
  refreshAudioDevices
}) {
  if (activeSubTab !== 'apariencia') return null;

  return (
    <section className="sub-view active">

      {/* HUD y Diseño */}
      <div className="card">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M4.93 4.93a10 10 0 0 0 0 14.14M8.46 8.46a5 5 0 0 0 0 7.07"></path>
          </svg>
          HUD y Diseño
        </h2>

        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm text-secondary">Color Acento</span>
          <div className="flex items-center gap-sm">
            <input
              type="color"
              value={config.accent || '#8b5cf6'}
              onChange={(e) => saveConfig({ accent: e.target.value })}
              style={{ width: 30, height: 30, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', padding: 0 }}
            />
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#10b981' })}>🟢</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#6366f1' })}>🔵</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#8b5cf6' })}>🟣</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#f59e0b' })}>🟡</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#ef4444' })}>🔴</button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-sm gap-md">
          <span className="text-sm text-secondary" style={{ minWidth: 90 }}>Transparencia</span>
          <input type="range" className="slider flex-1" min="0.1" max="1" step="0.05" value={config.opacity || 0.85} onChange={(e) => saveConfig({ opacity: parseFloat(e.target.value) })} />
        </div>

        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm">Fondo de escena</span>
          <button className={`toggle ${config.showSceneBg ? 'on' : ''}`} onClick={() => saveConfig({ showSceneBg: !config.showSceneBg })}></button>
        </div>

        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm">Resplandor Neón (Glow)</span>
          <button className={`toggle ${config.neonGlow ? 'on' : ''}`} onClick={() => saveConfig({ neonGlow: !config.neonGlow })}></button>
        </div>

        <div className="flex items-center justify-between mb-sm gap-md">
          <span className="text-sm text-secondary" style={{ minWidth: 90 }}>Grosor Marco Live</span>
          <input type="range" className="slider flex-1" min="0" max="150" step="1" value={config.frameThickness ?? 4} onChange={(e) => saveConfig({ frameThickness: parseInt(e.target.value) })} />
        </div>

        <div className="flex-col gap-xs mt-sm">
          <label className="text-xs text-secondary">Tema del Overlay:</label>
          <select value={config.theme || 'theme-liquid-glass'} onChange={(e) => saveConfig({ theme: e.target.value })} className="inp">
            <option value="theme-liquid-glass">Liquid Glass (Elegante y Cristalino)</option>
            <option value="theme-liquid-glass-expanded">Liquid Glass Expanded (Refraction Style)</option>
            <option value="theme-tokyo-night">Tokyo Night (Cyberpunk, Cuadrado)</option>
            <option value="theme-clean-flat">Clean Flat (Minimalista, Profesional)</option>
            <option value="theme-retro">Retro 8-Bit (Arcade Pixelado)</option>
            <option value="theme-brutalist">Brutalist (Pesado, Táctico)</option>
            <option value="theme-synthwave">Synthwave (Neón Retrowave)</option>
            <option value="theme-obsidian">Obsidian Gold (Lujo Oscuro Premium)</option>
            <option value="theme-holographic">Holographic (HUD Sci-Fi Avanzado)</option>
          </select>
        </div>

        <div className="flex-col gap-xs mt-sm">
          <label className="text-xs text-secondary">Fuente (Letra):</label>
          <select value={config.fontFamily || "'Inter', sans-serif"} onChange={(e) => saveConfig({ fontFamily: e.target.value })} className="inp">
            <option value="'Inter', sans-serif">Inter (Moderno UI)</option>
            <option value="'Rajdhani', sans-serif">Rajdhani (Gamer)</option>
            <option value="'JetBrains Mono', monospace">JetBrains Mono (Código)</option>
          </select>
        </div>

        <div className="flex-col gap-xs mt-sm">
          <label className="text-xs text-secondary">Estilo Reproductor de Música:</label>
          <select value={config.musicWidgetStyle || 'music-style-glass'} onChange={(e) => saveConfig({ musicWidgetStyle: e.target.value })} className="inp">
            <option value="music-style-glass">Tarjeta Premium (Glassmorphism)</option>
            <option value="music-style-vinyl">Vinilo Giratorio (Dinámico)</option>
            <option value="music-style-pill">Isla Dinámica (Píldora iOS)</option>
          </select>
        </div>
      </div>

      {/* Audio */}
      <div className="card">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
          Audio
        </h2>

        <div className="flex-col gap-xs mb-md">
          <label className="text-xs text-secondary">Dispositivo de Audio (Visualizador):</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={config.audioDeviceId || 'desktop'} onChange={(e) => saveConfig({ audioDeviceId: e.target.value })} className="inp" style={{ flex: 1 }}>
              <option value="desktop">Audio del Sistema (Mix Maestro)</option>
              {audioDevices.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={refreshAudioDevices} title="Recargar Dispositivos">↻</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Si el visualizador se congela al cambiar de auriculares, selecciona tu dispositivo aquí.
          </div>
        </div>

        <h3 className="mb-sm" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Mezclador de Volumen</h3>

        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Alertas ({Math.round((config.volAlerts ?? 1) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="2" step="0.1" value={config.volAlerts ?? 1} style={{ width: 150 }} onChange={(e) => saveConfig({ volAlerts: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Soundboard ({Math.round((config.volSoundboard ?? 0.8) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volSoundboard ?? 0.8} style={{ width: 150 }} onChange={(e) => saveConfig({ volSoundboard: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">TTS / Voz ({Math.round((config.volTts ?? 1) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volTts ?? 1} style={{ width: 150 }} onChange={(e) => saveConfig({ volTts: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Música / YouTube ({Math.round((config.volMusic ?? 0.8) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volMusic ?? 0.8} style={{ width: 150 }} onChange={(e) => saveConfig({ volMusic: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Sincronía Letras (Offset: {(config.lyricsOffset ?? 0).toFixed(1)}s)</span>
          <input type="range" className="slider" min="-5" max="5" step="0.1" value={config.lyricsOffset ?? 0} style={{ width: 150 }} onChange={(e) => saveConfig({ lyricsOffset: parseFloat(e.target.value) })} />
        </div>
      </div>

      {/* Redes Sociales */}
      <div className="card">
        <h2>Redes Sociales / Textos Libres</h2>
        <div className="flex-col gap-xs mb-sm">
          {config.social.map((s, i) => (
            <div key={s.uid || s.id} className="list-item flex" style={{ alignItems: 'center', gap: 8, padding: '8px 12px' }}>
              <select className="inp" style={{ width: 110, fontSize: 11, padding: '4px 8px', height: 28 }} value={s.icon} onChange={(e) => {
                const newSoc = [...config.social]; newSoc[i].icon = e.target.value; saveConfig({ social: newSoc });
              }}>
                <option value="tiktok">TikTok</option>
                <option value="twitch">Twitch</option>
                <option value="youtube">YouTube</option>
                <option value="discord">Discord</option>
                <option value="instagram">Instagram</option>
                <option value="twitter">Twitter / X</option>
                <option value="facebook">Facebook</option>
                <option value="globe">Personalizado</option>
              </select>
              <input className="inp flex-1" type="text" value={s.handle} placeholder="usuario / link..." style={{ fontSize: 12, height: 28, padding: '4px 8px' }} onChange={(e) => {
                const newSoc = [...config.social]; newSoc[i].handle = e.target.value; saveConfig({ social: newSoc });
              }} />
              <button className={`toggle ${s.visible ? 'on' : ''}`} onClick={() => {
                const newSoc = [...config.social]; newSoc[i].visible = !newSoc[i].visible; saveConfig({ social: newSoc });
              }}></button>
              <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12, height: 28 }} onClick={() => {
                saveConfig({ social: config.social.filter(x => x !== s) });
              }}>×</button>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost w-full" onClick={() => saveConfig({ social: [...config.social, { uid: uid(), icon: 'globe', handle: '', visible: true }] })}>+ Añadir Red Social</button>
      </div>

      {/* Widget Web Externo */}
      <div className="card">
        <h2>🎵 Widget Web Externo (Spotify / etc.)</h2>
        <div className="flex gap-sm mb-sm">
          <input className="inp" type="text" value={config.spotifyUrl || ''} placeholder="URL del widget..." onChange={(e) => saveConfig({ spotifyUrl: e.target.value })} />
        </div>
        <div className="flex gap-sm">
          <input className="inp" type="number" value={config.spotifyW || 400} placeholder="Ancho" style={{ width: 80 }} onChange={(e) => saveConfig({ spotifyW: parseInt(e.target.value) || 400 })} />
          <input className="inp" type="number" value={config.spotifyH || 150} placeholder="Alto" style={{ width: 80 }} onChange={(e) => saveConfig({ spotifyH: parseInt(e.target.value) || 150 })} />
        </div>
      </div>

    </section>
  );
}
