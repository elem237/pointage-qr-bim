import { test, assert, assertEq } from './harness.js';
import { etatCellule, finDe, slotsEchus, presents, taux, theta } from '../js/model/report.js';
import { idDe } from '../js/model/ident.js';
import { getConfig } from '../js/config.js';

// ─── helpers ─────────────────────────────────────────────

const D = (y, m, d, h, min) => Date.UTC(y, m, d, h, min);

const cfg = getConfig();
const TZ = cfg.TZ_OFFSET_MIN * 60 * 1000; // ms offset

/** epoch ms for a given Douala (UTC+1) date+time */
function douala(y, m, d, h, min) {
  return Date.UTC(y, m, d, h, min) - TZ;
}

/** 16 participants — reference */
const P = [
  { numero: 1,  nomComplet: "YEBGA Jacques Albert" },
  { numero: 2,  nomComplet: "ANYOUZO'A Marc Thyrille" },
  { numero: 3,  nomComplet: "NGOUDJO Fabrice Patrick" },
  { numero: 4,  nomComplet: "AKOLEO Lionel" },
  { numero: 5,  nomComplet: "ENAM NDONGO Benjamin Davy" },
  { numero: 6,  nomComplet: "BELLA Thierry Martial" },
  { numero: 7,  nomComplet: "LOMIE MPELLE Kenny Borel" },
  { numero: 8,  nomComplet: "BUINDA Theophilus YUKBANWI" },
  { numero: 9,  nomComplet: "MVA Cherel Christian" },
  { numero: 10, nomComplet: "NDJOMO Christian St\u00e9phane" },
  { numero: 11, nomComplet: "KOMOL MONGO Joseph" },
  { numero: 12, nomComplet: "BAYOKOLAK Guy Robert" },
  { numero: 13, nomComplet: "NTOLO Daniel Olivier" },
  { numero: 14, nomComplet: "MBIDA EYENGA Rollin" },
  { numero: 15, nomComplet: "ELANG BEYEME Wilfried" },
  { numero: 16, nomComplet: "MBIAHEU St\u00e9phanie Merveille" },
];

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

test('E1.2 — pas de pointage + tNow ≥ finDe → absent', () => {
  // J1 matin ends at 12:30 Douala; tNow = 18:00 Douala → ended
  const r = etatCellule(new Map(), P[0], J1_MATIN, douala(2026, 7, 4, 18, 0));
  assertEq(r.type, 'absent');
});

test('E1.3 — pas de pointage + tNow < finDe → vide', () => {
  // J1 midi ends at 19:00 Douala; tNow = 18:00 Douala → not ended
  const r = etatCellule(new Map(), P[0], J1_MIDI, douala(2026, 7, 4, 18, 0));
  assertEq(r.type, 'vide');
});

