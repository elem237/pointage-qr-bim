/**
 * C4 — Anti-rebond
 * @param {string} w — code scanné
 * @param {number} t — epoch ms
 * @param {Map<string,number>} H — historique
 * @returns {boolean} vrai si le code est accepté (pas vu depuis >= 3s)
 */
export function retenir(w, t, H) {
  const dernier = H.get(w);
  if (dernier !== undefined && t - dernier < 3000) return false;
  H.set(w, t);
  return true;
}
