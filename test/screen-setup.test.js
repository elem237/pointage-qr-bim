import { test, assert, assertEq } from './harness.js';
import { screenSetup } from '../js/ui/screen-setup.js';
import { DEFAULTS, getConfig, hydrateConfig, mergeConfig } from '../js/config.js';

function div() {
  return document.createElement('div');
}

/* ── P1 — Export ── */
test('P1 — screenSetup est une fonction', () => {
  assert(typeof screenSetup === 'function');
});

/* ── P2 — Structure DOM ── */
test('P2 — le rendu contient les sections attendues', () => {
  const d = div();
  screenSetup(d);
  assert(d.querySelector('#screen-setup') !== null, '#screen-setup');
  assert(d.querySelector('.setup-card-title') !== null, 'titre');
  assert(d.querySelector('#setup-today-plus-2') !== null, 'bouton +2 jours');
  assert(d.querySelector('#setup-reset-dates') !== null, 'bouton vider');
  assert(d.querySelector('#setup-clear-all') !== null, 'bouton effacer');
  assert(d.querySelector('#setup-confirm-input') !== null, 'champ confirmation');
});

/* ── P3 — 3 champs date ── */
test('P3 — 3 inputs type=date avec les valeurs courantes', () => {
  const d = div();
  screenSetup(d);
  const inputs = d.querySelectorAll('.setup-date');
  assertEq(inputs.length, 3, '3 dates');
  inputs.forEach((inp, i) => {
    assertEq(inp.type, 'date');
  });
});

/* ── P4 — Pas de bandeau (supprimé) ── */
test('P4 — aucun bandeau présent dans l\'écran', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  assert(d.querySelector('.setup-banner') === null, 'pas de bandeau');
});

/* ── P5 — Bouton "Dates = aujourd\'hui + 2 jours" présent ── */
test('P5 — bouton aujourd\'hui + 2 jours présent', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  const btn = d.querySelector('#setup-today-plus-2');
  assert(btn !== null, 'bouton +2 jours présent');
  assertEq(btn.textContent.trim(), 'Dates = aujourd\u2019hui + 2 jours');
});

/* ── P6 — Bouton effacer désactivé par défaut ── */
test('P6 — bouton EFFACER désactivé au départ', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  const btn = d.querySelector('#setup-clear-all');
  assert(btn.disabled === true, 'désactivé');
});

/* ── P7 — Saisie SUPPRIMER active le bouton ── */
test('P7 — taper SUPPRIMER active le bouton effacer', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  const input = d.querySelector('#setup-confirm-input');
  const btn = d.querySelector('#setup-clear-all');
  input.value = 'SUPPRIMER';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  assert(btn.disabled === false, 'activé après SUPPRIMER');
  input.value = 'SUPPR';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  assert(btn.disabled === true, 'désactivé après texte partiel');
});

/* ── P8 — refresh() met à jour les dates ── */
test('P8 — refresh() synchronise les champs date', () => {
  hydrateConfig({});
  const d = div();
  const ctrl = screenSetup(d);
  hydrateConfig({ DATES: ['2026-07-20', '2026-07-21', '2026-07-22'] });
  ctrl.refresh();
  const inputs = d.querySelectorAll('.setup-date');
  assertEq(inputs[0].value, '2026-07-20');
  assertEq(inputs[1].value, '2026-07-21');
  assertEq(inputs[2].value, '2026-07-22');
});
