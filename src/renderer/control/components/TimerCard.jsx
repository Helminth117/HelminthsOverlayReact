import React, { useEffect, useRef } from 'react';
import useStreamTimer from '../hooks/useStreamTimer';

function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

/**
 * Performant TimerCard component.
 * It manages its own interval ticking locally via useStreamTimer,
 * isolating the state updates so that the main ControlApp and LiveDashboard
 * do not re-render on every single tick.
 */
const TimerCard = React.memo(function TimerCard({
  initialSession,
  setSession,
  config,
  saveConfig,
}) {
  const {
    timerSeconds,
    timerMode,
    timerRunning,
    timerDoneMsg,
    countdownInput,
    setCountdownInput,
    timerToggle,
    timerSwitchMode,
    timerReset,
    applyCountdown,
    initTimer,
  } = useStreamTimer(setSession, config);

  // Initialize once session loads
  const isInitialized = useRef(false);
  useEffect(() => {
    if (initialSession && initialSession.timerSeconds !== undefined && !isInitialized.current) {
      initTimer(initialSession);
      isInitialized.current = true;
    }
  }, [initialSession, initTimer]);

  return (
    <div className="card">
      <h2>⏱ Temporizador del Stream</h2>
      <div className="timer-display">{formatTime(timerSeconds)}</div>
      {timerDoneMsg && (
        <div style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold', marginBottom: 'var(--space-sm)', fontSize: 13 }}>
          ¡TIEMPO TERMINADO!
        </div>
      )}

      <div className="flex gap-sm mt-md">
        <button className="btn btn-ghost flex-1" onClick={timerSwitchMode}>
          Modo: {timerMode === 'chrono' ? 'Crono' : 'Regresiva'}
        </button>
        <button className={`btn flex-1 ${timerRunning ? 'btn-danger' : 'btn-success'}`} onClick={timerToggle}>
          {timerRunning ? 'Pausar' : 'Iniciar'}
        </button>
        <button className="btn btn-danger" style={{ padding: 10 }} onClick={timerReset}>
          Reset
        </button>
      </div>

      {timerMode === 'countdown' && (
        <div className="flex gap-sm mt-sm">
          <input
            className="inp"
            type="number"
            placeholder="min"
            min="0"
            value={countdownInput.mins}
            onChange={(e) => setCountdownInput({ ...countdownInput, mins: e.target.value })}
          />
          <input
            className="inp"
            type="number"
            placeholder="seg"
            min="0"
            max="59"
            value={countdownInput.secs}
            onChange={(e) => setCountdownInput({ ...countdownInput, secs: e.target.value })}
          />
          <button className="btn btn-primary" onClick={applyCountdown}>
            Fijar Tiempo
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-md pt-sm" style={{ borderTop: '1px solid var(--border-light)' }}>
        <span className="text-sm font-bold">Modo Extensible (Subathon)</span>
        <button
          className={`toggle ${config.subathonMode ? 'on' : ''}`}
          onClick={() => saveConfig({ subathonMode: !config.subathonMode })}
        ></button>
      </div>
      {config.subathonMode && (
        <div className="flex gap-sm mt-xs" style={{ background: 'var(--bg-input)', padding: 10, borderRadius: 8 }}>
          <div style={{ flex: 1 }}>
            <div className="text-xs text-secondary mb-xs">+ Seg por Follow</div>
            <input
              type="number"
              className="inp"
              value={config.subathonFollow ?? 10}
              min="0"
              style={{ width: '100%' }}
              onChange={(e) => saveConfig({ subathonFollow: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div className="text-xs text-secondary mb-xs">+ Seg por Regalo</div>
            <input
              type="number"
              className="inp"
              value={config.subathonGift ?? 30}
              min="0"
              style={{ width: '100%' }}
              onChange={(e) => saveConfig({ subathonGift: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default TimerCard;
