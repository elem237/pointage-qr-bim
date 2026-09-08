import { test, assert, assertEq } from './harness.js';
import { screenReport, buildA4Html } from '../js/ui/screen-report.js';
import { PARTICIPANTS } from '../js/data.js';
import { idDe } from '../js/model/ident.js';
import { getConfig, mergeConfig } from '../js/config.js';
import { tousLesSlots } from '../js/model/slots.js';
import { trierAbsences } from '../js/model/absences.js';

test('screen-report-setup-dates', () => {
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

/* ── P1 — Export ── */
test('P1 — screenReport est une fonction', () => {
  assert(typeof screenReport === 'function');
});

/* ── P2 — Structure page + table SKILL.md §7 ── */
test('P2 — le rapport contient page, band, table, footer', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  assert(div.querySelector('.page') !== null, '.page');
  assert(div.querySelector('img.band') !== null, 'header band');
  assert(div.querySelector('table.presence') !== null, 'table');
  assert(div.querySelector('img.band.footer') !== null, 'footer band');
});

/* ── P3 — 13 lignes participant dans tbody ── */
test('P3 — 13 lignes participant dans tbody (hors R0,R1,R2)', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const rows = div.querySelectorAll('table.presence tbody tr');
  // R0 + R1 + R2 + 13 participants = 16 rows total
  assertEq(rows.length, 16, '16 rows au total');
});

/* ── P4 — R0 : DIRECTION DES AFFAIRES GÉNÉRALE ── */
test('P4 — R0 contient DIRECTION DES AFFAIRES GÉNÉRALE', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const firstRow = div.querySelector('table.presence tbody tr.r0');
  assert(firstRow !== null, 'tr.r0');
  assert(firstRow.textContent.includes('DIRECTION DES AFFAIRES G\u00c9N\u00c9RALE'));
});

/* ── P5 — colspan=10 sur R0 ── */
test('P5 — R0 colspan=10', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const td = div.querySelector('tr.r0 td');
  assertEq(td.getAttribute('colspan'), '10');
});

/* ── P6 — R1 : THÈMES, LIEU, PERSONNELS, EFFECTIFS, Jour 1-3 ── */
test('P6 — R1 a THÈMES LIEU PERSONNELS EFFECTIFS et 3 Jours', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const cells = div.querySelectorAll('tr.r1 td.h');
  assertEq(cells.length, 7, '7 cellules en-tête R1');
  assertEq(cells[0].textContent.trim(), 'TH\u00c8MES');
  assertEq(cells[1].textContent.trim(), 'LIEU');
  assertEq(cells[2].textContent.trim(), 'PERSONNELS');
  assertEq(cells[3].textContent.trim(), 'EFFECTIFS');
  assert(cells[4].textContent.includes('Jour 1'));
  assert(cells[5].textContent.includes('Jour 2'));
  assert(cells[6].textContent.includes('Jour 3'));
});

/* ── P7 — R2 : 4 verts vides + 6 Mt/Md ── */
test('P7 — R2 : 4 verts + 6 en-têtes Mt/Md', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const cells = div.querySelectorAll('tr.r2 td');
  assertEq(cells.length, 10);
  // 4 verts vides (background #E2EFD9)
  for (let i = 0; i < 4; i++) {
    assertEq(cells[i].textContent.trim(), '');
    assert(cells[i].classList.contains('vert'));
  }
  // 6 en-têtes Mt/Md
  const expectedLabels = ['Mt','Md','Mt','Md','Mt','Md'];
  for (let i = 0; i < 6; i++) {
    assertEq(cells[4 + i].textContent.trim(), expectedLabels[i]);
  }
});

/* ── P8 — rowspan=13 sur THÈMES/LIEU/EFFECTIFS ── */
test('P8 — rowspan=13 sur THÈMES LIEU EFFECTIFS', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const firstRow = div.querySelectorAll('table.presence tbody > tr')[3]; // first participant row
  const cells = firstRow.querySelectorAll('td');
  const n = String(PARTICIPANTS.length);
  assertEq(cells[0].getAttribute('rowspan'), n, 'TH\u00c8MES');
  assertEq(cells[1].getAttribute('rowspan'), n, 'LIEU');
  assertEq(cells[3].getAttribute('rowspan'), n, 'EFFECTIFS');
});

