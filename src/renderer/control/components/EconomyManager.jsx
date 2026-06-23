import React, { useState, useEffect } from 'react';
import { 
  Trophy, Coins, User, Edit3, Save, PlusCircle, Settings, RefreshCw, Award
} from 'lucide-react';

const EconomyManager = React.memo(function EconomyManager({ activeTab, config, saveConfig, showSaved }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [editingSettings, setEditingSettings] = useState(false);
  
  // Settings Form States
  const [pointsPerFollow, setPointsPerFollow] = useState(25);
  const [likesThreshold, setLikesThreshold] = useState(50);
  const [pointsPerLikesThreshold, setPointsPerLikesThreshold] = useState(5);
  const [pointsPerChat, setPointsPerChat] = useState(1);
  const [chatCooldownMs, setChatCooldownMs] = useState(30000);
  const [giftExponent, setGiftExponent] = useState(1.4);

  // Override Form States
  const [targetUser, setTargetUser] = useState('');
  const [overridePoints, setOverridePoints] = useState('');
  const [givePointsAmount, setGivePointsAmount] = useState('');
  
  const fetchLeaderboard = async () => {
    if (!window.api) return;
    try {
      const list = await window.api.getLeaderboard(20);
      setLeaderboard(list || []);
    } catch (e) {
      console.error('[EconomyManager] Error fetching leaderboard:', e);
    }
  };

  useEffect(() => {
    if (activeTab !== 'economia') return;
    fetchLeaderboard();

    // Inicializar inputs desde config
    const eco = config?.economy || {};
    setPointsPerFollow(eco.pointsPerFollow !== undefined ? eco.pointsPerFollow : 25);
    setLikesThreshold(eco.likesThreshold !== undefined ? eco.likesThreshold : 50);
    setPointsPerLikesThreshold(eco.pointsPerLikesThreshold !== undefined ? eco.pointsPerLikesThreshold : 5);
    setPointsPerChat(eco.pointsPerChat !== undefined ? eco.pointsPerChat : 1);
    setChatCooldownMs(eco.chatCooldownMs !== undefined ? eco.chatCooldownMs : 30000);
    setGiftExponent(eco.giftExponent !== undefined ? eco.giftExponent : 1.4);
  }, [activeTab]);

  useEffect(() => {
    if (!window.api || activeTab !== 'economia') return;
    const handleUpdate = () => fetchLeaderboard();
    const unsub = window.api.on('economy-update', handleUpdate);
    return () => {
      if (unsub) window.api.off('economy-update', unsub);
    };
  }, [activeTab]);



  const handleSaveSettings = () => {
    saveConfig({
      economy: {
        pointsPerFollow: parseInt(pointsPerFollow) || 25,
        likesThreshold: parseInt(likesThreshold) || 50,
        pointsPerLikesThreshold: parseInt(pointsPerLikesThreshold) || 5,
        pointsPerChat: parseInt(pointsPerChat) || 1,
        chatCooldownMs: parseInt(chatCooldownMs) || 30000,
        giftExponent: parseFloat(giftExponent) || 1.4
      }
    });
    setEditingSettings(false);
    showSaved();
  };

  const handleSetPoints = async (e) => {
    e.preventDefault();
    if (!targetUser || overridePoints === '') return;
    if (!window.api) return;
    try {
      const res = await window.api.adminSetPoints(targetUser, parseInt(overridePoints) || 0);
      if (res) {
        alert(`Puntos de @${targetUser} establecidos a ${overridePoints}`);
        setTargetUser('');
        setOverridePoints('');
        fetchLeaderboard();
      } else {
        alert('Usuario no encontrado o no inicializado.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al establecer puntos.');
    }
  };

  const handleGivePoints = async (e) => {
    e.preventDefault();
    if (!targetUser || !givePointsAmount) return;
    if (!window.api) return;
    try {
      const res = await window.api.adminGivePoints(targetUser, parseInt(givePointsAmount) || 0);
      if (res) {
        alert(`Otorgados ${givePointsAmount} puntos a @${targetUser}`);
        setTargetUser('');
        setGivePointsAmount('');
        fetchLeaderboard();
      } else {
        alert('Error al otorgar puntos.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al otorgar puntos.');
    }
  };

  return (
    <div className={`tab-view ${activeTab === 'economia' ? 'active' : ''} flex flex-col gap-md`} style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '16px', display: activeTab === 'economia' ? 'flex' : 'none' }}>
      
      {/* HEADER */}
      <div className="flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '20px', fontWeight: '700' }}>
            <Coins size={22} style={{ color: 'var(--accent)' }} />
            Gestión de Economía
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Estadísticas de puntos, leaderboard global y modificaciones manuales.
          </p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={() => setEditingSettings(!editingSettings)}>
            <Settings size={15} />
            Configurar Puntos
          </button>
          <button className="btn btn-ghost" onClick={fetchLeaderboard}>
            <RefreshCw size={15} />
            Refrescar
          </button>
        </div>
      </div>

      {/* SETTINGS PANEL */}
      {editingSettings && (
        <div className="card flex-col gap-md" style={{ backgroundColor: 'rgba(20, 20, 25, 0.95)', border: '1px solid var(--accent)' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>Fórmulas y Cooldowns de Puntos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Puntos por Seguir:</label>
              <input 
                type="number" 
                value={pointsPerFollow}
                onChange={e => setPointsPerFollow(e.target.value)}
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Likes necesarios para Puntos:</label>
              <input 
                type="number" 
                value={likesThreshold}
                onChange={e => setLikesThreshold(e.target.value)}
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Puntos otorgados por tanda de Likes:</label>
              <input 
                type="number" 
                value={pointsPerLikesThreshold}
                onChange={e => setPointsPerLikesThreshold(e.target.value)}
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Puntos por mensaje de Chat:</label>
              <input 
                type="number" 
                value={pointsPerChat}
                onChange={e => setPointsPerChat(e.target.value)}
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cooldown Chat (segundos):</label>
              <input 
                type="number" 
                value={chatCooldownMs / 1000}
                onChange={e => setChatCooldownMs(parseInt(e.target.value) * 1000 || 30000)}
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Exponente de Regalos (Gifts):</label>
              <input 
                type="number" 
                step="0.1"
                value={giftExponent}
                onChange={e => setGiftExponent(e.target.value)}
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}
              />
            </div>

          </div>
          <div className="flex gap-sm mt-sm">
            <button className="btn text-xs" onClick={handleSaveSettings}>Guardar Ajustes</button>
            <button className="btn btn-ghost text-xs" onClick={() => setEditingSettings(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* OVERRIDE & LEADERBOARD GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
        
        {/* MANUAL OVERRIDES CARD */}
        <div className="flex flex-col gap-sm">
          <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={16} style={{ color: 'var(--accent)' }} />
            Modificaciones Manuales
          </h3>
          <div className="card flex-col gap-md" style={{ padding: '16px' }}>
            
            {/* Form set points */}
            <form onSubmit={handleSetPoints} className="flex flex-col gap-sm" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>ESTABLECER PUNTOS DIRECTOS</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Usuario (sin @)"
                  value={targetUser}
                  onChange={e => setTargetUser(e.target.value)}
                  style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}
                  required
                />
                <input 
                  type="number" 
                  placeholder="Puntos"
                  value={overridePoints}
                  onChange={e => setOverridePoints(e.target.value)}
                  style={{ width: '90px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}
                  required
                />
                <button type="submit" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px' }}>
                  <Save size={14} />
                </button>
              </div>
            </form>

            {/* Form give points */}
            <form onSubmit={handleGivePoints} className="flex flex-col gap-sm">
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>OTORGAR PUNTOS ADICIONALES</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Usuario (sin @)"
                  value={targetUser}
                  onChange={e => setTargetUser(e.target.value)}
                  style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}
                  required
                />
                <input 
                  type="number" 
                  placeholder="Cantidad"
                  value={givePointsAmount}
                  onChange={e => setGivePointsAmount(e.target.value)}
                  style={{ width: '90px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}
                  required
                />
                <button type="submit" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px' }}>
                  <PlusCircle size={14} />
                </button>
              </div>
            </form>

          </div>
        </div>

        {/* TOP 20 LEADBOARD LIST */}
        <div className="flex flex-col gap-sm">
          <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={16} style={{ color: '#f59e0b' }} />
            Top 20 Leaderboard Global
          </h3>
          <div className="card flex-col gap-sm" style={{ maxHeight: '600px', overflowY: 'auto', padding: '12px' }}>
            {leaderboard.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', opacity: 0.7, fontSize: '13px' }}>
                No hay registros en la base de datos de economía.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 4px' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '6px 4px' }}>Usuario</th>
                    <th style={{ textAlign: 'right', padding: '6px 4px' }}>Puntos</th>
                    <th style={{ textAlign: 'right', padding: '6px 4px' }}>Likes</th>
                    <th style={{ textAlign: 'right', padding: '6px 4px' }}>Gifts (D)</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((user, idx) => (
                    <tr key={user.username} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 'bold', color: idx < 3 ? '#f59e0b' : 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 4px', fontWeight: '500' }}>
                        <span 
                          onClick={() => setTargetUser(user.username)}
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          @{user.username}
                        </span>
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent)' }}>{user.points}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', opacity: 0.8 }}>{user.likes}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', opacity: 0.8 }}>{user.totalGifted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
});

export default EconomyManager;
