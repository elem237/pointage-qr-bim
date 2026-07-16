/**
 * Étape 9 — Écran Scan
 * UI + sélecteur Auto/Matin/Midi
 * Couleur et message (feedback visuel) gérés ici (ETAT.md §64).
 */
import { startCamera, stopCamera, lancerBoucle } from '../scan/camera.js';
import { Scan } from '../scan/pipeline.js';
import { feedback, initAudio } from '../feedback.js';

const H_MAP = new Map();

export function formatTau(tau) {
  const d = new Date(tau + 3600000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function messagePourResultat(r) {
  switch (r.resultat) {
    case 'RIEN': return '';
    case 'OK': return r.participant ? r.participant.nomComplet : '';
    case 'DEJA_POINTE': return `déjà pointé à ${formatTau(r.tau)}`;
    case 'ERREUR': {
      switch (r.code) {
        case 'format': return 'Format non reconnu';
        case 'checksum': return 'Checksum invalide';
        case 'inconnu': return 'Code inconnu';
        default: return 'Erreur inconnue';
      }
    }
    case 'HORS_SESSION': return 'hors créneau';
    default: return '';
  }
}

export function couleurPourResultat(r) {
  switch (r.resultat) {
    case 'OK': return '#4caf50';
    case 'DEJA_POINTE': return '#ff9800';
    case 'ERREUR': return '#f44336';
    case 'HORS_SESSION': return '#9e9e9e';
    default: return 'transparent';
  }
}

export async function screenScan(container, store) {
  container.innerHTML = `
<div id="screen-scan" style="position:relative;width:100%;height:calc(100vh - 44px);overflow:hidden;">
  <video id="camera-feed" autoplay playsinline style="width:100%;height:100%;display:block;object-fit:cover;"></video>
  <canvas id="roi-canvas" style="display:none;"></canvas>
  <div id="selector-bar" style="position:absolute;top:8px;left:0;right:0;text-align:center;background:rgba(0,0,0,0.5);padding:8px;">
    <label style="color:#fff;margin:0 8px;cursor:pointer;">
      <input type="radio" name="override" value="auto" checked> Auto
    </label>
    <label style="color:#fff;margin:0 8px;cursor:pointer;">
      <input type="radio" name="override" value="matin"> Matin
    </label>
    <label style="color:#fff;margin:0 8px;cursor:pointer;">
      <input type="radio" name="override" value="midi"> Midi
    </label>
  </div>
  <div id="result-overlay" style="display:none;position:absolute;bottom:52px;left:0;right:0;padding:16px;text-align:center;font-size:1.4em;font-weight:bold;color:#fff;"></div>
  <button id="btn-scan" style="position:absolute;bottom:0;left:0;right:0;width:100%;padding:12px;font-size:1.1em;border:none;cursor:pointer;background:#006633;color:#fff;">Démarrer le scan</button>
</div>
  `;

  const video = container.querySelector('#camera-feed');
  const canvas = container.querySelector('#roi-canvas');
  const resultOverlay = container.querySelector('#result-overlay');
  const btnScan = container.querySelector('#btn-scan');

  let stream = null;
  let controller = null;

  async function arreterScan() {
    if (controller) { controller.stop(); controller = null; }
    if (stream) { stopCamera(stream); stream = null; }
    btnScan.textContent = 'Démarrer le scan';
  }

  btnScan.addEventListener('click', async () => {
    if (stream) { arreterScan(); return; }
    resultOverlay.style.display = 'block';
    resultOverlay.style.background = '#555';
    resultOverlay.textContent = 'Démarrage de la caméra…';
    const audioOk = initAudio();
    if (audioOk && audioOk.state === 'suspended') {
      try { await audioOk.resume(); } catch (_) {}
    }
    try {
      stream = await startCamera(video);
      btnScan.textContent = 'Arrêter';
      resultOverlay.style.display = 'none';
      controller = lancerBoucle(video, canvas, async (roi) => {
        const override = container.querySelector('input[name="override"]:checked').value;
        const result = await Scan(roi, Date.now(), override, store, H_MAP);
        if (result.resultat === 'RIEN') return;
        resultOverlay.style.display = 'block';
        resultOverlay.style.background = couleurPourResultat(result);
        resultOverlay.textContent = messagePourResultat(result);
        feedback(result);
        if (controller) controller.freeze(300);
      });
    } catch (e) {
      resultOverlay.style.display = 'block';
      resultOverlay.style.background = '#f44336';
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        resultOverlay.textContent = 'Caméra bloquée — autorisez-la dans Réglages > Safari, ou utilisez l\'écran Liste';
      } else if (e.name === 'NotFoundError') {
        resultOverlay.textContent = 'Aucune caméra trouvée';
      } else {
        resultOverlay.textContent = 'Caméra inaccessible';
      }
      feedback({ resultat: 'ERREUR', code: 'inconnu' });
    }
  });

  return {
    arreterScan,
    getOverrideValue: () => container.querySelector('input[name="override"]:checked').value,
  };
}
