import React from 'react';

export default function DesignSettings({ config, saveConfig }) {
  return (
    <section className="sub-view active">
      <div className="card">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M4.93 4.93a10 10 0 0 0 0 14.14M8.46 8.46a5 5 0 0 0 0 7.07"></path>
          </svg>
          HUD y Diseño
        </h2>

        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm text-secondary">Color Acento</span>
          <div className="flex items-center gap-sm">
            <input
              type="color"
              value={config.accent || '#8b5cf6'}
              onChange={(e) => saveConfig({ accent: e.target.value })}
              style={{ width: 30, height: 30, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', padding: 0 }}
            />
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#10b981' })}>🟢</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#6366f1' })}>🔵</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#8b5cf6' })}>🟣</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#f59e0b' })}>🟡</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveConfig({ accent: '#ef4444' })}>🔴</button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-sm gap-md">
          <span className="text-sm text-secondary" style={{ minWidth: 90 }}>Transparencia</span>
          <input type="range" className="slider flex-1" min="0.1" max="1" step="0.05" value={config.opacity || 0.85} onChange={(e) => saveConfig({ opacity: parseFloat(e.target.value) })} />
        </div>

        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm">Fondo de escena</span>
          <button className={`toggle ${config.showSceneBg ? 'on' : ''}`} onClick={() => saveConfig({ showSceneBg: !config.showSceneBg })}></button>
        </div>

        <div className="flex items-center justify-between mb-sm">
          <span className="text-sm">Resplandor Neón (Glow)</span>
          <button className={`toggle ${config.neonGlow ? 'on' : ''}`} onClick={() => saveConfig({ neonGlow: !config.neonGlow })}></button>
        </div>

        <div className="flex items-center justify-between mb-sm gap-md">
          <span className="text-sm text-secondary" style={{ minWidth: 90 }}>Grosor Marco Live</span>
          <input type="range" className="slider flex-1" min="0" max="150" step="1" value={config.frameThickness ?? 4} onChange={(e) => saveConfig({ frameThickness: parseInt(e.target.value) })} />
        </div>

        <div className="flex-col gap-xs mt-sm">
          <label className="text-xs text-secondary">
            Tema del Overlay:
          </label>
          <select value={config.theme || 'theme-liquid-glass'} onChange={(e) => saveConfig({ theme: e.target.value })} className="inp">
            <option value="theme-liquid-glass">Liquid Glass (Elegante y Cristalino)</option>
            <option value="theme-liquid-glass-expanded">Liquid Glass Expanded (Refraction Style)</option>
            <option value="theme-tokyo-night">Tokyo Night (Cyberpunk, Cuadrado)</option>
            <option value="theme-clean-flat">Clean Flat (Minimalista, Profesional)</option>
            <option value="theme-retro">Retro 8-Bit (Arcade Pixelado)</option>
            <option value="theme-brutalist">Brutalist (Pesado, Táctico)</option>
            <option value="theme-synthwave">Synthwave (Neón Retrowave)</option>
            <option value="theme-obsidian">Obsidian Gold (Lujo Oscuro Premium)</option>
            <option value="theme-holographic">Holographic (HUD Sci-Fi Avanzado)</option>
            <option value="theme-luna-cosmic">Luna Cosmic (Mystical Tarot & Oro)</option>
          </select>
        </div>

        <div className="flex-col gap-xs mt-sm">
          <label className="text-xs text-secondary">Fuente (Letra):</label>
          <select value={config.fontFamily || "'Inter', sans-serif"} onChange={(e) => saveConfig({ fontFamily: e.target.value })} className="inp">
            <option value="'Inter', sans-serif">Inter (Moderno UI)</option>
            <option value="'Rajdhani', sans-serif">Rajdhani (Gamer)</option>
            <option value="'JetBrains Mono', monospace">JetBrains Mono (Código)</option>
          </select>
        </div>

        <div className="flex-col gap-xs mt-sm">
          <label className="text-xs text-secondary">Estilo Reproductor de Música:</label>
          <select value={config.musicWidgetStyle || 'music-style-glass'} onChange={(e) => saveConfig({ musicWidgetStyle: e.target.value })} className="inp">
            <option value="music-style-glass">Tarjeta Premium (Glassmorphism)</option>
            <option value="music-style-vinyl">Vinilo Giratorio (Dinámico)</option>
            <option value="music-style-pill">Isla Dinámica (Píldora iOS)</option>
          </select>
        </div>
      </div>
    </section>
  );
}
