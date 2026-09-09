import { test, assert, assertEq } from './harness.js';
import { retenir } from '../js/scan/debounce.js';
import { decode, _resetDetector } from '../js/scan/decode.js';
import { startCamera, stopCamera, captureROI, lancerBoucle, sansChevauchement, onStreamEnded } from '../js/scan/camera.js';

test('C4 — retenir : première occurrence → vrai', () => {
  const H = new Map();
  assert(retenir('A', 1000, H) === true);
});

test('C4 — retenir : répétition dans les 3s → faux', () => {
  const H = new Map();
  retenir('A', 1000, H);
  assert(retenir('A', 1100, H) === false);
});

test('C4 — retenir : après 3s → vrai', () => {
  const H = new Map();
  retenir('A', 1000, H);
  assert(retenir('A', 5000, H) === true);
});

test('C4 — retenir : clés différentes indépendantes', () => {
  const H = new Map();
  retenir('A', 1000, H);
  assert(retenir('B', 1100, H) === true);
});

test('C4 — 20 détections en 2s → 1 seul appel reg', () => {
  const H = new Map();
  const t0 = 1000;
  let count = 0;
  for (let i = 0; i < 20; i++) {
    if (retenir('A', t0 + i * 100, H)) count++;
  }
  assertEq(count, 1, '20 détections du même code en 2s → 1 seul vrai');
});

test('C4 — retenir : exactement 3000ms → vrai', () => {
  const H = new Map();
  retenir('A', 1000, H);
  assert(retenir('A', 4000, H) === true, 't - dernier = 3000 → vrai');
});

test('C4 — retenir : juste sous 3000ms → faux', () => {
  const H = new Map();
  retenir('A', 1000, H);
  assert(retenir('A', 3999, H) === false, 't - dernier = 2999 → faux');
});

test('C2 — decode(bruit) → null', async () => {
  // Objet minimal au lieu d'ImageData (absent de Node) : decode ne lit
  // que data/width/height — fonctionne aussi dans le navigateur.
  const img = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
  const result = await decode(img);
  assert(result === null, 'decode(1×1 noise) doit retourner null');
});

test('C2 — decode exporte une fonction', () => {
  assert(typeof decode === 'function');
});

test('C1 — camera exporte les fonctions attendues', () => {
  assert(typeof startCamera === 'function');
  assert(typeof stopCamera === 'function');
  assert(typeof captureROI === 'function');
  assert(typeof lancerBoucle === 'function');
  assert(typeof sansChevauchement === 'function');
  assert(typeof onStreamEnded === 'function');
});

function fauxCanvas() {
  const appels = { draw: 0, get: [] };
  return {
    appels,
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: () => { appels.draw++; },
      getImageData: (x, y, w, h) => { appels.get.push([w, h]); return { width: w, height: h }; },
    }),
  };
}

/* ── ROI plafonnée (fluidité Android) : testable sans DOM via mocks ── */

test('ROI — grande vidéo 1280×720 : décodage plafonné à 240 px', async () => {
  const { captureROI, ROI_DECODE_MAX } = await import('../js/scan/camera.js');
  const canvas = fauxCanvas();
  captureROI({ videoWidth: 1280, videoHeight: 720 }, canvas);
  assertEq(canvas.width, ROI_DECODE_MAX);
  assertEq(canvas.height, ROI_DECODE_MAX);
  assertEq(canvas.appels.get[0][0], ROI_DECODE_MAX);
});

test('ROI — petite vidéo 320×240 : taille réelle conservée (120 px)', async () => {
  const { captureROI } = await import('../js/scan/camera.js');
  const canvas = fauxCanvas();
  captureROI({ videoWidth: 320, videoHeight: 240 }, canvas);
  assertEq(canvas.width, 120);
  assertEq(canvas.height, 120);
});

test('ROI — pas de redimensionnement si taille identique', async () => {
  const { captureROI } = await import('../js/scan/camera.js');
  const canvas = fauxCanvas();
  const video = { videoWidth: 640, videoHeight: 480 };
  captureROI(video, canvas);
  const w1 = canvas.width;
  let resizes = 0;
  Object.defineProperty(canvas, 'width', {
    get() { return w1; },
    set() { resizes++; },
  });
  captureROI(video, canvas);
  assertEq(resizes, 0, 'aucune réassignation');
});

