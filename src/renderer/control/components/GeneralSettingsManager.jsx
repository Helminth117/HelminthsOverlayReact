import React, { useState } from 'react';

export default function GeneralSettingsManager({
  activeSubTab,
  config,
  saveConfig,
  WIDGET_LABELS
}) {
  const [widgetOptsOpen, setWidgetOptsOpen] = useState({});

  if (activeSubTab !== 'general') return null;

  return (
    <section className="sub-view active">

      {/* Widget Visibility */}
      <div className="card highlight">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Visibilidad de Widgets
        </h2>
        <div className="flex-col gap-xs">
          {Object.keys(WIDGET_LABELS).map(id => {
            const isOpen = widgetOptsOpen[id];
            const wActive = config.widgets[id] !== false;
            const gActive = config.glassWidgets[id] !== false;
            const align = config.textAlign[id] || 'left';
            return (
              <div key={id} className="list-item flex-col" style={{ padding: 0 }}>
                <div className="flex items-center justify-between" style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => setWidgetOptsOpen(p => ({ ...p, [id]: !p[id] }))}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{WIDGET_LABELS[id]}</span>
                  <div className="flex items-center gap-sm">
                    <button className="btn btn-ghost" title="Opciones" onClick={(e) => { e.stopPropagation(); setWidgetOptsOpen(p => ({ ...p, [id]: !p[id] })); }} style={{ padding: '4px 8px', fontSize: 11 }}>⚙️</button>
                    <button className={`toggle ${wActive ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); saveConfig({ widgets: { ...config.widgets, [id]: !wActive } }); }}></button>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 12px 12px 12px' }}>
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }} className="flex-col gap-sm">
                      <button className="btn btn-ghost w-full" onClick={() => {
                        const newLayout = { ...(config.layout || { modules: {} }) };
                        if (!newLayout.modules) newLayout.modules = {};
                        newLayout.modules['comp-' + id] = { l: '40vw', t: '40vh', w: '', h: '', z: '999' };
                        saveConfig({ layout: newLayout, widgets: { ...config.widgets, [id]: true } });
                      }} style={{ fontSize: 11 }}>⌖ Centrar en pantalla</button>
                      <div className="flex items-center justify-between mt-xs">
                        <div className="flex items-center gap-xs">
                          <span className="text-xs text-secondary">Fondo Glass</span>
                          <button className={`toggle ${gActive ? 'on' : ''}`} style={{ transform: 'scale(0.8)' }} onClick={() => saveConfig({ glassWidgets: { ...config.glassWidgets, [id]: !gActive } })}></button>
                        </div>
                        <div className="flex items-center gap-xs">
                          <span className="text-xs text-secondary">Alineación</span>
                          <div className="flex" style={{ background: 'var(--bg-input)', borderRadius: 4, padding: 2 }}>
                            {['left', 'center', 'right'].map(a => (
                              <button key={a} onClick={() => saveConfig({ textAlign: { ...config.textAlign, [id]: a } })} style={{ padding: '2px 8px', borderRadius: 3, border: 'none', background: align === a ? 'var(--accent)' : 'transparent', color: align === a ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }}>
                                {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-md" style={{ paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-light)' }}>
          <span className="text-sm" style={{ fontWeight: 600 }}>Modo Movimiento (Editar Pantalla)</span>
          <button className={`toggle ${config.moveMode ? 'on' : ''}`} onClick={() => { window.api.setMoveMode(!config.moveMode); saveConfig({ moveMode: !config.moveMode }); }}></button>
        </div>
      </div>

      {/* Escenas Cinemáticas */}
      <div className="card highlight">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
          Escenas Cinemáticas
        </h2>
        <div className="flex-col gap-sm">
          <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => saveConfig({ activeScene: 'starting' })}>▶ Empezando Stream</button>
          <button className="btn btn-ghost w-full" style={{ justifyContent: 'center', background: 'rgba(255, 204, 0, 0.2)', color: '#ffcc00' }} onClick={() => saveConfig({ activeScene: 'brb' })}>⏸ Ahorita Vuelvo</button>
          <button className="btn btn-ghost w-full" style={{ justifyContent: 'center', background: 'rgba(255, 50, 50, 0.2)', color: '#ff5555' }} onClick={() => saveConfig({ activeScene: 'ending' })}>⏹ Stream Finalizado</button>
          <button className="btn w-full" style={{ justifyContent: 'center', border: '1px solid var(--border-light)' }} onClick={() => saveConfig({ activeScene: 'none' })}>👁 Volver al Stream (En Vivo)</button>
        </div>
      </div>

    </section>
  );
}
