import { norm } from '../js/model/norm.js';
import { PARTICIPANTS } from '../js/data.js';
import { test, assert, assertEq } from './harness.js';

const NOMS = PARTICIPANTS.map(p => p.nomComplet);

test('Prop 3.1 — idempotence sur les 16 noms', () => {
  for (const v of NOMS) {
    assertEq(norm(norm(v)), norm(v), `idempotence failed for "${v}"`);
  }
});

test('Prop 8.7 — diacritiques : St\u00e9phane → stephane', () => {
  assertEq(norm('NDJOMO Christian St\u00e9phane'), 'ndjomo christian stephane');
});

test('apostrophe : U+2019 normalis\u00e9 vers droite pour la recherche', () => {
  const avecU2019 = 'ANYOUZO\u2019A Marc';
  const avecApostrophe = "ANYOUZO'A Marc";
  assertEq(norm(avecU2019), norm(avecApostrophe));
});

test('squeeze/trim : espaces multiples r\u00e9duits', () => {
  assertEq(norm('  A   B  '), 'a b');
});

test('Prop 8.6 — sous-cha\u00eene : stephane dans NDJOMO Christian St\u00e9phane', () => {
  const n = norm('stephane');
  const ndjomo = norm('NDJOMO Christian St\u00e9phane');
  assert(ndjomo.includes(n), '"stephane" devrait \u00eatre sous-cha\u00eene de "ndjomo christian stephane"');
});

test('Prop 3.1 — idempotence sur cha\u00eenes quelconques', () => {
  const cases = ['', '   ', 'A', '\u00c9\u00c0\u00d4', '  Hello   World  '];
  for (const c of cases) {
    assertEq(norm(norm(c)), norm(c), `idempotence failed for "${c}"`);
  }
});
