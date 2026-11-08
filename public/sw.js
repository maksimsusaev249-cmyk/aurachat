// Lightweight Fast-Install PWA Service Worker (Zero Stale Cache + Background Push & Call Notifications)
const SW_VERSION = 'chatix-fast-v4';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through network fetch to satisfy PWA installability without breaking JS/CSS modules
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});

// Background Push Notification handler (works when app is in background or closed)
self.addEventListener('push', (event) => {
  try {
    let data = { title: 'Chatix', body: 'Новое уведомление', url: '/' };
    if (event.data) {
      try {
        data = event.data.json();
      } catch {
        data.body = event.data.text();
      }
    }
    const isCall = data.type === 'call' || data.isCall;
    const title = data.title || (isCall ? '📞 Входящий звонок Chatix' : '💬 Chatix');
    const options = {
      body: data.body || 'Новое сообщение',
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: isCall ? [500, 200, 500, 200, 500] : [200, 100, 200],
      tag: isCall ? 'chatix_call' : 'chatix_msg',
      renotify: true,
      requireInteraction: isCall,
      data: {
        url: data.url || '/',
        callId: data.callId
      }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('ServiceWorker push error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
