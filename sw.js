/* Service Worker — Agenda de Retirada */
const CACHE_VERSION = 'agenda-v1.0.0';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './icon-512.svg',
  './icon-maskable.svg'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Erro install:', err))
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n.startsWith('agenda-') && n !== CACHE_STATIC && n !== CACHE_DYNAMIC)
        .map(n => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Recursos externos (Google Fonts etc)
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_DYNAMIC).then(c => c.put(request, clone));
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // Navegação — network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_STATIC).then(c => c.put(request, clone));
        return res;
      }).catch(() =>
        caches.match(request).then(c => c || caches.match('./offline.html'))
      )
    );
    return;
  }

  // Assets — cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_DYNAMIC).then(c => c.put(request, clone));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
