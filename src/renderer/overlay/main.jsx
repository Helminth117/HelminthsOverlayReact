import React from 'react';
import ReactDOM from 'react-dom/client';
import OverlayApp from './OverlayApp';
import './styles/overlay.css';

window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.log("GLOBAL ERROR:", msg, lineNo, columnNo, error);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OverlayApp />
  </React.StrictMode>
);
