import { test, assert, assertEq } from './harness.js';
import { screenReport } from '../js/ui/screen-report.js';
import { PARTICIPANTS } from '../js/data.js';
import { idDe } from '../js/model/ident.js';
import { getConfig } from '../js/config.js';

const cfg = getConfig();
const TZ = cfg.TZ_OFFSET_MIN * 60 * 1000;

function douala(y, m, d, h, min) {
  return Date.UTC(y, m, d, h, min) - TZ;
}

function pv(generation, statut, tau, mode, device, override) {
  return { generation, statut, tau, mode, device, override };
}

function cle(p, slot) {
  return idDe(p.numero) + '|' + slot.date + '|' + slot.creneau;
}

const J1_MATIN = { date: '2026-08-04', creneau: 'matin' };
const J1_MIDI  = { date: '2026-08-04', creneau: 'midi' };

/* ── P1 — Export ── */
test('P1 — screenReport est une fonction', () => {
  assert(typeof screenReport === 'function');
});

/* ── P2 — Structure DOM (§10 docx) ── */
test('P2 — le rapport contient header, titre, tableau', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  assert(div.querySelector('#screen-report') !== null, '#screen-report');
  assert(div.querySelector('.report-header') !== null, 'en-tête');
  assert(div.querySelector('.report-title') !== null, 'titre');
  assert(div.querySelector('.report-table') !== null, 'tableau');
});

/* ── P3 — 16 lignes participant (§10 docx) ── */
test('P3 — 16 lignes dans tbody', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const rows = div.querySelectorAll('.report-table tbody tr');
  assertEq(rows.length, 16);
});

/* ── P4 — 3 colonnes Jour (pas 6) ― docx 8 colonnes ── */
test('P4 — 3 colonnes Jour dans l\'en-tête', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const theadRows = div.querySelectorAll('thead > tr');
  const headerRow = theadRows[1];
  const ths = headerRow.querySelectorAll('th');
  // N°, THÈMES, LIEU, PERSONNELS, EFFECTIFS, Jour1, Jour2, Jour3 = 8
  assertEq(ths.length, 8, '8 colonnes');
  assertEq(ths[5].textContent.trim(), 'Jour 1 (08-04)');
  assertEq(ths[6].textContent.trim(), 'Jour 2 (08-05)');
  assertEq(ths[7].textContent.trim(), 'Jour 3 (08-06)');
});

/* ── P5 — N° rowspan=16 dans tbody (docx) ── */
test('P5 — N° rowspan=16 dans tbody', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const firstRow = div.querySelectorAll('.report-table tbody > tr')[0];
  const cells = firstRow.querySelectorAll('td');
  assertEq(cells[0].getAttribute('rowspan'), '16', 'N°');
  assertEq(cells[0].className, 'report-cell-num');
});

/* ── P6 — THÈMES rowspan=16 dans tbody (docx) ── */
test('P6 — THÈMES rowspan=16 dans tbody', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const firstRow = div.querySelectorAll('.report-table tbody > tr')[0];
  const cells = firstRow.querySelectorAll('td');
  assertEq(cells[1].getAttribute('rowspan'), '16', 'THÈMES');
  assertEq(cells[1].className, 'report-cell-theme');
});

/* ── P7 — LIEU rowspan=16 dans tbody (docx) ── */
test('P7 — LIEU rowspan=16 dans tbody', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const firstRow = div.querySelectorAll('.report-table tbody > tr')[0];
  const cells = firstRow.querySelectorAll('td');
  assertEq(cells[2].getAttribute('rowspan'), '16', 'LIEU');
});

/* ── P8 — EFFECTIFS rowspan=16 dans tbody (docx) ── */
test('P8 — EFFECTIFS rowspan=16 dans tbody', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const firstRow = div.querySelectorAll('.report-table tbody > tr')[0];
  const cells = firstRow.querySelectorAll('td');
  assertEq(cells[4].getAttribute('rowspan'), '16', 'EFFECTIFS');
  assertEq(cells[4].className, 'report-cell-effectif');
});

/* ── P9 — colspan=8 direction header (docx) ── */
test('P9 — direction header colspan=8', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const dir = div.querySelector('.report-dir-header');
  assertEq(dir.getAttribute('colspan'), '8', 'colspan=8');
  assert(dir.textContent.includes('DIRECTION DES AFFAIRES GÉNÉRALE'));
});

