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

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      localStorage.getItem('aurachat_easy_installed') === 'true';
    return isStandalone;
  });

  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isIOSDevice && !isAndroidDevice);

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
      localStorage.setItem('aurachat_easy_installed', 'true');
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

  // 1-Click Easy Install: tries native PWA prompt first, otherwise activates instant standalone mode
  const promptInstall = async (): Promise<'accepted' | 'instant_activated'> => {
    const activePrompt =
      deferredPrompt || ((window as any).__aurachatDeferredPrompt as BeforeInstallPromptEvent | null);
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          (window as any).__aurachatDeferredPrompt = null;
          localStorage.setItem('aurachat_easy_installed', 'true');
          setIsInstalled(true);
          setDeferredPrompt(null);
          return 'accepted';
        }
      } catch {}
    }

    // Instant in-place activation without needing external package parsers
    localStorage.setItem('aurachat_easy_installed', 'true');
    setIsInstalled(true);
    return 'instant_activated';
  };

  // Download self-launching HTML shortcut (works even when JS is restricted via meta refresh + direct button)
  const downloadApk = async (): Promise<'native_installed' | 'launcher_downloaded'> => {
    const activePrompt =
      deferredPrompt || ((window as any).__aurachatDeferredPrompt as BeforeInstallPromptEvent | null);
    if (activePrompt) {
      const res = await promptInstall();
      if (res === 'accepted') return 'native_installed';
    }

    const appUrl = window.location.origin;
    const launcherHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=${appUrl}/" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>AuraChat — Быстрый запуск</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 24px; width: 100%; height: 100%; background: #0e1621; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .card { max-width: 360px; width: 100%; background: #17212b; border: 1px solid #243344; border-radius: 24px; padding: 28px 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .logo { width: 72px; height: 72px; border-radius: 20px; background: linear-gradient(135deg, #2aabee, #0077ff); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; color: #fff; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0 0 20px; font-size: 13px; color: #94a3b8; line-height: 1.4; }
    .btn { display: block; width: 100%; padding: 14px 20px; border-radius: 14px; background: linear-gradient(90deg, #0077ff, #2aabee); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 8px 20px rgba(0,119,255,0.35); }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">A</div>
    <h1>AuraChat v2.5</h1>
    <p>Нажмите кнопку ниже для мгновенного входа в приложение:</p>
    <a class="btn" href="${appUrl}/">🚀 Открыть AuraChat</a>
  </div>
  <script>
    window.location.href = "${appUrl}/";
  </script>
</body>
</html>`;

    const blob = new Blob([launcherHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AuraChat-Start.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    localStorage.setItem('aurachat_easy_installed', 'true');
    setIsInstalled(true);
    return 'launcher_downloaded';
  };

  const downloadDesktopInstaller = async (): Promise<'native_installed' | 'shortcut_downloaded'> => {
    const activePrompt =
      deferredPrompt || ((window as any).__aurachatDeferredPrompt as BeforeInstallPromptEvent | null);
    if (activePrompt) {
      const res = await promptInstall();
      if (res === 'accepted') return 'native_installed';
    }

    const shortcutContent = `[InternetShortcut]\r\nURL=${window.location.origin}/\r\n`;
    const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AuraChat.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    localStorage.setItem('aurachat_easy_installed', 'true');
    setIsInstalled(true);
    return 'shortcut_downloaded';
  };

  return {
    isInstallable: Boolean(
      deferredPrompt || (typeof window !== 'undefined' && (window as any).__aurachatDeferredPrompt)
    ),
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    promptInstall,
    downloadApk,
    downloadDesktopInstaller
  };
}
