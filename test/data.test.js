import { PARTICIPANTS } from '../js/data.js';
import { test, assert, assertEq } from './harness.js';

test('13 entr\u00e9es exactement (liste client r\u00e9vis\u00e9e : 14, 15, 16 supprim\u00e9s)', () => {
  assertEq(PARTICIPANTS.length, 13);
});

test('numeros 1..13, uniques, dans l\'ordre', () => {
  for (let i = 0; i < PARTICIPANTS.length; i++) {
    assertEq(PARTICIPANTS[i].numero, i + 1, `position ${i} should have numero ${i + 1}`);
  }
});

test('\u03bd2 contient U+2019 (apostrophe typographique)', () => {
  const idx = PARTICIPANTS[1].nomComplet.indexOf('\u2019');
  assert(idx !== -1, 'U+2019 should be present in ANYOUZO\u2019A');
  assertEq(PARTICIPANTS[1].nomComplet.charCodeAt(idx), 0x2019);
});

test('aucun nomComplet vide apr\u00e8s norm', () => {
  import('../js/model/norm.js').then(({ norm }) => {
    for (const p of PARTICIPANTS) {
      assert(norm(p.nomComplet).length > 0, `norm("${p.nomComplet}") should not be empty`);
    }
  });
});

test('St\u00e9phane porte un accent (numero 10)', () => {
  const s1 = PARTICIPANTS.find(p => p.numero === 10).nomComplet;
  assert(s1.includes('\u00e9'), 'St\u00e9phane should have accent');
});

test('numeros 14, 15, 16 supprim\u00e9s (liste r\u00e9vis\u00e9e)', () => {
  for (const n of [14, 15, 16]) {
    assertEq(PARTICIPANTS.find(p => p.numero === n), undefined, `numero ${n} absent`);
  }
});