/* ── P10 — Titre ── */
test('P10 — titre "LISTE DE PRÉSENCE"', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  assertEq(div.querySelector('.report-title').textContent.trim(), 'LISTE DE PRÉSENCE');
});

/* ── P11 — Nom formaté ── */
test('P11 — nom formaté "numero. nomComplet"', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const firstRow = div.querySelectorAll('.report-table tbody tr')[0];
  const cells = firstRow.querySelectorAll('td');
  assert(cells[3].textContent.includes('1. YEBGA'));
});

/* ── P12 — Tous les 16 participants ── */
test('P12 — 16 cellules de noms', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const allNames = div.querySelectorAll('.report-cell-name');
  assertEq(allNames.length, 16);
  assertEq(allNames[0].textContent.trim(), '1. YEBGA Jacques Albert');
  assertEq(allNames[15].textContent.trim(), '16. MBIAHEU St\u00e9phanie Merveille');
});

/* ── P13 — N° affiche NUMERO_THEME ── */
test('P13 — N° = NUMERO_THEME', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const numCell = div.querySelector('.report-cell-num');
  assertEq(numCell.textContent.trim(), String(cfg.NUMERO_THEME));
});

/* ── P14 — THÈMES contient le texte THEME ── */
test('P14 — THÈMES = THEME', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const themeCell = div.querySelector('.report-cell-theme');
  assert(themeCell.textContent.includes(cfg.THEME));
});

/* ── P15 — EFFECTIFS = 16 ── */
test('P15 — EFFECTIFS = 16', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const effCell = div.querySelector('.report-cell-effectif');
  assertEq(effCell.textContent.trim(), '16');
});

/* ── P16 — Cellule present (matin) → P + heure dans la cellule du jour ── */
test('P16 — present matin → P + heure dans cellule Jour1', () => {
  const div = document.createElement('div');
  const m = new Map();
  m.set(cle(PARTICIPANTS[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto'));
  screenReport(div, m, douala(2026, 7, 4, 18, 0));
  const firstRow = div.querySelectorAll('.report-table tbody tr')[0];
  const cells = firstRow.querySelectorAll('td');
  const jour1 = cells[5]; // 6th cell (0:num, 1:theme, 2:lieu, 3:name, 4:eff, 5:j1, 6:j2, 7:j3)
  assert(jour1.innerHTML.includes('P'), 'contient P');
  assert(jour1.innerHTML.includes('08h42'), 'contient heure');
});

/* ── P17 — Cellule present (midi) → P + heure dans la même cellule ── */
test('P17 — present midi → P + heure dans cellule Jour1', () => {
  const div = document.createElement('div');
  const m = new Map();
  m.set(cle(PARTICIPANTS[0], J1_MIDI), pv(0, 'actif', douala(2026, 7, 4, 13, 5), 'scan', 'd1', 'auto'));
  screenReport(div, m, douala(2026, 7, 4, 18, 0));
  const firstRow = div.querySelectorAll('.report-table tbody tr')[0];
  const cells = firstRow.querySelectorAll('td');
  const jour1 = cells[5];
  assert(jour1.innerHTML.includes('P'), 'contient P midi');
  assert(jour1.innerHTML.includes('13h05'), 'contient heure midi');
});

/* ── P18 — Les deux créneaux (matin + midi) dans la même cellule ── */
test('P18 — matin + midi présents → deux P dans cellule Jour1', () => {
  const div = document.createElement('div');
  const m = new Map();
  m.set(cle(PARTICIPANTS[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto'));
  m.set(cle(PARTICIPANTS[0], J1_MIDI),  pv(0, 'actif', douala(2026, 7, 4, 13, 5), 'scan', 'd1', 'auto'));
  screenReport(div, m, douala(2026, 7, 4, 18, 0));
  const firstRow = div.querySelectorAll('.report-table tbody tr')[0];
  const cells = firstRow.querySelectorAll('td');
  const jour1 = cells[5];
  assert(jour1.innerHTML.includes('08h42'), 'matin');
  assert(jour1.innerHTML.includes('13h05'), 'midi');
  const pCount = (jour1.innerHTML.match(/P/g) || []).length;
  assertEq(pCount, 2, 'deux P');
});

/* ── P19 — Cellule absent → A dans cellule jour ── */
test('P19 — les deux absents → A A dans cellule Jour1', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0)); // J1 18h, matin+midi échus
  const firstRow = div.querySelectorAll('.report-table tbody tr')[0];
  const cells = firstRow.querySelectorAll('td');
  const jour1 = cells[5];
  assert(jour1.innerHTML.includes('A'), 'absent');
});

/* ── P20 — Cellule vide → rien ── */
test('P20 — cellule vide (avant fin de créneau)', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 10, 0)); // avant finDe matin
  const firstRow = div.querySelectorAll('.report-table tbody tr')[0];
  const cells = firstRow.querySelectorAll('td');
  const jour1 = cells[5];
  assertEq(jour1.innerHTML.trim(), '', 'vide');
});

