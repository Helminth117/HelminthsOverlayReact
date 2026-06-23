import React, { useState } from 'react';

const PRESET_TEMPLATES = [
  {
    id: 'preset_cyberpunk',
    name: '🌌 Cyberpunk Neón',
    isPreset: true,
    theme: 'theme-synthwave',
    accent: '#f43f5e',
    opacity: 0.9,
    neonGlow: true,
    frameThickness: 6,
    fontFamily: "'Rajdhani', sans-serif",
    musicWidgetStyle: 'music-style-vinyl',
    widgets: { user: true, socials: true, timers: true, chat: true, webcam: true },
    textAlign: { user: 'right', game: 'right' }
  },
  {
    id: 'preset_glassmorphism',
    name: '💎 Cristal Místico',
    isPreset: true,
    theme: 'theme-liquid-glass',
    accent: '#10b981',
    opacity: 0.75,
    neonGlow: true,
    frameThickness: 2,
    fontFamily: "'Inter', sans-serif",
    musicWidgetStyle: 'music-style-glass',
    widgets: { user: true, socials: true, chat: true, webcam: false },
    textAlign: { user: 'left', game: 'left' }
  },
  {
    id: 'preset_obsidian',
    name: '👑 Obsidian Gold',
    isPreset: true,
    theme: 'theme-obsidian',
    accent: '#e0a95c',
    opacity: 0.85,
    neonGlow: true,
    frameThickness: 4,
    fontFamily: "'Inter', sans-serif",
    musicWidgetStyle: 'music-style-glass',
    widgets: { user: true, socials: true, timers: true, chat: true, webcam: true },
    textAlign: { user: 'right', game: 'right' }
  },
  {
    id: 'preset_arcade',
    name: '👾 Retro Arcade 8-Bit',
    isPreset: true,
    theme: 'theme-retro',
    accent: '#ef4444',
    opacity: 0.95,
    neonGlow: false,
    frameThickness: 8,
    fontFamily: "'Rajdhani', sans-serif",
    musicWidgetStyle: 'music-style-vinyl',
    widgets: { user: true, socials: true, timers: true, chat: true, webcam: true },
    textAlign: { user: 'center', game: 'center' }
  }
];

const FIELDS_TO_SAVE = [
  'widgets',
  'widgetsHorizontal',
  'layout',
  'layoutHorizontal',
  'glassWidgets',
  'textAlign',
  'accent',
  'opacity',
  'showSceneBg',
  'neonGlow',
  'frameThickness',
  'theme',
  'fontFamily',
  'musicWidgetStyle',
  'webcamAspect'
];

const THEME_LABELS = {
  'theme-liquid-glass': 'Liquid Glass',
  'theme-liquid-glass-expanded': 'Liquid Glass Exp.',
  'theme-tokyo-night': 'Tokyo Night',
  'theme-clean-flat': 'Clean Flat',
  'theme-retro': 'Retro 8-Bit',
  'theme-brutalist': 'Brutalista',
  'theme-synthwave': 'Synthwave',
  'theme-obsidian': 'Obsidian Gold',
  'theme-holographic': 'Holographic',
  'theme-luna-cosmic': 'Luna Cosmic'
};

