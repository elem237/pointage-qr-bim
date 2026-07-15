import { test, assert, assertEq } from './harness.js';
import { initAudio, jouerSon, vibrer, feedback } from '../js/feedback.js';

test('C7 §8 — feedback exporte les 4 fonctions', () => {
  assert(typeof initAudio === 'function', 'initAudio');
  assert(typeof jouerSon === 'function', 'jouerSon');
  assert(typeof vibrer  === 'function', 'vibrer');
  assert(typeof feedback === 'function', 'feedback');
});

test('C7 §8 — initAudio ne lance pas, retourne null ou AudioContext', () => {
  let ctx;
  try { ctx = initAudio(); }
  catch (e) { assert(false, 'initAudio a lancé: ' + e.message); }
});

test('C7 Tableau — jouerSon ne lance pour aucun résultat', () => {
  const cas = [
    { resultat: 'RIEN' },
    { resultat: 'OK', participant: { numero: 1, nomComplet: 'Test' } },
    { resultat: 'DEJA_POINTE', tau: Date.now() },
    { resultat: 'ERREUR', code: 'format' },
    { resultat: 'ERREUR', code: 'inconnu' },
    { resultat: 'ERREUR', code: 'checksum' },
    { resultat: 'HORS_SESSION' },
  ];
  for (const c of cas) {
    try { jouerSon(c); }
    catch (e) { assert(false, `jouerSon(${c.resultat}) a lancé: ${e.message}`); }
  }
});

test('C7 Tableau — vibrer ne lance pour aucun résultat', () => {
  const cas = [
    { resultat: 'RIEN' },
    { resultat: 'OK', participant: { numero: 1, nomComplet: 'Test' } },
    { resultat: 'DEJA_POINTE', tau: Date.now() },
    { resultat: 'ERREUR', code: 'format' },
    { resultat: 'ERREUR', code: 'inconnu' },
    { resultat: 'ERREUR', code: 'checksum' },
    { resultat: 'HORS_SESSION' },
  ];
  for (const c of cas) {
    try { vibrer(c); }
    catch (e) { assert(false, `vibrer(${c.resultat}) a lancé: ${e.message}`); }
  }
});

test('C7 Tableau — feedback ne lance pour aucun résultat', () => {
  const cas = [
    { resultat: 'RIEN' },
    { resultat: 'OK', participant: { numero: 1, nomComplet: 'Test' } },
    { resultat: 'DEJA_POINTE', tau: Date.now() },
    { resultat: 'ERREUR', code: 'format' },
    { resultat: 'HORS_SESSION' },
  ];
  for (const c of cas) {
    try { feedback(c); }
    catch (e) { assert(false, `feedback(${c.resultat}) a lancé: ${e.message}`); }
  }
});

test('C7 Tableau ligne OK — vibrer(OK) durée 50ms', () => {
  const orig = navigator.vibrate;
  if (typeof orig !== 'function') return;
  let appel = null;
  navigator.vibrate = (p) => { appel = p; return true; };
  vibrer({ resultat: 'OK' });
  assertEq(appel, 50, 'OK → vibration 50ms');
  navigator.vibrate = orig;
});

test('C7 Tableau ligne DEJA_POINTE — vibrer(DEJA_POINTE) pattern 30ms×2', () => {
  const orig = navigator.vibrate;
  if (typeof orig !== 'function') return;
  let appel = null;
  navigator.vibrate = (p) => { appel = p; return true; };
  vibrer({ resultat: 'DEJA_POINTE', tau: Date.now() });
  assert(Array.isArray(appel), 'DEJA_POINTE → pattern tableau');
  assertEq(appel[0], 30, '1re vibration 30ms');
  assertEq(appel[2], 30, '2e vibration 30ms');
  navigator.vibrate = orig;
});

test('C7 Tableau ligne ERREUR — vibrer(ERREUR) durée 200ms', () => {
  const orig = navigator.vibrate;
  if (typeof orig !== 'function') return;
  let appel = null;
  navigator.vibrate = (p) => { appel = p; return true; };
  vibrer({ resultat: 'ERREUR', code: 'format' });
  assertEq(appel, 200, 'ERREUR → vibration 200ms');
  navigator.vibrate = orig;
});

test('C7 Tableau ligne HORS_SESSION — pas de vibration', () => {
  const orig = navigator.vibrate;
  if (typeof orig !== 'function') return;
  let appel = 'pas_appele';
  navigator.vibrate = (p) => { appel = p; return true; };
  vibrer({ resultat: 'HORS_SESSION' });
  assertEq(appel, 'pas_appele', 'HORS_SESSION → pas de vibrate');
  navigator.vibrate = orig;
});

test('C7 Tableau ligne RIEN — pas de vibration', () => {
  const orig = navigator.vibrate;
  if (typeof orig !== 'function') return;
  let appel = 'pas_appele';
  navigator.vibrate = (p) => { appel = p; return true; };
  vibrer({ resultat: 'RIEN' });
  assertEq(appel, 'pas_appele', 'RIEN → pas de vibrate');
  navigator.vibrate = orig;
});
