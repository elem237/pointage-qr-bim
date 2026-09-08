import { test, assert, assertEq } from './harness.js';
import { etatCellule, finDe, slotsEchus, presents, taux, theta } from '../js/model/report.js';
import { idDe } from '../js/model/ident.js';
import { getConfig, mergeConfig } from '../js/config.js';

test('report-setup-dates', () => {
  mergeConfig({ DATES: ['2026-08-04', '2026-08-05', '2026-08-06'] });
});

// ─── helpers ─────────────────────────────────────────────

const cfg = getConfig();
const TZ = cfg.TZ_OFFSET_MIN * 60 * 1000;

/** epoch ms for a given Douala (UTC+1) date+time */
function douala(y, m, d, h, min) {
  return Date.UTC(y, m, d, h, min) - TZ;
}

import { PARTICIPANTS as P } from '../js/data.js';

const J1_MATIN = { date: '2026-08-04', creneau: 'matin' };
const J1_MIDI  = { date: '2026-08-04', creneau: 'midi' };
const J2_MATIN = { date: '2026-08-05', creneau: 'matin' };
const J2_MIDI  = { date: '2026-08-05', creneau: 'midi' };
const J3_MATIN = { date: '2026-08-06', creneau: 'matin' };
const J3_MIDI  = { date: '2026-08-06', creneau: 'midi' };

function pv(generation, statut, tau, mode, device, override) {
  return { generation, statut, tau, mode, device, override };
}

function cle(p, slot) {
  return idDe(p.numero) + '|' + slot.date + '|' + slot.creneau;
}

// ─── E1 — etatCellule ─────────────────────────────────

