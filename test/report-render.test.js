import { test, assert, assertEq } from './harness.js';
import { screenReport } from '../js/ui/screen-report.js';
import { PARTICIPANTS } from '../js/data.js';
import { idDe } from '../js/model/ident.js';
import { getConfig, mergeConfig } from '../js/config.js';
import { tousLesSlots } from '../js/model/slots.js';

test('report-render-setup-dates', () => {
  mergeConfig({ DATES: ['2026-08-04', '2026-08-05', '2026-08-06'] });
});

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

/* ── D1 🔴 cohérence en-tête / cellules ── */
test('D1 — étiquette en-tête i correspond au slot i', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const slots = tousLesSlots();
  const r2Cells = div.querySelectorAll('tr.r2 td');
  // 4 vert cells + 6 labels
  for (let i = 0; i < 6; i++) {
    const label = r2Cells[4 + i].textContent.trim();
    assertEq(label, slots[i].label, `label col ${i} = ${slots[i].label} (${slots[i].date} ${slots[i].creneau})`);
  }
});

/* ── E1 — rendu present ── */
test('E1 — present : contient P et HHhMM', () => {
  const div = document.createElement('div');
  const m = new Map();
  m.set(cle(PARTICIPANTS[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto'));
  screenReport(div, m, douala(2026, 7, 4, 18, 0));
  const cell = div.querySelector('td.cell-jour');
  assert(cell.innerHTML.includes('P'), 'contient P');
  assert(cell.innerHTML.includes('08h42'), 'contient HHhMM');
});

/* ── E2 🔴 rendu vide : jamais "A" ── */
test('E2 — cellule vide est vide, pas "A"', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 10, 0)); // avant finDe matin
  const cells = div.querySelectorAll('td.cell-jour');
  for (const c of cells) {
    assertEq(c.innerHTML.trim(), '', 'cellule vide');
    assert(!c.innerHTML.includes('A'), 'ne contient pas A');
  }
});

/* ── F1 — 13 participants dans l'ordre numero ── */
test('F1 — 13 participants ordre numero croissant', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const persos = div.querySelectorAll('td.perso');
  assertEq(persos.length, PARTICIPANTS.length);
  for (let i = 0; i < PARTICIPANTS.length; i++) {
    const text = persos[i].textContent.trim();
    assert(text.startsWith(`${i + 1}.`), `ligne ${i} commence par ${i+1}.`);
    assert(text.includes(PARTICIPANTS[i].nomComplet), `ligne ${i} contient le nom`);
  }
});

/* ── F2 — 10 <col> avec largeurs SKILL-IMPRESSION-V2 §2 ── */
test('F2 — 10 <col> largeurs = SKILL-IMPRESSION-V2 §2', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const cols = div.querySelectorAll('colgroup col');
  assertEq(cols.length, 10);
  const expected = ['24.61mm', '18.13mm', '51.19mm', '14.87mm',
    '8.55mm', '8.59mm', '7.94mm', '9.00mm', '7.94mm', '9.21mm'];
  for (let i = 0; i < 10; i++) {
    assertEq(cols[i].style.width, expected[i], `col ${i} width = ${expected[i]}`);
  }
});
