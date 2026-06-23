import React from 'react';

export default function AudioSettings({
  config,
  saveConfig,
  audioDevices = [],
  refreshAudioDevices
}) {
  return (
    <section className="sub-view active">
      <div className="card">
        <h2 className="flex items-center gap-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
          Audio
        </h2>

        <div className="flex-col gap-xs mb-md">
          <label className="text-xs text-secondary">Dispositivo de Audio (Visualizador):</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={config.audioDeviceId || 'desktop'} onChange={(e) => saveConfig({ audioDeviceId: e.target.value })} className="inp" style={{ flex: 1 }}>
              <option value="desktop">Audio del Sistema (Mix Maestro)</option>
              {audioDevices.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={refreshAudioDevices} title="Recargar Dispositivos">↻</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Si el visualizador se congela al cambiar de auriculares, selecciona tu dispositivo aquí.
          </div>
        </div>

        <h3 className="mb-sm" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Mezclador de Volumen</h3>

        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Alertas ({Math.round((config.volAlerts ?? 1) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="2" step="0.1" value={config.volAlerts ?? 1} style={{ width: 150 }} onChange={(e) => saveConfig({ volAlerts: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Soundboard ({Math.round((config.volSoundboard ?? 0.8) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volSoundboard ?? 0.8} style={{ width: 150 }} onChange={(e) => saveConfig({ volSoundboard: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">TTS / Voz ({Math.round((config.volTts ?? 1) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volTts ?? 1} style={{ width: 150 }} onChange={(e) => saveConfig({ volTts: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Música / YouTube ({Math.round((config.volMusic ?? 0.8) * 100)}%)</span>
          <input type="range" className="slider" min="0" max="1" step="0.05" value={config.volMusic ?? 0.8} style={{ width: 150 }} onChange={(e) => saveConfig({ volMusic: parseFloat(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between mb-xs">
          <span className="text-sm">Sincronía Letras (Offset: {(config.lyricsOffset ?? 0).toFixed(1)}s)</span>
          <input type="range" className="slider" min="-5" max="5" step="0.1" value={config.lyricsOffset ?? 0} style={{ width: 150 }} onChange={(e) => saveConfig({ lyricsOffset: parseFloat(e.target.value) })} />
        </div>
      </div>
    </section>
  );
}
