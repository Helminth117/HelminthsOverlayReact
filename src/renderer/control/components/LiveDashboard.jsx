import React from 'react';

function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

export default function LiveDashboard({
  activeTab,
  config,
  saveConfig,
  showSaved,
  ttStatus,
  setTtStatus,
  poll,
  setPoll,
  isPollActive,
  setIsPollActive,
  chatHistory,
  queueData,
  timerSeconds,
  timerMode,
  timerRunning,
  timerDoneMsg,
  countdownInput,
  setCountdownInput,
  timerToggle,
  timerSwitchMode,
  timerReset,
  applyCountdown
}) {
  if (activeTab !== 'live') return null;

  return (
    <div className="tab-view active" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* ── CONEXIÓN ── */}
      <div className="card">
        <h2>🔴 Conectar a TikTok Live</h2>
        <div className="flex gap-sm">
          <input 
            className="inp" 
            type="text" 
            placeholder="tu_usuario (sin @)" 
            value={ttStatus.username} 
            onChange={(e) => setTtStatus({ ...ttStatus, username: e.target.value })} 
          />
          <button 
            className="btn btn-primary" 
            disabled={ttStatus.state === 'connecting'} 
            onClick={async () => {
              const user = ttStatus.username.trim().replace('@', '');
              if (!user) return;
              setTtStatus(p => ({ ...p, state: 'connecting', msg: 'Conectando a @' + user + '...' }));
              try {
                const r = await window.api.tiktokConnect(user);
                if (r.waiting) setTtStatus(p => ({ ...p, state: 'waiting', msg: '⏳ Esperando live de @' + user + '...' }));
                else if (!r.ok) setTtStatus(p => ({ ...p, state: 'error', msg: '❌ Error: ' + r.error }));
              } catch (e) {
                setTtStatus(p => ({ ...p, state: 'error', msg: '❌ Error: ' + e.message }));
              }
            }}
          >
            {ttStatus.state === 'connecting' ? 'Conectando...' : 'Conectar'}
          </button>
        </div>
        <div 
          className="mt-sm flex items-center gap-sm" 
          style={{ 
            background: 'var(--bg-input)', 
            padding: 10, 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-light)', 
            display: ttStatus.state !== 'disconnected' ? 'flex' : 'none' 
          }}
        >
          <div className={`status-dot ${ttStatus.state === 'connected' ? 'live' : (ttStatus.state === 'waiting' ? 'online' : (ttStatus.state === 'error' ? 'error' : ''))}`} />
          <span className="text-sm text-secondary">{ttStatus.msg}</span>
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
          <button className="btn btn-ghost w-full mt-md" onClick={() => window.api.tiktokReset()}>Resetear estadísticas</button>
        </div>
      )}

      {/* ── ESCENAS CINEMÁTICAS ── */}
      <div className="card highlight">
        <h2>🎬 Transiciones de Escena</h2>
        <p className="text-xs text-secondary mb-md">Cambia el estado visual del stream en pantalla.</p>
        <div className="flex-col gap-sm">
          <button className="btn btn-primary w-full" style={{ justifyContent: 'center', height: 40 }} onClick={() => saveConfig({ activeScene: 'starting' })}>▶ Empezando Stream</button>
          <button className="btn btn-ghost w-full" style={{ justifyContent: 'center', height: 40, background: 'rgba(255, 204, 0, 0.2)', color: '#ffcc00' }} onClick={() => saveConfig({ activeScene: 'brb' })}>⏸ Ahorita Vuelvo</button>
          <button className="btn btn-ghost w-full" style={{ justifyContent: 'center', height: 40, background: 'rgba(255, 50, 50, 0.2)', color: '#ff5555' }} onClick={() => saveConfig({ activeScene: 'ending' })}>⏹ Stream Finalizado</button>
          <button className="btn w-full" style={{ justifyContent: 'center', height: 40, border: '1px solid var(--border-light)' }} onClick={() => saveConfig({ activeScene: 'none' })}>👁 En Vivo (Mostrar HUD)</button>
        </div>
      </div>

      {/* ── SOUNDBOARD INSTANTÁNEO ── */}
      <div className="card">
        <h2>🔊 Soundboard Instantáneo</h2>
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

      {/* ── TEMPORIZADOR DEL STREAM ── */}
      <div className="card">
        <h2>⏱ Temporizador del Stream</h2>
        <div className="timer-display">{formatTime(timerSeconds)}</div>
        {timerDoneMsg && (
          <div style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold', marginBottom: 'var(--space-sm)', fontSize: 13 }}>
            ¡TIEMPO TERMINADO!
          </div>
        )}

        <div className="flex gap-sm mt-md">
          <button className="btn btn-ghost flex-1" onClick={timerSwitchMode}>Modo: {timerMode === 'chrono' ? 'Crono' : 'Regresiva'}</button>
          <button className={`btn flex-1 ${timerRunning ? 'btn-danger' : 'btn-success'}`} onClick={timerToggle}>{timerRunning ? 'Pausar' : 'Iniciar'}</button>
          <button className="btn btn-danger" style={{ padding: 10 }} onClick={timerReset}>Reset</button>
        </div>

        {timerMode === 'countdown' && (
          <div className="flex gap-sm mt-sm">
            <input className="inp" type="number" placeholder="min" min="0" value={countdownInput.mins} onChange={e => setCountdownInput({ ...countdownInput, mins: e.target.value })} />
            <input className="inp" type="number" placeholder="seg" min="0" max="59" value={countdownInput.secs} onChange={e => setCountdownInput({ ...countdownInput, secs: e.target.value })} />
            <button className="btn btn-primary" onClick={applyCountdown}>Fijar Tiempo</button>
          </div>
        )}

        <div className="flex items-center justify-between mt-md pt-sm" style={{ borderTop: '1px solid var(--border-light)' }}>
          <span className="text-sm font-bold">Modo Extensible (Subathon)</span>
          <button className={`toggle ${config.subathonMode ? 'on' : ''}`} onClick={() => saveConfig({ subathonMode: !config.subathonMode })}></button>
        </div>
        {config.subathonMode && (
          <div className="flex gap-sm mt-xs" style={{ background: 'var(--bg-input)', padding: 10, borderRadius: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="text-xs text-secondary mb-xs">+ Seg por Follow</div>
              <input type="number" className="inp" value={config.subathonFollow ?? 10} min="0" style={{ width: '100%' }} onChange={(e) => saveConfig({ subathonFollow: parseInt(e.target.value) || 0 })} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="text-xs text-secondary mb-xs">+ Seg por Regalo</div>
              <input type="number" className="inp" value={config.subathonGift ?? 30} min="0" style={{ width: '100%' }} onChange={(e) => saveConfig({ subathonGift: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        )}
      </div>

      {/* ── ENCUESTAS DE CHAT ── */}
      <div className="card">
        <h2>💬 Encuestas de Chat (TikTok)</h2>
        <div className="text-xs p-xs mb-sm" style={{ background: 'var(--accent-glow)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--accent)', color: '#fff', lineHeight: 1.4 }}>
          💡 <strong>¡Nueva pestaña!</strong> Ahora puedes ver gráficos de resultados en vivo, breakdown de votos y simular votos en la pestaña <strong>Encuestas</strong> del menú lateral.
        </div>
        <p className="text-xs text-secondary mb-sm">Los espectadores votan en el chat escribiendo el número correspondiente.</p>
        <div className="flex-col gap-sm">
          <div>
            <label className="text-xs text-secondary font-bold uppercase block mb-xs">Pregunta</label>
            <input type="text" className="inp w-full" placeholder="Ej: ¿Qué juego transmitimos?" value={poll.question} onChange={e => setPoll({ ...poll, question: e.target.value })} />
          </div>
          <div className="flex gap-sm">
            <div style={{ flex: 1 }}>
              <label className="text-xs text-secondary font-bold uppercase block mb-xs">Duración (seg.)</label>
              <input type="number" className="inp w-full" value={poll.duration} min="0" onChange={e => setPoll({ ...poll, duration: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-secondary font-bold uppercase block mb-xs">Opciones de Voto</label>
            <div className="flex-col gap-xs">
              {poll.options.map((opt, i) => (
                <div key={i} className="flex gap-xs items-center">
                  <span className="font-bold text-xs" style={{ width: 15 }}>{i + 1}.</span>
                  <input type="text" className="inp flex-1" placeholder={`Opción ${i + 1}`} value={opt} onChange={e => {
                    const val = e.target.value;
                    setPoll(prev => {
                      const newOpts = [...prev.options];
                      newOpts[i] = val;
                      return { ...prev, options: newOpts };
                    });
                  }} />
                </div>
              ))}
            </div>
            <button className="btn btn-ghost w-full mt-sm text-xs" onClick={() => {
              if (poll.options.length >= 6) return alert('Máximo 6 opciones recomendadas');
              setPoll(prev => ({ ...prev, options: [...prev.options, ''] }));
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

      {/* ── SIMULADOR DE LIKES / COMBOS ── */}
      <div className="card">
        <h2>🔥 Simulador de Likes / Combos</h2>
        <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ flex: 1, padding: 6, fontSize: 11 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 1 })}>+1</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: 6, fontSize: 11 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 10 })}>+10</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: 6, fontSize: 11 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 100 })}>+100</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: 6, fontSize: 11 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 1000 })}>+1k</button>
        </div>
      </div>

      {/* ── MÚSICA Y COLA ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-sm">
          <h2 style={{ marginBottom: 0 }}>🎵 Controles del Reproductor</h2>
          <span className="text-xs text-secondary">
            {config.enableSongRequests ? '✅ Activo' : '❌ Inactivo'}
          </span>
        </div>
        
        <div className="player-controls">
          <button className="player-btn" title="Anterior" onClick={() => window.api.testChatTts({ user: 'Control', text: '!back', isMod: true })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/>
            </svg>
          </button>
          <button className="player-btn" title="Pausa" onClick={() => window.api.ytPause()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>
          <button className="player-btn play-pause" title="Reproducir" onClick={() => window.api.ytResume()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z"/>
            </svg>
          </button>
          <button className="player-btn" title="Detener" onClick={() => window.api.ytStop()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h12v12H6V6z"/>
            </svg>
          </button>
          <button className="player-btn" title="Siguiente" onClick={() => window.api.ytSkip()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2V6z"/>
            </svg>
          </button>
        </div>

        <div className="mt-sm" style={{ maxHeight: 250, overflowY: 'auto', background: 'var(--bg-input)', borderRadius: 8, padding: 10 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700 }}>Cola de Canciones</h4>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {(!queueData?.current && (!queueData?.queue || queueData.queue.length === 0)) ? (
              <div style={{ textAlign: 'center', padding: 10 }}>Cola vacía</div>
            ) : (
              <>
                {queueData.current && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid var(--accent)', marginBottom: 4 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 'bold', minWidth: 24 }}>▶️</span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{queueData.current.title || queueData.current.query || 'Desconocido'}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>@{queueData.current.user || '?'}</span>
                  </div>
                )}
                {(queueData.queue || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 'bold', minWidth: 24 }}>{idx + 1}.</span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.query || 'Desconocido'}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>@{item.user || '?'}</span>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '2px 6px', fontSize: 10, height: 'auto', lineHeight: 1 }} 
                      onClick={() => {
                        if (window.api?.ytRemoveSong) {
                          window.api.ytRemoveSong(idx);
                        }
                      }}
                      title="Eliminar de la cola"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* CHAT DEL STREAM */}
      {chatHistory.length > 0 && (
        <div className="card" id="tiktok-chat-card">
          <h2 className="mb-sm">Chat del Stream</h2>
          <div id="tt-chat-list" className="flex-col" style={{ maxHeight: 350, overflowY: 'auto' }}>
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
    </div>
  );
}
