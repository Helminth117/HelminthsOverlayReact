import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../assets/app.css';

function ActivationApp() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleActivate = async () => {
    if (!code) return;
    if (window.api) {
      const res = await window.api.activateLicense(code);
      if (res.success) {
        // App restarts or continues internally
      } else {
        setError('Código inválido o expirado.');
      }
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center text-white p-8">
      <div className="text-center w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4 text-accent">StreamOverlay Pro</h1>
        <p className="text-white/60 mb-8">Por favor ingresa tu licencia para continuar.</p>
        <input 
          type="text" 
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-center mb-4 focus:border-accent outline-none font-mono" 
          placeholder="XXXX-XXXX-XXXX-XXXX" 
        />
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <button 
          onClick={handleActivate}
          className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Activar
        </button>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ActivationApp />
  </React.StrictMode>
);
