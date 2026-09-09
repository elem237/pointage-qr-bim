/**
 * C1 — Caméra
 */
import { getConfig } from '../config.js';

/**
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<MediaStream>}
 */
export async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
  });
  // Best effort : exposition continue si l'appareil la propose —
  // aide en contre-jour / pleine lumière (scans de l'après-midi).
  try {
    const track = stream.getVideoTracks()[0];
    const caps = track && track.getCapabilities ? track.getCapabilities() : null;
    if (caps && Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
      await track.applyConstraints({ advanced: [{ exposureMode: 'continuous' }] });
    }
  } catch {
  }
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

/**
 * @param {MediaStream} stream
 */
export function stopCamera(stream) {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

/**
 * Extrait la ROI (carré central) d'une frame vidéo
 * Le canvas n'est redimensionné que si la taille change : réassigner
 * width/height à chaque trame réalloue le buffer et réinitialise
 * le contexte 2D (coût CPU + à-coups sur Android).
 * La ROI décodée est plafonnée à 240 px de côté : un QR version 1
 * (21×21 modules) se décode dès ~4 px/module, et diviser les pixels
 * par ~2–4 divise le coût jsQR d'autant. La RÉGION (carré central
 * × ROI_RATIO) est inchangée — seule la résolution de décodage baisse.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @returns {ImageData}
 */
export const ROI_DECODE_MAX = 240;

export function captureROI(video, canvas) {
  const cfg = getConfig();
  const w = video.videoWidth;
  const h = video.videoHeight;
  const size = Math.min(w, h) * cfg.ROI_RATIO;
  const cw = Math.min(Math.ceil(size), ROI_DECODE_MAX);
  const ch = Math.min(Math.ceil(size), ROI_DECODE_MAX);
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  const ctx = canvas.getContext('2d');
  const x = (w - size) / 2;
  const y = (h - size) / 2;
  ctx.drawImage(video, x, y, size, size, 0, 0, cw, ch);
  return ctx.getImageData(0, 0, cw, ch);
}

/**
 * Enveloppe anti-chevauchement pour onFrame.
 * Le décodage (jsQR / BarcodeDetector) coûte plus cher qu'une période
 * de 100 ms sur un Android d'entrée de gamme : sans garde, les appels
 * s'empilent (N décodages simultanés), le CPU sature et l'app ralentit
 * jusqu'au gel. Avec la garde : 10 Hz max, jamais de chevauchement —
 * une trame est sautée tant que la précédente n'est pas terminée.
 * @param {(roi: ImageData) => (void|Promise<any>)} onFrame
 * @returns {(roi: ImageData) => boolean} vrai si la trame est traitée
 */
export function sansChevauchement(onFrame, delaiSecuriteMs = 5000) {
  let enCours = false;
  return (roi) => {
    if (enCours) return false;
    let r;
    try {
      r = onFrame(roi);
    } catch {
      return true;
    }
    if (r && typeof r.then === 'function') {
      enCours = true;
      const liberer = () => { enCours = false; };
      r.then(liberer, liberer);
      // Sécurité : même une promesse qui ne se termine jamais (décodeur
      // natif bloqué, IndexedDB en souffrance) ne fige pas le scan.
      setTimeout(liberer, delaiSecuriteMs);
    }
    return true;
  };
}

/**
 * Surveille la fin involontaire du flux (OS qui révoque la caméra en
 * arrière-plan, surchauffe, débranchement). Les tracks émettent 'ended' ;
 * sans écoute, l'app affiche une vidéo noire sans explication.
 * Note : `track.stop()` volontaire émet aussi 'ended' — l'appelant doit
 * ignorer le rappel quand il a lui-même arrêté le flux.
 * @param {MediaStream} stream
 * @param {(track: MediaStreamTrack) => void} cb
 * @returns {() => void} fonction de désabonnement
 */
export function onStreamEnded(stream, cb) {
  if (!stream) return () => {};
  const off = [];
  for (const track of stream.getTracks()) {
    const h = () => cb(track);
    track.addEventListener('ended', h);
    off.push(() => track.removeEventListener('ended', h));
  }
  return () => off.forEach(f => f());
}

/**
 * Boucle de scan throttlée
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {(roi: ImageData) => void} onFrame
 * @returns {{ stop: () => void, freeze: (ms: number) => void }}
 */
export function lancerBoucle(video, canvas, onFrame) {
  const cfg = getConfig();
  const interval = 1000 / cfg.FREQ_HZ;
  const garde = sansChevauchement(onFrame);
  let lastTime = 0;
  let running = true;
  let freeze = false;

  function loop(time) {
    if (!running) return;
    if (freeze) {
      requestAnimationFrame(loop);
      return;
    }
    if (time - lastTime >= interval) {
      lastTime = time;
      // Capture + décodage DANS la garde : quand l'appareil rame, on saute
      // aussi le getImageData (synchrone, coûteux : synchro GPU→CPU) au lieu
      // de le payer à chaque tick pour un décodage qui serait ignoré.
      garde(() => {
        const roi = captureROI(video, canvas);
        return onFrame(roi);
      });
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return {
    stop: () => { running = false; },
    freeze: (ms) => {
      freeze = true;
      setTimeout(() => { freeze = false; }, ms);
    },
  };
}