/* ── P9 — Noms formatés numero. nomComplet ── */
test('P9 — format "numero. nomComplet"', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const firstPerso = div.querySelector('td.perso');
  assert(firstPerso.textContent.includes('1. YEBGA'));
});

/* ── P9b — Retrait hanging : la numérotation reste dans PERSONNELS ── */
test('P9b — td.perso avec padding-left 5.6mm (pas de débord en LIEU)', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const persos = div.querySelectorAll('td.perso');
  assert(persos.length > 0, 'des cellules perso');
  persos.forEach(td => {
    assertEq(td.style.paddingLeft, '5.6mm', 'retrait SKILL.md §5');
  });
});

/* ── P10 — 13 cellules perso ── */
test('P10 — 13 cellules perso', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const persos = div.querySelectorAll('td.perso');
  assertEq(persos.length, PARTICIPANTS.length);
  assertEq(persos[0].textContent.trim(), '1. YEBGA Jacques Albert');
  assertEq(persos[persos.length - 1].textContent.trim(), '13. NTOLO Daniel Olivier');
});

/* ── P11 — 6 cellules jour par participant ── */
test('P11 — 6 cellules jour par participant', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const rows = div.querySelectorAll('table.presence tbody > tr');
  for (let i = 3; i < 3 + PARTICIPANTS.length; i++) {
    const jours = rows[i].querySelectorAll('td.cell-jour');
    assertEq(jours.length, 6, `participant ${i-2} a 6 cellules`);
  }
});

/* ── P12 — 10 <col> avec les bonnes largeurs ── */
test('P12 — 10 <col> avec largeurs SKILL-IMPRESSION-V2 §2', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const cols = div.querySelectorAll('colgroup col');
  assertEq(cols.length, 10);
  const expected = ['24.61mm','18.13mm','51.19mm','14.87mm','8.55mm','8.59mm','7.94mm','9.00mm','7.94mm','9.21mm'];
  for (let i = 0; i < 10; i++) {
    assertEq(cols[i].style.width, expected[i], `col ${i} width`);
  }
});

/* ── P13 — Present → span.pa P + span.heure HHhMM ── */
test('P13 — present → P + HHhMM', () => {
  const div = document.createElement('div');
  const m = new Map();
  m.set(cle(PARTICIPANTS[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto'));
  screenReport(div, m, douala(2026, 7, 4, 18, 0));
  const cell = div.querySelector('td.cell-jour');
  const pa = cell.querySelector('span.pa');
  const heure = cell.querySelector('span.heure');
  assert(pa !== null, 'span.pa');
  assert(heure !== null, 'span.heure');
  assertEq(pa.textContent, 'P');
  assertEq(heure.textContent, '08h42');
});

/* ── P14 — Absent → span.pa A, pas de span.heure ── */
test('P14 — absent → A', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const cell = div.querySelector('td.cell-jour');
  const pa = cell.querySelector('span.pa');
  const heure = cell.querySelector('span.heure');
  assert(pa !== null, 'span.pa');
  assertEq(pa.textContent, 'A');
  assert(heure === null, 'pas de span.heure');
});

/* ── P15 — Vide → td vide, pas "A" ── */
test('P15 — vide → td vide', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 10, 0)); // avant finDe
  const cell = div.querySelector('td.cell-jour');
  assertEq(cell.innerHTML.trim(), '');
});

/* ── P16 — Propriété 8.2 : J2/J3 vides à J1 18h ── */
test('P16 — J2/J3 vides à tNow=J1 18h', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const rows = div.querySelectorAll('table.presence tbody > tr');
  for (let r = 3; r < 3 + PARTICIPANTS.length; r++) {
    const jours = rows[r].querySelectorAll('td.cell-jour');
    for (let j = 2; j < 6; j++) { // J2 starts at index 2, J3 at index 4
      assertEq(jours[j].innerHTML.trim(), '', `row ${r-2} col ${j} vide`);
    }
  }
});

/* ── P17 — Refresh ── */
test('P17 — refresh() met à jour', () => {
  const div = document.createElement('div');
  const ctrl = screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const m2 = new Map();
  m2.set(cle(PARTICIPANTS[0], J1_MATIN), pv(0, 'actif', douala(2026, 7, 4, 8, 42), 'scan', 'd1', 'auto'));
  ctrl.refresh(m2, douala(2026, 7, 4, 18, 0));
  const cell = div.querySelector('td.cell-jour');
  assert(cell.innerHTML.includes('P'), 'présent après refresh');
});

