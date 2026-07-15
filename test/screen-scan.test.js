import { test, assert, assertEq } from './harness.js';
import {
  screenScan,
  formatTau,
  messagePourResultat,
  couleurPourResultat,
} from '../js/ui/screen-scan.js';

/* ── P1 — Export ── */
test('screenScan est une fonction', () => {
  assert(typeof screenScan === 'function', 'screenScan doit être une fonction');
});

test('formatTau est une fonction', () => {
  assert(typeof formatTau === 'function');
});

test('messagePourResultat est une fonction', () => {
  assert(typeof messagePourResultat === 'function');
});

test('couleurPourResultat est une fonction', () => {
  assert(typeof couleurPourResultat === 'function');
});

/* ── P2 — DOM structure (C5/C5b — sélecteur visible) ── */
test('screenScan crée les éléments DOM requis', async () => {
  const div = document.createElement('div');
  await screenScan(div, {});
  assert(div.querySelector('#camera-feed') !== null, '#camera-feed manquant');
  assert(div.querySelector('#roi-canvas') !== null, '#roi-canvas manquant');
  assert(div.querySelector('#selector-bar') !== null, '#selector-bar manquant');
  assert(div.querySelector('#result-overlay') !== null, '#result-overlay manquant');
  assert(div.querySelector('#btn-scan') !== null, '#btn-scan manquant');
});

/* ── P3 — Default override auto (C5/C5b — valeur par défaut) ── */
test('le sélecteur par défaut est auto', async () => {
  const div = document.createElement('div');
  const ctrl = await screenScan(div, {});
  assertEq(ctrl.getOverrideValue(), 'auto', 'la valeur par défaut doit être auto');
});

/* ── P4 — formatTau ── */
test('formatTau: 2026-08-04 08:42 UTC+1 → "08:42"', () => {
  const tau = new Date('2026-08-04T07:42:00Z').getTime();
  assertEq(formatTau(tau), '08:42');
});

test('formatTau: 2026-08-04 13:05 UTC+1 → "13:05"', () => {
  const tau = new Date('2026-08-04T12:05:00Z').getTime();
  assertEq(formatTau(tau), '13:05');
});

/* ── P5 — messagePourResultat OK → nom complet (propriété §8 OK) ── */
test('message OK affiche le nom complet', () => {
  const msg = messagePourResultat({
    resultat: 'OK',
    participant: { nomComplet: 'YEBGA Jacques Albert' },
  });
  assertEq(msg, 'YEBGA Jacques Albert');
});

/* ── P6 — messagePourResultat DEJA_POINTE → "déjà pointé à HH:MM" (propriété §8 DEJA_POINTE) ── */
test('message DEJA_POINTE affiche "déjà pointé à HH:MM"', () => {
  const tau = new Date('2026-08-04T07:42:00Z').getTime();
  const msg = messagePourResultat({ resultat: 'DEJA_POINTE', tau });
  assertEq(msg, 'déjà pointé à 08:42');
});

/* ── P7 — messagePourResultat ERREUR → messages dédiés (propriété §8 ERREUR) ── */
test('message ERREUR format → "Format non reconnu"', () => {
  const msg = messagePourResultat({ resultat: 'ERREUR', code: 'format' });
  assertEq(msg, 'Format non reconnu');
});

test('message ERREUR checksum → "Checksum invalide"', () => {
  const msg = messagePourResultat({ resultat: 'ERREUR', code: 'checksum' });
  assertEq(msg, 'Checksum invalide');
});

test('message ERREUR inconnu → "Code inconnu"', () => {
  const msg = messagePourResultat({ resultat: 'ERREUR', code: 'inconnu' });
  assertEq(msg, 'Code inconnu');
});

/* ── P8 — messagePourResultat HORS_SESSION → "hors créneau" (propriété §8 HORS_SESSION) ── */
test('message HORS_SESSION → "hors créneau"', () => {
  const msg = messagePourResultat({ resultat: 'HORS_SESSION' });
  assertEq(msg, 'hors créneau');
});

/* ── P9 — messagePourResultat RIEN → "" (propriété §8 RIEN) ── */
test('message RIEN → chaîne vide', () => {
  const msg = messagePourResultat({ resultat: 'RIEN' });
  assertEq(msg, '');
});

/* ── P10 — couleurPourResultat OK → vert (#4caf50) ── */
test('couleur OK → #4caf50', () => {
  assertEq(couleurPourResultat({ resultat: 'OK' }), '#4caf50');
});

/* ── P11 — couleurPourResultat DEJA_POINTE → orange (#ff9800) ── */
test('couleur DEJA_POINTE → #ff9800', () => {
  assertEq(couleurPourResultat({ resultat: 'DEJA_POINTE' }), '#ff9800');
});

/* ── P12 — couleurPourResultat ERREUR → rouge (#f44336) ── */
test('couleur ERREUR → #f44336', () => {
  assertEq(couleurPourResultat({ resultat: 'ERREUR' }), '#f44336');
});

/* ── P13 — couleurPourResultat HORS_SESSION → gris (#9e9e9e) ── */
test('couleur HORS_SESSION → #9e9e9e', () => {
  assertEq(couleurPourResultat({ resultat: 'HORS_SESSION' }), '#9e9e9e');
});

/* ── P14 — couleurPourResultat RIEN → transparent ── */
test('couleur RIEN → transparent', () => {
  assertEq(couleurPourResultat({ resultat: 'RIEN' }), 'transparent');
});

/* ── P15 — Bouton texte initial (propriété §C5 — sélecteur + bouton visibles) ── */
test('bouton btn-scan affiche "Démarrer le scan" au départ', async () => {
  const div = document.createElement('div');
  await screenScan(div, {});
  const btn = div.querySelector('#btn-scan');
  assertEq(btn.textContent, 'Démarrer le scan');
});

/* ── P16 — getOverrideValue reflète le changement du sélecteur ── */
test('getOverrideValue reflète le changement de sélecteur', async () => {
  const div = document.createElement('div');
  const ctrl = await screenScan(div, {});
  const matin = div.querySelector('input[value="matin"]');
  matin.checked = true;
  assertEq(ctrl.getOverrideValue(), 'matin');
  const midi = div.querySelector('input[value="midi"]');
  midi.checked = true;
  assertEq(ctrl.getOverrideValue(), 'midi');
  const auto = div.querySelector('input[value="auto"]');
  auto.checked = true;
  assertEq(ctrl.getOverrideValue(), 'auto');
});
