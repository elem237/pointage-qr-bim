import { test, assert, assertEq } from './harness.js';
import { rang, join, fusion } from '../js/model/lattice.js';
import { idDe } from '../js/model/ident.js';

const D1 = 'a'; // device fixe pour tests déterministes
const D2 = 'b';

/** Fabrique une PointageValue minimale */
function v(generation, statut, tau, mode, device, override) {
  return { generation, statut, tau, mode, device, override };
}

/** Compare deux Maps entrée par entrée */
function mapsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (!vb) return false;
    if (va.generation !== vb.generation) return false;
    if (va.statut !== vb.statut) return false;
    if (va.tau !== vb.tau) return false;
    if (va.mode !== vb.mode) return false;
    if (va.device !== vb.device) return false;
    if (va.override !== vb.override) return false;
  }
  return true;
}

function assertMapsEqual(a, b, msg) {
  assert(mapsEqual(a, b), msg || 'Maps should be equal');
}

// ─── rang ────────────────────────────────────────────────

const k1 = idDe(1); // 'BIM26-001'

test('B1 — rang(null) === null', () => {
  assertEq(rang(null), null);
});

test('B1 — rang(undefined) === null', () => {
  assertEq(rang(undefined), null);
});

test('B1 — rang retourne un tableau de 5 éléments', () => {
  const r = rang(v(0, 'actif', 1000, 'scan', D1, 'auto'));
  assert(Array.isArray(r), 'est un tableau');
  assertEq(r.length, 5, '5 composantes');
});

test('B1 — generation domine : gen 1 gagne sur gen 0 à tau égal', () => {
  const a = v(1, 'actif', 2000, 'scan', D1, 'auto');
  const b = v(0, 'actif', 1000, 'scan', D1, 'auto');
  // rang(a) = [1,0,-2000,0,D1], rang(b) = [0,0,-1000,0,D1] => a gagne
  assertEq(join(a, b), a);
  assertEq(join(b, a), a);
});

test('B1 — à generation égale, annulé gagne sur actif', () => {
  const a = v(1, 'annule', 2000, 'scan', D1, 'auto');
  const b = v(1, 'actif',  1000, 'scan', D1, 'auto');
  // rang(a) = [1,1,-2000,0,D1], rang(b) = [1,0,-1000,0,D1] => a gagne
  assertEq(join(a, b), a);
  assertEq(join(b, a), a);
});

test('B1 — à generation+statut égaux, tau minimal gagne', () => {
  const a = v(0, 'actif',  500, 'scan', D1, 'auto');
  const b = v(0, 'actif', 1000, 'scan', D1, 'auto');
  // rang(a) = [0,0,-500,0,D1], rang(b) = [0,0,-1000,0,D1] => -500 > -1000 => a gagne
  assertEq(join(a, b), a);
  assertEq(join(b, a), a);
});

test('B1 — départage final par device', () => {
  const a = v(0, 'actif', 1000, 'scan', 'a', 'auto');
  const b = v(0, 'actif', 1000, 'scan', 'b', 'auto');
  // cmpRang: 'a' < 'b' → rang(b) plus grand → b gagne
  assertEq(join(a, b), b);
});

// ─── join ────────────────────────────────────────────────

test('B1 — join(null, null) === null', () => {
  assertEq(join(null, null), null);
});

test('B1 — join(null, v) === v', () => {
  const va = v(0, 'actif', 1000, 'scan', D1, 'auto');
  assertEq(join(null, va), va);
  assertEq(join(va, null), va);
});

// ─── Idempotence (propriété §6.2) ────────────────────

test('P6.2.1 — fusion(m, m) === m (idempotence)', () => {
  const m = new Map([
    [k1, v(0, 'actif', 1000, 'scan', D1, 'auto')],
    [idDe(2), v(1, 'annule', 2000, 'manuel', D2, 'matin')],
  ]);
  const r = fusion(m, m);
  assertMapsEqual(r, m, 'fusion(m, m) === m');
});

// ─── Commutativité (propriété §6.2) ──────────────────

test('P6.2.2 — commutativité : fusion(m1, m2) === fusion(m2, m1)', () => {
  const m1 = new Map([
    [k1, v(0, 'actif', 1000, 'scan', D1, 'auto')],
    [idDe(3), v(1, 'annule', 2000, 'scan', D1, 'auto')],
  ]);
  const m2 = new Map([
    [k1, v(1, 'annule', 1500, 'scan', D2, 'auto')],   // generation sup, annule
    [idDe(4), v(0, 'actif', 500, 'manuel', D2, 'midi')],
  ]);
  const a = fusion(m1, m2);
  const b = fusion(m2, m1);
  assertMapsEqual(a, b);
});

