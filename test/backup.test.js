import { test, assert, assertEq } from './harness.js';
import { serialiser, deserialiser, pointagesMap } from '../js/db/backup.js';
import { PARTICIPANTS } from '../js/data.js';

/* ── G1 — serialiser structure (SPEC §6.5, version 2) ── */
test('G1 — serialiser produit un JSON valide avec version=2', () => {
  const m = new Map();
  const json = serialiser(PARTICIPANTS, m);
  const o = JSON.parse(json);
  assertEq(o.version, 2, 'version = 2');
  assert(Array.isArray(o.pointages), 'pointages est un tableau');
  assert(Array.isArray(o.participants), 'participants est un tableau');
  assert(typeof o.exportLe === 'number', 'exportLe est un nombre');
});

/* ── G2 — serialiser préserve les pointages (SPEC §6.5) ── */
test('G2 — serialiser préserve les champs de PointageValue', () => {
  const m = new Map([
    ['BIM26-001|2026-08-04|matin', { generation: 0, statut: 'actif', tau: 1722750000000, mode: 'scan', device: 'abc', override: 'auto' }],
    ['BIM26-002|2026-08-04|midi', { generation: 1, statut: 'annule', tau: 1722753600000, mode: 'manuel', device: 'def', override: 'matin' }],
  ]);
  const json = serialiser(PARTICIPANTS, m);
  const o = JSON.parse(json);
  assertEq(o.pointages.length, 2);
  const [k1, v1] = o.pointages[0];
  assertEq(k1, 'BIM26-001|2026-08-04|matin');
  assertEq(v1.generation, 0);
  assertEq(v1.statut, 'actif');
  assertEq(v1.mode, 'scan');
  assertEq(v1.device, 'abc');
  assertEq(v1.override, 'auto');
});

/* ── G3 — deserialiser accepte version 2 (SPEC §12.1 rejet strict) ── */
test('G3 — deserialiser accepte version 2', () => {
  const json = JSON.stringify({ version: 2, participants: [], pointages: [] });
  const result = deserialiser(json);
  assert(result !== null, 'version 2 accepté');
});

/* ── G4 — deserialiser rejette version ≠ 2 (SPEC Propriété 12.1) ── */
test('G4 — deserialiser rejette version ≠ 2', () => {
  const v1 = JSON.stringify({ version: 1, participants: [], pointages: [] });
  assertEq(deserialiser(v1), null, 'v1 rejeté');
  const v3 = JSON.stringify({ version: 3, participants: [], pointages: [] });
  assertEq(deserialiser(v3), null, 'v3 rejeté');
});

/* ── G5 — deserialiser rejette null / malformé (SPEC §12.1) ── */
test('G5 — deserialiser rejette null, objet invalide', () => {
  assertEq(deserialiser(null), null, 'null JSON rejeté');
  assertEq(deserialiser('pas du json'), null, 'texte rejeté');
  assertEq(deserialiser('{"version":2}'), null, 'sans pointages rejeté');
  assertEq(deserialiser('{"version":2,"pointages":{}}'), null, 'pointages objet rejeté');
});

/* ── G6 — deserialiser valide la structure des pointages (SPEC §12.1) ── */
test('G6 — deserialiser valide chaque entrée pointage', () => {
  const ok = JSON.stringify({ version: 2, participants: [], pointages: [['cle', { generation: 0, statut: 'actif', tau: 100, mode: 'scan', device: 'x', override: 'auto' }]] });
  assert(deserialiser(ok) !== null, 'entrée valide acceptée');
  const badKey = JSON.stringify({ version: 2, participants: [], pointages: [[123, {}]] });
  assertEq(deserialiser(badKey), null, 'clé non-string rejetée');
  const badStatut = JSON.stringify({ version: 2, participants: [], pointages: [['cle', { generation: 0, statut: 'bogus', tau: 100 }]] });
  assertEq(deserialiser(badStatut), null, 'statut invalide rejeté');
});

/* ── G7 — Aller-retour serialiser → deserialiser (SPEC Propriété 4.8) ── */
test('G7 — aller-retour serialiser/deserialiser préserve les données', () => {
  const m = new Map([
    ['BIM26-001|2026-08-04|matin', { generation: 0, statut: 'actif', tau: 1000, mode: 'scan', device: 'd1', override: 'auto' }],
    ['BIM26-005|2026-08-05|midi', { generation: 2, statut: 'annule', tau: 2000, mode: 'manuel', device: 'd2', override: 'midi' }],
  ]);
  const json = serialiser(PARTICIPANTS, m);
  const data = deserialiser(json);
  assert(data !== null, 'deserialisation réussie');
  assertEq(data.pointages.length, 2);
  const map2 = pointagesMap(data.pointages);
  assertEq(map2.get('BIM26-001|2026-08-04|matin').generation, 0);
  assertEq(map2.get('BIM26-005|2026-08-05|midi').statut, 'annule');
});

/* ── G8 — pointagesMap crée une Map correcte (SPEC §6.5) ── */
test('G8 — pointagesMap convertit le tableau en Map', () => {
  const arr = [['k1', { generation: 0, statut: 'actif', tau: 1, mode: 'scan', device: 'd', override: 'auto' }]];
  const m = pointagesMap(arr);
  assertEq(m.size, 1);
  assert(m.has('k1'));
  assertEq(m.get('k1').statut, 'actif');
});

/* ── G9 — serialiser préserve participants verbatim (SPEC §4.1) ── */
test('G9 — serialiser préserve les participants', () => {
  const m = new Map();
  const json = serialiser(PARTICIPANTS, m);
  const data = deserialiser(json);
  assertEq(data.participants.length, 16);
  assertEq(data.participants[0].nomComplet, PARTICIPANTS[0].nomComplet);
  assertEq(data.participants[15].numero, 16);
});

/* ── G10 — deserialiser préserve exportLe (SPEC §6.5) ── */
test('G10 — exportLe est conservé', () => {
  const m = new Map();
  const json = serialiser(PARTICIPANTS, m);
  const data = deserialiser(json);
  assert(typeof data.exportLe === 'number', 'exportLe est un nombre');
  assert(data.exportLe > 1720000000000, 'exportLe est récent');
});