test('ROI — vidéo sans image (0×0) → null, pas d\u2019exception', async () => {
  const { captureROI } = await import('../js/scan/camera.js');
  const canvas = fauxCanvas();
  // Avant : getImageData(0,0,0,0) levait et tuait la boucle en silence total.
  assertEq(captureROI({ videoWidth: 0, videoHeight: 0 }, canvas), null);
  assertEq(captureROI({ videoWidth: 640, videoHeight: 0 }, canvas), null);
});

/* ── Anti-chevauchement (lenteur Android) ── */

test('Garde — onFrame synchrone : toutes les trames acceptées', () => {
  let n = 0;
  const garde = sansChevauchement(() => { n++; });
  assertEq(garde(null), true);
  assertEq(garde(null), true);
  assertEq(garde(null), true);
  assertEq(n, 3);
});

test('Garde — onFrame async : 2e trame sautée tant que la 1re tourne', async () => {
  let n = 0;
  let liberer;
  const enCours = new Promise(res => { liberer = res; });
  const garde = sansChevauchement(() => { n++; return enCours; });
  assertEq(garde(null), true, '1re acceptée');
  assertEq(garde(null), false, '2e sautée (décodage en cours)');
  assertEq(garde(null), false, '3e sautée');
  assertEq(n, 1, 'onFrame appelé 1 seule fois');
  liberer();
  await enCours;
  await Promise.resolve();
  assertEq(garde(null), true, 'acceptée après fin du décodage');
  assertEq(n, 2);
});

test('Garde — un rejet libère la garde (pas de blocage définitif)', async () => {
  const garde = sansChevauchement(() => Promise.reject(new Error('boom')));
  assertEq(garde(null), true);
  await Promise.resolve();
  await new Promise(res => setTimeout(res, 0));
  assertEq(garde(null), true, 'garde libérée après rejet');
});

test('Garde — une exception synchrone ne bloque pas la boucle', () => {
  const garde = sansChevauchement(() => { throw new Error('sync'); });
  assertEq(garde(null), true);
  assertEq(garde(null), true);
});

/* ── Détecteur singleton (fuite mémoire Android) ── */

test('C2 — BarcodeDetector construit 1 seule fois pour N décodages', async () => {
  let constructions = 0;
  globalThis.BarcodeDetector = class {
    constructor() { constructions++; }
    async detect() { return []; }
  };
  try {
    _resetDetector();
    // ImageData n'existe pas en Node : objet minimal (decode ne lit que data/width/height).
    const img = { data: new Uint8ClampedArray(16), width: 2, height: 2 };
    assertEq(await decode(img), null);
    assertEq(await decode(img), null);
    assertEq(await decode(img), null);
    assertEq(constructions, 1, '1 seul BarcodeDetector');
  } finally {
    delete globalThis.BarcodeDetector;
    _resetDetector();
  }
});

test('C2 — decode bloqué (natif muet) rend null après timeout', async () => {
  globalThis.BarcodeDetector = class {
    async detect() { return new Promise(() => {}); } // ne se termine jamais
  };
  try {
    _resetDetector();
    const img = { data: new Uint8ClampedArray(16), width: 2, height: 2 };
    const t0 = Date.now();
    assertEq(await decode(img, 30), null, 'timeout → null');
    assert(Date.now() - t0 < 1000, 'rend la main vite');
  } finally {
    delete globalThis.BarcodeDetector;
    _resetDetector();
  }
});

test('Garde — promesse qui ne se termine jamais : sécurité libère', async () => {
  const garde = sansChevauchement(() => new Promise(() => {}), 20);
  assertEq(garde(null), true);
  assertEq(garde(null), false, 'bloqué juste après');
  await new Promise(res => setTimeout(res, 50));
  assertEq(garde(null), true, 'libéré par la sécurité');
});
