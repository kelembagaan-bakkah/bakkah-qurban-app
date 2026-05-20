const APP_VERSION = '1.0.5';
const CACHE = `qurban-app-v${APP_VERSION}`;

const STATIC_ASSETS = [
  '/',
  `/index.html?v=${APP_VERSION}`,
  `/app.js?v=${APP_VERSION}`,
  `/styles.css?v=${APP_VERSION}`,
  '/manifest.json',
  '/assets/ic-kepala.png',
  '/assets/ic-kaki.png',
  '/assets/ic-ekor.png',
  '/assets/ic-sapi.png',
  '/assets/ic-kambing.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS.concat(CDN_ASSETS)).catch((err) => {
        console.warn('SW: Some assets failed to cache', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Google Apps Script API — network only (no cache)
  if (url.hostname === 'script.google.com') {
    return;
  }

  // HTML — Network First agar selalu dapat versi terbaru
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // CDN — Network First
  if (url.hostname === 'cdn.tailwindcss.com' ||
      url.hostname === 'cdn.jsdelivr.net' ||
      url.hostname === 'unpkg.com') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // JS/CSS — Stale While Revalidate
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
          return response;
        });
        return cached || fetched;
      })
    );
    return;
  }

  // Images — Cache First
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Default — Network First
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});