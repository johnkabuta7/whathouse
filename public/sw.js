// Minimal service worker for PWA installability.
// Network-only for HTML documents: users always see the latest version.
const CACHE = 'pro-immo-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // For navigations and HTML documents: always fetch fresh from network, never cache.
  const acceptsHtml = req.headers.get('accept')?.includes('text/html');
  if (req.mode === 'navigate' || acceptsHtml) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => fetch(req)));
    return;
  }
  // Everything else: pass through to network (Vite handles hashed assets).
});
