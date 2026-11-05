// Lightweight Fast-Install PWA Service Worker (Zero Stale Cache)
const SW_VERSION = 'aurachat-fast-v3';

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
