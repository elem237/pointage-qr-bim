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
    video: { facingMode: 'environment' },
  });
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
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @returns {ImageData}
 */
export function captureROI(video, canvas) {
  const cfg = getConfig();
  const w = video.videoWidth;
  const h = video.videoHeight;
  const size = Math.min(w, h) * cfg.ROI_RATIO;
  const x = (w - size) / 2;
  const y = (h - size) / 2;
  canvas.width = Math.ceil(size);
  canvas.height = Math.ceil(size);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, x, y, size, size, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
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
      const roi = captureROI(video, canvas);
      onFrame(roi);
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
