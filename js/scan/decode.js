/**
 * C2 — Décodage QR
 */
import jsQR from '../../vendor/jsqr.js';

/**
 * @param {ImageData} imageData
 * @returns {Promise<string|null>}
 */
export async function decode(imageData) {
  if ('BarcodeDetector' in globalThis) {
    try {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const codes = await detector.detect(imageData);
      if (codes.length > 0) return codes[0].rawValue;
    } catch {
    }
  }
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code ? code.data : null;
}
