const APP_VERSION = '1.1.2';
const CACHE = `qurban-app-v${APP_VERSION}`;

const STATIC_ASSETS = [
  '/',



  '/index.html',
  '/manifest.json',







  '/src/css/app.css',
  '/src/js/supabase.js',
  '/src/js/store.js',
  '/src/js/components.js',
  '/src/js/router.js',
  '/src/js/charts.js',
  '/src/js/app.js',
  '/src/components/sidebar.html',
  '/src/components/bottom-nav.html',
  '/src/components/transaction-form.html',
  '/src/pages/login.html',
  '/src/pages/dashboard.html',
  '/src/pages/coa.html',
  '/src/pages/transactions.html',
  '/src/pages/fixed-expenses.html',
  '/src/pages/profile.html',
  '/src/pages/input-transaction.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.x.x/dist/cdn.min.js'
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