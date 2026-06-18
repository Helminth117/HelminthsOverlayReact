import React from 'react';

function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

export default function AlertsTimerManager({
  activeSubTab,
  config,
  saveConfig,
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
  if (activeSubTab !== 'alertas') return null;

  return (
    <section className="sub-view active">
      <div className="card">
        <h2>⏱ Temporizador</h2>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }}>{formatTime(timerSeconds)}</div>
        {timerDoneMsg && <div style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold', marginBottom: 'var(--space-sm)' }}>¡TIEMPO TERMINADO!</div>}
        
        <div className="flex gap-sm mt-md">
          <button className="btn btn-ghost flex-1" onClick={timerSwitchMode}>Modo: {timerMode === 'chrono' ? 'Crono' : 'Regresiva'}</button>
          <button className={`btn flex-1 ${timerRunning ? 'btn-danger' : 'btn-success'}`} onClick={timerToggle}>{timerRunning ? 'Pausar' : 'Iniciar'}</button>
          <button className="btn btn-danger" style={{ padding: 10 }} onClick={timerReset}>Reset</button>
        </div>

        {timerMode === 'countdown' && (
          <div className="flex gap-sm mt-sm">
            <input className="inp" type="number" placeholder="min" min="0" value={countdownInput.mins} onChange={e => setCountdownInput({ ...countdownInput, mins: e.target.value })} />
            <input className="inp" type="number" placeholder="seg" min="0" max="59" value={countdownInput.secs} onChange={e => setCountdownInput({ ...countdownInput, secs: e.target.value })} />
            <button className="btn btn-primary" onClick={applyCountdown}>Fijar</button>
          </div>
        )}

        <div className="flex items-center justify-between mt-sm">
          <span className="text-sm">Modo Extensible (Subathon)</span>
          <button className={`toggle ${config.subathonMode ? 'on' : ''}`} onClick={() => saveConfig({ subathonMode: !config.subathonMode })}></button>
        </div>
        {config.subathonMode && (
          <div className="flex gap-sm mt-xs" style={{ background: 'var(--surface2)', padding: 10, borderRadius: 8 }}>
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

      <div className="card">
        <h2>🔔 Ajustes de Alertas</h2>
        <div className="flex gap-sm mb-sm" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'follow', user: 'TestUser123', message: '¡@TestUser123 te siguió!' })}>🎉 Follow</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'gift', user: 'TestUser123', gift: 'Rosa', count: 5, message: '🎁 x5 Rosa' })}>🎁 Regalo</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'game', message: 'Valorant' })}>🎮 Juego</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'goal', message: '¡100 seguidores!' })}>🏆 Meta</button>
        </div>
        
        <div className="flex-col gap-xs mt-sm mb-sm" style={{ background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 8 }}>
          <h3 style={{ fontSize: 14, margin: '0 0 8px 0' }}>Sonidos Personalizados</h3>
          {['follow', 'gift', 'game', 'goal'].map(type => (
            <div key={type} className="flex items-center justify-between mt-xs">
              <span className="text-xs">{type === 'follow' ? '🎉 Follow' : type === 'gift' ? '🎁 Regalo' : type === 'game' ? '🎮 Juego' : '🏆 Meta'}</span>
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
          <span className="text-sm">Posición</span>
          <select className="inp" style={{ width: 'auto' }} value={config.alertPosition || 'bottom'} onChange={(e) => saveConfig({ alertPosition: e.target.value })}>
            <option value="bottom">Abajo (Bottom)</option>
            <option value="top">Arriba (Top)</option>
            <option value="center">Centro (Center)</option>
          </select>
        </div>
        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm">Sonido Activado</span>
          <button className={`toggle ${config.alertSounds !== false ? 'on' : ''}`} onClick={() => saveConfig({ alertSounds: config.alertSounds === false ? true : false })}></button>
        </div>
        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm">Voz de IA (TTS) para Alertas</span>
          <button className={`toggle ${config.enableTTS ? 'on' : ''}`} onClick={() => saveConfig({ enableTTS: !config.enableTTS })}></button>
        </div>
        
        <div className="flex-col gap-xs mb-sm mt-md" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', padding: 12, borderRadius: 8 }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">💬 Prefijo para Chat TTS</span>
            <div className="flex gap-xs items-center">
              <input type="text" className="inp text-center font-bold" style={{ width: 50 }} maxLength="3" value={config.chatTtsPrefix || '.'} onChange={(e) => saveConfig({ chatTtsPrefix: e.target.value })} />
              <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => {
                const prefix = config.chatTtsPrefix || '.';
                const customText = document.getElementById('custom-tts-test-input')?.value?.trim();
                const msg = { user: 'TestUser', text: customText ? `${prefix}${customText}` : `${prefix}Hola, probando el TTS del chat!`, isFollower: true, isMod: false, isSub: false };
                window.api.testChatTts(msg);
              }}>Probar Voz</button>
            </div>
          </div>
          <div className="flex gap-xs items-center mt-xs">
            <input type="text" id="custom-tts-test-input" className="inp flex-1" placeholder="Ej. puta mierda (Prueba el filtro)" />
          </div>
          <span className="text-xs text-secondary">Los seguidores usarán este prefijo al inicio de sus mensajes para que la IA los lea (ej. <strong>.hola</strong>).</span>
        </div>

        <div className="flex-col gap-sm mb-md" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', padding: 12, borderRadius: 8 }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">🎵 Peticiones de Canciones (!play)</span>
            <button className={`toggle ${config.enableSongRequests ? 'on' : ''}`} onClick={() => saveConfig({ enableSongRequests: !config.enableSongRequests })}></button>
          </div>
          <span className="text-xs text-secondary mb-xs">Permite que el chat pida música de YouTube con <strong>!play [canción]</strong>.</span>
          
          <div className="flex gap-xs items-center">
            <input type="text" id="song-request-test-input" className="inp flex-1" placeholder="Ej. Rap God" defaultValue="Blinding Lights" />
            <button className="btn btn-primary" style={{ padding: '8px 12px' }} onClick={() => {
              if (!config.enableSongRequests) return alert("Activa la casilla primero para poder probarlo.");
              const query = document.getElementById('song-request-test-input').value || 'blinding lights';
              window.api.testChatTts({ user: 'Helminth', text: `!play ${query}`, isFollower: true, isMod: true, isSub: false });
            }}>Probar Búsqueda</button>
          </div>

          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifySpace: 'between', justifyContent: 'space-between' }}>
            <span>Cooldown por usuario (seg.):</span>
            <input type="number" min="0" max="600" style={{ width: 70, background: 'var(--bg-input)', color: '#fff', border: '1px solid var(--border-light)', padding: 5, borderRadius: 4 }} value={config.songCooldown ?? 60} onChange={(e) => saveConfig({ songCooldown: parseInt(e.target.value) || 0 })} />
          </div>
          
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifySpace: 'between', justifyContent: 'space-between' }}>
            <span>Duración máx. (minutos):</span>
            <input type="number" min="1" max="120" style={{ width: 70, background: 'var(--bg-input)', color: '#fff', border: '1px solid var(--border-light)', padding: 5, borderRadius: 4 }} value={config.maxSongDuration ?? 25} onChange={(e) => saveConfig({ maxSongDuration: parseInt(e.target.value) || 25 })} />
          </div>

          <div className="flex gap-sm justify-center mt-xs" style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8 }}>
            <button className="btn btn-ghost" title="Anterior" style={{ padding: '8px 16px' }} onClick={() => window.api.testChatTts({ user: 'Control', text: '!back', isMod: true })}>⏮️</button>
            <button className="btn btn-ghost" title="Pausa" style={{ padding: '8px 16px' }} onClick={() => window.api.ytPause()}>⏸️</button>
            <button className="btn btn-ghost" title="Play" style={{ padding: '8px 16px' }} onClick={() => window.api.ytResume()}>▶️</button>
            <button className="btn btn-ghost" title="Stop" style={{ padding: '8px 16px' }} onClick={() => window.api.ytStop()}>⏹️</button>
            <button className="btn btn-ghost" title="Siguiente" style={{ padding: '8px 16px' }} onClick={() => window.api.ytSkip()}>⏭️</button>
          </div>

          <div className="card mt-xs" style={{ maxHeight: 200, overflowY: 'auto' }}>
            <h4 style={{ margin: '8px 0' }}>Cola de Reproducción</h4>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {!queueData.current && queueData.queue.length === 0 ? (
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
                  {queueData.queue.map((item, idx) => (
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

        <h3 className="mt-md mb-xs" style={{ fontSize: 14, color: 'var(--primary)' }}>Mezclador de Volumen</h3>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Alertas ({Math.round((config.volAlerts ?? 1) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="2" step="0.1" value={config.volAlerts ?? 1} style={{ width: 150 }} onChange={(e) => saveConfig({ volAlerts: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Soundboard ({Math.round((config.volSoundboard ?? 0.8) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volSoundboard ?? 0.8} style={{ width: 150 }} onChange={(e) => saveConfig({ volSoundboard: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">TTS/Voz ({Math.round((config.volTts ?? 1) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volTts ?? 1} style={{ width: 150 }} onChange={(e) => saveConfig({ volTts: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Música (YouTube) ({Math.round((config.volMusic ?? 0.8) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volMusic ?? 0.8} style={{ width: 150 }} onChange={(e) => saveConfig({ volMusic: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Sincro Letras (Offset: {(config.lyricsOffset ?? 0).toFixed(1)}s)</span>
          <input type="range" className="slider" min="-5" max="5" step="0.1" value={config.lyricsOffset ?? 0} style={{ width: 150 }} onChange={(e) => saveConfig({ lyricsOffset: parseFloat(e.target.value) })} />
        </div>
      </div>

      <div className="card">
        <h2>🤖 Bot del Chat (Overlay)</h2>
        <p className="text-sm text-secondary mb-xs">El bot responderá y enviará mensajes directamente en el chat visual de la pantalla.</p>
        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm">Intervalo Automático (Minutos)</span>
          <input type="number" className="inp" style={{ width: 80 }} value={config.botInterval ?? 5} min="1" onChange={(e) => saveConfig({ botInterval: parseFloat(e.target.value) || 5 })} />
        </div>
        <div className="mb-sm">
          <span className="text-sm">Mensajes Automáticos (Uno por línea)</span>
          <textarea className="inp" rows="4" style={{ resize: 'vertical' }} value={config.botMessages ?? "¡Sígueme para más contenido!\n¡Comparte el directo!\n¡Pide canciones con !play!"} onChange={(e) => saveConfig({ botMessages: e.target.value })}></textarea>
        </div>
      </div>
      
      <div className="card">
        <h2>💡 Panel de Sonidos (Soundboard)</h2>
        <div className="flex gap-sm mb-sm" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('applause')}>👏 Aplausos</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('laugh')}>😂 Risas</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('drumroll')}>🥁 Tambores</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('crickets')}>🦗 Grillos</button>
        </div>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('bruh')}>🗿 Bruh</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('sad')}>🎻 Triste</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('wow')}>😲 Wow</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }} onClick={() => window.api.playSoundboard('fail')}>❌ Fail</button>
        </div>
      </div>
    </section>
  );
}
