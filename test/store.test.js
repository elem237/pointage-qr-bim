import { test, assert, assertEq } from './harness.js';
import { initDB } from '../js/db/store.js';
import { idDe } from '../js/model/ident.js';

const TAU  = 1722768000000;
const TAU2 = 1722768001000;
const CLE1 = idDe(1) + '|2026-08-04|matin';
const CLE2 = idDe(2) + '|2026-08-04|midi';
const CLE_INEXISTANT = 'BIM26-999|2026-08-04|matin';

function name() { return 'bim-test-' + Date.now() + '-' + Math.random(); }

function deleteDB(n) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.deleteDatabase(n);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

// ─── §6.3 reg — Idempotence (Théorème 6.7) ───────────────

test('P6.7 — reg idempotent : 1er OK, 2e DEJA_POINTE', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    const r1 = await s.reg(CLE1, TAU, 'scan', 'auto');
    assertEq(r1.resultat, 'OK');
    assert(r1.participant != null, 'retourne le participant');
    assertEq(r1.participant.numero, 1);

    const r2 = await s.reg(CLE1, TAU2, 'scan', 'auto');
    assertEq(r2.resultat, 'DEJA_POINTE');
    assertEq(r2.tau, TAU, 'tau du 1er pointage');

    const p = s.getPointages().get(CLE1);
    assertEq(p.generation, 0, 'generation pas incrémentée');
    assertEq(p.tau, TAU, 'tau pas remplacé');
  } finally {
    s.close();
    await deleteDB(n);
  }
});

// ─── §6.3 reg — Croissance (Propriété 6.9) ────────────────

test('P6.9 — croissance : reg ajoute une entrée au Map', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    assertEq(s.getPointages().size, 0);
    await s.reg(CLE1, TAU, 'scan', 'auto');
    assertEq(s.getPointages().size, 1);
    assert(s.getPointages().has(CLE1));

    await s.reg(CLE2, TAU2, 'manuel', 'midi');
    assertEq(s.getPointages().size, 2);
    assert(s.getPointages().has(CLE2));
  } finally {
    s.close();
    await deleteDB(n);
  }
});

test('P6.9 — re-reg idempotent : generation pas incrémentée', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    await s.reg(CLE1, TAU, 'scan', 'auto');
    await s.reg(CLE1, TAU2, 'scan', 'auto');
    const p = s.getPointages().get(CLE1);
    assertEq(p.generation, 0);
    assertEq(p.tau, TAU);
    assertEq(p.statut, 'actif');
  } finally {
    s.close();
    await deleteDB(n);
  }
});

// ─── §6.3 reg — re-pointage après cancel ──────────────────

test('P6.9 — reg après cancel : generation 2, actif', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    await s.reg(CLE1, TAU, 'scan', 'auto');
    await s.cancel(CLE1);
    await s.reg(CLE1, TAU2, 'scan', 'auto');
    const p = s.getPointages().get(CLE1);
    assertEq(p.generation, 2);
    assertEq(p.statut, 'actif');
    assertEq(p.tau, TAU2);
  } finally {
    s.close();
    await deleteDB(n);
  }
});

// ─── §6.3 reg — retour participant ────────────────────────

test('P6.3 — reg OK retourne le participant (nom + numero)', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    const r = await s.reg(CLE1, TAU, 'scan', 'auto');
    assertEq(r.resultat, 'OK');
    assertEq(r.participant.numero, 1);
    assert(typeof r.participant.nomComplet === 'string');
    assert(r.participant.nomComplet.length > 0);
  } finally {
    s.close();
    await deleteDB(n);
  }
});

// ─── §6.4 cancel — P-CANCEL ───────────────────────────────

test('P6.4 — cancel sur cle inexistante → ERREUR', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    const r = await s.cancel(CLE1);
    assertEq(r.resultat, 'ERREUR');
  } finally {
    s.close();
    await deleteDB(n);
  }
});

test('P6.4 — cancel sur pointage actif → OK', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    await s.reg(CLE1, TAU, 'scan', 'auto');
    const r = await s.cancel(CLE1);
    assertEq(r.resultat, 'OK');
    const p = s.getPointages().get(CLE1);
    assertEq(p.generation, 1);
    assertEq(p.statut, 'annule');
    assertEq(p.tau, TAU, 'tau préservé');
    assertEq(p.mode, 'scan', 'mode préservé');
    assertEq(p.override, 'auto', 'override préservé');
  } finally {
    s.close();
    await deleteDB(n);
  }
});

