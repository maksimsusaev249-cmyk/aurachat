import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  // Clear any stale CacheStorage that could block app startup
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    }).catch(() => {});
  }

  // Capture beforeinstallprompt early for 1-click PWA install
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).__aurachatDeferredPrompt = e;
    window.dispatchEvent(new CustomEvent('aurachat-pwa-ready'));
  });

  window.addEventListener('appinstalled', () => {
    (window as any).__aurachatDeferredPrompt = null;
    window.dispatchEvent(new CustomEvent('aurachat-pwa-installed'));
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch(() => {});
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
