import { PARTICIPANTS } from '../js/data.js';
import { test, assert, assertEq } from './harness.js';

test('16 entr\u00e9es exactement', () => {
  assertEq(PARTICIPANTS.length, 16);
});

test('numeros 1..16, uniques, dans l\'ordre', () => {
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

test('St\u00e9phane et St\u00e9phanie portent des accents', () => {
  const s1 = PARTICIPANTS.find(p => p.numero === 10).nomComplet;
  const s2 = PARTICIPANTS.find(p => p.numero === 16).nomComplet;
  assert(s1.includes('\u00e9'), 'St\u00e9phane should have accent');
  assert(s2.includes('\u00e9'), 'St\u00e9phanie should have accent');
});
