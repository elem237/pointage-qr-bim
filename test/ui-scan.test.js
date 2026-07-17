/**
 * U2 — Tests écran Scan (INTERFACE.md §5)
 */
import { test, assert, assertEq } from './harness.js';
import {
  screenScan,
  formatTau,
  messagePourResultat,
  renderEtatPanel,
  updateCounter,
  ERREUR_LABELS,
} from '../js/ui/screen-scan.js';
import { PARTICIPANTS } from '../js/data.js';

/* ── Export ── */
test('screenScan est une fonction', () => {
  assert(typeof screenScan === 'function');
});

test('formatTau est une fonction', () => {
  assert(typeof formatTau === 'function');
});

test('messagePourResultat est une fonction', () => {
  assert(typeof messagePourResultat === 'function');
});

/* ── Compteur — hors créneau ── */
test('compteur affiche « — / 16 » quand slotAvecOverride retourne null', () => {
  const div = document.createElement('div');
  div.innerHTML = '<div id="scan-counter"><span id="scan-counter-left"></span><span id="scan-counter-right"></span></div>';

  /* T hors fenêtre de pointage → slotAvecOverride renvoie null */
  const tHors = new Date('2026-08-04T03:00:00Z').getTime() - 3600000; /* 04:00 UTC = 05:00 Douala, hors fenêtre */
  const store = { getPointages: () => new Map() };
  updateCounter(div, store, tHors, 'auto');

  assertEq(div.querySelector('#scan-counter-left').textContent, 'Hors créneau');
  assert(
    div.querySelector('#scan-counter-right').innerHTML.includes('\u2014') ||
    div.querySelector('#scan-counter-right').innerHTML.includes('&mdash;'),
    'devrait contenir —'
  );
});

/* ── Compteur — compte les présents du slot courant seulement ── */
test('compteur ne compte que les present du slot courant', () => {
  const div = document.createElement('div');
  div.innerHTML = '<div id="scan-counter"><span id="scan-counter-left"></span><span id="scan-counter-right"></span></div>';

  const t = new Date('2026-08-04T08:00:00Z').getTime() - 3600000; /* 09:00 Douala → matin */
  const m = new Map();

  /* Participant 1 pointé sur J1 matin (ok) */
  m.set('BIM26-001|2026-08-04|matin', { generation: 0, statut: 'actif', tau: t, mode: 'scan', device: 'd1', override: 'auto' });
  /* Participant 2 pointé sur J1 midi (ne doit PAS compter dans le compteur matin) */
  m.set('BIM26-002|2026-08-04|midi', { generation: 0, statut: 'actif', tau: t, mode: 'scan', device: 'd1', override: 'auto' });

  const store = { getPointages: () => m };
  updateCounter(div, store, t, 'auto');

  const right = div.querySelector('#scan-counter-right');
  assertEq(div.querySelector('#scan-counter-left').textContent, 'Jour 1 · Matin');
  assertEq(right.textContent.replace(/\s+/g, ' ').trim(), '1 / 16 pointés');
});

/* ── formatTau ── */
test('formatTau: 2026-08-04 08:42 UTC+1 → "08:42"', () => {
  const tau = new Date('2026-08-04T07:42:00Z').getTime();
  assertEq(formatTau(tau), '08:42');
});

test('formatTau: 2026-08-04 13:05 UTC+1 → "13:05"', () => {
  const tau = new Date('2026-08-04T12:05:00Z').getTime();
  assertEq(formatTau(tau), '13:05');
});

/* ── messagePourResultat (nouveaux messages INTERFACE.md §5.4) ── */
test('message OK → "Pointé"', () => {
  const msg = messagePourResultat({ resultat: 'OK', participant: { nomComplet: 'X' } });
  assertEq(msg, 'Pointé');
});

test('message DEJA_POINTE → "Déjà pointé à HHhMM"', () => {
  const tau = new Date('2026-08-04T07:42:00Z').getTime();
  const msg = messagePourResultat({ resultat: 'DEJA_POINTE', tau });
  assertEq(msg, 'Déjà pointé à 08h42');
});

test('message ERREUR format → "Format non reconnu"', () => {
  assertEq(messagePourResultat({ resultat: 'ERREUR', code: 'format' }), 'Format non reconnu');
});

test('message ERREUR checksum → "Checksum invalide"', () => {
  assertEq(messagePourResultat({ resultat: 'ERREUR', code: 'checksum' }), 'Checksum invalide');
});

test('message ERREUR inconnu → "Code inconnu"', () => {
  assertEq(messagePourResultat({ resultat: 'ERREUR', code: 'inconnu' }), 'Code inconnu');
});

test('message HORS_SESSION → "Hors créneau"', () => {
  assertEq(messagePourResultat({ resultat: 'HORS_SESSION' }), 'Hors créneau');
});

test('message RIEN → chaîne vide', () => {
  assertEq(messagePourResultat({ resultat: 'RIEN' }), '');
});

/* ── Panneau 6 états — rendu DOM ── */

function etatContainer() {
  const div = document.createElement('div');
  div.innerHTML = '<div id="scan-result"><div id="scan-result-inner"></div></div>';
  return div;
}

