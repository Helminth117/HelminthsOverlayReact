import React, { useState } from 'react';

export default function TikTokManager({
  activeTab,
  ttStatus,
  setTtStatus,
  config,
  saveConfig,
  showSaved,
  poll,
  setPoll,
  isPollActive,
  setIsPollActive,
  chatHistory,
  queueData
}) {
  const [activeSubTab, setActiveSubTab] = useState('live');

  return (
    <main className={`tab-view ${activeTab === 'tiktok' ? 'active' : ''}`}>

      {/* Sub-tabs de TikTok */}
      <nav className="sub-tabs">
        <button className={`sub-tab-btn ${activeSubTab === 'live' ? 'active' : ''}`} onClick={() => setActiveSubTab('live')}>🔴 Live</button>
        <button className={`sub-tab-btn ${activeSubTab === 'interaccion' ? 'active' : ''}`} onClick={() => setActiveSubTab('interaccion')}>💬 Interacción</button>
        <button className={`sub-tab-btn ${activeSubTab === 'herramientas' ? 'active' : ''}`} onClick={() => setActiveSubTab('herramientas')}>🛠️ Herramientas</button>
      </nav>

      {/* ── LIVE ── */}
      {activeSubTab === 'live' && (
        <section className="sub-view active">

          <div className="card">
            <h2>Conectar al Live</h2>
            <div className="flex gap-sm">
              <input className="inp" type="text" placeholder="tu_usuario (sin @)" value={ttStatus.username} onChange={(e) => setTtStatus({ ...ttStatus, username: e.target.value })} />
              <button className="btn btn-primary" disabled={ttStatus.state === 'connecting'} onClick={async () => {
                const user = ttStatus.username.trim().replace('@', '');
                if (!user) return;
                setTtStatus(p => ({ ...p, state: 'connecting', msg: 'Conectando a @' + user + '...' }));
                try {
                  const r = await window.api.tiktokConnect(user);
                  if (r.waiting) setTtStatus(p => ({ ...p, state: 'waiting', msg: '⏳ Esperando que @' + user + ' inicie el live...' }));
                  else if (!r.ok) setTtStatus(p => ({ ...p, state: 'error', msg: '❌ Error: ' + r.error }));
                } catch (e) {
                  setTtStatus(p => ({ ...p, state: 'error', msg: '❌ Error: ' + e.message }));
                }
              }}>{ttStatus.state === 'connecting' ? 'Conectando...' : 'Conectar'}</button>
            </div>
            <div className="mt-sm flex items-center gap-sm" style={{ background: 'var(--bg-input)', padding: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: ttStatus.state !== 'disconnected' ? 'flex' : 'none' }}>
              <div className={`status-dot ${ttStatus.state === 'connected' ? 'live' : (ttStatus.state === 'waiting' ? 'online' : (ttStatus.state === 'error' ? 'error' : ''))}`} style={ttStatus.state === 'waiting' ? { background: '#e0a95c' } : (ttStatus.state === 'error' ? { background: '#e05c5c' } : {})}></div>
              <span className="text-sm text-secondary">{ttStatus.msg}</span>
            </div>
          </div>

          <div className="card">
            <h2>Meta de Seguidores</h2>
            <div className="flex gap-sm">
              <input className="inp" type="number" placeholder="Ej: 1000" min="1" value={config.followersGoal || ''} onChange={e => saveConfig({ followersGoal: parseInt(e.target.value) || 0 })} />
              <button className="btn btn-ghost" onClick={() => showSaved()}>Guardar</button>
            </div>
          </div>

          {ttStatus.stats && (
            <div className="card">
              <h2>Estadísticas en vivo</h2>
              <div className="stat-grid">
                {[
                  { val: '+' + (ttStatus.stats.followers_gained || 0), lbl: 'Nuevos seguidores' },
                  { val: ttStatus.stats.viewers || 0, lbl: 'Viewers' },
                  { val: ttStatus.stats.likes || 0, lbl: 'Likes' },
                  { val: ttStatus.stats.gifts || 0, lbl: 'Regalos' }
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-value">{s.val}</div>
                    <div className="stat-label">{s.lbl}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost w-full mt-md" onClick={() => window.api.tiktokReset()}>Resetear stats</button>
            </div>
          )}

          {chatHistory.length > 0 && (
            <div className="card" id="tiktok-chat-card">
              <h2 className="mb-sm">Chat en vivo</h2>
              <div id="tt-chat-list" className="flex-col" style={{ maxHeight: 300, overflowY: 'auto' }}>
                {[...chatHistory].reverse().map((msg, idx) => (
                  <div key={idx} className="flex items-center justify-between p-xs" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
                      {msg.isMod && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, padding: '2px 4px', borderRadius: 4, marginRight: 4 }}>MOD</span>}
                      {msg.isSub && <span style={{ background: '#8b5cf6', color: '#fff', fontSize: 10, padding: '2px 4px', borderRadius: 4, marginRight: 4 }}>SUB</span>}
                      <strong style={{ color: 'var(--text-main)' }}>{msg.user}:</strong>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{msg.text}</span>
                    </div>
                    <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => window.api.pinChatMessage(msg)}>📌 Pin</button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>
      )}

      {/* ── INTERACCIÓN ── */}
      {activeSubTab === 'interaccion' && (
        <section className="sub-view active">

          <div className="card">
            <h2>Encuesta Rápida (TikTok)</h2>
            <p className="text-sm text-secondary mb-sm">Los espectadores votan en el chat usando los números (1, 2, 3...).</p>
            <div className="flex-col gap-sm">
              <div>
                <label className="text-xs text-secondary font-bold uppercase block mb-xs">Pregunta</label>
                <input type="text" className="inp w-full" placeholder="Ej: ¿Qué juego transmitimos?" value={poll.question} onChange={e => setPoll({ ...poll, question: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-secondary font-bold uppercase block mb-xs">Duración (segundos)</label>
                <input type="number" className="inp w-full" value={poll.duration} min="0" onChange={e => setPoll({ ...poll, duration: parseInt(e.target.value) || 0 })} />
                <p className="text-xs text-secondary mt-xs">0 para votación manual (sin tiempo límite)</p>
              </div>
              <div>
                <label className="text-xs text-secondary font-bold uppercase block mb-xs">Opciones</label>
                <div className="flex-col gap-xs">
                  {poll.options.map((opt, i) => (
                    <div key={i} className="flex gap-xs items-center poll-option-row">
                      <span className="text-primary font-bold">{i + 1}.</span>
                      <input type="text" className="inp flex-1 poll-opt-input" placeholder={`Opción ${i + 1}`} value={opt} onChange={e => {
                        const newOpts = [...poll.options]; newOpts[i] = e.target.value; setPoll({ ...poll, options: newOpts });
                      }} />
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost w-full mt-sm" onClick={() => {
                  if (poll.options.length >= 6) return alert('Máximo 6 opciones recomendadas');
                  setPoll({ ...poll, options: [...poll.options, ''] });
                }}>+ Añadir Opción</button>
              </div>
              <div className="flex gap-sm mt-sm">
                {!isPollActive ? (
                  <button className="btn btn-primary flex-1" onClick={() => {
                    const validOpts = poll.options.map(o => o.trim()).filter(Boolean);
                    if (!poll.question.trim()) return alert('Escribe una pregunta.');
                    if (validOpts.length < 2) return alert('Necesitas al menos 2 opciones.');
                    setIsPollActive(true);
                    window.api.previewAlert({ type: 'start-poll', question: poll.question.trim(), options: validOpts, duration: poll.duration });
                  }}>Iniciar Encuesta</button>
                ) : (
                  <button className="btn btn-danger flex-1" onClick={() => {
                    setIsPollActive(false);
                    window.api.previewAlert({ type: 'stop-poll' });
                  }}>Detener Encuesta</button>
                )}
              </div>
            </div>
          </div>

        </section>
      )}

      {/* ── HERRAMIENTAS ── */}
      {activeSubTab === 'herramientas' && (
        <section className="sub-view active">

          {/* Peticiones de Canciones */}
          <div className="card">
            <div className="flex items-center justify-between mb-sm">
              <h2 style={{ marginBottom: 0 }}>🎵 Peticiones de Canciones (!play)</h2>
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

            <div className="flex gap-sm mb-xs">
              <div style={{ flex: 1 }}>
                <div className="text-xs text-secondary mb-xs">Cooldown por usuario (seg.)</div>
                <input type="number" min="0" max="600" className="inp" style={{ width: '100%' }} value={config.songCooldown ?? 60} onChange={(e) => saveConfig({ songCooldown: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="text-xs text-secondary mb-xs">Duración máx. (minutos)</div>
                <input type="number" min="1" max="120" className="inp" style={{ width: '100%' }} value={config.maxSongDuration ?? 25} onChange={(e) => saveConfig({ maxSongDuration: parseInt(e.target.value) || 25 })} />
              </div>
            </div>

            <div className="player-controls">
              {/* Anterior */}
              <button className="player-btn" title="Anterior" onClick={() => window.api.testChatTts({ user: 'Control', text: '!back', isMod: true })}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/>
                </svg>
              </button>
              {/* Pausa */}
              <button className="player-btn" title="Pausa" onClick={() => window.api.ytPause()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              </button>
              {/* Play */}
              <button className="player-btn play-pause" title="Reproducir" onClick={() => window.api.ytResume()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7L8 5z"/>
                </svg>
              </button>
              {/* Stop */}
              <button className="player-btn" title="Detener" onClick={() => window.api.ytStop()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h12v12H6V6z"/>
                </svg>
              </button>
              {/* Siguiente */}
              <button className="player-btn" title="Siguiente" onClick={() => window.api.ytSkip()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2V6z"/>
                </svg>
              </button>
            </div>

            <div className="mt-sm" style={{ maxHeight: 200, overflowY: 'auto', background: 'var(--bg-input)', borderRadius: 8, padding: 10 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13 }}>Cola de Reproducción</h4>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {(!queueData?.current && (!queueData?.queue || queueData.queue.length === 0)) ? (
                  <div style={{ textAlign: 'center', padding: 10 }}>Cola vacía</div>
                ) : (
                  <>
                    {queueData.current && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid var(--accent)', marginBottom: 4 }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 'bold', minWidth: 24 }}>▶️</span>
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{queueData.current.query || 'Desconocido'}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>@{queueData.current.user || '?'}</span>
                      </div>
                    )}
                    {(queueData.queue || []).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderBottom: '1px solid var(--border-light)' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 'bold', minWidth: 24 }}>{idx + 1}.</span>
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.query || 'Desconocido'}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>@{item.user || '?'}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bot del Chat */}
          <div className="card">
            <h2>🤖 Bot del Chat (Overlay)</h2>
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

          {/* Soundboard */}
          <div className="card">
            <h2>💡 Soundboard</h2>
            <div className="sound-grid">
              <button className="sound-btn" onClick={() => window.api.playSoundboard('applause')}><span className="sound-icon">👏</span>Aplausos</button>
              <button className="sound-btn" onClick={() => window.api.playSoundboard('laugh')}><span className="sound-icon">😂</span>Risas</button>
              <button className="sound-btn" onClick={() => window.api.playSoundboard('drumroll')}><span className="sound-icon">🥁</span>Tambores</button>
              <button className="sound-btn" onClick={() => window.api.playSoundboard('crickets')}><span className="sound-icon">🦗</span>Grillos</button>
              <button className="sound-btn" onClick={() => window.api.playSoundboard('bruh')}><span className="sound-icon">🗿</span>Bruh</button>
              <button className="sound-btn" onClick={() => window.api.playSoundboard('sad')}><span className="sound-icon">🎻</span>Triste</button>
              <button className="sound-btn" onClick={() => window.api.playSoundboard('wow')}><span className="sound-icon">😲</span>Wow</button>
              <button className="sound-btn" onClick={() => window.api.playSoundboard('fail')}><span className="sound-icon">❌</span>Fail</button>
            </div>
          </div>

          {/* Simulador de Combos */}
          <div className="card">
            <h2>🔥 Simulador de Combos</h2>
            <p className="text-sm text-secondary mb-sm">Simula likes para probar el contador de combos en pantalla.</p>
            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 1 })}>+1 Like</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 10 })}>+10 Likes</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 100 })}>+100 Likes</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 1000 })}>+1000 Likes</button>
            </div>
          </div>

        </section>
      )}

    </main>
  );
}
