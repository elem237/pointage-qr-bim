/**
 * Normalisation pour indexation et recherche.
 * Écart délibéré vs formalisation : remplacement [’‘] → "'" avant NFKD
 * (§5 A1 — SPEC v1.1).
 */
export function norm(x) {
  return x
    .replace(/[\u2019\u2018]/g, "'")
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
