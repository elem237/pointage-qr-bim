const CACHE = 'bim-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/config.js',
  './js/data.js',
  './js/main.js',
  './js/badges.js',
  './js/feedback.js',
  './js/db/store.js',
  './js/db/backup.js',
  './js/model/norm.js',
  './js/model/ident.js',
  './js/model/lattice.js',
  './js/model/slots.js',
  './js/model/report.js',
  './js/scan/camera.js',
  './js/scan/decode.js',
  './js/scan/debounce.js',
  './js/scan/pipeline.js',
  './js/ui/screen-scan.js',
  './js/ui/screen-list.js',
  './js/ui/screen-report.js',
  './js/ui/screen-setup.js',
  './vendor/jsqr.js',
  './vendor/qrcode.js',
  './assets/logos.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
