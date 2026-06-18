import React from 'react';

export default function HistoryManager({
  activeTab,
  historial,
  setHistorial,
  setSession,
  setActiveTab,
  showSaved
}) {
  if (activeTab !== 'historial') return null;

  return (
    <main className={`tab-view ${activeTab === 'historial' ? 'active' : ''}`}>
      <div className="flex items-center justify-between mb-md">
        <h2 style={{ margin: 0 }}>Registro de Sesiones</h2>
        <button className="btn btn-primary" onClick={async () => {
          if (!window.confirm('¿Cerrar sesión y guardar en el historial?')) return;
          await window.api.guardarSesion();
          const newS = await window.api.getSession();
          const newH = await window.api.getHistorial();
          setSession(newS); setHistorial(newH);
          showSaved();
          alert('✓ Sesión guardada.');
        }}>💾 Guardar Sesión Actual</button>
      </div>
      <div className="flex-col gap-sm">
        {historial.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>Sin sesiones guardadas.</div> : historial.map((entry, idx) => {
          const total = entry.sections.reduce((a, s) => a + s.items.length, 0);
          const done = entry.done?.length || 0;
          return (
            <div key={idx} className="hist-entry list-item" style={{ overflow: 'hidden' }}>
              <div className="hist-head list-item-header" onClick={(e) => {
                if (e.target.tagName === 'BUTTON') return;
                e.currentTarget.nextElementSibling.classList.toggle('open');
              }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 'bold' }}>{entry.fecha}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{entry.hora}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--success)' }}>✓{done}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/{total}</span>
                  <button className="btn btn-success" style={{ padding: '2px 8px', fontSize: 10 }} onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm('¿Continuar esta sesión?')) return;
                    await window.api.continuarSesion(idx);
                    const newS = await window.api.getSession();
                    setSession(newS);
                    setActiveTab('objetivos');
                  }}>▶</button>
                  <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 10 }} onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm('¿Borrar esta sesión?')) return;
                    await window.api.deleteHistorial(idx);
                    const newH = await window.api.getHistorial();
                    setHistorial(newH);
                  }}>×</button>
                </div>
              </div>
              <div className="hist-body list-item-body">
                {entry.sections.map((s, i) => {
                  const pending = s.items.filter(it => !entry.done?.includes(it.id));
                  const doneItems = s.items.filter(it => entry.done?.includes(it.id));
                  return (
                    <div key={i}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '6px 0 3px' }}>{s.label}</div>
                      {doneItems.map(it => <div key={it.id} style={{ fontSize: 11, color: 'var(--success)', marginBottom: 2 }}>✓ {it.name}{it.max > 0 ? ` (${it.cur}/${it.max})` : ''}</div>)}
                      {pending.map(it => <div key={it.id} style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>○ {it.name}{it.max > 0 ? ` (${it.cur}/${it.max})` : ''}</div>)}
                    </div>
                  );
                })}
                {entry.notes && <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{entry.notes}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
