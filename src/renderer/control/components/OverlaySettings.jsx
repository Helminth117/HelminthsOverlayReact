import React, { useState, useEffect } from 'react';

function uid() {
  return 'x' + Date.now() + Math.random().toString(36).substr(2, 9);
}

const WIDGET_LABELS = { 
  frame: 'Marco Live', 
  user: 'Nombre/Live', 
  socials: 'Redes', 
  stats: 'Stats TikTok', 
  topevents: 'Top Eventos', 
  objs: 'Objetivos', 
  timers: 'Reloj', 
  game: 'Juego', 
  chips: 'Datos Juego', 
  chat: 'Caja Chat', 
  'pinned-chat': 'Mensaje Fijado', 
  visualizer: 'Visualizador', 
  spotify: 'Spotify / Web', 
  media: 'Música Local', 
  lyrics: 'Letras', 
  'chat-avatars': 'Avatares Chat', 
  combo: 'Combos de Likes' 
};

export default function OverlaySettings({
  activeTab,
  config,
  saveConfig,
  showSaved,
  audioDevices,
  refreshAudioDevices
}) {
  const [activeSubTab, setActiveSubTab] = useState('widgets');
  const [widgetOptsOpen, setWidgetOptsOpen] = useState({});
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        const all = window.speechSynthesis.getVoices();
        setVoices(all);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const testVoiceLocal = () => {
    const customText = document.getElementById('custom-tts-test-input')?.value?.trim();
    const prefix = config.chatTtsPrefix || '.';
    const msgText = customText ? `${prefix}${customText}` : `${prefix}Hola, probando la voz del chat!`;

    if (window.api && window.api.testChatTts) {
      const msg = { user: 'TestUser', text: msgText, isFollower: true, isMod: false, isSub: false };
      window.api.testChatTts(msg);
    }
  };

  const esVoices = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
  const otherVoices = voices.filter(v => !v.lang.toLowerCase().startsWith('es'));

  if (activeTab !== 'settings') return null;

  return (
    <div className="tab-view active">
      {/* Subtabs Navigation */}
      <nav className="sub-tabs">
        <button className={`sub-tab-btn ${activeSubTab === 'widgets' ? 'active' : ''}`} onClick={() => setActiveSubTab('widgets')}>🧱 Widgets</button>
        <button className={`sub-tab-btn ${activeSubTab === 'diseno' ? 'active' : ''}`} onClick={() => setActiveSubTab('diseno')}>🎨 Diseño</button>
        <button className={`sub-tab-btn ${activeSubTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveSubTab('audio')}>🔊 Audio</button>
        <button className={`sub-tab-btn ${activeSubTab === 'integraciones' ? 'active' : ''}`} onClick={() => setActiveSubTab('integraciones')}>🔌 Integraciones</button>
      </nav>

      {/* ── WIDGETS SUBTAB ── */}
      {activeSubTab === 'widgets' && (
        <section className="sub-view active">
          <div className="card highlight">
            <h2 className="flex items-center gap-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
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
        </section>
      )}

      {/* ── DISEÑO SUBTAB ── */}
      {activeSubTab === 'diseno' && (
        <section className="sub-view active">
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
        </section>
      )}

      {/* ── AUDIO SUBTAB ── */}
      {activeSubTab === 'audio' && (
        <section className="sub-view active">
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
        </section>
      )}

      {/* ── INTEGRACIONES SUBTAB ── */}
      {activeSubTab === 'integraciones' && (
        <section className="sub-view active">
          {/* TikTok Live Goals */}
          <div className="card">
            <h2>Meta de Seguidores</h2>
            <div className="flex gap-sm">
              <input className="inp" type="number" placeholder="Ej: 1000" min="1" value={config.followersGoal || ''} onChange={e => saveConfig({ followersGoal: parseInt(e.target.value) || 0 })} />
              <button className="btn btn-ghost" onClick={() => showSaved()}>Guardar</button>
            </div>
          </div>

          {/* Socials */}
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

          {/* Spotify External URL */}
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

          {/* Chat Bot messages */}
          <div className="card">
            <div className="flex items-center justify-between mb-sm">
              <h2 style={{ marginBottom: 0 }}>🤖 Bot del Chat (Overlay)</h2>
              <button className={`toggle ${config.enableBot ? 'on' : ''}`} onClick={() => saveConfig({ enableBot: !config.enableBot })}></button>
            </div>
            <p className="text-sm text-secondary mb-xs">El bot enviará mensajes automáticos en el chat visual de la pantalla.</p>
            <div className="flex items-center justify-between mb-sm">
              <span className="text-sm">Intervalo Automático (Minutos)</span>
              <input type="number" className="inp" style={{ width: 80 }} value={config.botInterval ?? 5} min="1" onChange={(e) => saveConfig({ botInterval: parseFloat(e.target.value) || 5 })} />
            </div>
            <div className="mb-sm">
              <span className="text-sm">Mensajes Automáticos (Uno por línea)</span>
              <textarea className="inp" rows="4" style={{ resize: 'vertical', marginTop: 6 }} value={config.botMessages ?? '¡Sígueme para más contenido!\n¡Comparte el directo!\n¡Pide canciones con !play!'} onChange={(e) => saveConfig({ botMessages: e.target.value })}></textarea>
            </div>
          </div>

          {/* Custom Blacklist */}
          <div className="card">
            <h2>🚫 Lista Negra de Palabras (Blacklist)</h2>
            <p className="text-xs text-secondary mb-sm">
              Las canciones o mensajes que contengan estas palabras se bloquearán y censurarán automáticamente (además de la blacklist global).
            </p>
            
            <div className="flex gap-sm mb-md">
              <input 
                type="text" 
                id="custom-blacklist-input" 
                className="inp flex-1" 
                placeholder="Palabra o frase a bloquear..." 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const btn = document.getElementById('add-blacklist-btn');
                    if (btn) btn.click();
                  }
                }}
              />
              <button 
                id="add-blacklist-btn"
                className="btn btn-primary" 
                onClick={() => {
                  const input = document.getElementById('custom-blacklist-input');
                  const word = input?.value?.trim()?.toLowerCase();
                  if (!word) return;
                  
                  const currentList = config.customBlacklist || [];
                  if (currentList.includes(word)) {
                    alert('Esta palabra ya está en tu lista negra.');
                    return;
                  }
                  
                  saveConfig({ customBlacklist: [...currentList, word] });
                  if (input) input.value = '';
                }}
              >
                Añadir
              </button>
            </div>

            <div className="flex-col gap-xs" style={{ maxHeight: 200, overflowY: 'auto', background: 'var(--bg-input)', borderRadius: 8, padding: 10 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700 }}>Palabras Bloqueadas Personalizadas</h4>
              {(!config.customBlacklist || config.customBlacklist.length === 0) ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: 8 }}>
                  No hay palabras personalizadas agregadas.
                </div>
              ) : (
                config.customBlacklist.map((word, idx) => (
                  <div key={idx} className="flex items-center justify-between p-xs" style={{ borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{word}</span>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '2px 8px', fontSize: 11, height: 'auto', lineHeight: 1 }}
                      onClick={() => {
                        const newList = config.customBlacklist.filter((_, i) => i !== idx);
                        saveConfig({ customBlacklist: newList });
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Song Request Settings */}
          <div className="card">
            <div className="flex items-center justify-between mb-sm">
              <h2 style={{ marginBottom: 0 }}>🎵 Configuración de !play (Song Requests)</h2>
              <button className={`toggle ${config.enableSongRequests ? 'on' : ''}`} onClick={() => saveConfig({ enableSongRequests: !config.enableSongRequests })}></button>
            </div>
            <span className="text-xs text-secondary mb-sm" style={{ display: 'block' }}>Permite que el chat pida música de YouTube con <strong>!play [canción]</strong>.</span>

            <div className="flex gap-xs items-center mb-sm">
              <input type="text" id="song-request-test-input" className="inp flex-1" placeholder="Ej. Rap God" defaultValue="Blinding Lights" />
              <button className="btn btn-primary" style={{ padding: '8px 12px' }} onClick={() => {
                if (!config.enableSongRequests) return alert('Activa la casilla primero para poder probarlo.');
                const query = document.getElementById('song-request-test-input').value || 'blinding lights';
                window.api.testChatTts({ user: 'Helminth', text: `!play ${query}`, isFollower: true, isMod: true, isSub: false });
              }}>Probar Búsqueda</button>
            </div>

            <div className="flex gap-sm">
              <div style={{ flex: 1 }}>
                <div className="text-xs text-secondary mb-xs">Cooldown por usuario (seg.)</div>
                <input type="number" min="0" max="600" className="inp" style={{ width: '100%' }} value={config.songCooldown ?? 60} onChange={(e) => saveConfig({ songCooldown: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="text-xs text-secondary mb-xs">Duración máx. (minutos)</div>
                <input type="number" min="1" max="120" className="inp" style={{ width: '100%' }} value={config.maxSongDuration ?? 25} onChange={(e) => saveConfig({ maxSongDuration: parseInt(e.target.value) || 25 })} />
              </div>
            </div>
          </div>

          {/* Alerts Configuration */}
          <div className="card">
            <h2>🔔 Configuración de Alertas</h2>
            
            {/* Preview buttons */}
            <div className="flex gap-sm mb-sm" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'follow', user: 'TestUser123', message: '¡@TestUser123 te siguió!' })}>🎉 Follow</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'gift', user: 'TestUser123', gift: 'Rosa', count: 5, message: '🎁 x5 Rosa' })}>🎁 Regalo</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'game', message: 'Valorant' })}>🎮 Juego</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'goal', message: '¡100 seguidores!' })}>🏆 Meta</button>
            </div>

            {/* Custom Sounds */}
            <div className="flex-col gap-xs mb-sm" style={{ background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 8 }}>
              <h3 style={{ fontSize: 13, margin: '0 0 8px 0', fontWeight: 600 }}>Sonidos Personalizados</h3>
              {['follow', 'gift', 'game', 'goal'].map(type => (
                <div key={type} className="flex items-center justify-between mt-xs">
                  <span className="text-xs" style={{ textTransform: 'capitalize' }}>
                    {type === 'follow' ? '🎉 Follow' : type === 'gift' ? '🎁 Regalo' : type === 'game' ? '🎮 Juego' : '🏆 Meta'}
                  </span>
                  <input type="file" accept="audio/*" className="inp text-xs" style={{ width: 160, padding: 2 }} onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      saveConfig({ customSounds: { ...config.customSounds, [type]: e.target.files[0].path } });
                    }
                  }} />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-sm mt-md">
              <span className="text-sm">Duración ({(config.alertDuration || 4000) / 1000}s)</span>
              <input type="range" className="slider" min="1" max="10" step="0.5" value={(config.alertDuration || 4000) / 1000} style={{ width: 150 }} onChange={(e) => saveConfig({ alertDuration: parseFloat(e.target.value) * 1000 })} />
            </div>
            <div className="flex items-center justify-between mb-sm">
              <span className="text-sm">Altura Alertas (Top Offset)</span>
              <div className="flex items-center gap-xs">
                <input type="range" className="slider" min="10" max="800" step="10" value={config.alertTop !== undefined ? config.alertTop : 40} style={{ width: 120 }} onChange={(e) => saveConfig({ alertTop: parseInt(e.target.value) || 0 })} />
                <span className="text-xs" style={{ width: 45, textAlign: 'right', fontWeight: 'bold' }}>{config.alertTop !== undefined ? config.alertTop : 40}px</span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-sm">
              <span className="text-sm">Sonido Activado</span>
              <button className={`toggle ${config.alertSounds !== false ? 'on' : ''}`} onClick={() => saveConfig({ alertSounds: config.alertSounds === false ? true : false })}></button>
            </div>
            <div className="flex items-center justify-between mb-sm">
              <span className="text-sm">Voz de IA (TTS) para Alertas</span>
              <button className={`toggle ${config.enableTTS ? 'on' : ''}`} onClick={() => saveConfig({ enableTTS: !config.enableTTS })}></button>
            </div>

            {/* TTS Settings & Chat Prefix */}
            <div className="flex-col gap-xs mb-sm mt-md" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', padding: 12, borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700 }}>⚙️ Configuración de Voz (TTS)</h3>
              
              {/* Proveedor dropdown */}
              <div className="flex-col gap-xs mb-sm">
                <label className="text-xs text-secondary">Motor / Proveedor de Voz:</label>
                <select 
                  value={config.ttsProvider || 'browser'} 
                  onChange={(e) => saveConfig({ ttsProvider: e.target.value })} 
                  className="inp w-full"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  <option value="browser">Voces del Sistema (Offline/Locales)</option>
                  <option value="google">Voz de Google Translate (Online/Femenina y Fluida)</option>
                </select>
              </div>

              {/* Voz dropdown */}
              {(config.ttsProvider || 'browser') === 'browser' && (
                <div className="flex-col gap-xs mb-sm">
                  <label className="text-xs text-secondary">Seleccionar Voz:</label>
                  <select 
                    value={config.ttsVoiceURI || ''} 
                    onChange={(e) => saveConfig({ ttsVoiceURI: e.target.value })} 
                    className="inp w-full"
                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <option value="">-- Voz por Defecto del Sistema --</option>
                    {esVoices.length > 0 && (
                      <optgroup label="Español (Recomendado)">
                        {esVoices.map(v => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherVoices.length > 0 && (
                      <optgroup label="Otros Idiomas">
                        {otherVoices.map(v => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <span className="text-xs text-secondary" style={{ fontStyle: 'italic', display: 'block', marginTop: 4 }}>
                    Nota: Las voces dependen de tu sistema operativo y navegador (ej. Microsoft Sabina/Helena en Windows).
                  </span>
                </div>
              )}

              {/* Sliders for Rate (Speed) and Pitch (Tone) */}
              <div className="flex items-center justify-between mb-sm">
                <span className="text-sm">Velocidad (Fluidez):</span>
                <div className="flex items-center gap-xs">
                  <input 
                    type="range" 
                    className="slider" 
                    min="0.5" 
                    max="2.0" 
                    step="0.05" 
                    value={config.ttsRate !== undefined ? config.ttsRate : 1.0} 
                    style={{ width: 120 }} 
                    onChange={(e) => saveConfig({ ttsRate: parseFloat(e.target.value) })} 
                  />
                  <span className="text-xs font-bold" style={{ width: 35, textAlign: 'right' }}>
                    {config.ttsRate !== undefined ? config.ttsRate.toFixed(2) : '1.00'}x
                  </span>
                </div>
              </div>

              {(config.ttsProvider || 'browser') === 'browser' && (
                <div className="flex items-center justify-between mb-sm">
                  <span className="text-sm">Tono (Femenino / Agudo):</span>
                  <div className="flex items-center gap-xs">
                    <input 
                      type="range" 
                      className="slider" 
                      min="0.5" 
                      max="2.0" 
                      step="0.05" 
                      value={config.ttsPitch !== undefined ? config.ttsPitch : 1.0} 
                      style={{ width: 120 }} 
                      onChange={(e) => saveConfig({ ttsPitch: parseFloat(e.target.value) })} 
                    />
                    <span className="text-xs font-bold" style={{ width: 35, textAlign: 'right' }}>
                      {config.ttsPitch !== undefined ? config.ttsPitch.toFixed(2) : '1.00'}
                    </span>
                  </div>
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '10px 0' }} />

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">💬 Prefijo para Chat TTS</span>
                <div className="flex gap-xs items-center">
                  <input type="text" className="inp text-center font-bold" style={{ width: 50 }} maxLength="3" value={config.chatTtsPrefix || '.'} onChange={(e) => saveConfig({ chatTtsPrefix: e.target.value })} />
                  <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={testVoiceLocal}>
                    Probar Voz
                  </button>
                </div>
              </div>
              <div className="flex gap-xs items-center mt-xs">
                <input type="text" id="custom-tts-test-input" className="inp flex-1" placeholder="Ej. Escribe algo para escuchar la voz de prueba..." />
              </div>
              <span className="text-xs text-secondary mt-xs" style={{ display: 'block' }}>
                Los seguidores usarán este prefijo para que el TTS lea su mensaje (ej. <strong>.hola</strong>).
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
