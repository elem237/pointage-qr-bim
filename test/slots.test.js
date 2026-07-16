import { test, assert, assertEq } from './harness.js';
import { slotDe, slotAvecOverride, tousLesSlots } from '../js/model/slots.js';

const D = (y, m, d, h, min) => Date.UTC(y, m, d, h, min);

test('A1 — tousLesSlots().length === 6', () => {
  assertEq(tousLesSlots().length, 6);
});

test('A2 — ordre des slots', () => {
  const slots = tousLesSlots();
  const expected = [
    { date: '2026-08-04', creneau: 'matin' },
    { date: '2026-08-04', creneau: 'midi'  },
    { date: '2026-08-05', creneau: 'matin' },
    { date: '2026-08-05', creneau: 'midi'  },
    { date: '2026-08-06', creneau: 'matin' },
    { date: '2026-08-06', creneau: 'midi'  },
  ];
  for (let i = 0; i < 6; i++) {
    assertEq(slots[i].date, expected[i].date, `slot ${i} date`);
    assertEq(slots[i].creneau, expected[i].creneau, `slot ${i} creneau`);
  }
});

test('A3 — labels dans l\'ordre', () => {
  const slots = tousLesSlots();
  const expected = ['Mt','Md','Mt','Md','Mt','Md'];
  for (let i = 0; i < 6; i++) {
    assertEq(slots[i].label, expected[i], `slot ${i} label`);
  }
});

test('A4 — bijection index ↔ slot', () => {
  const s = tousLesSlots()[2];
  assertEq(s.date, '2026-08-05');
  assertEq(s.creneau, 'matin');
});

test('B1 — 4 août 08h05 Douala → matin', () => {
  const s = slotDe(D(2026, 7, 4, 7, 5));
  assertEq(s.creneau, 'matin', '08:05 Douala → matin');
});

test('B2 — 4 août 10h45 (pause café) → matin, pas null', () => {
  const s = slotDe(D(2026, 7, 4, 9, 45));
  assert(s !== null, '10:45 Douala ne doit pas être null');
  assertEq(s.creneau, 'matin', '10:45 Douala → matin');
});

test('B3 — 4 août 12h59 (borne) → matin', () => {
  const s = slotDe(D(2026, 7, 4, 11, 59));
  assert(s !== null, '12:59 Douala ne doit pas être null');
  assertEq(s.creneau, 'matin', '12:59 Douala → matin');
});

test('B4 — 4 août 13h00 (borne) → midi', () => {
  const s = slotDe(D(2026, 7, 4, 12, 0));
  assert(s !== null, '13:00 Douala ne doit pas être null');
  assertEq(s.creneau, 'midi', '13:00 Douala → midi');
});

test('B5 — 4 août 13h50 (déjeuner) → midi, pas null', () => {
  const s = slotDe(D(2026, 7, 4, 12, 50));
  assert(s !== null, '13:50 Douala ne doit pas être null');
  assertEq(s.creneau, 'midi', '13:50 Douala → midi');
});

test('B6 — 4 août 15h20 → midi', () => {
  const s = slotDe(D(2026, 7, 4, 14, 20));
  assertEq(s.creneau, 'midi', '15:20 Douala → midi');
});

test('B7 — 4 août 16h40 (marge) → midi', () => {
  const s = slotDe(D(2026, 7, 4, 15, 40));
  assert(s !== null, '16:40 Douala ne doit pas être null');
  assertEq(s.creneau, 'midi', '16:40 Douala → midi');
});

test('B8 — 4 août 06h59 → null', () => {
  const s = slotDe(D(2026, 7, 4, 5, 59));
  assert(s === null, '06:59 Douala → null');
});

test('B9 — 4 août 17h30 → null', () => {
  const s = slotDe(D(2026, 7, 4, 16, 30));
  assert(s === null, '17:30 Douala → null');
});

test('B10 — 7 août 09h00 → null', () => {
  const s = slotDe(D(2026, 7, 7, 8, 0));
  assert(s === null, '2026-08-07 09:00 Douala → null');
});

test('C1 — Override matin à 14h10', () => {
  const s = slotAvecOverride(D(2026, 7, 4, 13, 10), 'matin');
  assert(s !== null);
  assertEq(s.creneau, 'matin');
  assertEq(s.date, '2026-08-04');
});

test('slotDe couvre les 6 slots (3 jours × 2 créneaux)', () => {
  const matins = [D(2026, 7, 4, 7, 30), D(2026, 7, 5, 7, 30), D(2026, 7, 6, 7, 30)];
  const midis  = [D(2026, 7, 4, 13, 30), D(2026, 7, 5, 13, 30), D(2026, 7, 6, 13, 30)];
  for (const t of matins) {
    const s = slotDe(t);
    assert(s !== null, `matin atteignable`);
    assertEq(s.creneau, 'matin');
  }
  for (const t of midis) {
    const s = slotDe(t);
    assert(s !== null, `midi atteignable`);
    assertEq(s.creneau, 'midi');
  }
});

test('slotDe utilise le décalage UTC+1 manuel', () => {
  const s = slotDe(D(2026, 7, 4, 7, 0));
  assert(s !== null);
  assertEq(s.date, '2026-08-04');
});

test('slotAvecOverride auto = slotDe', () => {
  const t = D(2026, 7, 4, 10, 0);
  const s1 = slotDe(t);
  const s2 = slotAvecOverride(t, 'auto');
  assertEq(s1.creneau, s2.creneau);
  assertEq(s1.date, s2.date);
});

test('slotAvecOverride matin force le créneau matin', () => {
  const s = slotAvecOverride(D(2026, 7, 4, 14, 0), 'matin');
  assert(s !== null);
  assertEq(s.creneau, 'matin', '15:00 Douala override matin → matin');
  assertEq(s.date, '2026-08-04');
});

test('slotAvecOverride midi force le créneau midi', () => {
  const s = slotAvecOverride(D(2026, 7, 4, 7, 0), 'midi');
  assert(s !== null);
  assertEq(s.creneau, 'midi', '08:00 Douala override midi → midi');
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

test('slotDe bornes exactes avec nouvelle config', () => {
  // H_DEBUT_MATIN=07:00 → Douala 07:00 = UTC 06:00
  assert(slotDe(D(2026, 7, 4, 6, 0)) !== null, '07:00 exact → matin');
  // juste avant bascule 13:00 → Douala 12:59 = UTC 11:59
  assert(slotDe(D(2026, 7, 4, 11, 59)) !== null, '12:59 → matin');
  // bascule 13:00 → Douala 13:00 = UTC 12:00
  assert(slotDe(D(2026, 7, 4, 12, 0)) !== null, '13:00 exact → midi');
  // juste avant fin 17:30 → Douala 17:29 = UTC 16:29
  assert(slotDe(D(2026, 7, 4, 16, 29)) !== null, '17:29 → midi');
  // fin 17:30 → Douala 17:30 = UTC 16:30 → null
  assert(slotDe(D(2026, 7, 4, 16, 30)) === null, '17:30 exact → null');
});
