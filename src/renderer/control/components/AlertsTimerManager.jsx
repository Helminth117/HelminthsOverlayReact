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

      {/* Temporizador */}
      <div className="card">
        <h2>⏱ Temporizador</h2>
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

      {/* Alertas */}
      <div className="card">
        <h2>🔔 Alertas</h2>

        {/* Preview buttons */}
        <div className="flex gap-sm mb-sm" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'follow', user: 'TestUser123', message: '¡@TestUser123 te siguió!' })}>🎉 Follow</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'gift', user: 'TestUser123', gift: 'Rosa', count: 5, message: '🎁 x5 Rosa' })}>🎁 Regalo</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'game', message: 'Valorant' })}>🎮 Juego</button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px' }} onClick={() => window.api.previewAlert({ type: 'goal', message: '¡100 seguidores!' })}>🏆 Meta</button>
        </div>

        {/* Sonidos personalizados */}
        <div className="flex-col gap-xs mb-sm" style={{ background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 8 }}>
          <h3 style={{ fontSize: 14, margin: '0 0 8px 0' }}>Sonidos Personalizados</h3>
          {['follow', 'gift', 'game', 'goal'].map(type => (
            <div key={type} className="flex items-center justify-between mt-xs">
              <span className="text-xs">
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

        {/* Configuración de alertas */}
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

        {/* TTS Chat */}
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
          <span className="text-xs text-secondary">
            Los seguidores usarán este prefijo para que la IA los lea (ej. <strong>.hola</strong>).
          </span>
        </div>
      </div>

    </section>
  );
}
