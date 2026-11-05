import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Capture beforeinstallprompt early before React components mount
if (typeof window !== 'undefined') {
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
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
