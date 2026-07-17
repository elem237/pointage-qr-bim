import { test, assert, assertEq } from './harness.js';
import { screenSetup } from '../js/ui/screen-setup.js';
import { DEFAULTS, getConfig, hydrateConfig } from '../js/config.js';
import { renderBadges } from '../js/badges.js';

function div() {
  return document.createElement('div');
}

function fakeStore() {
  return {
    getPointages: () => new Map(),
    reg: async () => ({ resultat: 'OK' }),
    cancel: async () => ({ resultat: 'OK' }),
    loadAllPointages: async () => {},
  };
}

/* ── US1 — screenSetup est une fonction ── */
test('US1 — screenSetup est une fonction', () => {
  assert(typeof screenSetup === 'function');
});

/* ── US2 — Bandeau rouge présent avec dates de test ── */
test('US2 — bandeau rouge avec dates de test', () => {
  hydrateConfig({ DATES: ['2026-07-20', '2026-07-21', '2026-07-22'] });
  const d = div();
  screenSetup(d);
  const banner = d.querySelector('.setup-banner');
  assert(banner !== null, 'bandeau pr\u00e9sent');
  assert(banner.textContent.includes('Mode test'), 'texte Mode test');
  assert(banner.textContent.includes('20'), 'contient la date test');
  assert(banner.textContent.includes('juil.'), 'contient le mois test');
  assert(banner.textContent.includes('ao\u00fbt'), 'contient le mois r\u00e9el');
});

/* ── US3 — Bandeau ABSENT avec les vraies dates ── */
test('US3 — pas de bandeau avec dates r\u00e9elles', () => {
  hydrateConfig({});
  const cfg = getConfig();
  assertEq(cfg.DATES.join(','), DEFAULTS.DATES.join(','), 'DATES = r\u00e9elles');
  const d = div();
  screenSetup(d);
  const banner = d.querySelector('.setup-banner');
  assert(banner === null, 'pas de bandeau');
});

/* ── US4 — Carte Dates : 3 champs ── */
test('US4 — carte Dates a 3 champs', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  const inputs = d.querySelectorAll('.setup-date');
  assertEq(inputs.length, 3, '3 champs date');
  inputs.forEach((inp, i) => {
    assertEq(inp.type, 'date', 'type=date');
    assertEq(inp.value, DEFAULTS.DATES[i], 'date ' + i + ' = ' + DEFAULTS.DATES[i]);
  });
});

/* ── US5 — Bouton retour dates réelles et +2 jours ── */
test('US5 — boutons R\u00e9tablir et +2 jours pr\u00e9sents', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  assert(d.querySelector('#setup-reset-dates') !== null, 'bouton r\u00e9tablir');
  assert(d.querySelector('#setup-today-plus-2') !== null, 'bouton +2 jours');
});

/* ── US6 — Carte Créneaux : 3 champs, bascule mise en évidence ── */
test('US6 — carte Cr\u00e9neaux a 3 champs et bascule en \u00e9vidence', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  const hd = d.querySelector('#setup-h-debut');
  const hb = d.querySelector('#setup-h-bascule');
  const hf = d.querySelector('#setup-h-fin');
  assert(hd !== null, 'H_DEBUT_MATIN');
  assert(hb !== null, 'H_BASCULE');
  assert(hf !== null, 'H_FIN_MIDI');
  assertEq(hd.value, DEFAULTS.H_DEBUT_MATIN);
  assertEq(hb.value, DEFAULTS.H_BASCULE);
  assertEq(hf.value, DEFAULTS.H_FIN_MIDI);
  const basculeLabel = hb.closest('label');
  assert(basculeLabel.classList.contains('setup-creneau-focus'), 'bascule en \u00e9vidence');
});

/* ── US7 — Carte Badges : 3 boutons ── */
test('US7 — carte Badges a imprimer/exporter/importer', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  assert(d.querySelector('#setup-print-badges') !== null, 'imprimer');
  assert(d.querySelector('#setup-export') !== null, 'exporter');
  assert(d.querySelector('#setup-import') !== null, 'importer');
});

/* ── US8 — Zone dangereuse : bordure, bouton contour rouge ── */
test('US8 — zone dangereuse : bordure et bouton contour rouge', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  const card = d.querySelector('.setup-card--danger');
  assert(card !== null, 'carte danger');
  const btn = d.querySelector('#setup-clear-all');
  assert(btn !== null, 'bouton effacer');
  assert(btn.disabled === true, 'd\u00e9sactiv\u00e9 par d\u00e9faut');
  /* Vérifie que c'est un bouton contour (pas --vert-900) */
  assert(btn.classList.contains('setup-btn--danger-outline'), 'bouton contour rouge');
});

/* ── US9 — « SUPPRIMER » mal tapé → bouton inerte ── */
test('US9 — "SUPPRIMER" mal tap\u00e9 : le bouton reste inerte', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  const input = d.querySelector('#setup-confirm-input');
  const btn = d.querySelector('#setup-clear-all');
  input.value = 'SUPPRIME';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  assert(btn.disabled === true, 'd\u00e9sactiv\u00e9 avec SUPPRIME');
  input.value = 'SUPPRIMER';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  assert(btn.disabled === false, 'activ\u00e9 avec SUPPRIMER');
  input.value = 'SUPPRIMEZ';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  assert(btn.disabled === true, 'd\u00e9sactiv\u00e9 avec SUPPRIMEZ');
});

/* ── US10 — Pied : Hors-ligne présent ── */
test('US10 — pied Hors-ligne pr\u00e9sent', () => {
  hydrateConfig({});
  const d = div();
  screenSetup(d);
  const footer = d.querySelector('#setup-footer');
  assert(footer !== null, 'pied pr\u00e9sent');
  assert(footer.textContent.length > 0, 'pied non vide');
});
