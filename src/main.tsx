import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Chatix error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#141414',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            padding: '32px',
            backgroundColor: '#1e1e20',
            borderRadius: '16px',
            border: '1px solid #2e2e30',
            maxWidth: '480px',
            width: '100%'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Chatix</h2>
            <p style={{ fontSize: '14px', color: '#939393', marginBottom: '20px', lineHeight: '1.5' }}>
              Произошла ошибка при загрузке данных. Нажмите кнопку ниже для перезапуска приложения.
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch {}
                window.location.reload();
              }}
              style={{
                backgroundColor: '#0077FF',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Перезапустить Chatix
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

if (typeof window !== 'undefined') {
  // Capture beforeinstallprompt early for 1-click PWA install
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).__chatixDeferredPrompt = e;
    window.dispatchEvent(new CustomEvent('chatix-pwa-ready'));
  });

  window.addEventListener('appinstalled', () => {
    (window as any).__chatixDeferredPrompt = null;
    window.dispatchEvent(new CustomEvent('chatix-pwa-installed'));
  });

  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
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

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
