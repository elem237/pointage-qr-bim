import { DEFAULTS, getConfig, hydrateConfig } from '../js/config.js';
import { test, assert, assertEq } from './harness.js';

test('DEFAULTS est gel\u00e9 (Object.freeze)', () => {
  assert(Object.isFrozen(DEFAULTS), 'DEFAULTS should be frozen');
  if (typeof Proxy !== 'undefined') {
    try { DEFAULTS.FREQ_HZ = 99; } catch (_) {}
    assertEq(DEFAULTS.FREQ_HZ, 10, 'FREQ_HZ should remain 10 after attempted write');
  }
});

test('getConfig() === DEFAULTS sans hydrateConfig', () => {
  const c = getConfig();
  assertEq(c.PREFIXE_ID, DEFAULTS.PREFIXE_ID);
  assertEq(c.H_BASCULE, '12:30');
  assertEq(c.MULTI_APPAREILS, false);
  assert(c !== DEFAULTS, 'getConfig() should return a new object');
});

test('hydrateConfig surcharge sans muter DEFAULTS', () => {
  hydrateConfig({ H_BASCULE: '13:00', MULTI_APPAREILS: true });
  const c = getConfig();
  assertEq(c.H_BASCULE, '13:00');
  assertEq(c.MULTI_APPAREILS, true);
  assertEq(c.PREFIXE_ID, 'BIM26-', 'PREFIXE_ID should remain default');
  assertEq(DEFAULTS.H_BASCULE, '12:30', 'DEFAULTS should not be mutated');
});

test('hydrateConfig remplace completement les overrides', () => {
  hydrateConfig({ DEBOUNCE_MS: 5000 });
  const c = getConfig();
  assertEq(c.DEBOUNCE_MS, 5000);
  assertEq(c.H_BASCULE, '12:30', 'H_BASCULE should be back to default after override replace');
});

test('getConfig() retourne une copie fraiche a chaque appel', () => {
  hydrateConfig({});
  const a = getConfig();
  const b = getConfig();
  assert(a !== b, 'should be different objects');
  assertEq(a.H_FIN_MIDI, b.H_FIN_MIDI);
});
