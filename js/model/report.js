import { getConfig } from '../config.js';
import { idDe } from './ident.js';
import { PARTICIPANTS } from '../data.js';

/** @typedef {import('../data.js').PointageValue} PointageValue */

/**
 * Calcule l'epoch ms de fin d'un créneau (UTC+1).
 * matin → H_BASCULE, midi → H_FIN_MIDI sur la date du slot.
 * @param {{ date: string, creneau: 'matin'|'midi' }} slot
 * @returns {number}
 */
export function finDe(slot) {
  const cfg = getConfig();
  const h = slot.creneau === 'matin' ? cfg.H_BASCULE : cfg.H_FIN_MIDI;
  const [hh, mm] = h.split(':').map(Number);
  const [y, m, d] = slot.date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - cfg.TZ_OFFSET_MIN * 60 * 1000;
}

/**
 * Construit la clé de pointage pour un participant et un créneau.
 * @param {number} numero
 * @param {{ date: string, creneau: 'matin'|'midi' }} slot
 * @returns {string}
 */
function cle(numero, slot) {
  return idDe(numero) + '|' + slot.date + '|' + slot.creneau;
}

/**
 * État d'une cellule du rapport.
 * @param {Map<string, PointageValue>} m — pointages
 * @param {{ numero: number, nomComplet: string }} participant
 * @param {{ date: string, creneau: 'matin'|'midi' }} slot
 * @param {number} tNow — epoch ms
 * @returns {{ type: 'present', tau: number } | { type: 'absent' } | { type: 'vide' }}
 */
export function etatCellule(m, participant, slot, tNow) {
  const v = m.get(cle(participant.numero, slot));
  if (v != null && v.statut === 'actif') {
    return { type: 'present', tau: v.tau };
  }
  if (tNow >= finDe(slot)) {
    return { type: 'absent' };
  }
  return { type: 'vide' };
}

/**
 * Créneaux dont la fin est passée.
 * @param {number} tNow — epoch ms
 * @returns {Array<{ date: string, creneau: 'matin'|'midi' }>}
 */
export function slotsEchus(tNow) {
  const cfg = getConfig();
  const echus = [];
  for (const date of cfg.DATES) {
    for (const creneau of ['matin', 'midi']) {
      const s = { date, creneau };
      if (tNow >= finDe(s)) echus.push(s);
    }
  }
  return echus;
}

/**
 * Nombre de présents sur un créneau.
 * @param {Map<string, PointageValue>} m
 * @param {{ date: string, creneau: 'matin'|'midi' }} slot
 * @returns {number}
 */
export function presents(m, slot) {
  let count = 0;
  for (const p of PARTICIPANTS) {
    const v = m.get(cle(p.numero, slot));
    if (v != null && v.statut === 'actif') count++;
  }
  return count;
}

/**
 * Taux de présence sur un créneau (0..1).
 * @param {Map<string, PointageValue>} m
 * @param {{ date: string, creneau: 'matin'|'midi' }} slot
 * @returns {number}
 */
export function taux(m, slot) {
  return presents(m, slot) / 16;
}

/**
 * Taux de présence global sur tous les créneaux échus.
 * @param {Map<string, PointageValue>} m
 * @param {number} tNow — epoch ms
 * @returns {number|null} null si aucun créneau échu (INDÉFINI)
 */
export function theta(m, tNow) {
  const echus = slotsEchus(tNow);
  if (echus.length === 0) return null;
  let total = 0;
  for (const s of echus) total += presents(m, s);
  return total / (16 * echus.length);
}
