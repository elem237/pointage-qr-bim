import { test, assert, assertEq } from './harness.js';
import { pos, genererBadges } from '../js/badges.js';
import { valider } from '../js/model/ident.js';
import { PARTICIPANTS } from '../js/data.js';

// ─── pos() ───────────────────────────────────────────────

test('pos — injective sur 16 participants', () => {
  const clés = new Set(PARTICIPANTS.map(p => {
    const { page, index } = pos(p.numero);
    return `${page}-${index}`;
  }));
  assertEq(clés.size, 16);
});

test('pos — 2 pages exactement', () => {
  const pages = new Set(PARTICIPANTS.map(p => pos(p.numero).page));
  assertEq(pages.size, 2);
  assert(pages.has(1));
  assert(pages.has(2));
});

test('pos — 8 badges page 1, 8 badges page 2', () => {
  const p1 = PARTICIPANTS.filter(p => pos(p.numero).page === 1);
  const p2 = PARTICIPANTS.filter(p => pos(p.numero).page === 2);
  assertEq(p1.length, 8);
  assertEq(p2.length, 8);
});

test('pos(1) → {page:1, index:1}', () => {
  const p = pos(1);
  assertEq(p.page, 1);
  assertEq(p.index, 1);
});

test('pos(8) → {page:1, index:8}', () => {
  const p = pos(8);
  assertEq(p.page, 1);
  assertEq(p.index, 8);
});

test('pos(9) → {page:2, index:1}', () => {
  const p = pos(9);
  assertEq(p.page, 2);
  assertEq(p.index, 1);
});

test('pos(16) → {page:2, index:8}', () => {
  const p = pos(16);
  assertEq(p.page, 2);
  assertEq(p.index, 8);
});

// ─── genererBadges() ─────────────────────────────────────

test('16 badges générés', async () => {
  const badges = await genererBadges();
  assertEq(badges.length, 16);
});

test('0 doublon — 16 payloads distincts', async () => {
  const badges = await genererBadges();
  const payloads = new Set(badges.map(b => b.payload));
  assertEq(payloads.size, 16);
});

test('chaque payload passe valider() → "ok"', async () => {
  // genererBadges() appelle precalcChecksums() → CHECKSUMS peuplé pour valider()
  const badges = await genererBadges();
  for (const b of badges) {
    assertEq(valider(b.payload), 'ok', `${b.payload} → ok`);
  }
});

test('tous les QR en version 1 — moduleCount === 21', async () => {
  const badges = await genererBadges();
  for (const b of badges) {
    assertEq(b.moduleCount, 21, `${b.id} → 21 modules`);
  }
});

test('chaque badge contient un SVG', async () => {
  const badges = await genererBadges();
  for (const b of badges) {
    assert(typeof b.svg === 'string' && b.svg.startsWith('<svg'), `${b.id} SVG`);
  }
});
