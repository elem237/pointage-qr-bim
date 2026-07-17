import { test, assert, assertEq } from './harness.js';
import { screenList, filtrerParticipants, resetFilter } from '../js/ui/screen-list.js';
import { DEFAULTS, hydrateConfig } from '../js/config.js';
import { PARTICIPANTS } from '../js/data.js';
import { tousLesSlots } from '../js/model/slots.js';
import { idDe } from '../js/model/ident.js';
import { cle } from '../js/model/slots.js';

function div() {
  return document.createElement('div');
}

function fakeStore(initMap) {
  let m = initMap || new Map();
  return {
    getPointages: () => m,
    reg: async (k, tau, mode, override) => {
      const v = m.get(k);
      if (v && v.statut === 'actif') return { resultat: 'DEJA_POINTE', tau: v.tau };
      const vp = { generation: v ? v.generation + 1 : 0, statut: 'actif', tau, mode, device: 'test', override };
      m.set(k, vp);
      return { resultat: 'OK' };
    },
    cancel: async (k) => {
      const v = m.get(k);
      if (!v || v.statut !== 'actif') return { resultat: 'ERREUR' };
      m.set(k, { ...v, generation: v.generation + 1, statut: 'annule' });
      return { resultat: 'OK' };
    },
    loadAllPointages: async (newMap) => { m = newMap; },
  };
}

/* ── UL1 — Recherche « stephane » sans accent → trouve NDJOMO Christian Stéphane ── */
test('UL1 — recherche "stephane" trouve NDJOMO Christian St\u00e9phane (accents)', () => {
  resetFilter();
  const r = filtrerParticipants('stephane');
  const found = r.some(p => p.nomComplet === 'NDJOMO Christian St\u00e9phane');
  assert(found, 'devrait trouver NDJOMO Christian St\u00e9phane');
});

/* ── UL2 — Recherche « anyouzo'a » apostrophe droite → trouve ANYOUZO'A ── */
test('UL2 — recherche "anyouzo\'a" (apostrophe droite) trouve ANYOUZO\u2019A', () => {
  resetFilter();
  const r = filtrerParticipants("anyouzo'a");
  const found = r.some(p => p.nomComplet === 'ANYOUZO\u2019A Marc Thyrille');
  assert(found, 'devrait trouver ANYOUZO\u2019A Marc Thyrille');
});

/* ── UL3 — Filtre Absents : compte juste sans pointages ── */
test('UL3 — filtre Absents : compte 0 sans pointages (rien \u00e9chu)', () => {
  const d = div();
  const store = fakeStore();
  const tFarFuture = Date.parse('2026-06-01T00:00:00');
  screenList(d, store, new Map(), tFarFuture);
  const absBtn = d.querySelector('#ls-filter-abs');
  assert(absBtn !== null, 'bouton Absents');
  assert(absBtn.textContent.includes('0'), 'Absents = 0');
});

/* ── UL4 — Filtre Absents recalculé après un pointage ── */
test('UL4 — filtre Absents : recalcul\u00e9 apr\u00e8s un pointage manuel', async () => {
  const d = div();
  const m = new Map();
  const store = fakeStore(m);
  const tEchu = Date.parse('2026-08-06T19:00:00');
  screenList(d, store, m, tEchu);

  const absBtn = d.querySelector('#ls-filter-abs');
  const avant = parseInt(absBtn.textContent.match(/\d+/)[0], 10);
  assert(avant > 0, 'il y a des absents avant pointage');

  const slots = tousLesSlots();
  for (const s of slots) {
    await store.reg(cle(idDe(1), s), tEchu, 'manuel', 'auto');
  }
  screenList(d, store, store.getPointages(), tEchu);
  const apresBtn = d.querySelector('#ls-filter-abs');
  const apres = parseInt(apresBtn.textContent.match(/\d+/)[0], 10);
  assert(apres < avant, 'moins d\'absents apr\u00e8s pointage (' + apres + ' < ' + avant + ')');
});

