import { decode } from './decode.js';
import { retenir } from './debounce.js';
import { valider } from '../model/ident.js';
import { slotAvecOverride } from '../model/slots.js';

/**
 * §7 — Pipeline Scan de bout en bout
 * @param {ImageData} image — ROI déjà extraite par camera.js
 * @param {number} t — epoch ms
 * @param {'auto'|'matin'|'midi'} override
 * @param {Object} store — Store retourné par initDB()
 * @param {Map<string,number>} H — historique debounce
 * @param {function} [_decode] — injectable pour tests
 */
export async function Scan(image, t, override, store, H, _decode = decode) {
  const w = await _decode(image);
  if (w === null) return { resultat: 'RIEN' };

  if (!retenir(w, t, H)) return { resultat: 'RIEN' };

  const e = valider(w);
  if (e !== 'ok') return { resultat: 'ERREUR', code: e };

  const s = slotAvecOverride(t, override);
  if (s === null) return { resultat: 'HORS_SESSION' };

  const parts = w.match(/^BIM26-([0-9]{3})-/);
  const cle = `BIM26-${parts[1]}|${s.date}|${s.creneau}`;
  return store.reg(cle, t, 'scan', override);
}
