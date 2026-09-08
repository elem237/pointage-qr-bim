import { test, assert, assertEq } from './harness.js';
import { screenList, filtrerParticipants, resetFilter } from '../js/ui/screen-list.js';
import { mergeConfig } from '../js/config.js';
import { PARTICIPANTS } from '../js/data.js';

test('L0 — setup dates', () => {
  mergeConfig({ DATES: ['2026-08-04', '2026-08-05', '2026-08-06'] });
});

function div() {
  return document.createElement('div');
}

/* ── L1 — Export ── */
test('L1 — screenList est une fonction (SPEC D1–D4)', () => {
  assert(typeof screenList === 'function');
});

/* ── L2 — Structure DOM (SPEC D1 — recherche, D2 — pointage manuel, D3 — annulation) ── */
test('L2 — le rendu contient les éléments attendus', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  screenList(d, fakeStore, new Map());
  assert(d.querySelector('#screen-list') !== null, '#screen-list');
  assert(d.querySelector('#ls-search') !== null, 'champ recherche');
  assert(d.querySelector('#ls-rows') !== null, 'conteneur lignes');
  assert(d.querySelector('#ls-filter-all') !== null, 'filtre Tous');
  assert(d.querySelector('#ls-filter-abs') !== null, 'filtre Absents');
  assert(d.querySelector('#ls-export') !== null, 'bouton export');
  assert(d.querySelector('#ls-import') !== null, 'bouton import');
  assert(d.querySelector('.ls-legend') !== null, 'légende');
});

/* ── L3 — N lignes dans la liste (SPEC D4 — affiche l'état) ── */
test('L3 — N lignes de participants rendues', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  screenList(d, fakeStore, new Map());
  const rows = d.querySelectorAll('.ls-row');
  assertEq(rows.length, PARTICIPANTS.length, `${PARTICIPANTS.length} participants`);
});

/* ── L4 — nom + 6 pastilles + action par ligne (SPEC D4 — P 08h42 / A / —) ── */
test('L4 — chaque ligne a num + nom + menu + 6 pastilles', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  screenList(d, fakeStore, new Map());
  const firstRow = d.querySelector('.ls-row');
  assert(firstRow.querySelector('.ls-num') !== null, 'numéro');
  assert(firstRow.querySelector('.ls-name') !== null, 'nom');
  assert(firstRow.querySelector('.ls-menu-btn') !== null, 'bouton menu');
  const pastilles = firstRow.querySelectorAll('.ls-pastille');
  assertEq(pastilles.length, 6, '6 pastilles');
});

/* ── L5 — 3 boutons radio override via le menu (SPEC D2 — sélecteur Auto/Matin/Midi) ── */
test('L5 — menu ⋯ → Pointer → 3 radios auto, matin, midi', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  screenList(d, fakeStore, new Map());
  const menuBtn = d.querySelector('.ls-menu-btn[data-numero="1"]');
  assert(menuBtn !== null, 'bouton menu participant 1');
  menuBtn.click();
  const pointerItem = d.querySelector('.ls-menu-popup [data-action="pointer"]');
  assert(pointerItem !== null, 'entrée « Pointer manuellement »');
  pointerItem.click();
  const radios = d.querySelectorAll('input[name="ls-popup-ov"]');
  assertEq(radios.length, 3, '3 radios');
  const values = Array.from(radios).map(r => r.value);
  assert(values.includes('auto'), 'auto présent');
  assert(values.includes('matin'), 'matin présent');
  assert(values.includes('midi'), 'midi présent');
});

/* ── L6 — Les pastilles d'état montrent — pour vide (SPEC D4 — état vide = —) ── */
test('L6 — pastilles vides affichent —', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  const tFarPast = Date.parse('2026-06-01T00:00:00');
  screenList(d, fakeStore, new Map(), tFarPast);
  const pastilles = d.querySelectorAll('.ls-row .ls-pastille');
  assert(pastilles.length > 0, 'des pastilles d\'état');
  pastilles.forEach(el => {
    assert(el.textContent.includes('—'), 'vide = —');
  });
});

