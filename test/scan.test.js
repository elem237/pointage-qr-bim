import { test, assert, assertEq } from './harness.js';
import { retenir } from '../js/scan/debounce.js';
import { decode } from '../js/scan/decode.js';
import { startCamera, stopCamera, captureROI, lancerBoucle } from '../js/scan/camera.js';

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
  const img = new ImageData(1, 1);
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
});
