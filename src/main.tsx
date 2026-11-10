import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AikaApp from './app/AikaApp';
import '../app/globals.css';
import 'leaflet/dist/leaflet.css';

const root = document.getElementById('root');
if (!root)
    throw Error('Missing AIKA root element.');
createRoot(root).render(<StrictMode><AikaApp /></StrictMode>);

// Register PWA service worker safely with update detection
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Check if an updated worker is already waiting
        if (registration.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('aika-pwa-update', { detail: registration }));
        }

        // Listen for new workers entering the update cycle
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('aika-pwa-update', { detail: registration }));
              }
            });
          }
        });
      })
      .catch(() => {
        // Safe graceful degradation if service workers are disabled or unsupported
      });
  });
}
