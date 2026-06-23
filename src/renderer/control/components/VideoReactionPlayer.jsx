import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Play, Pause, Square, Trash2, Volume2, Settings, RefreshCw, 
  Download, CheckCircle, AlertCircle, Clock, Film
} from 'lucide-react';

const formatMMSS = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity || seconds === null) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const VideoReactionPlayer = React.memo(function VideoReactionPlayer({ activeTab }) {
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingItem, setPlayingItem] = useState(null);
  const [volume, setVolume] = useState(0.5);
  const [settings, setSettings] = useState({ cost: 1000, enabled: true });
  const [showSettings, setShowSettings] = useState(false);
  const [newCost, setNewCost] = useState(1000);

  const fetchQueue = async () => {
    if (!window.api) return;
    try {
      const q = await window.api.getVideoQueue();
      setQueue(q || []);
    } catch (err) {
      console.error('[VideoReactionPlayer] Error fetching queue:', err);
    }
  };

  useEffect(() => {
    if (activeTab !== 'reacciones') return;
    fetchQueue();
  }, [activeTab]);

  // Manejar eventos en tiempo real
  useEffect(() => {
    if (!window.api || activeTab !== 'reacciones') return;

    const handleQueued = () => fetchQueue();
    const handleReady = () => fetchQueue();
    const handleUpdated = () => fetchQueue();
    const handleRemoved = () => fetchQueue();
    const handleSettings = (newSettings) => setSettings(newSettings);

    // Escuchar cambios de tiempo de reproducción en tiempo real
    const handlePlayEvent = (data) => {
      setIsPlaying(true);
      setPlayingItem(data);
    };

    const handlePauseEvent = () => setIsPlaying(false);
    const handleResumeEvent = () => setIsPlaying(true);
    const handleStopEvent = () => {
      setIsPlaying(false);
      setPlayingItem(null);
    };

    const unsubQueued = window.api.on('video-reaction-queued', handleQueued);
    const unsubReady = window.api.on('video-reaction-ready', handleReady);
    const unsubUpdated = window.api.on('video-reaction-updated', handleUpdated);
    const unsubRemoved = window.api.on('video-reaction-removed', handleRemoved);
    const unsubSettings = window.api.on('video-reaction-settings-updated', handleSettings);
    const unsubPlay = window.api.on('video-reaction-play', handlePlayEvent);
    const unsubPause = window.api.on('video-reaction-pause', handlePauseEvent);
    const unsubResume = window.api.on('video-reaction-resume', handleResumeEvent);
    const unsubStop = window.api.on('video-reaction-stop', handleStopEvent);

    return () => {
      if (unsubQueued) window.api.off('video-reaction-queued', unsubQueued);
      if (unsubReady) window.api.off('video-reaction-ready', unsubReady);
      if (unsubUpdated) window.api.off('video-reaction-updated', unsubUpdated);
      if (unsubRemoved) window.api.off('video-reaction-removed', unsubRemoved);
      if (unsubSettings) window.api.off('video-reaction-settings-updated', unsubSettings);
      if (unsubPlay) window.api.off('video-reaction-play', unsubPlay);
      if (unsubPause) window.api.off('video-reaction-pause', unsubPause);
      if (unsubResume) window.api.off('video-reaction-resume', unsubResume);
      if (unsubStop) window.api.off('video-reaction-stop', unsubStop);
    };
  }, [activeTab]);



  const handlePlay = useCallback((item) => {
    if (!window.api || !item.filePath) return;
    window.api.playVideoReaction({
      id: item.id,
      filePath: item.filePath,
      title: item.title,
      requestedBy: item.requestedBy,
      volume: volume
    });
    setPlayingItem(item);
    setIsPlaying(true);
  }, [volume]);

  const handlePauseToggle = useCallback(() => {
    if (!window.api) return;
    if (isPlaying) {
      window.api.pauseVideoReaction();
      setIsPlaying(false);
    } else {
      window.api.resumeVideoReaction();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    if (!window.api) return;
    window.api.stopVideoReaction();
    setIsPlaying(false);
    setPlayingItem(null);
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (window.api) {
      window.api.volumeVideoReaction(val);
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!window.api) return;
    if (confirm('¿Seguro que deseas eliminar este video de la cola?')) {
      await window.api.removeVideoQueue(id);
      fetchQueue();
    }
  }, []);

  const saveSettings = async () => {
    if (!window.api) return;
    const updated = await window.api.updateVideoReactionSettings({
      cost: parseInt(newCost) || 1000,
      enabled: settings.enabled
    });
    setSettings(updated);
    setShowSettings(false);
  };

  const toggleSystem = async () => {
    if (!window.api) return;
    const updated = await window.api.updateVideoReactionSettings({
      cost: settings.cost,
      enabled: !settings.enabled
    });
    setSettings(updated);
  };

  const pendingItems = useMemo(() => queue.filter(item => item.status !== 'played' && item.status !== 'error'), [queue]);
  const finishedItems = useMemo(() => queue.filter(item => item.status === 'played' || item.status === 'error'), [queue]);

  return (
    <div className={`tab-view ${activeTab === 'reacciones' ? 'active' : ''} flex flex-col gap-md`} style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '16px', display: activeTab === 'reacciones' ? 'flex' : 'none' }}>
      
      {/* HEADER SECTOR */}
      <div className="flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '20px', fontWeight: '700' }}>
            <Film size={22} style={{ color: 'var(--accent)' }} />
            Cola de Video Reacciones
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            {settings.enabled ? '🟢 Sistema Activo' : '🔴 Sistema Desactivado'} • Costo: <b>{settings.cost} pts</b>
          </p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={() => {
            setNewCost(settings.cost);
            setShowSettings(!showSettings);
          }}>
            <Settings size={15} />
            Configurar
          </button>
          <button className="btn btn-ghost" onClick={fetchQueue}>
            <RefreshCw size={15} />
            Refrescar
          </button>
        </div>
      </div>

      {/* CONFIG MODAL OR PANEL */}
      {showSettings && (
        <div className="card flex-col gap-md" style={{ backgroundColor: 'rgba(20, 20, 25, 0.95)', border: '1px solid var(--accent)' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>Configuración del Sistema</h3>
          <div className="flex flex-col gap-sm" style={{ maxWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '12px' }}>
              <label style={{ fontSize: '13px' }}>Habilitar sistema:</label>
              <button 
                className={`btn text-xs ${settings.enabled ? 'btn-success' : 'btn-ghost'}`} 
                onClick={toggleSystem}
                style={{ padding: '4px 12px' }}
              >
                {settings.enabled ? 'Activado' : 'Desactivado'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px' }}>Costo por video (puntos):</label>
              <input 
                type="number" 
                value={newCost}
                onChange={e => setNewCost(e.target.value)}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '6px 10px',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>
          <div className="flex gap-sm mt-sm">
            <button className="btn text-xs" onClick={saveSettings}>Guardar</button>
            <button className="btn btn-ghost text-xs" onClick={() => setShowSettings(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* CONTROLLER SECTOR */}
      {playingItem && (
        <div 
          className="card flex-col gap-md"
          style={{
            borderLeft: '4px solid var(--accent)',
            backgroundColor: 'rgba(var(--accent-rgb), 0.05)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}
        >
          <div className="flex items-center justify-between">
            <div style={{ maxWidth: '75%' }}>
              <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Reproduciendo en el Stream:
              </div>
              <h3 style={{ margin: '4px 0', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {playingItem.title || 'Cargando video...'}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Pedido por: <b>{playingItem.requestedBy}</b>
              </div>
            </div>

            {/* Controles principales */}
            <div className="flex gap-sm">
              <button 
                className={`btn ${isPlaying ? 'btn-ghost' : 'btn-success'}`}
                onClick={handlePauseToggle}
                style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: 0 }}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={handleStop}
                style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: 0, color: '#ef4444' }}
              >
                <Square size={18} />
              </button>
            </div>
          </div>

          {/* Progress Seek Bar (Isolated Component to prevent parent re-renders) */}
          <PlaybackSeekBar />

          {/* Volume control */}
          <div className="flex items-center gap-md" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <Volume2 size={15} />
              <span style={{ fontSize: '12px' }}>Volumen ({Math.round(volume * 100)}%)</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={volume} 
              onChange={handleVolumeChange}
              style={{
                flex: 1,
                height: '4px',
                accentColor: 'var(--accent)',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      )}

      {/* QUEUE COLUMNS SECTOR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* PENDINGS AND READY LIST */}
        <div className="flex flex-col gap-sm">
          <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} style={{ color: 'var(--accent)' }} />
            Videos Pendientes ({pendingItems.length})
          </h3>
          <div className="flex flex-col gap-sm" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
            {pendingItems.length === 0 ? (
              <div className="card text-center" style={{ padding: '24px', opacity: 0.7 }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No hay videos pendientes en cola.</span>
              </div>
            ) : (
              pendingItems.map(item => (
                <div 
                  key={item.id} 
                  className="card flex-row items-center justify-between"
                  style={{
                    padding: '12px',
                    border: playingItem?.id === item.id ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                    backgroundColor: playingItem?.id === item.id ? 'rgba(var(--accent-rgb), 0.03)' : ''
                  }}
                >
                  <div style={{ maxWidth: '70%', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        fontSize: '13px', 
                        fontWeight: '500', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}
                      title={item.title || item.url}
                    >
                      {item.title || 'Descargando información...'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '3px' }}>
                      <span>De: <b>{item.requestedBy}</b></span>
                      <span>•</span>
                      <span style={{ 
                        color: item.status === 'ready' ? '#10b981' : (item.status === 'downloading' ? '#3b82f6' : '#f59e0b') 
                      }}>
                        {item.status === 'ready' ? '✓ Listo' : (item.status === 'downloading' ? '⏳ Descargando' : '⏳ En cola')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-xs">
                    {item.status === 'ready' && (
                      <button 
                        className="btn btn-ghost" 
                        onClick={() => handlePlay(item)}
                        style={{ padding: '6px 10px', color: '#10b981' }}
                        title="Reproducir en Overlay"
                      >
                        <Play size={14} />
                      </button>
                    )}
                    {item.status === 'downloading' && (
                      <button className="btn btn-ghost" disabled style={{ padding: '6px 10px', opacity: 0.5 }}>
                        <Download size={14} className="animate-bounce" />
                      </button>
                    )}
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => handleDelete(item.id)}
                      style={{ padding: '6px 10px', color: '#ef4444' }}
                      title="Eliminar de la cola"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FINISHED AND HISTORY LIST */}
        <div className="flex flex-col gap-sm">
          <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} style={{ color: '#10b981' }} />
            Historial de Reacciones ({finishedItems.length})
          </h3>
          <div className="flex flex-col gap-sm" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
            {finishedItems.length === 0 ? (
              <div className="card text-center" style={{ padding: '24px', opacity: 0.7 }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Aún no se ha reproducido ningún video.</span>
              </div>
            ) : (
              finishedItems.map(item => (
                <div 
                  key={item.id} 
                  className="card flex-row items-center justify-between"
                  style={{
                    padding: '10px 12px',
                    opacity: 0.8,
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ maxWidth: '80%', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        fontSize: '12px', 
                        textDecoration: item.status === 'played' ? 'line-through' : 'none',
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}
                    >
                      {item.title || item.url}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', gap: '6px', marginTop: '2px' }}>
                      <span>Pedidor: <b>{item.requestedBy}</b></span>
                      <span>•</span>
                      <span style={{ color: item.status === 'played' ? 'var(--text-secondary)' : '#ef4444' }}>
                        {item.status === 'played' ? 'Reproducido' : 'Error'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-xs">
                    {item.status === 'played' && item.filePath && (
                      <button 
                        className="btn btn-ghost" 
                        onClick={() => handlePlay(item)}
                        style={{ padding: '4px 8px', color: 'var(--text-secondary)' }}
                        title="Volver a reproducir"
                      >
                        <Play size={12} />
                      </button>
                    )}
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => handleDelete(item.id)}
                      style={{ padding: '4px 8px', color: '#ef4444' }}
                      title="Eliminar del historial"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
});

export default VideoReactionPlayer;

// Componente hijo aislado para controlar la barra de progreso sin re-renderizar todo el reproductor
function PlaybackSeekBar() {
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!window.api) return;

    const handleTimeEvent = (data) => {
      if (data) {
        setPlaybackTime(data.currentTime || 0);
        setDuration(data.duration || 0);
      }
    };

    const handleStopEvent = () => {
      setPlaybackTime(0);
      setDuration(0);
    };

    const unsubTime = window.api.on('video-reaction-time', handleTimeEvent);
    const unsubStop = window.api.on('video-reaction-stop', handleStopEvent);

    return () => {
      if (unsubTime) window.api.off('video-reaction-time', unsubTime);
      if (unsubStop) window.api.off('video-reaction-stop', unsubStop);
    };
  }, []);

  return (
    <div className="flex flex-col gap-xs" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px' }}>
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Progreso: {formatMMSS(playbackTime)} / {formatMMSS(duration)}</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max={duration || 100} 
        step="1"
        value={playbackTime} 
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          setPlaybackTime(val);
          if (window.api) {
            window.api.seekVideoReaction(val);
          }
        }}
        style={{
          width: '100%',
          height: '6px',
          accentColor: 'var(--accent)',
          cursor: 'pointer',
          borderRadius: '3px',
          background: 'rgba(255, 255, 255, 0.1)',
          outline: 'none'
        }}
      />
    </div>
  );
}
