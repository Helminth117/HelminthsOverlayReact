import React, { useState, useEffect, useRef } from 'react';

const PollsManager = React.memo(function PollsManager({
  activeTab,
  poll,
  setPoll,
  isPollActive,
  setIsPollActive
}) {
  const [livePoll, setLivePoll] = useState(null);
  const [recentVotes, setRecentVotes] = useState([]);
  const votedUsersRef = useRef(new Set());
  const timerRef = useRef(null);

  // Sync isPollActive back if livePoll ends or starts
  useEffect(() => {
    if (!isPollActive) {
      setLivePoll(null);
      votedUsersRef.current.clear();
      setRecentVotes([]);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else if (isPollActive && !livePoll) {
      // If active but no livePoll state locally, create one
      const validOpts = poll.options.map(o => o.trim()).filter(Boolean);
      const initialOptions = {};
      validOpts.forEach(opt => {
        initialOptions[opt] = 0;
      });
      votedUsersRef.current.clear();
      setRecentVotes([]);

      setLivePoll({
        question: poll.question.trim(),
        options: initialOptions,
        optionsList: validOpts,
        duration: poll.duration || 60,
        timeLeft: poll.duration || 60,
        totalVotes: 0,
        twitchVotes: 0,
        tiktokVotes: 0
      });
    }
  }, [isPollActive]);

  // Handle countdown timer for livePoll
  useEffect(() => {
    if (!livePoll || livePoll.timeLeft <= 0 || livePoll.duration === 0) return;

    timerRef.current = setInterval(() => {
      setLivePoll(prev => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [livePoll === null, livePoll?.timeLeft]);

  // Listen to chat for incoming votes in real-time
  useEffect(() => {
    if (!window.api) return;

    const chatHandler = window.api.on('tiktok-chat', (data) => {
      if (!data || !data.text || !data.user) return;

      setLivePoll(prev => {
        if (!prev) return null;
        // Don't count votes if poll is finished
        if (prev.duration > 0 && prev.timeLeft <= 0) return prev;
        // Check if user already voted
        if (votedUsersRef.current.has(data.user)) return prev;

        const cleanedText = data.text.trim().toLowerCase();
        let votedOption = null;

        // Match index number (1, 2, 3...)
        const optIndex = parseInt(cleanedText, 10) - 1;
        if (!isNaN(optIndex) && optIndex >= 0 && optIndex < prev.optionsList.length) {
          votedOption = prev.optionsList[optIndex];
        } else {
          // Match exact text
          votedOption = prev.optionsList.find(opt => opt.toLowerCase() === cleanedText);
        }

        if (votedOption) {
          votedUsersRef.current.add(data.user);
          const platform = data.platform === 'twitch' ? 'twitch' : 'tiktok';

          // Add to recent votes log
          setRecentVotes(prevLog => {
            const updated = [
              { user: data.user, option: votedOption, platform, time: new Date().toLocaleTimeString() },
              ...prevLog
            ];
            return updated.slice(0, 10); // Keep last 10
          });

          return {
            ...prev,
            options: {
              ...prev.options,
              [votedOption]: (prev.options[votedOption] || 0) + 1
            },
            totalVotes: prev.totalVotes + 1,
            twitchVotes: prev.twitchVotes + (platform === 'twitch' ? 1 : 0),
            tiktokVotes: prev.tiktokVotes + (platform === 'tiktok' ? 1 : 0)
          };
        }

        return prev;
      });
    });

    return () => {
      window.api.off('tiktok-chat', chatHandler);
    };
  }, []);



  // Add a new option input to the template
  const addOption = () => {
    if (poll.options.length >= 6) {
      alert('Se recomiendan máximo 6 opciones para mantener el overlay limpio.');
      return;
    }
    setPoll({ ...poll, options: [...poll.options, ''] });
  };

  // Remove an option input
  const removeOption = (index) => {
    if (poll.options.length <= 2) {
      alert('Una encuesta necesita al menos 2 opciones.');
      return;
    }
    const newOpts = poll.options.filter((_, i) => i !== index);
    setPoll({ ...poll, options: newOpts });
  };

  // Start the poll
  const startPoll = () => {
    const validOpts = poll.options.map(o => o.trim()).filter(Boolean);
    if (!poll.question.trim()) {
      alert('Escribe una pregunta para la encuesta.');
      return;
    }
    if (validOpts.length < 2) {
      alert('Necesitas ingresar al menos 2 opciones de respuesta.');
      return;
    }

    setIsPollActive(true);
    window.api.previewAlert({
      type: 'start-poll',
      question: poll.question.trim(),
      options: validOpts,
      duration: poll.duration
    });
  };

  // Stop the active poll
  const stopPoll = () => {
    setIsPollActive(false);
    window.api.previewAlert({ type: 'stop-poll' });
  };

  // Vote Simulator to test overlay and dashboard
  const simulateVote = (platform) => {
    if (!livePoll || (livePoll.duration > 0 && livePoll.timeLeft <= 0)) return;
    
    // Choose random option
    const idx = Math.floor(Math.random() * livePoll.optionsList.length);
    const chosenOpt = livePoll.optionsList[idx];
    const dummyUser = `${platform === 'twitch' ? 'TwitchViewer' : 'TikTokFan'}_${Math.floor(Math.random() * 900 + 100)}`;

    // Fake the incoming chat message via window.api so the overlay updates too!
    if (window.api && typeof window.api.testChatTts === 'function') {
      window.api.tiktokChatMock({
        user: dummyUser,
        text: String(idx + 1),
        isMod: false,
        isSub: false,
        platform: platform
      });
    } else {
      // Fallback local state if mock is missing
      if (votedUsersRef.current.has(dummyUser)) return;
      votedUsersRef.current.add(dummyUser);
      setRecentVotes(prevLog => [
        { user: dummyUser, option: chosenOpt, platform, time: new Date().toLocaleTimeString() },
        ...prevLog
      ].slice(0, 10));

      setLivePoll(prev => ({
        ...prev,
        options: {
          ...prev.options,
          [chosenOpt]: (prev.options[chosenOpt] || 0) + 1
        },
        totalVotes: prev.totalVotes + 1,
        twitchVotes: prev.twitchVotes + (platform === 'twitch' ? 1 : 0),
        tiktokVotes: prev.tiktokVotes + (platform === 'tiktok' ? 1 : 0)
      }));
    }
  };

  return (
    <main className={`tab-view ${activeTab === 'encuestas' ? 'active' : ''} flex-col gap-md`} style={{ animation: 'slideUpFade 0.4s var(--ease-out)' }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📊</span>
            <span>Encuestas de Chat</span>
          </h1>
          <p className="text-xs text-secondary">
            Crea encuestas interactivas que leen los votos del chat de TikTok en tiempo real.
          </p>
        </div>
      </div>

      <div className="flex gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        
        {/* Left Side: Create / Edit Poll Template */}
        <div className="card flex-col gap-sm">
          <h2>📝 Configuración de Encuesta</h2>
          
          <div className="flex-col gap-xs">
            <label className="text-xs text-secondary font-bold uppercase">Pregunta de la Encuesta</label>
            <input 
              type="text" 
              className="inp w-full" 
              placeholder="Ej: ¿Qué juego jugamos hoy?" 
              disabled={isPollActive}
              value={poll.question} 
              onChange={e => setPoll({ ...poll, question: e.target.value })} 
            />
          </div>

          <div className="flex gap-sm">
            <div style={{ flex: 1 }} className="flex-col gap-xs">
              <label className="text-xs text-secondary font-bold uppercase">Duración (Segundos)</label>
              <input 
                type="number" 
                className="inp w-full" 
                min="0"
                placeholder="0 = Sin límite de tiempo"
                disabled={isPollActive}
                value={poll.duration} 
                onChange={e => setPoll({ ...poll, duration: parseInt(e.target.value) || 0 })} 
              />
              <span className="text-xs text-muted" style={{ fontSize: '10px' }}>Pon 0 para votación permanente</span>
            </div>
          </div>

          <div className="flex-col gap-xs">
            <label className="text-xs text-secondary font-bold uppercase">Opciones de Voto (El chat responde 1, 2, 3...)</label>
            <div className="flex-col gap-xs">
              {poll.options.map((opt, i) => (
                <div key={i} className="flex gap-xs items-center">
                  <span className="font-bold text-xs" style={{ width: 18, color: 'var(--accent)' }}>{i + 1}.</span>
                  <input 
                    type="text" 
                    className="inp flex-1" 
                    placeholder={`Opción ${i + 1}`} 
                    disabled={isPollActive}
                    value={opt} 
                    onChange={e => {
                      const newOpts = [...poll.options];
                      newOpts[i] = e.target.value;
                      setPoll({ ...poll, options: newOpts });
                    }} 
                  />
                  {!isPollActive && (
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '8px 10px', height: '34px' }} 
                      onClick={() => removeOption(i)}
                      title="Eliminar opción"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!isPollActive && (
              <button className="btn btn-ghost w-full mt-xs text-xs" onClick={addOption}>
                ➕ Agregar Opción
              </button>
            )}
          </div>

          <div className="mt-md">
            {!isPollActive ? (
              <button 
                className="btn btn-primary w-full" 
                style={{ height: '42px', fontSize: '14px', fontWeight: 'bold' }} 
                onClick={startPoll}
              >
                🚀 Iniciar Encuesta en Pantalla
              </button>
            ) : (
              <button 
                className="btn btn-danger w-full animate-pulse" 
                style={{ height: '42px', fontSize: '14px', fontWeight: 'bold' }} 
                onClick={stopPoll}
              >
                🛑 Terminar Encuesta Activa
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Active Poll & Realtime Results */}
        <div className="card flex-col gap-sm" style={{ minHeight: '430px' }}>
          <h2>📊 Estado en Tiempo Real</h2>

          {!livePoll ? (
            <div className="flex-col items-center justify-center flex-1" style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 20px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-light)' }}>
              <span style={{ fontSize: '36px', marginBottom: '12px' }}>💤</span>
              <p className="font-bold mb-xs" style={{ color: '#fff' }}>No hay encuesta activa</p>
              <p className="text-xs text-muted">Configura una encuesta a la izquierda y presiona "Iniciar Encuesta" para ver los resultados aquí.</p>
            </div>
          ) : (
            <div className="flex-col gap-md flex-1">
              {/* Poll Header */}
              <div className="flex justify-between items-start" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <span className="badge-live uppercase text-xs" style={{ background: livePoll.timeLeft > 0 || livePoll.duration === 0 ? 'var(--accent)' : 'var(--text-muted)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold', fontSize: '10px' }}>
                    {livePoll.duration === 0 ? 'VOTACIÓN ABIERTA' : (livePoll.timeLeft > 0 ? 'ACTIVA' : 'FINALIZADA')}
                  </span>
                  <h3 style={{ fontSize: '16px', color: '#fff', marginTop: '6px', fontWeight: 'bold' }}>
                    {livePoll.question}
                  </h3>
                </div>
                {livePoll.duration > 0 && (
                  <div className="flex-col items-end">
                    <span className="text-xs text-secondary">Tiempo Restante</span>
                    <span className="font-bold" style={{ fontSize: '20px', color: livePoll.timeLeft <= 10 ? 'var(--danger)' : 'var(--success)' }}>
                      {livePoll.timeLeft}s
                    </span>
                  </div>
                )}
              </div>

              {/* Poll Options and Bars */}
              <div className="flex-col gap-sm">
                {Object.entries(livePoll.options).map(([optionName, votes]) => {
                  const percentage = livePoll.totalVotes > 0 ? Math.round((votes / livePoll.totalVotes) * 100) : 0;
                  const optionIndex = livePoll.optionsList.indexOf(optionName) + 1;
                  return (
                    <div key={optionName} className="flex-col gap-xs">
                      <div className="flex justify-between text-xs font-bold">
                        <span style={{ color: 'var(--text-primary)' }}>
                          <span style={{ color: 'var(--accent)', marginRight: 4 }}>{optionIndex}.</span>
                          {optionName}
                        </span>
                        <span>{votes} {votes === 1 ? 'voto' : 'votos'} ({percentage}%)</span>
                      </div>
                      <div style={{ height: '14px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                        <div 
                          style={{ 
                            width: `${percentage}%`, 
                            height: '100%', 
                            background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 100%)', 
                            borderRadius: '4px',
                            transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Platforms Breakdown Card */}
              <div className="flex gap-sm justify-between p-sm" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div className="flex items-center gap-xs">
                  <span style={{ color: '#00f2fe', fontSize: '16px' }}>📱</span>
                  <div className="flex-col">
                    <span className="text-xs text-secondary">Votos TikTok</span>
                    <span className="font-bold text-sm">{livePoll.tiktokVotes}</span>
                  </div>
                </div>
                <div style={{ width: '1px', background: 'var(--border-light)' }} />
                <div className="flex-col items-end">
                  <span className="text-xs text-secondary">Votos Totales</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>{livePoll.totalVotes}</span>
                </div>
              </div>

              {/* Live Simulator Panel for testing */}
              {(livePoll.timeLeft > 0 || livePoll.duration === 0) && (
                <div className="flex-col gap-xs mt-xs">
                  <span className="text-xs text-secondary font-bold uppercase block">Simulador de Votos (Para Pruebas)</span>
                  <div className="flex gap-sm">
                    <button 
                      className="btn btn-ghost flex-1 text-xs" 
                      style={{ height: '32px', borderColor: '#00f2fe', color: '#00f2fe' }} 
                      onClick={() => simulateVote('tiktok')}
                    >
                      📱 Simular Voto TikTok
                    </button>
                  </div>
                </div>
              )}

              {/* Log of Recent Votes */}
              {recentVotes.length > 0 && (
                <div className="flex-col gap-xs">
                  <span className="text-xs text-secondary font-bold uppercase">Votos Recientes</span>
                  <div style={{ maxHeight: '90px', overflowY: 'auto', background: 'var(--bg-input)', borderRadius: 'var(--radius-xs)', padding: '6px' }} className="flex-col gap-xs">
                    {recentVotes.map((v, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '2px' }}>
                        <span>
                          <span style={{ color: '#00f2fe', marginRight: 4 }}>
                            📱
                          </span>
                          <strong style={{ color: '#fff' }}>@{v.user}</strong> eligió <span style={{ color: 'var(--accent)' }}>"{v.option}"</span>
                        </span>
                        <span className="text-muted" style={{ fontSize: '10px' }}>{v.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
});

export default PollsManager;
