import { test, assert, assertEq } from './harness.js';

/* ─── D1 : netlify.toml existe ─── */

test('D1: netlify.toml existe et contient [build]', async () => {
  const resp = await fetch('/netlify.toml');
  assertEq(resp.status, 200, '/netlify.toml introuvable');
  const text = await resp.text();
  assert(text.includes('[build]'), 'section [build] manquante');
  assert(text.includes('publish = "."'), 'publish doit être "."');
});

/* ─── D2 : Content-Type du manifest ─── */

test('D2: netlify.toml définit Content-Type pour manifest.webmanifest', async () => {
  const resp = await fetch('/netlify.toml');
  const text = await resp.text();
  const idx = text.indexOf('/manifest.webmanifest');
  assert(idx !== -1, 'en-tête pour /manifest.webmanifest manquant');
  const after = text.slice(idx);
  assert(after.includes('Content-Type'), 'Content-Type manquant pour manifest');
  assert(after.includes('application/manifest+json'),
    'Content-Type doit être application/manifest+json');
});

/* ─── D3/D4 : SW headers ─── */

test('D3: netlify.toml définit Service-Worker-Allowed: / pour sw.js', async () => {
  const resp = await fetch('/netlify.toml');
  const text = await resp.text();
  const idx = text.indexOf('/sw.js');
  assert(idx !== -1, 'en-tête pour /sw.js manquant');
  const after = text.slice(idx);
  assert(after.includes('Service-Worker-Allowed'),
    'Service-Worker-Allowed manquant pour sw.js');
  assert(after.includes('Service-Worker-Allowed = "/"'),
    'Service-Worker-Allowed doit être "/"');
});

test('D4: netlify.toml définit Cache-Control: no-cache pour sw.js', async () => {
  const resp = await fetch('/netlify.toml');
  const text = await resp.text();
  const idx = text.indexOf('/sw.js');
  assert(idx !== -1, 'en-tête pour /sw.js manquant');
  const after = text.slice(idx);
  assert(after.includes('Cache-Control'), 'Cache-Control manquant pour sw.js');
  assert(after.includes('no-cache'), 'Cache-Control doit être no-cache');
});

/* ─── D5 : Redirect SPA ─── */

test('D5: netlify.toml définit redirect /* → /index.html', async () => {
  const resp = await fetch('/netlify.toml');
  const text = await resp.text();
  assert(text.includes('[[redirects]]'), 'section [[redirects]] manquante');
  const after = text.slice(text.indexOf('[[redirects]]'));
  assert(after.includes('from = "/*"'), 'from doit être "/*"');
  assert(after.includes('to = "/index.html"'), 'to doit être "/index.html"');
  assert(after.includes('status = 200'), 'status doit être 200');
});

/* ─── D6 : Headers de sécurité ─── */

test('D6: netlify.toml définit X-Frame-Options: DENY', async () => {
  const resp = await fetch('/netlify.toml');
  const text = await resp.text();
  const idx = text.indexOf('for = "/*"');
  assert(idx !== -1, 'en-tête pour "/*" manquant');
  const after = text.slice(idx, text.indexOf('[[', idx + 1) > 0
    ? text.indexOf('[[', idx + 1) : text.length);
  assert(after.includes('X-Frame-Options'), 'X-Frame-Options manquant');
  assert(after.includes('DENY'), 'X-Frame-Options doit être DENY');
  assert(after.includes('X-Content-Type-Options'), 'X-Content-Type-Options manquant');
  assert(after.includes('nosniff'), 'X-Content-Type-Options doit être nosniff');
});

/* ─── D7 : Chemins relatifs dans sw.js ─── */

test('D7: sw.js utilise ./ pour les chemins (compatible Netlify + GH Pages)', async () => {
  const resp = await fetch('/sw.js');
  const text = await resp.text();
  const lines = text.split('\n');
  const inAssets = lines.findIndex(l => l.includes("'./'"));
  assert(inAssets !== -1, './ manquant dans ASSETS');
  const assetLines = lines.filter(l => l.includes("./'") || l.includes("./js"));
  assert(assetLines.length >= 5, `trop peu de chemins ./ : ${assetLines.length}`);
  const hasAbsolute = lines.some(l => l.match(/['"]\/[^/.]/));
  assert(!hasAbsolute, 'chemins absolus / interdits dans sw.js — utiliser ./');
});

/* ─── D8 : Pas de package.json versionné ─── */

test('D8: Aucun package.json ou node_modules (interdit npm install)', async () => {
  const resp = await fetch('/package.json');
  // 404 attendu — package.json n'est pas versionné
  assertEq(resp.status, 404,
    'package.json ne doit PAS exister dans le dépôt');
});

/* ─── D9 : manifest start_url accessible ─── */

test('D9: start_url du manifest pointe vers index.html accessible', async () => {
  const resp = await fetch('/manifest.webmanifest');
  const m = await resp.json();
  assert(typeof m.start_url === 'string', 'start_url requis');
  const url = m.start_url;
  const pageResp = await fetch(url);
  assertEq(pageResp.status, 200,
    `start_url "${url}" → ${pageResp.status} (attendu 200)`);
  const html = await pageResp.text();
  assert(html.includes('serviceWorker.register'),
    `start_url "${url}" doit contenir l"enregistrement SW`);
});