/* ── P21 — Propriété 8.2 : 0 absent sur J2/J3 ── */
test('P21 — J2/J3 vides à tNow=J1 18h', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const rows = div.querySelectorAll('.report-table tbody tr');
  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r].querySelectorAll('td');
    const offset = r === 0 ? 5 : 1;
    // J2 = offset+1, J3 = offset+2
    for (let ci = offset + 1; ci <= offset + 2; ci++) {
      assert(!cells[ci].innerHTML.includes('A'), `ligne ${r+1} J2/J3 pas absent`);
      assertEq(cells[ci].innerHTML.trim(), '', `ligne ${r+1} J2/J3 vide`);
    }
  }
});

/* ── P22 — Logos dans l'en-tête ── */
test('P22 — logos GREEN + ACCA dans header', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const imgs = div.querySelectorAll('.report-header img');
  assert(imgs.length >= 2, '≥2 logos');
  assert(imgs[0].getAttribute('src').startsWith('data:image/'), 'base64');
});

/* ── P23 — Stats présentes (slots échus) ── */
test('P23 — stats avec slots échus', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const stats = div.querySelector('.report-stats');
  assert(stats !== null, 'stats');
  assert(stats.textContent.includes('Taux global'), 'Θ');
});

/* ── P24 — Stats absentes (pas de slot échu) ── */
test('P24 — pas de stats avant tout créneau', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 5, 0));
  assertEq(div.querySelector('.report-stats'), null);
});

/* ── P25 — Présents sur J1 ── */
test('P25 — 2 présents J1 matin, cellule jour affiche P', () => {
  const div = document.createElement('div');
  const m = new Map();
  m.set(cle(PARTICIPANTS[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto'));
  m.set(cle(PARTICIPANTS[1], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 9, 0), 'scan', 'd1', 'auto'));
  screenReport(div, m, douala(2026, 7, 4, 18, 0));
  const rows = div.querySelectorAll('.report-table tbody tr');
  const cells0 = rows[0].querySelectorAll('td');
  assert(cells0[5].innerHTML.includes('P'), '1er présent');
  assert(cells0[5].innerHTML.includes('08h42'), '1er heure');
  const cells1 = rows[1].querySelectorAll('td');
  assert(cells1[1].innerHTML.includes('P'), '2e présent');
  assert(cells1[1].innerHTML.includes('09h00'), '2e heure');
});

/* ── P26 — Refresh ── */
test('P26 — refresh() met à jour', () => {
  const div = document.createElement('div');
  const ctrl = screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const m2 = new Map();
  m2.set(cle(PARTICIPANTS[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto'));
  ctrl.refresh(m2, douala(2026, 7, 4, 18, 0));
  const rows = div.querySelectorAll('.report-table tbody tr');
  const cells = rows[0].querySelectorAll('td');
  assert(cells[5].innerHTML.includes('P'), 'présent après refresh');
});

/* ── P27 — report-cell-p classe ── */
test('P27 — classe report-cell-p sur P', () => {
  const div = document.createElement('div');
  const m = new Map();
  m.set(cle(PARTICIPANTS[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto'));
  screenReport(div, m, douala(2026, 7, 4, 18, 0));
  const spanP = div.querySelector('.report-cell-p');
  assert(spanP !== null);
  assertEq(spanP.textContent, 'P');
});

/* ── P28 — report-cell-a classe ── */
test('P28 — classe report-cell-a sur A', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const spanA = div.querySelector('.report-cell-a');
  assert(spanA !== null);
  assertEq(spanA.textContent, 'A');
});
