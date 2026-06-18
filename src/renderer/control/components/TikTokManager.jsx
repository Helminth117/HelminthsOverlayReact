import React from 'react';

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
  chatHistory
}) {
  return (
    <main className={`tab-view ${activeTab === 'tiktok' ? 'active' : ''}`}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            {[
              { val: '+' + (ttStatus.stats.followers_gained || 0), lbl: 'Nuevos seguidores' },
              { val: ttStatus.stats.viewers || 0, lbl: 'Viewers' },
              { val: ttStatus.stats.likes || 0, lbl: 'Likes' },
              { val: ttStatus.stats.gifts || 0, lbl: 'Regalos' }
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--bg-input)', padding: 10, borderRadius: 8, border: '1px solid var(--border-light)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{s.val}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.lbl}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost w-full mt-md" onClick={() => window.api.tiktokReset()}>Resetear stats</button>
        </div>
      )}

      <div className="card">
        <h2>🔥 Prueba de Combos (Simulador)</h2>
        <p className="text-sm text-secondary mb-sm">Simula recibir likes para probar el contador de combos en pantalla.</p>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 1 })}>+1 Like</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 10 })}>+10 Likes</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 100 })}>+100 Likes</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.api.previewAlert({ type: 'combo', count: 1000 })}>+1000 Likes</button>
        </div>
      </div>

      {/* Encuestas */}
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
    </main>
  );
}
