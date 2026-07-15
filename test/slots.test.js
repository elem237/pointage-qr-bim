import { test, assert, assertEq } from './harness.js';
import { slotDe, slotAvecOverride } from '../js/model/slots.js';

const D = (y, m, d, h, min) => Date.UTC(y, m, d, h, min);

test('slotDe identifie le matin correctement', () => {
  const s = slotDe(D(2026, 7, 4, 5, 0));
  assertEq(s.creneau, 'matin', '06:00 Douala → matin');
});

test('slotDe identifie le midi correctement', () => {
  const s = slotDe(D(2026, 7, 4, 11, 30));
  assertEq(s.creneau, 'midi', '12:30 Douala → midi');
});

test('slotDe retourne null avant H_DEBUT_MATIN', () => {
  const s = slotDe(D(2026, 7, 4, 4, 59));
  assert(s === null, '05:59 Douala → null');
});

test('slotDe retourne null après ou à H_FIN_MIDI', () => {
  const s = slotDe(D(2026, 7, 4, 18, 0));
  assert(s === null, '19:00 Douala → null');
});

test('slotDe retourne null pour une date hors DATES', () => {
  const s = slotDe(D(2026, 7, 7, 8, 0));
  assert(s === null, '2026-08-07 → null');
});

test('slotDe couvre les 6 slots (3 jours × 2 créneaux)', () => {
  const matins = [D(2026, 7, 4, 5, 0), D(2026, 7, 5, 5, 0), D(2026, 7, 6, 5, 0)];
  const midis  = [D(2026, 7, 4, 11, 30), D(2026, 7, 5, 11, 30), D(2026, 7, 6, 11, 30)];
  for (const t of matins) {
    const s = slotDe(t);
    assert(s !== null, `matin atteignable pour ${s.date}`);
    assertEq(s.creneau, 'matin');
  }
  for (const t of midis) {
    const s = slotDe(t);
    assert(s !== null, `midi atteignable pour ${s.date}`);
    assertEq(s.creneau, 'midi');
  }
});

test('slotDe utilise le décalage UTC+1 manuel', () => {
  const s = slotDe(D(2026, 7, 4, 5, 0));
  assert(s !== null);
  assertEq(s.date, '2026-08-04');
});

test('slotAvecOverride auto = slotDe', () => {
  const t = D(2026, 7, 4, 5, 0);
  const s1 = slotDe(t);
  const s2 = slotAvecOverride(t, 'auto');
  assertEq(s1.creneau, s2.creneau);
  assertEq(s1.date, s2.date);
});

test('slotAvecOverride matin force le créneau matin', () => {
  const s = slotAvecOverride(D(2026, 7, 4, 13, 0), 'matin');
  assert(s !== null);
  assertEq(s.creneau, 'matin', '14:00 Douala override matin → matin');
  assertEq(s.date, '2026-08-04');
});

test('slotAvecOverride midi force le créneau midi', () => {
  const s = slotAvecOverride(D(2026, 7, 4, 5, 0), 'midi');
  assert(s !== null);
  assertEq(s.creneau, 'midi', '06:00 Douala override midi → midi');
  assertEq(s.date, '2026-08-04');
});

test('slotAvecOverride hors DATES retourne null', () => {
  const s = slotAvecOverride(D(2026, 7, 7, 8, 0), 'matin');
  assert(s === null, '2026-08-07 override matin → null');
});

test('slotAvecOverride override invalide retourne null', () => {
  const s = slotAvecOverride(D(2026, 7, 4, 8, 0), 'soir');
  assert(s === null, 'override "soir" → null');
});

test('slotDe bornes exactes', () => {
  assert(slotDe(D(2026, 7, 4, 5, 0)) !== null, '06:00 exact → matin');
  assert(slotDe(D(2026, 7, 4, 11, 29)) !== null, '12:29 → matin');
  assert(slotDe(D(2026, 7, 4, 11, 30)) !== null, '12:30 exact → midi');
  assert(slotDe(D(2026, 7, 4, 17, 59)) !== null, '18:59 → midi');
  assert(slotDe(D(2026, 7, 4, 18, 0)) === null, '19:00 exact → null');
});
