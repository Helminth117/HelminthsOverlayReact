import React from 'react';

export default function GameProfilesCard({
  config,
  saveConfig,
  gameProfiles,
  saveGameProfilesDebounced,
  showSaved,
  uid
}) {
  return (
    <section className="sub-view active">
      <div className="card highlight" style={{ borderColor: 'var(--success)' }}>
        <h2 style={{ color: 'var(--success)' }}>Autodetector de Juego</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary">El overlay detectará si juegas LOL, Valorant, etc. y cambiará su color.</span>
          <button className={`toggle ${config.autoDetectGame !== false ? 'on' : ''}`} onClick={() => {
            const val = config.autoDetectGame === false;
            window.api.toggleAutoDetect(val);
            saveConfig({ autoDetectGame: val });
          }}></button>
        </div>
      </div>

      <div className="card">
        <h2>🎮 Datos de Juego (Widget Principal)</h2>
        <div className="flex-col gap-sm mb-sm">
          <input className="inp" type="text" value={config.gameImage || ''} placeholder="https://... o ruta local" onChange={(e) => saveConfig({ gameImage: e.target.value })} />
          <input className="inp" type="text" value={config.gameName || ''} placeholder="Minecraft, Dota 2..." onChange={(e) => saveConfig({ gameName: e.target.value })} />
        </div>
        <div className="flex items-center gap-sm mt-sm">
          <span className="text-xs text-secondary">Tamaño (px):</span>
          <input type="range" className="slider flex-1" min="10" max="100" step="1" value={config.gameFontSize || 24} onChange={(e) => saveConfig({ gameFontSize: parseInt(e.target.value) })} />
          <input type="number" className="inp" style={{ width: 65 }} min="10" max="100" value={config.gameFontSize || 24} onChange={(e) => saveConfig({ gameFontSize: parseInt(e.target.value) })} />
        </div>
      </div>

      <div className="card">
        <h2>Perfiles de Juego</h2>
        <div className="flex-col gap-sm mb-sm">
          {gameProfiles.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
              <input className="inp" style={{ width: 70, fontSize: 11 }} value={p.process} placeholder="proceso" onChange={e => {
                const newP = [...gameProfiles]; newP[i].process = e.target.value; saveGameProfilesDebounced(newP);
              }} />
              <input className="inp" style={{ flex: 1, fontSize: 11 }} value={p.name} placeholder="Nombre" onChange={e => {
                const newP = [...gameProfiles]; newP[i].name = e.target.value; saveGameProfilesDebounced(newP);
              }} />
              <div style={{ flex: 1.2, display: 'flex', gap: 4 }}>
                <input className="inp" style={{ width: '100%', fontSize: 10 }} value={p.imageUrl || ''} placeholder="Imagen (opc)" onChange={e => {
                  const newP = [...gameProfiles]; newP[i].imageUrl = e.target.value; saveGameProfilesDebounced(newP);
                }} />
                <button className="btn btn-success" style={{ padding: '2px 6px' }} title="Buscar en PC" onClick={async () => {
                  const r = await window.api.selectImage();
                  if (r) {
                    const newP = [...gameProfiles]; newP[i].imageUrl = r; saveGameProfilesDebounced(newP);
                  }
                }}>🖼</button>
              </div>
              <input type="color" value={p.accent || '#1D9E75'} style={{ width: 28, height: 28, border: 'none', borderRadius: 5, cursor: 'pointer', padding: 0 }} onChange={e => {
                const newP = [...gameProfiles]; newP[i].accent = e.target.value; saveGameProfilesDebounced(newP);
              }} />
              <button className={`toggle ${p.enabled ? 'on' : ''}`} onClick={() => {
                const newP = [...gameProfiles]; newP[i].enabled = !newP[i].enabled; saveGameProfilesDebounced(newP);
              }}></button>
              <button className="btn btn-danger" style={{ padding: '2px 7px' }} onClick={() => {
                const newP = gameProfiles.filter((_, idx) => idx !== i); saveGameProfilesDebounced(newP);
              }}>🗑</button>
            </div>
          ))}
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
            const newP = [...gameProfiles, { process: '', name: 'Nuevo juego', accent: '#10b981', imageUrl: '', enabled: true }];
            saveGameProfilesDebounced(newP);
          }}>+ Agregar Perfil</button>
          <button className="btn btn-primary" style={{ flex: 1, background: 'var(--accent)', color: 'white' }} onClick={async (e) => {
            const btn = e.target;
            const originalText = btn.innerText;
            btn.innerText = "⏳ Escaneando...";
            btn.disabled = true;
            const scanned = await window.api.scanPcGames();
            btn.innerText = originalText;
            btn.disabled = false;
            if (scanned && scanned.length > 0) {
              let added = 0;
              const newP = [...gameProfiles];
              scanned.forEach(game => {
                if (!newP.some(p => p.process === game.process || p.name === game.name)) {
                  newP.push(game);
                  added++;
                }
              });
              if (added > 0) {
                saveGameProfilesDebounced(newP);
                alert(`¡Se encontraron y agregaron ${added} juegos nuevos de Steam!`);
              } else {
                alert('Se escanearon los juegos pero todos ya estaban en la lista.');
              }
            } else {
              alert('No se encontraron juegos de Steam (o Steam no está instalado).');
            }
          }}>🔍 Escanear Steam</button>
        </div>
        <div className="flex gap-sm mt-sm">
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={async () => {
            await window.api.forceGameDetect();
            showSaved();
          }}>🕹️ Forzar Detección</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => {
            if (!window.confirm('¿Restaurar perfiles de juego a los valores por defecto?')) return;
            const defProfiles = [
              { process: 'javaw',      name: 'Minecraft',       accent: '#1D9E75', imageUrl: '', enabled: true },
              { process: 'dota2',      name: 'Dota 2',           accent: '#c23b22', imageUrl: '', enabled: true },
              { process: 're2',        name: 'Resident Evil 2',  accent: '#8b0000', imageUrl: '', enabled: true },
              { process: 'MonsterHunterWorld', name: 'Monster Hunter', accent: '#e0a95c', imageUrl: '', enabled: true },
              { process: 'StardewValley', name: 'Stardew Valley', accent: '#7ec850', imageUrl: '', enabled: true },
            ];
            saveGameProfilesDebounced(defProfiles);
          }}>🔄 Restaurar Defaults</button>
        </div>
      </div>

      <div className="card">
        <h2>Chips / Marcadores (Ej: IP, Server)</h2>
        <div className="flex-col gap-xs mb-sm">
          {config.game.map((chip, i) => (
            <div key={chip.id || i} className="item-row" style={{ flexWrap: 'wrap', gap: 5, padding: '8px 0' }}>
              <input className="inp" style={{ width: 32, textAlign: 'center', padding: 4 }} value={chip.icon || '🎮'} onChange={(e) => {
                const newGame = [...config.game]; newGame[i].icon = e.target.value; saveConfig({ game: newGame });
              }} />
              <input className="inp" style={{ flex: 1, minWidth: 60 }} value={chip.label || ''} placeholder="Label (IP, Puerto...)" onChange={(e) => {
                const newGame = [...config.game]; newGame[i].label = e.target.value; saveConfig({ game: newGame });
              }} />
              <input className="inp" style={{ flex: 1.4, minWidth: 80 }} value={chip.value || ''} placeholder="Valor" onChange={(e) => {
                const newGame = [...config.game]; newGame[i].value = e.target.value; saveConfig({ game: newGame });
              }} />
              <button className={`toggle ${chip.visible ? 'on' : ''}`} title="Mostrar/ocultar" onClick={() => {
                const newGame = [...config.game]; newGame[i].visible = !newGame[i].visible; saveConfig({ game: newGame });
              }}></button>
              <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => {
                saveConfig({ game: config.game.filter((_, idx) => idx !== i) });
              }}>×</button>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost w-full" onClick={() => saveConfig({ game: [...config.game, { id: uid(), icon: '🎮', label: '', value: '', visible: true }] })}>+ Añadir Dato</button>
      </div>
    </section>
  );
}