test('E1.4 — annulé + tNow ≥ finDe → absent (tombstone transparent)', () => {
  // §12: "Le tombstone est transparent au rapport"
  const m = new Map([
    [cle(P[0], J1_MATIN), pv(1, 'annule', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto')],
  ]);
  const r = etatCellule(m, P[0], J1_MATIN, douala(2026, 7, 4, 18, 0));
  assertEq(r.type, 'absent', 'annulé après finDe → absent');
});

test('E1.5 — annulé + tNow < finDe → vide', () => {
  const m = new Map([
    [cle(P[0], J1_MIDI), pv(1, 'annule', douala(2026, 7, 4, 13, 5), 'scan', 'd1', 'auto')],
  ]);
  const r = etatCellule(m, P[0], J1_MIDI, douala(2026, 7, 4, 15, 0));
  assertEq(r.type, 'vide', 'annulé avant finDe → vide');
});

test('E1.6 — présent pour un participant, absent pour un autre', () => {
  const m = new Map([
    [cle(P[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto')],
  ]);
  const r1 = etatCellule(m, P[0], J1_MATIN, douala(2026, 7, 4, 18, 0));
  assertEq(r1.type, 'present');
  const r2 = etatCellule(m, P[1], J1_MATIN, douala(2026, 7, 4, 18, 0));
  assertEq(r2.type, 'absent');
});

test('E1.7 — propriété 8.2 : 0 absent sur J2/J3 à tNow = J1 18:00', () => {
  // 🔴 spec §12 "0 absence future"
  const tNow = douala(2026, 7, 4, 18, 0);
  const slots = [J2_MATIN, J2_MIDI, J3_MATIN, J3_MIDI];
  for (const slot of slots) {
    for (const p of P) {
      const r = etatCellule(new Map(), p, slot, tNow);
      assertEq(r.type, 'vide', `${p.numero} @ ${slot.date}/${slot.creneau} doit être vide`);
    }
  }
});

test('E1.8 — propriété 8.2 : absent après fin du dernier créneau', () => {
  // Après la fin du dernier créneau (J3 midi 19:00), tous sont absents
  const tNow = douala(2026, 7, 6, 20, 0); // after J3 midi ends at 19:00
  for (const slot of [J1_MATIN, J1_MIDI, J2_MATIN, J2_MIDI, J3_MATIN, J3_MIDI]) {
    const r = etatCellule(new Map(), P[0], slot, tNow);
    assertEq(r.type, 'absent', `doit être absent pour ${slot.date}/${slot.creneau}`);
  }
});

test('E1.9 — garde sur finDe(s) PAS sur debutDe(s)', () => {
  // Début du matin le J1 : 06:00. Si on testait debutDe, un rapport à 10h
  // dirait absent. Avec finDe, à 10h c'est encore vide (fin à 12:30).
  const tNow = douala(2026, 7, 4, 10, 0); // 10:00 Douala, matin en cours
  const r = etatCellule(new Map(), P[0], J1_MATIN, tNow);
  assertEq(r.type, 'vide', 'matin en cours → vide, pas absent');
});

// ─── finDe ───────────────────────────────────────────────

test('E2.1 — finDe matin = H_BASCULE sur la date', () => {
  const f = finDe(J1_MATIN);
  const expected = douala(2026, 7, 4, 12, 30); // H_BASCULE
  assertEq(f, expected);
});

test('E2.2 — finDe midi = H_FIN_MIDI sur la date', () => {
  const f = finDe(J1_MIDI);
  const expected = douala(2026, 7, 4, 19, 0); // H_FIN_MIDI
  assertEq(f, expected);
});

test('E2.3 — finDe J2 matin', () => {
  const f = finDe(J2_MATIN);
  const expected = douala(2026, 7, 5, 12, 30);
  assertEq(f, expected);
});

// ─── slotsEchus ──────────────────────────────────────────

test('E2.4 — slotsEchus vide avant le premier créneau', () => {
  // 2026-08-04 05:00 Douala — avant H_DEBUT_MATIN (06:00)
  const s = slotsEchus(douala(2026, 7, 4, 5, 0));
  assertEq(s.length, 0, '0 slots échus');
});

test('E2.5 — slotsEchus = [J1 matin] après matin et avant midi', () => {
  // 2026-08-04 12:31 Douala — matin fini (12:30), midi pas fini (19:00)
  const s = slotsEchus(douala(2026, 7, 4, 12, 31));
  assertEq(s.length, 1);
  assertEq(s[0].date, '2026-08-04');
  assertEq(s[0].creneau, 'matin');
});

test('E2.6 — slotsEchus = [J1 matin, J1 midi] après J1 midi et avant J2', () => {
  // 2026-08-04 19:01 Douala — J1 fini
  const s = slotsEchus(douala(2026, 7, 4, 19, 1));
  assertEq(s.length, 2);
});

test('E2.7 — slotsEchus = 6 slots après J3 midi', () => {
  // Après 2026-08-06 19:00 Douala
  const s = slotsEchus(douala(2026, 7, 6, 19, 1));
  assertEq(s.length, 6);
});

// ─── presents ────────────────────────────────────────────

test('E2.8 — presents = 0 quand personne', () => {
  const m = new Map();
  const n = presents(m, J1_MATIN);
  assertEq(n, 0);
});

test('E2.9 — presents = 1 avec un participant présent', () => {
  const m = new Map([
    [cle(P[0], J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto')],
  ]);
  assertEq(presents(m, J1_MATIN), 1);
});

test('E2.10 — presents ignore les annulés', () => {
  const m = new Map([
    [cle(P[0], J1_MATIN), pv(1, 'annule', 1000, 'scan', 'd1', 'auto')],
    [cle(P[1], J1_MATIN), pv(0, 'actif', 2000, 'scan', 'd2', 'auto')],
  ]);
  assertEq(presents(m, J1_MATIN), 1);
});

test('E2.11 — presents = 16 avec tous présents', () => {
  const m = new Map();
  for (const p of P) {
    m.set(cle(p, J1_MATIN), pv(0, 'actif', 1000 + p.numero, 'scan', 'd1', 'auto'));
  }
  assertEq(presents(m, J1_MATIN), 16);
});

// ─── taux ────────────────────────────────────────────────

test('E2.12 — taux = 0 quand aucun présent', () => {
  assertEq(taux(new Map(), J1_MATIN), 0);
});

test('E2.13 — taux = 1 quand tous présents', () => {
  const m = new Map();
  for (const p of P) m.set(cle(p, J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto'));
  assertEq(taux(m, J1_MATIN), 1);
});

test('E2.14 — taux = 0.5 pour 8/16', () => {
  const m = new Map();
  for (let i = 0; i < 8; i++) {
    m.set(cle(P[i], J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto'));
  }
  assertEq(taux(m, J1_MATIN), 0.5);
});

// ─── theta ───────────────────────────────────────────────

test('E2.15 — theta = null quand aucun slot échu', () => {
  // 2026-08-04 05:00 — avant tout créneau
  const m = new Map();
  assertEq(theta(m, douala(2026, 7, 4, 5, 0)), null);
});

test('E2.16 — theta = 1 avec 100% sur 1 slot échu', () => {
  // 2026-08-04 12:31 — seul J1 matin échu, tous présents
  const m = new Map();
  for (const p of P) m.set(cle(p, J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto'));
  const t = theta(m, douala(2026, 7, 4, 12, 31));
  assertEq(t, 1);
});

test('E2.17 — theta = 0.5 avec 50% sur 2 slots échus', () => {
  // 2026-08-04 19:01 — J1 matin et midi échus
  // J1 matin: 16/16 présents, J1 midi: 0/16 présents
  const m = new Map();
  for (const p of P) m.set(cle(p, J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto'));
  // J1 midi: personne
  const t = theta(m, douala(2026, 7, 4, 19, 1));
  // Σ presents = 16, |slotsEchus| = 2, denominator = 32
  // 16/32 = 0.5
  assertEq(t, 0.5);
});

test('E2.18 — theta calcule la moyenne sur tous les slots échus', () => {
  // 2026-08-04 19:01 — J1 matin + midi échus
  // matin: 16/16, midi: 8/16 → Σ = 24, |slots| = 2, denom = 32 → 24/32 = 0.75
  const m = new Map();
  for (const p of P) m.set(cle(p, J1_MATIN), pv(0, 'actif', 1000, 'scan', 'd1', 'auto'));
  for (let i = 0; i < 8; i++) m.set(cle(P[i], J1_MIDI), pv(0, 'actif', 2000, 'scan', 'd1', 'auto'));
  const t = theta(m, douala(2026, 7, 4, 19, 1));
  assertEq(t, 0.75);
});
