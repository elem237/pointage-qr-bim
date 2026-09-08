/**
 * C2 — Décodage QR
 */
import jsQR from '../../vendor/jsqr.js';

/* Singleton : UN seul BarcodeDetector réutilisé.
 * Le créer à chaque trame (10 Hz) alloue un objet natif + workers
 * à chaque fois — fuite mémoire et surchauffe sur Android. */
let _detector = null;

function getDetector() {
  if (!('BarcodeDetector' in globalThis)) return null;
  if (!_detector) {
    try {
      _detector = new BarcodeDetector({ formats: ['qr_code'] });
    } catch {
      return null;
    }
  }
  return _detector;
}

/** Réinitialise le singleton (tests uniquement). */
export function _resetDetector() {
  _detector = null;
}

/**
 * @param {ImageData} imageData
 * @returns {Promise<string|null>}
 */
export async function decode(imageData) {
  const detector = getDetector();
  if (detector) {
    try {
      const codes = await detector.detect(imageData);
      if (codes.length > 0) return codes[0].rawValue;
    } catch {
    }
  }
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code ? code.data : null;
}
