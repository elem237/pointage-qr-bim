import { test, assert, assertEq, run } from './harness.js';
import { dureeMinutes, formatDuree, estRapportable, phraseAbsence, trierAbsences } from '../js/model/absences.js';

const TZ = 60 * 60 * 1000;

function douala(y, m, d, h, min) {
  return Date.UTC(y, m, d, h, min) - TZ;
}

// ─── AB1-AB2 : dureeMinutes ────────────────────────────

test('AB1 — dureeMinutes absence 10h15→11h02 = 47', () => {
  const a = {
    id: 'u1', numero: 3, dateJour: '2026-08-04',
    depart: douala(2026, 7, 4, 10, 15),
    retour: douala(2026, 7, 4, 11, 2),
    motif: '',
  };
  assertEq(dureeMinutes(a), 47);
});

test('AB2 — dureeMinutes retour null = null', () => {
  const a = {
    id: 'u2', numero: 3, dateJour: '2026-08-04',
    depart: douala(2026, 7, 4, 10, 15),
    retour: null,
    motif: '',
  };
  assertEq(dureeMinutes(a), null);
});

// ─── AB3-AB4 : formatDuree ─────────────────────────────

test('AB3 — formatDuree(47) → "00:47"', () => {
  assertEq(formatDuree(47), '00:47');
});

test('AB4 — formatDuree(95) → "01:35"', () => {
  assertEq(formatDuree(95), '01:35');
});

// ─── AB5-AB8 : estRapportable ──────────────────────────

function absRetour(retour, dureeMin) {
  return {
    id: 'u', numero: 1, dateJour: '2026-08-04',
    depart: douala(2026, 7, 4, 10, 0),
    retour: retour,
    motif: '',
  };
}

test('AB5 — estRapportable durée 47, seuil 20 → true', () => {
  const a = absRetour(douala(2026, 7, 4, 10, 47), 47);
  assertEq(estRapportable(a, 20), true);
});

test('AB6 — estRapportable durée 12, seuil 20 → false', () => {
  const a = absRetour(douala(2026, 7, 4, 10, 12), 12);
  assertEq(estRapportable(a, 20), false);
});

test('AB7 — estRapportable durée 12, seuil 10 → true (seuil paramétrable)', () => {
  const a = absRetour(douala(2026, 7, 4, 10, 12), 12);
  assertEq(estRapportable(a, 10), true);
});

test('AB8 — estRapportable retour null, seuil 20 → true (toujours signalé)', () => {
  const a = absRetour(null, null);
  assertEq(estRapportable(a, 20), true);
});

// ─── AB9-AB12 : phraseAbsence ──────────────────────────

test('AB9 — phraseAbsence terminée → "…s\'est absenté·e pour 00:47 le 4 août 2026."', () => {
  const a = {
    id: 'u3', numero: 3, dateJour: '2026-08-04',
    depart: douala(2026, 7, 4, 10, 15),
    retour: douala(2026, 7, 4, 11, 2),
    motif: '',
  };
  const r = phraseAbsence(a, 'NGOUDJO Fabrice Patrick');
  assertEq(r.phrase, "NGOUDJO Fabrice Patrick s'est absent\u00e9\u00b7e pour 00:47 le 4 ao\u00fbt 2026.");
});

test('AB10 — phraseAbsence non revenu·e → "…à partir de 10h15 le 4 août 2026, non revenu·e."', () => {
  const a = {
    id: 'u4', numero: 3, dateJour: '2026-08-04',
    depart: douala(2026, 7, 4, 10, 15),
    retour: null,
    motif: '',
  };
  const r = phraseAbsence(a, 'NGOUDJO Fabrice Patrick');
  assertEq(r.phrase, "NGOUDJO Fabrice Patrick s'est absent\u00e9\u00b7e \u00e0 partir de 10h15 le 4 ao\u00fbt 2026, non revenu\u00b7e.");
});

test('AB11 — phraseAbsence motif "rdv" → motif: "rdv"', () => {
  const a = {
    id: 'u5', numero: 3, dateJour: '2026-08-04',
    depart: douala(2026, 7, 4, 10, 15),
    retour: douala(2026, 7, 4, 11, 2),
    motif: 'rdv',
  };
  const r = phraseAbsence(a, 'NGOUDJO Fabrice Patrick');
  assertEq(r.motif, 'rdv');
});

test('AB12 — phraseAbsence motif "" → motif: null', () => {
  const a = {
    id: 'u6', numero: 3, dateJour: '2026-08-04',
    depart: douala(2026, 7, 4, 10, 15),
    retour: douala(2026, 7, 4, 11, 2),
    motif: '',
  };
  const r = phraseAbsence(a, 'NGOUDJO Fabrice Patrick');
  assertEq(r.motif, null);
});

// ─── AB13 : tri ────────────────────────────────────────

test('AB13 — tri : numero croissant puis depart croissant', () => {
  const a1 = { id: 'a', numero: 2, depart: 1000 };
  const a2 = { id: 'b', numero: 1, depart: 2000 };
  const a3 = { id: 'c', numero: 1, depart: 1000 };
  const sorted = trierAbsences([a1, a2, a3]);
  assertEq(sorted.length, 3);
  assertEq(sorted[0].id, 'c');
  assertEq(sorted[1].id, 'b');
  assertEq(sorted[2].id, 'a');
});

if (typeof document === 'undefined') run();
