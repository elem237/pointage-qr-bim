import { test, assert, assertEq } from './harness.js';
import { Scan } from '../js/scan/pipeline.js';
import { decode } from '../js/scan/decode.js';
import { initDB } from '../js/db/store.js';
import { precalcChecksums, idDe, payload } from '../js/model/ident.js';

function dbName() { return 'bim-test-' + Date.now() + '-' + Math.random(); }

function deleteDB(n) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.deleteDatabase(n);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

const T_SESSION = Date.UTC(2026, 7, 4, 7, 0, 0);  // 2026-08-04 08:00 Douala → matin
const T_HORS    = Date.UTC(2025, 0, 1, 12, 0, 0);  // 2025-01-01 — pas dans DATES

// ─── Branche 1 — decode(null) → RIEN ─────────────────

test('§7.1 — Scan branch 1: decode(1x1 noise) → RIEN', async () => {
  const n = dbName();
  const s = await initDB(n);
  const H = new Map();
  const img = new ImageData(1, 1);
  const r = await Scan(img, T_SESSION, 'auto', s, H);
  assertEq(r.resultat, 'RIEN', 'bruit → RIEN');
  s.close();
  await deleteDB(n);
});

// ─── Branche 2 — debounce bloque → RIEN ──────────────

test('§7.2 — Scan branch 2: debounce bloque la 2e occurrence → RIEN', async () => {
  await precalcChecksums();
  const n = dbName();
  const s = await initDB(n);
  const H = new Map();
  const validW = await payload(idDe(1));
  const fakeDecode = async () => validW;

  const r1 = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r1.resultat, 'OK', '1er scan → OK (passe toutes les branches)');

  const r2 = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r2.resultat, 'RIEN', '2e scan même t → RIEN (debounce bloque)');

  s.close();
  await deleteDB(n);
});

// ─── Branche 3 — valider erreur → ERREUR ─────────────

test('§7.3a — Scan branch 3: format invalide → ERREUR(format)', async () => {
  const n = dbName();
  const s = await initDB(n);
  const H = new Map();
  const fakeDecode = async () => 'pas-un-qr';
  const r = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r.resultat, 'ERREUR');
  assertEq(r.code, 'format');
  s.close();
  await deleteDB(n);
});

test('§7.3b — Scan branch 3: id inconnu → ERREUR(inconnu)', async () => {
  const n = dbName();
  const s = await initDB(n);
  const H = new Map();
  const fakeDecode = async () => 'BIM26-999-AA';
  const r = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r.resultat, 'ERREUR');
  assertEq(r.code, 'inconnu');
  s.close();
  await deleteDB(n);
});

test('§7.3c — Scan branch 3: mauvais checksum → ERREUR(checksum)', async () => {
  await precalcChecksums();
  const n = dbName();
  const s = await initDB(n);
  const H = new Map();
  const fakeDecode = async () => 'BIM26-001-ZZ';
  const r = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r.resultat, 'ERREUR');
  assertEq(r.code, 'checksum');
  s.close();
  await deleteDB(n);
});

// ─── Branche 4 — hors session → HORS_SESSION ─────────

test('§7.4 — Scan branch 4: date hors DATES → HORS_SESSION', async () => {
  await precalcChecksums();
  const n = dbName();
  const s = await initDB(n);
  const H = new Map();
  const validW = await payload(idDe(1));
  const fakeDecode = async () => validW;
  const r = await Scan(null, T_HORS, 'auto', s, H, fakeDecode);
  assertEq(r.resultat, 'HORS_SESSION');
  s.close();
  await deleteDB(n);
});

// ─── Branche 5 — reg → OK / DEJA_POINTE ──────────────

test('§7.5a — Scan branch 5: succès complet → OK avec participant', async () => {
  await precalcChecksums();
  const n = dbName();
  const s = await initDB(n);
  const H = new Map();
  const validW = await payload(idDe(1));
  const fakeDecode = async () => validW;
  const r = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r.resultat, 'OK');
  assert(r.participant != null, 'a un participant');
  assertEq(r.participant.numero, 1);
  s.close();
  await deleteDB(n);
});

test('§7.5b — Scan branch 5: 2e scan même cle → DEJA_POINTE', async () => {
  await precalcChecksums();
  const n = dbName();
  const s = await initDB(n);
  const H = new Map();
  const validW = await payload(idDe(1));
  const fakeDecode = async () => validW;

  const r1 = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r1.resultat, 'OK', '1er → OK');

  H.clear();
  const T2 = T_SESSION + 5000;
  const r2 = await Scan(null, T2, 'auto', s, H, fakeDecode);
  assertEq(r2.resultat, 'DEJA_POINTE', '2e → DEJA_POINTE');
  assert(typeof r2.tau === 'number', 'tau présent dans DEJA_POINTE');

  s.close();
  await deleteDB(n);
});

test('§7.5c — Scan branch 5: même participant, slot différent → OK', async () => {
  await precalcChecksums();
  const n = dbName();
  const s = await initDB(n);
  const H = new Map();
  const validW = await payload(idDe(1));
  const fakeDecode = async () => validW;

  const r1 = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r1.resultat, 'OK', 'matin → OK');

  H.clear();
  const T_MIDI = Date.UTC(2026, 7, 4, 12, 0, 0); // 13:00 Douala → midi
  const r2 = await Scan(null, T_MIDI, 'auto', s, H, fakeDecode);
  assertEq(r2.resultat, 'OK', 'midi même jour → OK');

  s.close();
  await deleteDB(n);
});