// ─── Associativité (propriété §6.2) ──────────────────

test('P6.2.3 — associativité sur 3 états', () => {
  const m1 = new Map([[k1, v(0, 'actif', 1000, 'scan', D1, 'auto')]]);
  const m2 = new Map([[k1, v(1, 'annule', 2000, 'scan', D2, 'auto')]]);
  const m3 = new Map([[k1, v(2, 'actif', 1500, 'manuel', D1, 'matin')]]);
  const gauche = fusion(fusion(m1, m2), m3);
  const droite = fusion(m1, fusion(m2, m3));
  assertMapsEqual(gauche, droite);
});

// ─── Convergence (propriété §6.2) ────────────────────

test('P6.2.4 — convergence : toutes les séquences de fusion donnent le même résultat', () => {
  // 3 états avec différentes clés et valeurs
  const m1 = new Map([
    [k1, v(0, 'actif', 1000, 'scan', D1, 'auto')],
    [idDe(5), v(1, 'annule', 3000, 'scan', D1, 'auto')],
  ]);
  const m2 = new Map([
    [k1, v(1, 'annule', 2000, 'scan', D2, 'auto')],
    [idDe(6), v(0, 'actif', 500, 'manuel', D2, 'midi')],
  ]);
  const m3 = new Map([
    [k1, v(2, 'actif', 1500, 'manuel', D1, 'matin')],
    [idDe(5), v(2, 'actif', 4000, 'scan', D2, 'auto')],
  ]);

  const sequences = [
    () => fusion(fusion(m1, m2), m3),
    () => fusion(fusion(m1, m3), m2),
    () => fusion(fusion(m2, m1), m3),
    () => fusion(fusion(m2, m3), m1),
    () => fusion(fusion(m3, m1), m2),
    () => fusion(fusion(m3, m2), m1),
  ];

  const results = sequences.map(fn => fn());
  for (let i = 1; i < results.length; i++) {
    assertMapsEqual(results[0], results[i], `sequence 0 vs ${i}`);
  }
});

// ─── Non-résurrection (propriété §6.2) ──────────────

test('P6.2.5 — non-résurrection : cancel sur A, fusion avec B non informé → reste annule', () => {
  // État A : generation=1, statut='annule' (cancel a été fait sur A)
  const vA = v(1, 'annule', 2000, 'scan', D1, 'auto');
  // État B : generation=0, statut='actif' (B n'a pas encore fusionné)
  const vB = v(0, 'actif', 1000, 'scan', D2, 'auto');

  const mA = new Map([[k1, vA]]);
  const mB = new Map([[k1, vB]]);

  const r = fusion(mA, mB);
  const result = r.get(k1);
  assertEq(result.statut, 'annule', 'doit rester annule');
  assertEq(result.generation, 1, 'generation 1');
});

// ─── Re-pointage (propriété §6.2) ───────────────────

test('P6.2.6 — re-pointage : reg→cancel→reg sur A, fusion avec B → actif', () => {
  // A a fait reg(g=0)→cancel(g=1)→reg(g=2) → generation=2, statut='actif'
  const vA = v(2, 'actif', 3000, 'scan', D1, 'auto');
  // B n'a que le cancel (g=1, annule) — n'a pas encore fusionné le re-pointage
  const vB = v(1, 'annule', 2000, 'scan', D2, 'auto');

  const mA = new Map([[k1, vA]]);
  const mB = new Map([[k1, vB]]);

  const r = fusion(mA, mB);
  const result = r.get(k1);
  assertEq(result.statut, 'actif', 'doit être actif (re-pointage gagne)');
  assertEq(result.generation, 2, 'generation 2');
});

// ─── Cas limites ─────────────────────────────────────

test('B1 — fusion avec Map vide', () => {
  const m = new Map([[k1, v(0, 'actif', 1000, 'scan', D1, 'auto')]]);
  const vide = new Map();
  assertMapsEqual(fusion(m, vide), m);
  assertMapsEqual(fusion(vide, m), m);
});

test('B1 — clés disjointes : fusion les réunit', () => {
  const m1 = new Map([[k1, v(0, 'actif', 1000, 'scan', D1, 'auto')]]);
  const k2 = idDe(2);
  const m2 = new Map([[k2, v(0, 'actif', 2000, 'scan', D2, 'auto')]]);
  const r = fusion(m1, m2);
  assertEq(r.size, 2);
  assertEq(r.get(k1).tau, 1000);
  assertEq(r.get(k2).tau, 2000);
});