export default function OverlayTemplatesSettings({ config, saveConfig }) {
  const [templateName, setTemplateName] = useState('');
  const userTemplates = config.overlayTemplates || [];

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Por favor, introduce un nombre para la plantilla.');
      return;
    }

    const newTemplate = {
      id: 'tpl_' + Date.now(),
      name: templateName.trim(),
      createdAt: new Date().toISOString()
    };

    FIELDS_TO_SAVE.forEach(field => {
      if (config[field] !== undefined) {
        newTemplate[field] = JSON.parse(JSON.stringify(config[field]));
      }
    });

    const updatedTemplates = [...userTemplates, newTemplate];
    saveConfig({ overlayTemplates: updatedTemplates });
    setTemplateName('');
  };

  const handleLoadTemplate = (template) => {
    if (!window.confirm(`¿Estás seguro de que deseas cargar la plantilla "${template.name}"? Esto reemplazará tu diseño y colores actuales.`)) {
      return;
    }

    const updatedConfigValues = {};
    FIELDS_TO_SAVE.forEach(field => {
      if (template[field] !== undefined) {
        updatedConfigValues[field] = JSON.parse(JSON.stringify(template[field]));
      }
    });

    saveConfig(updatedConfigValues);
  };

  const handleDeleteTemplate = (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la plantilla "${name}"?`)) {
      return;
    }

    const updatedTemplates = userTemplates.filter(t => t.id !== id);
    saveConfig({ overlayTemplates: updatedTemplates });
  };

  return (
    <section className="sub-view active">
      {/* Save Template Section */}
      <div className="card highlight">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          Guardar Diseño Actual
        </h2>
        <p className="text-xs text-secondary mb-md">
          Guarda la posición de los widgets, colores, tema, alineaciones y visibilidad actuales como una plantilla personalizada.
        </p>
        <div className="flex gap-sm">
          <input
            className="inp flex-1"
            type="text"
            placeholder="Ej. Mi plantilla de noche, Solo Chatting..."
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleSaveTemplate}>
            Guardar Plantilla
          </button>
        </div>
      </div>

      {/* User Templates Section */}
      <div className="card">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          Mis Plantillas Personalizadas
        </h2>
        
        {userTemplates.length === 0 ? (
          <div className="text-center text-secondary text-sm py-lg" style={{ border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)' }}>
            No tienes plantillas guardadas. Escribe un nombre arriba y haz clic en "Guardar Plantilla" para crear la primera.
          </div>
        ) : (
          <div className="flex-col gap-sm">
            {userTemplates.map((tpl) => {
              const activeWidgetsCount = Object.values(tpl.widgets || {}).filter(Boolean).length;
              return (
                <div key={tpl.id} className="list-item flex items-center justify-between" style={{ padding: '12px var(--space-md)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                  <div className="flex-col gap-xs">
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{tpl.name}</span>
                    <div className="flex items-center gap-sm text-xs text-secondary">
                      <span className="flex items-center gap-xs">
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: tpl.accent || 'var(--accent)' }}></span>
                        {tpl.accent || '#8b5cf6'}
                      </span>
                      <span>•</span>
                      <span>🎨 {THEME_LABELS[tpl.theme] || 'Personalizado'}</span>
                      <span>•</span>
                      <span>🧱 {activeWidgetsCount} widgets activos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-xs">
                    <button className="btn btn-success text-xs" style={{ padding: '6px 12px' }} onClick={() => handleLoadTemplate(tpl)}>
                      Cargar
                    </button>
                    <button className="btn btn-danger text-xs" style={{ padding: '6px 10px' }} onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}>
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preset Templates Section */}
      <div className="card">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Plantillas de Fábrica (Presets)
        </h2>
        <p className="text-xs text-secondary mb-md">
          Prueba uno de nuestros temas preconfigurados listos para usar en tus transmisiones.
        </p>

        <div className="grid gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {PRESET_TEMPLATES.map((preset) => {
            return (
              <div 
                key={preset.id} 
                className="list-item flex-col justify-between" 
                style={{ 
                  padding: 'var(--space-md)', 
                  background: 'var(--bg-input)', 
                  border: `1px solid ${preset.accent}33`, 
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 140
                }}
              >
                {/* Visual accent border top */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: preset.accent }}></div>
                
                <div className="flex-col gap-xs mb-md">
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{preset.name}</span>
                  <div className="flex-col gap-xxs text-xs text-secondary mt-xs">
                    <div>Tema: <span style={{ color: 'var(--text-primary)' }}>{THEME_LABELS[preset.theme]}</span></div>
                    <div>Fuente: <span style={{ color: 'var(--text-primary)', fontFamily: preset.fontFamily }}>{preset.fontFamily.split(',')[0].replace(/'/g, '')}</span></div>
                    <div className="flex items-center gap-xs">
                      Color: <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: preset.accent }}></span>
                      <span style={{ color: 'var(--text-primary)' }}>{preset.accent}</span>
                    </div>
                  </div>
                </div>

                <button 
                  className="btn w-full text-xs" 
                  style={{ 
                    background: `linear-gradient(135deg, ${preset.accent}ee, ${preset.accent})`, 
                    color: '#fff', 
                    border: 'none',
                    fontWeight: 600,
                    padding: '8px 0'
                  }} 
                  onClick={() => handleLoadTemplate(preset)}
                >
                  Cargar Preset
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
