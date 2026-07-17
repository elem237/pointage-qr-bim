import { test, assert, assertEq } from './harness.js';
import { screenReport } from '../js/ui/screen-report.js';
import { PARTICIPANTS } from '../js/data.js';
import { idDe } from '../js/model/ident.js';
import { getConfig } from '../js/config.js';
import { tousLesSlots } from '../js/model/slots.js';

const cfg = getConfig();
const TZ = cfg.TZ_OFFSET_MIN * 60 * 1000;

function douala(y, m, d, h, min) {
  return Date.UTC(y, m, d, h, min) - TZ;
}

function pv(generation, statut, tau, mode, device, override) {
  return { generation, statut, tau, mode, device, override };
}

/* ── U3.1 — Θ indéfini → « — », pas « 0 % » ni « NaN » ── */
test('U3.1 — Θ indéfini affiche "—" et "aucun créneau échu"', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 5, 0)); // avant tout créneau
  const val = div.querySelector('#report-taux-value');
  const label = div.querySelector('#report-taux-label');
  assert(val !== null, '#report-taux-value');
  assert(label !== null, '#report-taux-label');
  assertEq(val.textContent.trim(), '—', 'valeur = —');
  assertEq(label.textContent.trim(), 'aucun créneau échu', 'label = aucun créneau échu');
});

test('U3.2 — Θ défini affiche le pourcentage', () => {
  const div = document.createElement('div');
  const m = new Map();
  for (const p of PARTICIPANTS) {
    const slot = tousLesSlots()[0];
    const k = idDe(p.numero) + '|' + slot.date + '|' + slot.creneau;
    m.set(k, pv(0, 'actif', douala(2026, 7, 4, 8, 0), 'scan', 'd1', 'auto'));
  }
  screenReport(div, m, douala(2026, 7, 4, 18, 0)); // après J1 matin
  const val = div.querySelector('#report-taux-value');
  assert(val.textContent.includes('%'), 'contient %');
  assert(!val.textContent.includes('NaN'), 'pas NaN');
  assert(val.textContent !== '0%', 'pas 0%');
});

/* ── U3.3 — Grille : 6 cellules, ordre tousLesSlots() ── */
test('U3.3 — grille contient 6 cellules dans l ordre de tousLesSlots()', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const cells = div.querySelectorAll('.report-grid-cell');
  assertEq(cells.length, 6, '6 cellules');
  const slots = tousLesSlots();
  for (let i = 0; i < 6; i++) {
    const label = cells[i].querySelector('.report-grid-label');
    assert(label.textContent.includes('Jour ' + slots[i].jour), 'Jour ' + slots[i].jour);
    assert(label.textContent.includes(slots[i].label), 'label ' + slots[i].label);
  }
});

test('U3.4 — cellules échues ont fond --p-bg et compte, non échues ont --surf-1 et —', () => {
  const div = document.createElement('div');
  // tNow = J1 18h → J1 matin et J1 midi échus
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const cells = div.querySelectorAll('.report-grid-cell');
  // J1 matin et J1 midi échus → class -echu
  assert(cells[0].classList.contains('report-grid-cell--echu'), 'J1 Mt échu');
  assert(cells[1].classList.contains('report-grid-cell--echu'), 'J1 Md échu');
  // J2+ non échus → class -vide
  for (let i = 2; i < 6; i++) {
    assert(cells[i].classList.contains('report-grid-cell--vide'), 'slot ' + i + ' non échu');
    const na = cells[i].querySelector('.report-grid-count--na');
    assert(na !== null, 'slot ' + i + ' affiche —');
    assertEq(na.textContent.trim(), '—', 'valeur —');
  }
});

/* ── U3.5 — Bouton impression présent ── */
test('U3.5 — bouton impression présent', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const btn = div.querySelector('#report-print');
  assert(btn !== null, '#report-print');
  assert(btn.textContent.includes('Imprimer'), 'contient Imprimer');
});

/* ── U3.6 — Note présente ── */
test('U3.6 — note iPhone présente', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const note = div.querySelector('#report-note');
  assert(note !== null, '#report-note');
  assert(note.textContent.includes('iPhone'), 'mentionne iPhone');
  assert(note.textContent.includes('88 %'), 'mentionne 88%');
});

/* ── U3.7 — A4 page intacte dans preview ── */
test('U3.7 — la page A4 est dans le preview-container', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const page = div.querySelector('#report-preview-container .page');
  assert(page !== null, '.page dans preview');
  const table = page.querySelector('table.presence');
  assert(table !== null, 'table.presence');
  const header = page.querySelector('img.band');
  assert(header !== null, 'header band');
  const footer = page.querySelector('img.band.footer');
  assert(footer !== null, 'footer band');
});

/* ── U3.8 — 16 participants dans le tableau ── */
test('U3.8 — 16 participants dans le tableau A4', () => {
  const div = document.createElement('div');
  screenReport(div, new Map(), douala(2026, 7, 4, 18, 0));
  const persos = div.querySelectorAll('td.perso');
  assertEq(persos.length, 16, '16 perso');
});