test('P6.4 — cancel deux fois → ERREUR (déjà annulé)', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    await s.reg(CLE1, TAU, 'scan', 'auto');
    await s.cancel(CLE1);
    const r = await s.cancel(CLE1);
    assertEq(r.resultat, 'ERREUR');
  } finally {
    s.close();
    await deleteDB(n);
  }
});

test('P6.4 — cancel après DEJA_POINTE fonctionne (statut actif)', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    await s.reg(CLE1, TAU, 'scan', 'auto');
    await s.reg(CLE1, TAU2, 'scan', 'auto'); // DEJA_POINTE, statut toujours actif
    const r = await s.cancel(CLE1);
    assertEq(r.resultat, 'OK', 'cancel OK après DEJA_POINTE');
    assertEq(s.getPointages().get(CLE1).statut, 'annule');
  } finally {
    s.close();
    await deleteDB(n);
  }
});

// ─── §4.3 Persistance IndexedDB ───────────────────────────

test('P4.3 — reg persisté : rechargement depuis IndexedDB', async () => {
  const n = name();
  const s1 = await initDB(n);
  await s1.reg(CLE1, TAU, 'scan', 'auto');
  const d1 = s1.getDeviceId();
  s1.close();

  const s2 = await initDB(n);
  try {
    const p = s2.getPointages().get(CLE1);
    assert(p != null, 'pointage retrouvé');
    assertEq(p.generation, 0);
    assertEq(p.statut, 'actif');
    assertEq(p.tau, TAU);
    assertEq(p.device, d1);
  } finally {
    s2.close();
    await deleteDB(n);
  }
});

test('P4.3 — cancel persisté : rechargement', async () => {
  const n = name();
  const s1 = await initDB(n);
  await s1.reg(CLE1, TAU, 'scan', 'auto');
  await s1.cancel(CLE1);
  s1.close();

  const s2 = await initDB(n);
  try {
    const p = s2.getPointages().get(CLE1);
    assert(p != null);
    assertEq(p.statut, 'annule');
    assertEq(p.generation, 1);
  } finally {
    s2.close();
    await deleteDB(n);
  }
});

test('P4.3 — re-reg persisté : génération 2 après rechargement', async () => {
  const n = name();
  const s1 = await initDB(n);
  await s1.reg(CLE1, TAU, 'scan', 'auto');
  await s1.cancel(CLE1);
  await s1.reg(CLE1, TAU2, 'scan', 'auto');
  s1.close();

  const s2 = await initDB(n);
  try {
    const p = s2.getPointages().get(CLE1);
    assertEq(p.generation, 2);
    assertEq(p.statut, 'actif');
  } finally {
    s2.close();
    await deleteDB(n);
  }
});

// ─── PATCH §P3 DEVICE_ID ──────────────────────────────────

test('PP3 — DEVICE_ID généré au premier lancement', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    const d = s.getDeviceId();
    assert(typeof d === 'string' && d.length > 0, 'deviceId non vide');
  } finally {
    s.close();
    await deleteDB(n);
  }
});

test('PP3 — DEVICE_ID stable au rechargement', async () => {
  const n = name();
  const s1 = await initDB(n);
  const d1 = s1.getDeviceId();
  s1.close();

  const s2 = await initDB(n);
  try {
    assertEq(s2.getDeviceId(), d1);
  } finally {
    s2.close();
    await deleteDB(n);
  }
});

// ─── Cas limites ──────────────────────────────────────────

test('P4.3 — deux pointages sur clés distinctes coexistent', async () => {
  const n = name();
  const s = await initDB(n);
  try {
    await s.reg(CLE1, TAU, 'scan', 'auto');
    await s.reg(CLE2, TAU2, 'manuel', 'midi');
    assertEq(s.getPointages().size, 2);
    assertEq(s.getPointages().get(CLE1).tau, TAU);
    assertEq(s.getPointages().get(CLE2).tau, TAU2);
  } finally {
    s.close();
    await deleteDB(n);
  }
});
