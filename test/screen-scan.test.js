import { test, assert, assertEq } from './harness.js';
import {
  screenScan,
  formatTau,
  messagePourResultat,
  updateCounter,
  renderEtatPanel,
  ERREUR_LABELS,
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

/* ── P2 — DOM structure — 4 bandes ── */
test('screenScan crée les 4 bandes', async () => {
  const div = document.createElement('div');
  const ctrl = await screenScan(div, { getPointages: () => new Map() });
  assert(div.querySelector('#screen-scan') !== null, '#screen-scan');
  assert(div.querySelector('#scan-counter') !== null, 'compteur');
  assert(div.querySelector('#scan-counter-left') !== null, 'compteur gauche');
  assert(div.querySelector('#scan-counter-right') !== null, 'compteur droit');
  assert(div.querySelector('#scan-camera') !== null, 'caméra');
  assert(div.querySelector('#camera-feed') !== null, '#camera-feed');
  assert(div.querySelector('#scan-reticle') !== null, 'réticule');
  assert(div.querySelector('#scan-selector') !== null, 'sélecteur');
  assert(div.querySelector('#scan-result') !== null, 'panneau retour');
  assert(div.querySelector('#scan-result-inner') !== null, 'panneau intérieur');
  if (ctrl && typeof ctrl.arreterScan === 'function') ctrl.arreterScan();
});

/* ── P3 — Default override auto ── */
test('le sélecteur par défaut est auto', async () => {
  const div = document.createElement('div');
  const ctrl = await screenScan(div, { getPointages: () => new Map() });
  assert(div.querySelector('.sel-btn.active') !== null, 'un segment actif');
  assertEq(div.querySelector('.sel-btn.active').dataset.val, 'auto', 'auto par défaut');
  if (ctrl && typeof ctrl.arreterScan === 'function') setTimeout(() => ctrl.arreterScan(), 0);
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

/* ── P5 — messagePourResultat OK ── */
test('message OK affiche "Pointé"', () => {
  const msg = messagePourResultat({
    resultat: 'OK',
    participant: { nomComplet: 'YEBGA Jacques Albert' },
  });
  assertEq(msg, 'Pointé');
});

/* ── P6 — messagePourResultat DEJA_POINTE ── */
test('message DEJA_POINTE affiche "Déjà pointé à HHhMM"', () => {
  const tau = new Date('2026-08-04T07:42:00Z').getTime();
  const msg = messagePourResultat({ resultat: 'DEJA_POINTE', tau });
  assertEq(msg, 'Déjà pointé à 08h42');
});

/* ── P7 — messagePourResultat ERREUR ── */
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

/* ── P8 — messagePourResultat HORS_SESSION ── */
test('message HORS_SESSION → "Hors créneau"', () => {
  const msg = messagePourResultat({ resultat: 'HORS_SESSION' });
  assertEq(msg, 'Hors créneau');
});

/* ── P9 — messagePourResultat RIEN ── */
test('message RIEN → chaîne vide', () => {
  const msg = messagePourResultat({ resultat: 'RIEN' });
  assertEq(msg, '');
});

/* ── P10-P14 — couleurPourResultat est remplacé par renderEtatPanel ── */
/* Les couleurs sont testées via renderEtatPanel dans ui-scan.test.js */

/* ── P15 — Structure panneau initial ── */
test('panneau de retour existe avec les bons ID', async () => {
  const div = document.createElement('div');
  const ctrl = await screenScan(div, { getPointages: () => new Map() });
  assert(div.querySelector('#scan-result') !== null, '#scan-result');
  assert(div.querySelector('#scan-result-inner') !== null, '#scan-result-inner');
  if (ctrl && typeof ctrl.arreterScan === 'function') setTimeout(() => ctrl.arreterScan(), 0);
});

/* ── P16 — getOverrideValue reflète le changement du sélecteur ── */
test('getOverrideValue reflète le changement de sélecteur', async () => {
  const div = document.createElement('div');
  const ctrl = await screenScan(div, { getPointages: () => new Map() });
  const btns = div.querySelectorAll('.sel-btn');
  btns[1].click();
  assertEq(ctrl.getOverrideValue(), 'matin');
  btns[2].click();
  assertEq(ctrl.getOverrideValue(), 'midi');
  btns[0].click();
  assertEq(ctrl.getOverrideValue(), 'auto');
  if (ctrl && typeof ctrl.arreterScan === 'function') setTimeout(() => ctrl.arreterScan(), 0);
});
