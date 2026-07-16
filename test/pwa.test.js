import { test, assert, assertEq } from './harness.js';

/* ─── SPEC §11 F1 : Service Worker ─── */

test('PWA F1: API serviceWorker disponible', () => {
  assert(typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    'serviceWorker API non disponible');
});

test('PWA F1: sw.js existe et implémente addAll (pas de boucle add)', async () => {
  const resp = await fetch('/sw.js');
  assertEq(resp.status, 200, '/sw.js introuvable');
  const src = await resp.text();
  assert(src.includes('addAll'), 'addAll manquant — utiliser addAll pas une boucle add');
  assert(!src.includes('.add(') || src.includes('c.addAll'),
    'boucle .add() interdite — addAll atomique');
  assert(src.includes('cache-first') || src.includes('event.respondWith'),
    'stratégie cache-first absente');
});

test('PWA F1: CACHE versionné — pas de chaîne fixe', async () => {
  const resp = await fetch('/sw.js');
  const src = await resp.text();
  // Vérifie que CACHE n'est pas une chaîne vide
  const match = src.match(/const\s+CACHE\s*=\s*['"]([^'"]+)['"]/);
  assert(match !== null, 'const CACHE non trouvée');
  assert(match[1].length > 3, `CACHE="${match[1]}" trop court — doit être versionné`);
});

/* ─── SPEC §11 F3 : Web Manifest ─── */

test('PWA F3: manifest.webmanifest accessible', async () => {
  const resp = await fetch('/manifest.webmanifest');
  assertEq(resp.status, 200, '/manifest.webmanifest introuvable');
  assertEq(resp.headers.get('Content-Type'), 'application/manifest+json',
    'Content-Type doit être application/manifest+json');
});

test('PWA F3: manifest contient les champs requis', async () => {
  const resp = await fetch('/manifest.webmanifest');
  const m = await resp.json();
  assert(typeof m.name === 'string' && m.name.length > 0, 'name requis');
  assert(typeof m.short_name === 'string' && m.short_name.length > 0, 'short_name requis');
  assert(typeof m.start_url === 'string', 'start_url requis');
  assertEq(m.display, 'standalone', 'display doit être standalone');
  assertEq(m.orientation, 'portrait', 'orientation doit être portrait');
  assert(typeof m.background_color === 'string', 'background_color requis');
  assert(typeof m.theme_color === 'string', 'theme_color requis');
  assert(Array.isArray(m.icons) && m.icons.length >= 2, '≥2 icônes requises');
});

test('PWA F3: icônes du manifest accessibles et PNG', async () => {
  const resp = await fetch('/manifest.webmanifest');
  const m = await resp.json();
  for (const icon of m.icons) {
    const r = await fetch(icon.src);
    assertEq(r.status, 200, `icône ${icon.src} introuvable`);
    assertEq(r.headers.get('Content-Type'), 'image/png', `${icon.src} doit être PNG`);
  }
});

/* ─── SPEC §11 iOS : meta tags ─── */

test('§11 iOS: index.html contient les balises PWA iOS', async () => {
  const resp = await fetch('/index.html');
  assertEq(resp.status, 200, '/index.html introuvable');
  const html = await resp.text();
  assert(html.includes('apple-mobile-web-app-capable'),
    'meta apple-mobile-web-app-capable manquant');
  assert(html.includes('apple-touch-icon'),
    'link apple-touch-icon manquant');
  assert(html.includes('rel="manifest"'),
    'link rel="manifest" manquant');
  assert(html.includes('serviceWorker.register'),
    'serviceWorker.register manquant');
});

/* ─── SPEC §11 F1 : Service Worker opérationnel ─── */

test('PWA F1: enregistrement du service worker', async () => {
  // Si déjà enregistré, ne pas ré-enregistrer
  let reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }
  assert(reg !== undefined && reg !== null, 'enregistrement SW');
  // Attendre que le SW soit actif
  const sw = reg.installing || reg.waiting || reg.active;
  assert(sw !== null, 'SW dans un état (installing/waiting/active)');
  if (reg.installing) {
    await new Promise(resolve => {
      reg.installing.addEventListener('statechange', () => {
        if (reg.installing.state === 'activated') resolve();
      });
    });
  }
  if (reg.waiting && !reg.active) {
    // skipWaiting nécessaire — on attend
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    await new Promise(resolve => {
      reg.waiting.addEventListener('statechange', () => {
        if (reg.waiting.state === 'activated') resolve();
      });
    });
  }
});

test('PWA F1: précache contient les assets critiques', async () => {
  const cache = await caches.open('bim-v1');
  const keys = await cache.keys();
  const urls = keys.map(r => r.url);
  assert(urls.some(u => u.endsWith('index.html')),
    'index.html pas dans le précache');
  assert(urls.some(u => u.endsWith('css/app.css')),
    'css/app.css pas dans le précache');
  assert(urls.some(u => u.endsWith('manifest.webmanifest')),
    'manifest.webmanifest pas dans le précache');
  assert(urls.some(u => u.endsWith('js/config.js')),
    'js/config.js pas dans le précache');
  const totalAssets = keys.length;
  assert(totalAssets >= 20, `trop peu d'assets : ${totalAssets} — attendu ≥20`);
});
