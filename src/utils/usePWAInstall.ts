import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && (window as any).__aurachatDeferredPrompt) {
      return (window as any).__aurachatDeferredPrompt as BeforeInstallPromptEvent;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Platform detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isIOSDevice && !isAndroidDevice);

    // Sync if already captured globally in main.tsx
    if ((window as any).__aurachatDeferredPrompt) {
      setDeferredPrompt((window as any).__aurachatDeferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__aurachatDeferredPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleGlobalPwaReady = () => {
      if ((window as any).__aurachatDeferredPrompt) {
        setDeferredPrompt((window as any).__aurachatDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      (window as any).__aurachatDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('aurachat-pwa-ready', handleGlobalPwaReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('aurachat-pwa-installed', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('aurachat-pwa-ready', handleGlobalPwaReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('aurachat-pwa-installed', handleAppInstalled);
    };
  }, []);

  // Trigger Native Browser PWA / WebAPK Install Prompt (Chrome / Edge / Android / Desktop)
  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    const activePrompt = deferredPrompt || ((window as any).__aurachatDeferredPrompt as BeforeInstallPromptEvent | null);
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          (window as any).__aurachatDeferredPrompt = null;
          setIsInstalled(true);
          setDeferredPrompt(null);
          return 'accepted';
        }
        return 'dismissed';
      } catch {
        return 'dismissed';
      }
    }
    return 'unsupported';
  };

  // Fast error-free installation for Android (triggers native WebAPK or downloads working HTML5 Instant App Launcher)
  const downloadApk = async (): Promise<'native_installed' | 'launcher_downloaded'> => {
    const res = await promptInstall();
    if (res === 'accepted') {
      return 'native_installed';
    }

    const appOrigin = window.location.origin;
    const launcherHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#0e1621" />
  <title>AuraChat</title>
  <link rel="icon" href="${appOrigin}/pwa-192x192.png" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #0e1621; color: #fff; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
    .loader { width: 56px; height: 56px; border-radius: 50%; border: 4px solid rgba(0, 119, 255, 0.25); border-top-color: #0077ff; animation: spin 0.8s linear infinite; margin-bottom: 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    iframe { position: fixed; inset: 0; width: 100%; height: 100%; border: none; z-index: 10; }
  </style>
</head>
<body>
  <div class="loader"></div>
  <div style="font-weight:700;font-size:16px;">Запуск AuraChat...</div>
  <script>
    window.location.replace("${appOrigin}/?standalone=1");
  </script>
</body>
</html>`;

    const blob = new Blob([launcherHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AuraChat-App.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return 'launcher_downloaded';
  };

  // Fast error-free installation for Desktop (triggers native PWA or downloads working Desktop Shortcut)
  const downloadDesktopInstaller = async (): Promise<'native_installed' | 'shortcut_downloaded'> => {
    const res = await promptInstall();
    if (res === 'accepted') {
      return 'native_installed';
    }

    const shortcutContent = `[InternetShortcut]\r\nURL=${window.location.origin}/?standalone=1\r\nIconIndex=0\r\n`;
    const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AuraChat.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return 'shortcut_downloaded';
  };

  return {
    isInstallable: Boolean(deferredPrompt || (typeof window !== 'undefined' && (window as any).__aurachatDeferredPrompt)),
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    promptInstall,
    downloadApk,
    downloadDesktopInstaller
  };
}