/* ── L7 — Pas de fuite de vocabulaire modèle (AJOUT §D2) ── */
test('L7 — pas de "Mt"/"Md" dans les clés ou statuts JS', () => {
  const src = screenList.toString();
  // On vérifie qu'il n'y a pas de comparaison à 'Mt' ou 'Md' en JS
  assert(!src.includes("'Mt'"), 'pas de littéral Mt');
  assert(!src.includes("'Md'"), 'pas de littéral Md');
});

/* ── L8 — Exports présents (SPEC étape 13 — import/export) ── */
test('L8 — boutons export et import visibles dans le DOM', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  screenList(d, fakeStore, new Map());
  const exportBtn = d.querySelector('#ls-export');
  const importBtn = d.querySelector('#ls-import');
  assert(exportBtn !== null, 'bouton export');
  assert(importBtn !== null, 'bouton import');
  assertEq(exportBtn.getAttribute('title'), 'Exporter');
  assertEq(importBtn.getAttribute('title'), 'Importer');
});

/* ── L9 — refresh() est une fonction (SPEC D1-D4 — mise à jour) ── */
test('L9 — refresh() est une fonction', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  const ctrl = screenList(d, fakeStore, new Map());
  assert(typeof ctrl.refresh === 'function');
});

/* ── L10 — filtrerParticipants avec vide retourne N (SPEC D1 — recherche) ── */
test('L10 — filtrerParticipants("") retourne N participants', () => {
  resetFilter();
  const r = filtrerParticipants('');
  assertEq(r.length, PARTICIPANTS.length);
});

/* ── L11 — filtrerParticipants par nom (SPEC D1 — sous-chaîne) ── */
test('L11 — filtrerParticipants trouve "yebga" (insensible, normalisé)', () => {
  resetFilter();
  const r = filtrerParticipants('yebga');
  assertEq(r.length, 1);
  assertEq(r[0].nomComplet, 'YEBGA Jacques Albert');
});

/* ── L12 — filtrerParticipants trouve avec apostrophe normalisée (SPEC A1 norm) ── */
test('L12 — filtrerParticipants trouve "anyouzo" (apostrophe normalisée)', () => {
  resetFilter();
  const r = filtrerParticipants('anyouzo');
  assertEq(r.length, 1);
  assertEq(r[0].nomComplet, "ANYOUZO’A Marc Thyrille");
});

/* ── L13 — filtrerParticipants sous-chaîne partielle (SPEC D1) ── */
test('L13 — filtrerParticipants "sté" trouve le seul Stéphane (liste révisée)', () => {
  resetFilter();
  const r = filtrerParticipants('st\u00e9');
  assertEq(r.length, 1);
  assertEq(r[0].nomComplet, 'NDJOMO Christian St\u00e9phane');
});

/* ── L14 — filtrerParticipants avec accent aigu (SPEC D1 — recherche normalisée) ── */
test('L14 — filtrerParticipants "steph" (sans accent) trouve NDJOMO Christian Stéphane', () => {
  resetFilter();
  const r = filtrerParticipants('steph');
  // Seul Stéphane reste dans la liste révisée (Stéphanie supprimée)
  assertEq(r.length, 1);
  assertEq(r[0].nomComplet, 'NDJOMO Christian St\u00e9phane');
});

/* ── L15 — Monotonie : filtrerParticipants depuis résultat précédent (SPEC D1 monotonie) ── */
test('L15 — filtrerParticipants monotone : restreindre depuis résultat filtré', () => {
  resetFilter();
  const d = filtrerParticipants('b');
  // Noms contenant 'b' (liste révisée) : YEBGA, ENAM NDONGO Benjamin Davy,
  // BELLA, LOMIE MPELLE Kenny Borel, BUINDA, BAYOKOLAK
  resetFilter();
  const d2 = filtrerParticipants('b');
  // Si on refiltre depuis un résultat déjà filtré, on doit avoir le même résultat
  // que depuis 0 — car resetFilter a été appelé
  assertEq(d.length, d2.length, 'même résultat après reset');
  // Appel sans reset : doit filtrer depuis le cache
  const d3 = filtrerParticipants('be');
  // Parmi les 'b', ceux qui contiennent 'be' : BELLA, ENAM NDONGO (Benjamin)
  assert(d3.length > 0 && d3.length <= d.length, 'd3 ⊆ d');
});
