const CACHE = 'bim-v5';

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

async function remplirCache(cache, urls) {
  const result = { total: urls.length, reussi: 0, echecs: [] };
  await Promise.allSettled(urls.map(url =>
    fetch(url).then(r => {
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      return cache.put(url, r);
    }).catch(err => { result.echecs.push(err.message); })
  ));
  result.reussi = urls.length - result.echecs.length;
  return result;
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const resultat = await remplirCache(cache, ASSETS);
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) {
        c.postMessage({ type: 'SW_CACHE', ...resultat });
      }
    })()
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
      return fetch(event.request);
    })
  );
});
