// Hi Fi PDF Tool Kit — Service Worker
const CACHE_NAME = 'hifi-pdf-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/tool.html',
  '/compress-pdf-to.html',
  '/css/styles.css',
  '/js/tools-config.js',
  '/js/app.js',
  '/js/ui-components.js',
  '/js/pdf-engine.js',
  '/js/seo-engine.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then(r => r || new Response('Offline', { status: 503 })))
  );
});
