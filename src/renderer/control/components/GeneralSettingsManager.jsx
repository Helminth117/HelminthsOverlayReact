import React, { useState } from 'react';

function uid() {
  return 'x' + Date.now() + Math.random().toString(36).substr(2, 9);
}

export default function GeneralSettingsManager({
  activeSubTab,
  config,
  saveConfig,
  audioDevices,
  refreshAudioDevices,
  WIDGET_LABELS
}) {
  const [widgetOptsOpen, setWidgetOptsOpen] = useState({});

  if (activeSubTab !== 'general') return null;

  return (
    <section className="sub-view active">
      {/* Widget Visibility */}
      <div className="card highlight">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Visibilidad de Widgets
        </h2>
        <div className="flex-col gap-xs">
          {Object.keys(WIDGET_LABELS).map(id => {
            const isOpen = widgetOptsOpen[id];
            const wActive = config.widgets[id] !== false;
            const gActive = config.glassWidgets[id] !== false;
            const align = config.textAlign[id] || 'left';
            return (
              <div key={id} className="list-item flex-col" style={{ padding: 0 }}>
                <div className="flex items-center justify-between" style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => setWidgetOptsOpen(p => ({ ...p, [id]: !p[id] }))}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{WIDGET_LABELS[id]}</span>
                  <div className="flex items-center gap-sm">
                    <button className="btn btn-ghost" title="Opciones" onClick={(e) => { e.stopPropagation(); setWidgetOptsOpen(p => ({ ...p, [id]: !p[id] })); }} style={{ padding: '4px 8px', fontSize: 11 }}>⚙️</button>
                    <button className={`toggle ${wActive ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); saveConfig({ widgets: { ...config.widgets, [id]: !wActive } }); }}></button>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 12px 12px 12px' }}>
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }} className="flex-col gap-sm">
                      <button className="btn btn-ghost w-full" onClick={() => {
                          const newLayout = { ...(config.layout || { modules: {} }) };
                          if (!newLayout.modules) newLayout.modules = {};
                          newLayout.modules['comp-' + id] = { l: '40vw', t: '40vh', w: '', h: '', z: '999' };
                          saveConfig({ layout: newLayout, widgets: { ...config.widgets, [id]: true } });
                      }} style={{ fontSize: 11 }}>⌖ Centrar en pantalla</button>
                      <div className="flex items-center justify-between mt-xs">
                        <div className="flex items-center gap-xs">
                          <span className="text-xs text-secondary">Fondo Glass</span>
                          <button className={`toggle ${gActive ? 'on' : ''}`} style={{ transform: 'scale(0.8)' }} onClick={() => saveConfig({ glassWidgets: { ...config.glassWidgets, [id]: !gActive } })}></button>
                        </div>
                        <div className="flex items-center gap-xs">
                          <span className="text-xs text-secondary">Alineación</span>
                          <div className="flex" style={{ background: 'var(--bg-input)', borderRadius: 4, padding: 2 }}>
                            {['left', 'center', 'right'].map(a => (
                              <button key={a} onClick={() => saveConfig({ textAlign: { ...config.textAlign, [id]: a } })} style={{ padding: '2px 8px', borderRadius: 3, border: 'none', background: align === a ? 'var(--accent)' : 'transparent', color: align === a ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }}>
                                {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-md" style={{ paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-light)' }}>
          <span className="text-sm" style={{ fontWeight: 600 }}>Modo Movimiento (Editar Pantalla)</span>
          <button className={`toggle ${config.moveMode ? 'on' : ''}`} onClick={() => { window.api.setMoveMode(!config.moveMode); saveConfig({ moveMode: !config.moveMode }); }}></button>
        </div>
      </div>

      {/* Theme & HUD */}
      <div className="card">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          HUD y Diseño
        </h2>
        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm text-secondary">Color Acento</span>
          <div className="flex items-center gap-sm">
            <input type="color" value={config.accent || '#8b5cf6'} onChange={(e) => saveConfig({ accent: e.target.value })} style={{ width: 30, height: 30, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', padding: 0 }} />
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

      {/* Audio Config */}
      <div className="card">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          Configuración de Audio
        </h2>
        <div className="flex-col gap-xs mt-sm">
          <label className="text-xs text-secondary">Dispositivo de Audio (Visualizador):</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={config.audioDeviceId || 'desktop'} onChange={(e) => saveConfig({ audioDeviceId: e.target.value })} className="inp" style={{ flex: 1 }}>
              <option value="desktop">Audio del Sistema (Mix Maestro)</option>
              {audioDevices.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={refreshAudioDevices} title="Recargar Dispositivos">↻</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Si el visualizador se congela al cambiar de auriculares, selecciona tu dispositivo aquí en lugar del "Sistema".
          </div>
        </div>
      </div>

      {/* Scenes */}
      <div className="card highlight">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          Escenas Cinemáticas
        </h2>
        <div className="flex-col gap-sm">
          <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => saveConfig({ activeScene: 'starting' })}>▶ Empezando Stream</button>
          <button className="btn btn-ghost w-full" style={{ justifyContent: 'center', background: 'rgba(255, 204, 0, 0.2)', color: '#ffcc00' }} onClick={() => saveConfig({ activeScene: 'brb' })}>⏸ Ahorita Vuelvo</button>
          <button className="btn btn-ghost w-full" style={{ justifyContent: 'center', background: 'rgba(255, 50, 50, 0.2)', color: '#ff5555' }} onClick={() => saveConfig({ activeScene: 'ending' })}>⏹ Stream Finalizado</button>
          <button className="btn w-full" style={{ justifyContent: 'center', border: '1px solid var(--border-light)' }} onClick={() => saveConfig({ activeScene: 'none' })}>👁 Volver al Stream (En Vivo)</button>
        </div>
      </div>

      {/* Social */}
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

      {/* Spotify */}
      <div className="card">
        <h2>🎵 Widget Web Externo (Spotify)</h2>
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