test('état OK → fond --vert-500 + nom + sous-titre + id', () => {
  const div = etatContainer();
  const t = new Date('2026-08-04T07:42:00Z').getTime();
  const result = { resultat: 'OK', participant: { nomComplet: 'YEBGA Jacques Albert', numero: 1 } };
  const si = { label: 'Jour 1 · Matin', labelCourt: 'J1 Matin' };
  renderEtatPanel(div, result, si, t, null);

  const panel = div.querySelector('#scan-result');
  const inner = div.querySelector('#scan-result-inner');

  assert(panel.style.background.includes('--vert-500'), `fond vert, got: ${panel.style.background}`);
  assert(inner.innerHTML.includes('YEBGA Jacques Albert'), 'contient le nom');
  assert(
    inner.innerHTML.includes('J1 Matin'),
    `contient J1 Matin, got: ${inner.innerHTML}`
  );
  assert(inner.innerHTML.includes('08h42'), 'contient l\'heure formatée');
  assert(inner.innerHTML.includes('BIM26-001'), 'contient l\'ID');
});

test('état DEJA_POINTE → fond #ca8a04 + "Déjà pointé à" + nom', () => {
  const div = etatContainer();
  const tau = new Date('2026-08-04T07:42:00Z').getTime();
  const result = { resultat: 'DEJA_POINTE', tau };
  const participant = { nomComplet: 'ANYOUZO\u2019A Marc Thyrille', numero: 2 };
  renderEtatPanel(div, result, null, null, participant);

  const panel = div.querySelector('#scan-result');
  const inner = div.querySelector('#scan-result-inner');

  const bg = panel.style.background;
  assert(bg === '#ca8a04' || bg === 'rgb(202, 138, 4)', 'fond #ca8a04, got: ' + bg);
  assert(inner.innerHTML.includes('Déjà pointé à 08h42'), 'contient le message');
  assert(inner.innerHTML.includes('ANYOUZO\u2019A Marc Thyrille'), 'contient le nom');
});

test('état ERREUR format → fond --danger + "Format non reconnu"', () => {
  const div = etatContainer();
  renderEtatPanel(div, { resultat: 'ERREUR', code: 'format' }, null);

  const panel = div.querySelector('#scan-result');
  const inner = div.querySelector('#scan-result-inner');

  assert(panel.style.background.includes('--danger'), `fond danger, got: ${panel.style.background}`);
  assert(inner.innerHTML.includes('Format non reconnu'));
});

test('état ERREUR checksum → fond --danger + "Checksum invalide"', () => {
  const div = etatContainer();
  renderEtatPanel(div, { resultat: 'ERREUR', code: 'checksum' }, null);

  const inner = div.querySelector('#scan-result-inner');
  assert(inner.innerHTML.includes('Checksum invalide'));
});

test('état ERREUR inconnu → fond --danger + "Code inconnu"', () => {
  const div = etatContainer();
  renderEtatPanel(div, { resultat: 'ERREUR', code: 'inconnu' }, null);

  const inner = div.querySelector('#scan-result-inner');
  assert(inner.innerHTML.includes('Code inconnu'));
});

test('état HORS_SESSION → fond #57534e + "Hors créneau"', () => {
  const div = etatContainer();
  renderEtatPanel(div, { resultat: 'HORS_SESSION' }, null);

  const panel = div.querySelector('#scan-result');
  const inner = div.querySelector('#scan-result-inner');

  const bg2 = panel.style.background;
  assert(bg2 === '#57534e' || bg2 === 'rgb(87, 83, 78)', 'fond #57534e, got: ' + bg2);
  assert(inner.innerHTML.includes('Hors créneau'));
});

test('état RIEN → fond --surf-1 + "Présentez un badge"', () => {
  const div = etatContainer();
  renderEtatPanel(div, { resultat: 'RIEN' }, null);

  const panel = div.querySelector('#scan-result');
  const inner = div.querySelector('#scan-result-inner');

  assert(panel.style.background.includes('--surf-1'), `fond surf-1, got: ${panel.style.background}`);
  assert(inner.innerHTML.includes('Présentez un badge'));
});

/* ── Nom long sans troncature ── */
test('nom "BUINDA Theophilus YUKBANWI" rend sans overflow ni troncature', () => {
  const div = etatContainer();
  const t = new Date('2026-08-04T07:42:00Z').getTime();
  const result = { resultat: 'OK', participant: { nomComplet: 'BUINDA Theophilus YUKBANWI', numero: 8 } };
  const si = { label: 'Jour 1 · Matin', labelCourt: 'J1 Matin' };
  renderEtatPanel(div, result, si, t, null);

  const nameEl = div.querySelector('.result-name');
  assert(nameEl !== null, '.result-name existe');
  assertEq(nameEl.textContent, 'BUINDA Theophilus YUKBANWI');

  /* Vérifier l'absence de propriétés CSS qui tronquent */
  const style = getComputedStyle(nameEl);
  /* text-overflow doit être clip (valeur par défaut) ou absent */
  assert(style.textOverflow !== 'ellipsis', 'pas de text-overflow:ellipsis');
  /* white-space ne doit pas être nowrap */
  assert(style.whiteSpace !== 'nowrap', 'pas de white-space:nowrap');
  /* overflow-x ne doit pas être hidden/auto — Chrome retourne '' pour visible */
  assert(
    style.overflowX === 'visible' || style.overflowX === '',
    `pas d'overflow caché (${style.overflowX})`
  );
  /* pas de troncature par hauteur */
  assert(style.maxHeight === 'none' || style.maxHeight === '', `pas de max-height restrictif (${style.maxHeight})`);
});

/* ── ERREUR_LABELS contient les 3 clés ── */
test('ERREUR_LABELS a les 3 codes', () => {
  assert(ERREUR_LABELS.format === 'Format non reconnu');
  assert(ERREUR_LABELS.checksum === 'Checksum invalide');
  assert(ERREUR_LABELS.inconnu === 'Code inconnu');
});
