import { test, assert, assertEq } from './harness.js';
import { Scan } from '../js/scan/pipeline.js';
import { decode } from '../js/scan/decode.js';
import { initDB } from '../js/db/store.js';
import { PARTICIPANTS } from '../js/data.js';
import { precalcChecksums, idDe, payload } from '../js/model/ident.js';
import { mergeConfig } from '../js/config.js';

test('pipeline-setup-dates', () => {
  mergeConfig({ DATES: ['2026-08-04', '2026-08-05', '2026-08-06'] });
});

function dbName() { return 'bim-test-' + Date.now() + '-' + Math.random(); }

function participantDeCle(cle) {
  const id = cle.split('|')[0];
  return PARTICIPANTS.find(p => idDe(p.numero) === id) || null;
}

/* Repli Node uniquement : IndexedDB n'existe pas hors navigateur.
 * Sémantique de reg() recopiée de store.js (DEJA_POINTE + tau,
 * génération incrémentée, participant résolu). Dans le navigateur,
 * c'est le vrai initDB qui tourne — couverture inchangée. */
function fakeInitDB() {
  const m = new Map();
  return {
    async reg(cle, tau, mode, override) {
      const v = m.get(cle);
      if (v != null && v.statut === 'actif') {
        return { resultat: 'DEJA_POINTE', tau: v.tau };
      }
      const g = (v == null) ? 0 : v.generation + 1;
      const vp = { generation: g, statut: 'actif', tau, mode, device: 'test-node', override };
      m.set(cle, vp);
      return { resultat: 'OK', participant: participantDeCle(cle) };
    },
    getPointages: () => m,
    close() {},
  };
}

async function openTestDB() {
  if (typeof indexedDB === 'undefined') {
    return { s: fakeInitDB(), cleanup: async () => {} };
  }
  const n = dbName();
  const s = await initDB(n);
  return { s, cleanup: async () => { s.close(); await deleteDB(n); } };
}

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
  const { s, cleanup } = await openTestDB();
  const H = new Map();
  const img = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
  const r = await Scan(img, T_SESSION, 'auto', s, H);
  assertEq(r.resultat, 'RIEN', 'bruit → RIEN');
  await cleanup();
});

// ─── Branche 2 — debounce bloque → RIEN ──────────────

test('§7.2 — Scan branch 2: debounce bloque la 2e occurrence → RIEN', async () => {
  await precalcChecksums();
  const { s, cleanup } = await openTestDB();
  const H = new Map();
  const validW = await payload(idDe(1));
  const fakeDecode = async () => validW;

  const r1 = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r1.resultat, 'OK', '1er scan → OK (passe toutes les branches)');

  const r2 = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r2.resultat, 'RIEN', '2e scan même t → RIEN (debounce bloque)');

  await cleanup();
});

// ─── Branche 3 — valider erreur → ERREUR ─────────────

test('§7.3a — Scan branch 3: format invalide → ERREUR(format)', async () => {
  const { s, cleanup } = await openTestDB();
  const H = new Map();
  const fakeDecode = async () => 'pas-un-qr';
  const r = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r.resultat, 'ERREUR');
  assertEq(r.code, 'format');
  await cleanup();
});

test('§7.3b — Scan branch 3: id inconnu → ERREUR(inconnu)', async () => {
  const { s, cleanup } = await openTestDB();
  const H = new Map();
  const fakeDecode = async () => 'BIM26-999-AA';
  const r = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r.resultat, 'ERREUR');
  assertEq(r.code, 'inconnu');
  await cleanup();
});

test('§7.3c — Scan branch 3: mauvais checksum → ERREUR(checksum)', async () => {
  await precalcChecksums();
  const { s, cleanup } = await openTestDB();
  const H = new Map();
  const fakeDecode = async () => 'BIM26-001-ZZ';
  const r = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r.resultat, 'ERREUR');
  assertEq(r.code, 'checksum');
  await cleanup();
});

// ─── Branche 4 — hors session → HORS_SESSION ─────────

test('§7.4 — Scan branch 4: date hors DATES → HORS_SESSION', async () => {
  await precalcChecksums();
  const { s, cleanup } = await openTestDB();
  const H = new Map();
  const validW = await payload(idDe(1));
  const fakeDecode = async () => validW;
  const r = await Scan(null, T_HORS, 'auto', s, H, fakeDecode);
  assertEq(r.resultat, 'HORS_SESSION');
  await cleanup();
});

// ─── Branche 5 — reg → OK / DEJA_POINTE ──────────────

test('§7.5a — Scan branch 5: succès complet → OK avec participant', async () => {
  await precalcChecksums();
  const { s, cleanup } = await openTestDB();
  const H = new Map();
  const validW = await payload(idDe(1));
  const fakeDecode = async () => validW;
  const r = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r.resultat, 'OK');
  assert(r.participant != null, 'a un participant');
  assertEq(r.participant.numero, 1);
  await cleanup();
});

test('§7.5b — Scan branch 5: 2e scan même cle → DEJA_POINTE', async () => {
  await precalcChecksums();
  const { s, cleanup } = await openTestDB();
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

  await cleanup();
});

test('§7.5c — Scan branch 5: même participant, slot différent → OK', async () => {
  await precalcChecksums();
  const { s, cleanup } = await openTestDB();
  const H = new Map();
  const validW = await payload(idDe(1));
  const fakeDecode = async () => validW;

  const r1 = await Scan(null, T_SESSION, 'auto', s, H, fakeDecode);
  assertEq(r1.resultat, 'OK', 'matin → OK');

  H.clear();
  const T_MIDI = Date.UTC(2026, 7, 4, 12, 0, 0); // 13:00 Douala → midi
  const r2 = await Scan(null, T_MIDI, 'auto', s, H, fakeDecode);
  assertEq(r2.resultat, 'OK', 'midi même jour → OK');

  await cleanup();
});
