import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { DraggableWidget } from './DraggableWidget';

export default function PollDisplay() {
  const [poll, setPoll] = useState(null);
  const config = useOverlayStore(s => s.config) || {};
  const votedUsersRef = useRef(new Set());

  // Listen to start/stop events and incoming chat messages
  useEffect(() => {
    if (!window.api) return;

    // Listen to poll controls via stream-alert
    const streamAlertHandler = window.api.on('stream-alert', (data) => {
      if (!data) return;
      
      if (data.type === 'start-poll') {
        const initialOptions = {};
        data.options.forEach(opt => {
          initialOptions[opt] = 0;
        });
        votedUsersRef.current.clear();
        setPoll({
          question: data.question,
          options: initialOptions,
          optionsList: data.options,
          duration: data.duration || 0,
          timeLeft: data.duration || 0,
        });
      } else if (data.type === 'stop-poll') {
        setPoll(null);
      }
    });

    // Listen to chat to count votes
    const chatHandler = window.api.on('tiktok-chat', (data) => {
      if (!data || !data.text || !data.user) return;

      setPoll(prev => {
        if (!prev) return null;
        // Do not count votes if poll is timed out
        if (prev.duration > 0 && prev.timeLeft <= 0) return prev;
        
        // Check if user already voted
        if (votedUsersRef.current.has(data.user)) return prev;

        const cleanedText = data.text.trim().toLowerCase();
        let votedOption = null;

        // 1. Check if message is an index number (1, 2, 3...)
        const optIndex = parseInt(cleanedText, 10) - 1;
        if (!isNaN(optIndex) && optIndex >= 0 && optIndex < prev.optionsList.length) {
          votedOption = prev.optionsList[optIndex];
        } else {
          // 2. Check if message matches the option text case-insensitive
          votedOption = prev.optionsList.find(opt => opt.toLowerCase() === cleanedText);
        }

        if (votedOption) {
          votedUsersRef.current.add(data.user);
          return {
            ...prev,
            options: {
              ...prev.options,
              [votedOption]: (prev.options[votedOption] || 0) + 1
            }
          };
        }

        return prev;
      });
    });

    return () => {
      window.api.off('stream-alert', streamAlertHandler);
      window.api.off('tiktok-chat', chatHandler);
    };
  }, []);

  // Timer countdown handler
  useEffect(() => {
    if (!poll || poll.timeLeft <= 0 || poll.duration === 0) return;

    const timer = setInterval(() => {
      setPoll(prev => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          clearInterval(timer);
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [poll === null, poll?.duration, poll?.timeLeft]);

  if (!poll) return null;

  const totalVotes = Object.values(poll.options || {}).reduce((a, b) => a + b, 0);

  return (
    <DraggableWidget id="comp-poll" title="Encuesta en Vivo" isGlass={config.glassWidgets?.poll !== false} style={{ width: '300px', flexDirection: 'column' }}>
      <h3 id="poll-title" style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', textAlign: 'center', wordWrap: 'break-word' }}>
        {poll.question || '¿Pregunta?'}
      </h3>
      <div id="poll-bars" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        {Object.entries(poll.options || {}).map(([opt, votes]) => {
          const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
          return (
            <div key={opt} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden', position: 'relative', height: '24px' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }}></div>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 8px', alignItems: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                <span>{opt}</span>
                <span>{votes}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div id="poll-timer" style={{ fontSize: '12px', textAlign: 'center', color: '#bbb', marginTop: '10px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
        {poll.duration > 0 ? (poll.timeLeft > 0 ? `Tiempo restante: ${poll.timeLeft}s` : 'Encuesta Finalizada') : 'Votación abierta'}
      </div>
    </DraggableWidget>
  );
}
