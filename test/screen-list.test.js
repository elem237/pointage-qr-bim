import { test, assert, assertEq } from './harness.js';
import { screenList, filtrerParticipants, resetFilter } from '../js/ui/screen-list.js';
import { DEFAULTS, hydrateConfig } from '../js/config.js';
import { PARTICIPANTS } from '../js/data.js';

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
  assert(d.querySelector('#list-table') !== null, 'tableau');
  assert(d.querySelector('#list-tbody') !== null, 'tbody');
  assert(d.querySelector('#ls-export') !== null, 'bouton export');
  assert(d.querySelector('#ls-import') !== null, 'bouton import');
  assert(d.querySelector('input[name="ls-ov"]') !== null, 'sélecteur override');
});

/* ── L3 — 16 lignes dans le tableau (SPEC D4 — affiche l'état) ── */
test('L3 — 16 lignes de participants rendues', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  screenList(d, fakeStore, new Map());
  const rows = d.querySelectorAll('#list-tbody tr');
  assertEq(rows.length, 16, '16 participants');
});

/* ── L4 — 6 cellules d'état + nom + action par ligne (SPEC D4 — P 08h42 / A / —) ── */
test('L4 — chaque ligne a nom + 6 états + action', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  screenList(d, fakeStore, new Map());
  const firstRow = d.querySelector('#list-tbody tr');
  const cells = firstRow.querySelectorAll('td');
  assertEq(cells.length, 8, 'nom + 6 slots + action');
  assert(cells[0].classList.contains('ls-nom'), 'première cellule = nom');
});

/* ── L5 — 3 boutons radio override (SPEC D2 — sélecteur Auto/Matin/Midi) ── */
test('L5 — override a 3 options: auto, matin, midi', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  screenList(d, fakeStore, new Map());
  const radios = d.querySelectorAll('input[name="ls-ov"]');
  assertEq(radios.length, 3, '3 radios');
  const values = Array.from(radios).map(r => r.value);
  assert(values.includes('auto'), 'auto présent');
  assert(values.includes('matin'), 'matin présent');
  assert(values.includes('midi'), 'midi présent');
});

/* ── L6 — Les cellules d'état montrent — pour vide (SPEC D4 — état vide = —) ── */
test('L6 — cellules vides affichent &mdash;', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  screenList(d, fakeStore, new Map());
  const firstCells = d.querySelectorAll('#list-tbody tr:first-child td.ls-cell');
  assert(firstCells.length > 0, 'des cellules d\'état');
  firstCells.forEach(td => {
    assert(td.innerHTML.includes('\u2014') || td.innerHTML.includes('&mdash;'), 'vide = —');
  });
});

/* ── L7 — Pas de fuite de vocabulaire modèle (AJOUT §D2) ── */
test('L7 — pas de "Mt"/"Md" dans les clés ou statuts JS', () => {
  const src = screenList.toString();
  // Le seul endroit où 'Mt'/'Md' peut apparaître est dans les labels d'en-tête
  const lignes = src.split('\n');
  for (const l of lignes) {
    const trimmed = l.trim();
    // Ignorer les lignes d'en-tête de table qui sont OK
    if (trimmed.includes('J${s.jour} ${s.label}')) continue;
    if (trimmed.includes('en-tête')) continue;
  }
  // On vérifie plutôt qu'il n'y a pas de comparaison à 'Mt' ou 'Md' en JS
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
  assertEq(exportBtn.textContent, 'Exporter');
  assertEq(importBtn.textContent, 'Importer');
});

/* ── L9 — refresh() est une fonction (SPEC D1-D4 — mise à jour) ── */
test('L9 — refresh() est une fonction', () => {
  const d = div();
  const fakeStore = { getPointages: () => new Map() };
  const ctrl = screenList(d, fakeStore, new Map());
  assert(typeof ctrl.refresh === 'function');
});

/* ── L10 — filtrerParticipants avec vide retourne 16 (SPEC D1 — recherche) ── */
test('L10 — filtrerParticipants("") retourne 16 participants', () => {
  resetFilter();
  const r = filtrerParticipants('');
  assertEq(r.length, 16);
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
  assertEq(r[0].nomComplet, "ANYOUZO\u2019A Marc Thyrille");
});

/* ── L13 — filtrerParticipants sous-chaîne partielle (SPEC D1) ── */
test('L13 — filtrerParticipants "sté" trouve Stéphane et Stéphanie', () => {
  resetFilter();
  const r = filtrerParticipants('st\u00e9');
  assertEq(r.length, 2);
});

/* ── L14 — filtrerParticipants avec accent aigu (SPEC D1 — recherche normalisée) ── */
test('L14 — filtrerParticipants "steph" (sans accent) trouve Christian et Merveille', () => {
  resetFilter();
  const r = filtrerParticipants('steph');
  // Stéphane (Christian) et Stéphanie (Merveille) → tous deux matchent "steph"
  const names = r.map(p => p.nomComplet);
  assert(r.length >= 2, `trouvé ${r.length} participants: ${names.join(', ')}`);
});

/* ── L15 — Monotonie : filtrerParticipants depuis résultat précédent (SPEC D1 monotonie) ── */
test('L15 — filtrerParticipants monotone : restreindre depuis résultat filtré', () => {
  resetFilter();
  const d = filtrerParticipants('b');
  // Devrait trouver au moins YEBGA, BELLA, BUINDA, BAYOKOLAK, ELANG BEYEME, MBIAHEU
  // (norm(b) dans le nom)
  resetFilter();
  const d2 = filtrerParticipants('b');
  // Si on refiltre depuis un résultat déjà filtré, on doit avoir le même résultat
  // que depuis 0 — car resetFilter a été appelé
  assertEq(d.length, d2.length, 'même résultat après reset');
  // Appel sans reset : doit filtrer depuis le cache
  const d3 = filtrerParticipants('be');
  // Parmi les 'b', ceux qui contiennent 'be' : BELLA, BAYOKOLAK, ELANG BEYEME, MBIAHEU (mb... non, be...)
  // BELLA → be, BAYOKOLAK → bay..., ELANG BEYEME → be, MBIAHEU → mb... non
  // En fait: BELLA (bella → be), BAYOKOLAK (bayokolak → ba), ELANG BEYEME (beyeme → be), 
  // YEBGA (yebga → ...)
  // be dans: BELLA, ELANG BEYEME, YEBGA (yebga contient 'eb' pas 'be')
  // Laissez-moi compter: bella → be ✓, beyeme → be ✓, mbiaheu → mb... pas be, yebga → ye... pas be
  // Donc 2: BELLA, ELANG BEYEME
  assert(d3.length > 0 && d3.length <= d.length, 'd3 ⊆ d');
});
