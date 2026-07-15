import { getConfig } from '../config.js';

/**
 * @typedef {Object} Slot
 * @property {string} date
 * @property {'matin'|'midi'} creneau
 */

function localDouala(t) {
  const d = new Date(t + getConfig().TZ_OFFSET_MIN * 60 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return [`${yyyy}-${mm}-${dd}`, `${hh}:${min}`];
}

/**
 * @param {number} t - epoch ms
 * @returns {Slot|null}
 */
export function slotDe(t) {
  const cfg = getConfig();
  const [d, h] = localDouala(t);
  if (!cfg.DATES.includes(d)) return null;
  if (cfg.H_DEBUT_MATIN <= h && h < cfg.H_BASCULE) return { date: d, creneau: 'matin' };
  if (cfg.H_BASCULE <= h && h < cfg.H_FIN_MIDI) return { date: d, creneau: 'midi' };
  return null;
}

/**
 * @param {number} t - epoch ms
 * @param {'auto'|'matin'|'midi'} o
 * @returns {Slot|null}
 */
export function slotAvecOverride(t, o) {
  if (o === 'auto') return slotDe(t);
  const cfg = getConfig();
  const [d] = localDouala(t);
  if ((o === 'matin' || o === 'midi') && cfg.DATES.includes(d)) {
    return { date: d, creneau: o };
  }
  return null;
}
