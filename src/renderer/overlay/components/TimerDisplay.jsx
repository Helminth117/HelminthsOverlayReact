import React, { useEffect, useRef } from 'react';
import { useOverlayStore } from '../../store';

function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default function TimerDisplay() {
  const timerData = useOverlayStore(s => s.timer);
  const seconds = timerData.seconds || 0;
  const val = formatTime(seconds);
  const spansRef = useRef([]);

  const digits = val.split('');

  useEffect(() => {
    digits.forEach((char, idx) => {
      const el = spansRef.current[idx];
      if (el) {
        const prevVal = el.getAttribute('data-val');
        if (prevVal !== char) {
          el.setAttribute('data-val', char);
          el.animate([
            { transform: 'translateY(12px) scale(0.9)', opacity: 0 },
            { transform: 'translateY(0) scale(1)', opacity: 1 }
          ], { duration: 400, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
        }
      }
    });
  }, [val]);

  return (
    <div id="val-stopwatch" style={{ display: 'inline-block' }}>
      {digits.map((char, idx) => (
        <span
          key={idx}
          ref={el => { spansRef.current[idx] = el; }}
          style={{ display: 'inline-block' }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
