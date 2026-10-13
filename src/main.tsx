import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AikaApp from './app/AikaApp';
import '../app/globals.css';
import 'leaflet/dist/leaflet.css';
const root = document.getElementById('root');
if (!root)
    throw Error('Missing AIKA root element.');
createRoot(root).render(<StrictMode><AikaApp /></StrictMode>);

// Register PWA service worker safely for offline shell support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {
        // Safe graceful degradation if service workers are disabled or unsupported
      });
  });
}