/* ── P18 — Bandes en base64 ── */
test('P18 — bandes en base64', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const bands = div.querySelectorAll('img.band');
  assert(bands.length >= 2, 'au moins 2 bandes');
  for (const b of bands) {
    assert(b.getAttribute('src').startsWith('data:image/'), 'base64');
  }
});

// ─── AB4 : Absences dans le rapport ─────────────────────

function absVal(numero, depart, retour, motif) {
  return { id: 'a-' + numero + '-' + depart, numero, dateJour: '2026-08-04', depart, retour, motif };
}

test('AB4-RG4 — buildA4Html sans absences → pas de bloc', () => {
  const html = buildA4Html(new Map(), douala(2026, 7, 4, 18, 0));
  assert(!html.includes('bloc-absences'), 'pas de bloc');
});

test('AB4-R1 — buildA4Html avec absence terminée → bloc + phrase durée', () => {
  const dep = douala(2026, 7, 4, 10, 15);
  const ret = douala(2026, 7, 4, 11, 2);
  const abs = [absVal(3, dep, ret, '')];
  const html = buildA4Html(new Map(), douala(2026, 7, 4, 18, 0), abs);
  assert(html.includes('bloc-absences'), 'bloc present');
  assert(html.includes('Absences signal\u00e9es'), 'titre present');
  assert(html.includes('NGOUDJO'), 'nom present');
  assert(html.includes('00:47'), 'duree presente');
});

test('AB4-R2 — buildA4Html absence non revenu·e → phrase "à partir de"', () => {
  const dep = douala(2026, 7, 4, 10, 15);
  const abs = [absVal(3, dep, null, '')];
  const html = buildA4Html(new Map(), douala(2026, 7, 4, 18, 0), abs);
  assert(html.includes('bloc-absences'));
  assert(html.includes('partir de 10h15'));
  assert(html.includes('non revenu'));
});

test('AB4-R3 — buildA4Html absence avec motif → "Motif : rdv."', () => {
  const dep = douala(2026, 7, 4, 10, 15);
  const ret = douala(2026, 7, 4, 11, 2);
  const abs = [absVal(3, dep, ret, 'rdv')];
  const html = buildA4Html(new Map(), douala(2026, 7, 4, 18, 0), abs);
  assert(html.includes('Motif : rdv.'), 'motif present');
  assert(!html.includes('_______'), 'pas d\'underscores');
});

test('AB4-R4 — buildA4Html absence sans motif → "Motif : ______"', () => {
  const dep = douala(2026, 7, 4, 10, 15);
  const ret = douala(2026, 7, 4, 11, 2);
  const abs = [absVal(3, dep, ret, '')];
  const html = buildA4Html(new Map(), douala(2026, 7, 4, 18, 0), abs);
  assert(html.includes('Motif : ________________________________'), 'underscores');
});

test('AB4-R5 — deux absences triées par numero puis depart', () => {
  const t = douala(2026, 7, 4, 18, 0);
  const a1 = absVal(5, douala(2026, 7, 4, 9, 0), douala(2026, 7, 4, 9, 30), '');
  const a2 = absVal(3, douala(2026, 7, 4, 10, 0), douala(2026, 7, 4, 10, 45), '');
  const abs = trierAbsences([a1, a2]);
  const html = buildA4Html(new Map(), t, abs);
  // numero 3 avant numero 5
  const idx3 = html.indexOf('AKOLEO');  // participant 4 = AKOLEO
  const idx5 = html.indexOf('ENAM');    // participant 5 = ENAM
  // Adjust: participant 3 is NGOUDJO, 4 is AKOLEO, 5 is ENAM
  const idxN3 = html.indexOf('NGOUDJO');
  const idxN5 = html.indexOf('ENAM');
  assert(idxN3 < idxN5, 'ordre par numero');
});

test('AB4-R6 — motif HTML/injection \u00e9chapp\u00e9 (XSS)', () => {
  const dep = douala(2026, 7, 4, 10, 15);
  const ret = douala(2026, 7, 4, 11, 2);
  const abs = [absVal(3, dep, ret, '<script>alert(1)</script>')];
  const html = buildA4Html(new Map(), douala(2026, 7, 4, 18, 0), abs);
  assert(!html.includes('<script>alert(1)</script>'), 'pas de script inject\u00e9');
  assert(html.includes('&lt;script&gt;'), 'motif \u00e9chapp\u00e9');
});
