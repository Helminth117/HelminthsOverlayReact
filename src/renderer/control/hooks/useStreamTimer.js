import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook that encapsulates all stream timer logic.
 * Uses refs internally so that action callbacks (timerToggle, etc.)
 * are stable across renders and won't break React.memo on children.
 *
 * @param {Function} setSession — stable state setter from ControlApp
 */
export default function useStreamTimer(setSession, config) {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerMode, setTimerMode] = useState('chrono');
  const [countdownTarget, setCountdownTarget] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDoneMsg, setTimerDoneMsg] = useState(false);
  const [countdownInput, setCountdownInput] = useState({ mins: '', secs: '' });

  // Refs mirror state so stable callbacks can read current values
  const timerSecondsRef = useRef(0);
  const timerModeRef = useRef('chrono');
  const timerRunningRef = useRef(false);
  const countdownTargetRef = useRef(0);
  const countdownInputRef = useRef({ mins: '', secs: '' });
  const configRef = useRef(config);

  useEffect(() => { timerSecondsRef.current = timerSeconds; }, [timerSeconds]);
  useEffect(() => { timerModeRef.current = timerMode; }, [timerMode]);
  useEffect(() => { timerRunningRef.current = timerRunning; }, [timerRunning]);
  useEffect(() => { countdownTargetRef.current = countdownTarget; }, [countdownTarget]);
  useEffect(() => { countdownInputRef.current = countdownInput; }, [countdownInput]);
  useEffect(() => { configRef.current = config; }, [config]);

  // ── Tick interval ──
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(ts =>
        timerModeRef.current === 'chrono' ? ts + 1 : Math.max(0, ts - 1)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // ── Side-effects: broadcast to overlay + persist session ──
  useEffect(() => {
    if (!timerRunning) return;

    // Countdown finished
    if (timerMode === 'countdown' && timerSeconds === 0) {
      setTimerRunning(false);
      setTimerDoneMsg(true);
      setTimeout(() => setTimerDoneMsg(false), 4000);
      window.api.emitTimer({ seconds: 0, mode: 'countdown', running: false });
      setSession(prev => {
        const newS = { ...prev, timerSeconds: 0, timerMode, countdownTarget: countdownTargetRef.current };
        window.api.saveSession(newS);
        return newS;
      });
      return;
    }

    // Broadcast tick to overlay
    window.api.emitTimer({ seconds: timerSeconds, mode: timerMode, running: true });

    // Save session every 5 seconds
    if (timerSeconds % 5 === 0) {
      setSession(prev => {
        const newS = { ...prev, timerSeconds, timerMode, countdownTarget: countdownTargetRef.current };
        window.api.saveSession(newS);
        return newS;
      });
    }
  }, [timerSeconds, timerRunning, timerMode, setSession]);

  // ── Subathon stream-alert listener ──
  useEffect(() => {
    const handler = window.api.on('stream-alert', (data) => {
      if (!data) return;
      if (configRef.current?.subathonMode && timerModeRef.current === 'countdown' && timerRunningRef.current) {
        let added = 0;
        if (data.type === 'follow') added = configRef.current.subathonFollow || 10;
        if (data.type === 'gift') added = (configRef.current.subathonGift || 30) * (data.count || 1);
        if (added > 0) {
          setTimerSeconds(ts => ts + added);
          setCountdownTarget(ct => ct + added);
        }
      }
    });

    return () => {
      window.api.off('stream-alert', handler);
    };
  }, []);

  // ── Stable action callbacks (refs prevent re-creation on every tick) ──

  const timerToggle = useCallback(() => {
    const nextRunning = !timerRunningRef.current;
    setTimerRunning(nextRunning);
    window.api.emitTimer({
      seconds: timerSecondsRef.current,
      mode: timerModeRef.current,
      running: nextRunning,
    });
    setSession(prev => {
      const newS = { ...prev, timerSeconds: timerSecondsRef.current, timerMode: timerModeRef.current };
      window.api.saveSession(newS);
      return newS;
    });
  }, [setSession]);

  const timerSwitchMode = useCallback(() => {
    if (timerRunningRef.current) setTimerRunning(false);
    const newMode = timerModeRef.current === 'chrono' ? 'countdown' : 'chrono';
    const newSeconds = newMode === 'countdown' ? countdownTargetRef.current : 0;

    setTimerMode(newMode);
    setTimerSeconds(newSeconds);
    if (newMode === 'chrono') setCountdownTarget(0);

    window.api.emitTimer({ seconds: newSeconds, mode: newMode, running: false });
    setSession(prev => {
      const newS = { ...prev, timerSeconds: newSeconds, timerMode: newMode };
      window.api.saveSession(newS);
      return newS;
    });
  }, [setSession]);

  const timerReset = useCallback(() => {
    if (timerRunningRef.current) setTimerRunning(false);
    const newVal = timerModeRef.current === 'countdown' ? countdownTargetRef.current : 0;
    setTimerSeconds(newVal);
    window.api.emitTimer({ seconds: newVal, mode: timerModeRef.current, running: false });
    setSession(prev => {
      const newS = { ...prev, timerSeconds: newVal };
      window.api.saveSession(newS);
      return newS;
    });
  }, [setSession]);

  const applyCountdown = useCallback(() => {
    const mins = parseInt(countdownInputRef.current.mins) || 0;
    const secs = parseInt(countdownInputRef.current.secs) || 0;
    const target = mins * 60 + secs;
    setCountdownTarget(target);
    setTimerSeconds(target);
    window.api.emitTimer({ seconds: target, mode: timerModeRef.current, running: false });
    setSession(prev => {
      const newS = { ...prev, timerSeconds: target };
      window.api.saveSession(newS);
      return newS;
    });
  }, [setSession]);

  /** Initialize timer from a loaded session object */
  const initTimer = useCallback((session) => {
    if (session.timerSeconds !== undefined) {
      setTimerSeconds(session.timerSeconds);
      setTimerMode(session.timerMode || 'chrono');
      setCountdownTarget(session.countdownTarget || 0);
      window.api.timerTick({
        seconds: session.timerSeconds,
        mode: session.timerMode || 'chrono',
        running: false,
      });
    }
  }, []);

  /** Add seconds to countdown (used by subathon stream-alert handler) */
  const addSubathonTime = useCallback((seconds) => {
    setTimerSeconds(ts => ts + seconds);
    setCountdownTarget(ct => ct + seconds);
  }, []);

  return {
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
    addSubathonTime,
    // Expose refs for the stream-alert handler in ControlApp
    timerModeRef,
    timerRunningRef,
  };
}
