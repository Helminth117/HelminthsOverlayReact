import React, { useState } from 'react';

const WIDGET_LABELS = { 
  frame: 'Marco Live', 
  user: 'Nombre/Live', 
  socials: 'Redes', 
  stats: 'Stats TikTok', 
  topevents: 'Top Eventos', 
  objs: 'Objetivos', 
  timers: 'Reloj', 
  game: 'Juego', 
  chips: 'Datos Juego', 
  chat: 'Caja Chat', 
  'pinned-chat': 'Mensaje Fijado', 
  visualizer: 'Visualizador', 
  spotify: 'Spotify / Web', 
  media: 'Música Local', 
  lyrics: 'Letras', 
  'chat-avatars': 'Avatares Chat', 
  combo: 'Combos de Likes',
  poll: 'Encuestas',
  webcam: 'Marco Webcam',
  minecraft: 'Días Minecraft'
};

export default function WidgetsSettings({ config, saveConfig }) {
  const [widgetOptsOpen, setWidgetOptsOpen] = useState({});
  const isHoriz = false;

  return (
    <section className="sub-view active">
      <div className="card highlight">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Visibilidad (Vertical 9:16)
        </h2>

        <div className="flex-col gap-xs">
          {Object.keys(WIDGET_LABELS).map(id => {
            const isOpen = widgetOptsOpen[id];
            const widgetsKey = 'widgets';
            const layoutKey = 'layout';

            const wActive = (config[widgetsKey] || {})[id] !== false;
            const gActive = (config.glassWidgets || {})[id] !== false;
            const align = (config.textAlign || {})[id] || 'left';
            return (
              <div key={id} className="list-item flex-col" style={{ padding: 0 }}>
                <div className="flex items-center justify-between" style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => setWidgetOptsOpen(p => ({ ...p, [id]: !p[id] }))}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{WIDGET_LABELS[id]}</span>
                  <div className="flex items-center gap-sm">
                    <button className="btn btn-ghost" title="Opciones" onClick={(e) => { e.stopPropagation(); setWidgetOptsOpen(p => ({ ...p, [id]: !p[id] })); }} style={{ padding: '4px 8px', fontSize: 11 }}>⚙️</button>
                    <button className={`toggle ${wActive ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); saveConfig({ [widgetsKey]: { ...(config[widgetsKey] || {}), [id]: !wActive } }); }}></button>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 12px 12px 12px' }}>
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }} className="flex-col gap-sm">
                      <button className="btn btn-ghost w-full" onClick={() => {
                        const newLayout = { ...(config[layoutKey] || { modules: {} }) };
                        if (!newLayout.modules) newLayout.modules = {};
                        newLayout.modules['comp-' + id] = { l: isHoriz ? '45vw' : '40vw', t: isHoriz ? '40vh' : '40vh', w: '', h: '', z: '999' };
                        saveConfig({ [layoutKey]: newLayout, [widgetsKey]: { ...(config[widgetsKey] || {}), [id]: true } });
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
                              <button key={a} type="button" onClick={() => saveConfig({ textAlign: { ...config.textAlign, [id]: a } })} style={{ padding: '2px 8px', borderRadius: 3, border: 'none', background: align === a ? 'var(--accent)' : 'transparent', color: align === a ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }}>
                                {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {id === 'webcam' && (
                        <div className="flex items-center justify-between mt-sm" style={{ borderTop: '1px dashed var(--border-light)', paddingTop: 10 }}>
                          <span className="text-xs text-secondary font-bold">Formato de Webcam</span>
                          <select 
                            className="inp" 
                            style={{ padding: '2px 8px', fontSize: 11, width: 'auto', height: '28px', minWidth: '120px' }}
                            value={config.webcamAspect || '16_9'} 
                            onChange={(e) => saveConfig({ webcamAspect: e.target.value })}
                          >
                            <option value="16_9">16:9 (Horizontal)</option>
                            <option value="4_3">4:3 (Casi Cuadrado)</option>
                          </select>
                        </div>
                      )}
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
    </section>
  );
}