test('E1.1 — participant actif → present avec tau', () => {
  const m = new Map([
    [cle(P[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto')],
  ]);
  const r = etatCellule(m, P[0], J1_MATIN, douala(2026, 7, 4, 18, 0));
  assertEq(r.type, 'present');
  assertEq(r.tau, douala(2026, 7, 4, 8, 42));
});

test('E1.2 — pas de pointage + tNow \u2265 finDe → absent', () => {
  const r = etatCellule(new Map(), P[0], J1_MATIN, douala(2026, 7, 4, 18, 0));
  assertEq(r.type, 'absent');
});

test('E1.3 — pas de pointage + tNow < finDe → vide', () => {
  const r = etatCellule(new Map(), P[0], J1_MIDI, douala(2026, 7, 4, 15, 0));
  assertEq(r.type, 'vide');
});

test('E1.4 — annul\u00e9 + tNow \u2265 finDe → absent (tombstone transparent)', () => {
  const m = new Map([
    [cle(P[0], J1_MATIN), pv(1, 'annule', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto')],
  ]);
  const r = etatCellule(m, P[0], J1_MATIN, douala(2026, 7, 4, 18, 0));
  assertEq(r.type, 'absent', 'annul\u00e9 apr\u00e8s finDe → absent');
});

test('E1.5 — annul\u00e9 + tNow < finDe → vide', () => {
  const m = new Map([
    [cle(P[0], J1_MIDI), pv(1, 'annule', douala(2026, 7, 4, 13, 5), 'scan', 'd1', 'auto')],
  ]);
  const r = etatCellule(m, P[0], J1_MIDI, douala(2026, 7, 4, 15, 0));
  assertEq(r.type, 'vide', 'annul\u00e9 avant finDe → vide');
});

test('E1.6 — pr\u00e9sent pour un participant, absent pour un autre', () => {
  const m = new Map([
    [cle(P[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto')],
  ]);
  const r1 = etatCellule(m, P[0], J1_MATIN, douala(2026, 7, 4, 18, 0));
  assertEq(r1.type, 'present');
  const r2 = etatCellule(m, P[1], J1_MATIN, douala(2026, 7, 4, 18, 0));
  assertEq(r2.type, 'absent');
});

test('E1.7 — propri\u00e9t\u00e9 8.2 : 0 absent sur J2/J3 \u00e0 tNow = J1 18:00', () => {
  const tNow = douala(2026, 7, 4, 18, 0);
  const slots = [J2_MATIN, J2_MIDI, J3_MATIN, J3_MIDI];
  for (const slot of slots) {
    for (const p of P) {
      const r = etatCellule(new Map(), p, slot, tNow);
      assertEq(r.type, 'vide', `${p.numero} @ ${slot.date}/${slot.creneau} doit \u00eatre vide`);
    }
  }
});

test('E1.8 — propri\u00e9t\u00e9 8.2 : absent apr\u00e8s fin du dernier cr\u00e9neau', () => {
  const tNow = douala(2026, 7, 6, 20, 0);
  for (const slot of [J1_MATIN, J1_MIDI, J2_MATIN, J2_MIDI, J3_MATIN, J3_MIDI]) {
    const r = etatCellule(new Map(), P[0], slot, tNow);
    assertEq(r.type, 'absent', `doit \u00eatre absent pour ${slot.date}/${slot.creneau}`);
  }
});

test('E1.9 — garde sur finDe(s) PAS sur debutDe(s)', () => {
  const tNow = douala(2026, 7, 4, 10, 0);
  const r = etatCellule(new Map(), P[0], J1_MATIN, tNow);
  assertEq(r.type, 'vide', 'matin en cours → vide, pas absent');
});

// ─── finDe ───────────────────────────────────────────────

test('E2.1 — finDe matin = H_BASCULE (13:00) sur la date', () => {
  const f = finDe(J1_MATIN);
  const expected = douala(2026, 7, 4, 13, 0);
  assertEq(f, expected);
});

test('E2.2 — finDe midi = H_FIN_MIDI (17:30) sur la date', () => {
  const f = finDe(J1_MIDI);
  const expected = douala(2026, 7, 4, 17, 30);
  assertEq(f, expected);
});

test('E2.3 — finDe J2 matin', () => {
  const f = finDe(J2_MATIN);
  const expected = douala(2026, 7, 5, 13, 0);
  assertEq(f, expected);
});

// ─── slotsEchus ──────────────────────────────────────────

test('E2.4 — slotsEchus vide avant le premier cr\u00e9neau', () => {
  const s = slotsEchus(douala(2026, 7, 4, 5, 0));
  assertEq(s.length, 0, '0 slots \u00e9chus');
});

test('E2.5 — slotsEchus = [J1 matin] apr\u00e8s matin et avant midi', () => {
  const s = slotsEchus(douala(2026, 7, 4, 14, 0));
  assertEq(s.length, 1);
  assertEq(s[0].date, '2026-08-04');
  assertEq(s[0].creneau, 'matin');
});

test('E2.6 — slotsEchus = [J1 matin, J1 midi] apr\u00e8s J1 midi et avant J2', () => {
  const s = slotsEchus(douala(2026, 7, 4, 19, 0));
  assertEq(s.length, 2);
});

test('E2.7 — slotsEchus = 6 slots apr\u00e8s J3 midi', () => {
  const s = slotsEchus(douala(2026, 7, 6, 19, 0));
  assertEq(s.length, 6);
});

// ─── presents ────────────────────────────────────────────

test('E2.8 — presents = 0 quand personne', () => {
  const m = new Map();
  const n = presents(m, J1_MATIN);
  assertEq(n, 0);
});

test('E2.9 — presents = 1 avec un participant pr\u00e9sent', () => {
  const m = new Map([
    [cle(P[0], J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto')],
  ]);
  assertEq(presents(m, J1_MATIN), 1);
});

test('E2.10 — presents ignore les annul\u00e9s', () => {
  const m = new Map([
    [cle(P[0], J1_MATIN), pv(1, 'annule', 1000, 'scan', 'd1', 'auto')],
    [cle(P[1], J1_MATIN), pv(0, 'actif', 2000, 'scan', 'd2', 'auto')],
  ]);
  assertEq(presents(m, J1_MATIN), 1);
});

test('E2.11 — presents = 13 avec tous pr\u00e9sents', () => {
  const m = new Map();
  for (const p of P) {
    m.set(cle(p, J1_MATIN), pv(0, 'actif', 1000 + p.numero, 'scan', 'd1', 'auto'));
  }
  assertEq(presents(m, J1_MATIN), 13);
});

// ─── taux ────────────────────────────────────────────────

test('E2.12 — taux = 0 quand aucun pr\u00e9sent', () => {
  assertEq(taux(new Map(), J1_MATIN), 0);
});

test('E2.13 — taux = 1 quand tous pr\u00e9sents', () => {
  const m = new Map();
  for (const p of P) m.set(cle(p, J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto'));
  assertEq(taux(m, J1_MATIN), 1);
});

test('E2.14 — taux = 5/13 pour 5 pr\u00e9sents', () => {
  const m = new Map();
  for (let i = 0; i < 5; i++) {
    m.set(cle(P[i], J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto'));
  }
  assertEq(taux(m, J1_MATIN), 5 / 13);
});

// ─── theta ───────────────────────────────────────────────

test('E2.15 — theta = null quand aucun slot \u00e9chu', () => {
  const m = new Map();
  assertEq(theta(m, douala(2026, 7, 4, 5, 0)), null);
});

test('E2.16 — theta = 1 avec 100% sur 1 slot \u00e9chu', () => {
  const m = new Map();
  for (const p of P) m.set(cle(p, J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto'));
  const t = theta(m, douala(2026, 7, 4, 14, 0));
  assertEq(t, 1);
});

test('E2.17 — theta = 0.5 avec 50% sur 2 slots \u00e9chus', () => {
  const m = new Map();
  for (const p of P) m.set(cle(p, J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto'));
  const t = theta(m, douala(2026, 7, 4, 19, 0));
  assertEq(t, 0.5);
});

test('E2.18 — theta calcule la moyenne sur tous les slots \u00e9chus', () => {
  const m = new Map();
  for (const p of P) m.set(cle(p, J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto'));
  for (let i = 0; i < 6; i++) m.set(cle(P[i], J1_MIDI), pv(0, 'actif', 2000, 'scan', 'd1', 'auto'));
  const t = theta(m, douala(2026, 7, 4, 19, 0));
  assertEq(t, 19 / 26);
});
