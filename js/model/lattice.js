/**
 * @typedef {import('../data.js').PointageValue} PointageValue
 */

/**
 * Rang d'une PointageValue (vecteur de 5 composantes).
 * @param {PointageValue|null|undefined} v
 * @returns {Array|null}
 */
export function rang(v) {
  if (v == null) return null;
  return [
    v.generation,
    v.statut === 'annule' ? 1 : 0,
    -v.tau,
    v.mode === 'manuel' ? 1 : 0,
    v.device,
  ];
}

/**
 * Comparaison lexicographique de deux rangs.
 * @param {Array|null} a
 * @param {Array|null} b
 * @returns {-1|0|1}
 */
function cmpRang(a, b) {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

/**
 * Join de treillis : retourne la valeur dominante.
 * @param {PointageValue|null} v1
 * @param {PointageValue|null} v2
 * @returns {PointageValue|null}
 */
export function join(v1, v2) {
  return cmpRang(rang(v1), rang(v2)) >= 0 ? v1 : v2;
}

/**
 * Fusion de deux états (Map<Cle, PointageValue>).
 * @param {Map<string, PointageValue>} m1
 * @param {Map<string, PointageValue>} m2
 * @returns {Map<string, PointageValue>}
 */
export function fusion(m1, m2) {
  const out = new Map(m1);
  for (const [k, v] of m2) out.set(k, join(out.get(k) ?? null, v));
  return out;
}
