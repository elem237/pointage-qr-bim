import { test, assert, assertEq } from './harness.js';
import { idDe, checksum, payload, valider, IDS_CONNUS, CHECKSUMS, precalcChecksums } from '../js/model/ident.js';
import { PARTICIPANTS } from '../js/data.js';
import { getConfig } from '../js/config.js';

// ─── A2 — idDe ──────────────────────────────────────────

test('A2 — idDe(1) === "BIM26-001"', () => {
  assertEq(idDe(1), 'BIM26-001');
});

test('A2 — idDe(16) === "BIM26-016"', () => {
  assertEq(idDe(16), 'BIM26-016');
});

test('A2 — injective sur les 16 participants', () => {
  const ids = new Set(PARTICIPANTS.map(p => idDe(p.numero)));
  assertEq(ids.size, 16);
});

// ─── A3 — checksum ──────────────────────────────────────

test('A3 — checksum("BIM26-001") retourne une string de 2 caractères Base32', async () => {
  const ck = await checksum('BIM26-001');
  assert(typeof ck === 'string', 'type string');
  assertEq(ck.length, 2, 'longueur 2');
  assert(/^[A-Z2-7]{2}$/.test(ck), `caractères Base32, got "${ck}"`);
});

test('A3 — checksum("BIM26-999") ne lève pas (id valide hors domaine)', async () => {
  const ck = await checksum('BIM26-999');
  assert(typeof ck === 'string', 'type string');
  assertEq(ck.length, 2);
});

test('A3 — checksum est déterministe', async () => {
  const a = await checksum('BIM26-007');
  const b = await checksum('BIM26-007');
  assertEq(a, b);
});

test('A3 — taux de détection ≥ 99,9 % (propriété §A3)', async () => {
  // Pré-calculer les checksums réels
  await precalcChecksums();
  const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let fauxPositifs = 0;
  const N = 10000;
  for (let i = 0; i < N; i++) {
    const n = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const id = 'BIM26-' + n;
    const k1 = BASE32[Math.floor(Math.random() * 32)];
    const k2 = BASE32[Math.floor(Math.random() * 32)];
    const w = id + '-' + k1 + k2;
    if (valider(w) === 'ok') fauxPositifs++;
  }
  assert(fauxPositifs < 20, `faux positifs: ${fauxPositifs} < 20`);
});

// ─── A4 — payload ───────────────────────────────────────

test('A4 — payload("BIM26-001") retourne "BIM26-001-XX"', async () => {
  const p = await payload('BIM26-001');
  assert(/^BIM26-001-[A-Z2-7]{2}$/.test(p), `format: "${p}"`);
});

test('A4 — valider(payload(id)) === "ok" pour les 16 ids', async () => {
  await precalcChecksums();
  for (const p of PARTICIPANTS) {
    const id = idDe(p.numero);
    const pay = await payload(id);
    assertEq(valider(pay), 'ok', `${id} → ${pay}`);
  }
});

// ─── A4 — valider : cas d'erreur ────────────────────────

test('A4 — valider("BIM26-001-AA") === "checksum" (id connu, mauvais checksum)', async () => {
  await precalcChecksums();
  assertEq(valider('BIM26-001-AA'), 'checksum');
});

test('A4 — valider("BIM26-999-ZZ") === "inconnu" (id hors domaine, §P4 ordre des gardes)', async () => {
  await precalcChecksums();
  assertEq(valider('BIM26-999-ZZ'), 'inconnu');
});

test('A4 — valider("XXXX") === "format"', () => {
  assertEq(valider('XXXX'), 'format');
});

test('A4 — valider("BIM26-001") === "format" (pas de checksum)', () => {
  assertEq(valider('BIM26-001'), 'format');
});

test('A4 — valider("BIM26-001-ABC") === "format" (checksum trop long)', () => {
  assertEq(valider('BIM26-001-ABC'), 'format');
});

test('A4 — ordre des gardes (§P4) : id inconnu testé avant checksum', async () => {
  await precalcChecksums();
  // "BIM26-999-ZZ" : format ok, id inconnu → 'inconnu', pas 'checksum'
  assertEq(valider('BIM26-999-ZZ'), 'inconnu');
  // "BIM26-001-ZZ" : id connu, mauvais checksum → 'checksum'
  assertEq(valider('BIM26-001-ZZ'), 'checksum');
});

test('A4 — valider reste synchrone (n\'est pas async)', () => {
  const r = valider('BIM26-001-AA');
  assert(typeof r === 'string', 'retour synchrone');
});