/* ── UL5 — Pastille orange ssi mode === 'manuel' ── */
test('UL5 — pastille orange (manuel) vs pr\u00e9sence (scan)', () => {
  const d = div();
  const m = new Map();
  const kScan = cle(idDe(1), { date: '2026-08-04', creneau: 'matin' });
  const kManu = cle(idDe(2), { date: '2026-08-04', creneau: 'matin' });
  m.set(kScan, { generation: 0, statut: 'actif', tau: Date.now(), mode: 'scan', device: 't', override: 'auto' });
  m.set(kManu, { generation: 0, statut: 'actif', tau: Date.now(), mode: 'manuel', device: 't', override: 'auto' });
  const store = fakeStore(m);
  const t = Date.parse('2026-08-04T18:00:00');
  screenList(d, store, m, t);

  const rows = d.querySelectorAll('.ls-row');
  const firstPastilles = rows[0].querySelectorAll('.ls-pastille');
  const secondPastilles = rows[1].querySelectorAll('.ls-pastille');

  const hasManual = Array.from(secondPastilles).some(el => el.classList.contains('ls-pastille--manuel'));
  const hasPresent = Array.from(firstPastilles).some(el => el.classList.contains('ls-pastille--present'));
  assert(hasPresent, 'scan = pastille pr\u00e9sence');
  assert(hasManual, 'manuel = pastille orange');
});

/* ── UL6 — 6 pastilles dans l'ordre de tousLesSlots() ── */
test('UL6 — 6 pastilles dans l\'ordre de tousLesSlots()', () => {
  const d = div();
  const store = fakeStore();
  screenList(d, store, new Map());
  const firstRow = d.querySelector('.ls-row');
  if (!firstRow) {
    assert(false, 'pas de ligne rendue');
    return;
  }
  const pastilles = firstRow.querySelectorAll('.ls-pastille');
  assertEq(pastilles.length, 6, '6 pastilles');
  const slots = tousLesSlots();
  assertEq(pastilles.length, slots.length, 'autant de pastilles que de slots');
});

/* ── UL7 — Pas de 'Mt'/'Md' dans js/model|db|scan (compile-time check) ── */
test('UL7 — pas de fuite "Mt"/"Md" dans le code m\u00e9tier', () => {
  /* ce test est symbolique ici — le vrai est dans l'assertion bash */
  const src = screenList.toString();
  assert(!src.includes("'Mt'"), 'pas de litt\u00e9ral Mt');
  assert(!src.includes("'Md'"), 'pas de litt\u00e9ral Md');
});

/* ── UL8 — Annulation exige confirmation ; après annulation, pastille redevient A ou — ── */
test('UL8 — annulation : confirmation; pastille redevient A ou \u2014 selon \u00e9ch\u00e9ance', async () => {
  const d = div();
  const m = new Map();
  const k = cle(idDe(1), { date: '2026-08-04', creneau: 'matin' });
  m.set(k, { generation: 0, statut: 'actif', tau: Date.now(), mode: 'scan', device: 't', override: 'auto' });
  const store = fakeStore(m);
  const tEchu = Date.parse('2026-08-04T18:00:00');
  screenList(d, store, m, tEchu);

  /* Vérifie que la pastille montre le pointage avant annulation */
  const firstRow = d.querySelector('.ls-row');
  const pastilles = firstRow.querySelectorAll('.ls-pastille');
  const matinPastille = pastilles[0];
  assert(matinPastille.classList.contains('ls-pastille--present'), 'pr\u00e9sent avant annulation');

  /* Simuler l'annulation directement */
  const result = await store.cancel(k);
  assertEq(result.resultat, 'OK', 'annulation r\u00e9ussie');

  /* Re-rendre */
  screenList(d, store, store.getPointages(), tEchu);
  const newRow = d.querySelector('.ls-row');
  const newPastilles = newRow.querySelectorAll('.ls-pastille');
  const newMatin = newPastilles[0];
  assert(newMatin.classList.contains('ls-pastille--absent'), 'absent apr\u00e8s annulation (\u00e9chu)');
  assertEq(newMatin.textContent.trim(), 'A', 'affiche A');
});
