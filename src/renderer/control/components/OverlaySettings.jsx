import React, { useState } from 'react';
import WidgetsSettings from './settings/WidgetsSettings';
import DesignSettings from './settings/DesignSettings';
import AudioSettings from './settings/AudioSettings';
import IntegrationsSettings from './settings/IntegrationsSettings';
import OverlayTemplatesSettings from './settings/OverlayTemplatesSettings';

const OverlaySettings = React.memo(function OverlaySettings({
  activeTab,
  config,
  saveConfig,
  showSaved,
  audioDevices,
  refreshAudioDevices
}) {
  const [activeSubTab, setActiveSubTab] = useState('widgets');



  return (
    <div className={`tab-view ${activeTab === 'settings' ? 'active' : ''}`}>
      {/* Subtabs Navigation */}
      <nav className="sub-tabs">
        <button className={`sub-tab-btn ${activeSubTab === 'widgets' ? 'active' : ''}`} onClick={() => setActiveSubTab('widgets')}>🧱 Widgets</button>
        <button className={`sub-tab-btn ${activeSubTab === 'diseno' ? 'active' : ''}`} onClick={() => setActiveSubTab('diseno')}>🎨 Diseño</button>
        <button className={`sub-tab-btn ${activeSubTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveSubTab('audio')}>🔊 Audio</button>
        <button className={`sub-tab-btn ${activeSubTab === 'integraciones' ? 'active' : ''}`} onClick={() => setActiveSubTab('integraciones')}>🔌 Integraciones</button>
        <button className={`sub-tab-btn ${activeSubTab === 'plantillas' ? 'active' : ''}`} onClick={() => setActiveSubTab('plantillas')}>💾 Plantillas</button>
      </nav>

      {/* Render Active Subtab Component */}
      {activeSubTab === 'widgets' && (
        <WidgetsSettings config={config} saveConfig={saveConfig} />
      )}
      {activeSubTab === 'diseno' && (
        <DesignSettings config={config} saveConfig={saveConfig} />
      )}
      {activeSubTab === 'audio' && (
        <AudioSettings
          config={config}
          saveConfig={saveConfig}
          audioDevices={audioDevices}
          refreshAudioDevices={refreshAudioDevices}
        />
      )}
      {activeSubTab === 'integraciones' && (
        <IntegrationsSettings
          config={config}
          saveConfig={saveConfig}
          showSaved={showSaved}
        />
      )}
      {activeSubTab === 'plantillas' && (
        <OverlayTemplatesSettings
          config={config}
          saveConfig={saveConfig}
        />
      )}
    </div>
  );
});

export default OverlaySettings;
