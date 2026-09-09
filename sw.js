const CACHE = 'bim-v15';

const ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/print.css',
  './js/config.js',
  './js/data.js',
  './js/main.js',
  './js/badges.js',
  './js/feedback.js',
  './js/db/store.js',
  './js/db/backup.js',
  './js/model/norm.js',
  './js/model/absences.js',
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
  self.skipWaiting();
  // `{ cache: 'reload' }` : contourne le cache HTTP du navigateur. Sans ça,
  // les assets servis avec `max-age=86400` peuvent être précachés PÉRIMÉS
  // (vieux bytes sous le nouveau nom de cache) — mise à jour fantôme,
  // constatée sur Android. addAll reste atomique (tout-ou-rien).
  event.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(r => {
      if (r) return r;
      if (event.request.mode === 'navigate') return caches.match('./index.html');
      // Cache-first STRICT (Invariant 9.2) : aucun repli réseau.
      return Response.error();
    })
  );
});
