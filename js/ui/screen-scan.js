/**
 * U2 — Écran Scan (INTERFACE.md §5)
 * 4 bandes verticales : Navigation (U1) / Compteur / Caméra / Retour
 */
import { startCamera, stopCamera, lancerBoucle, onStreamEnded, onStreamMute } from '../scan/camera.js';
import { Scan } from '../scan/pipeline.js';
import { decode } from '../scan/decode.js';
import qrcode from '../../vendor/qrcode.js';
import { idDe, payload as genererPayload } from '../model/ident.js';
import { feedback, initAudio } from '../feedback.js';
import { slotAvecOverride } from '../model/slots.js';
import { etatCellule } from '../model/report.js';
import { PARTICIPANTS } from '../data.js';
import { getConfig } from '../config.js';

const H_MAP = new Map();

/* Compteurs de diagnostic embarqué (incident « scan muet ») :
 * trames = images traitées, lus = QR décodés (valides ou non).
 * trames qui n'augmentent pas → boucle figée ; lus = 0 → la caméra
 * ne lit rien (lumière, flou, objectif) ; lus > 0 sans OK → logique. */
const STATS = { trames: 0, lus: 0, dernier: '—' };

/* ── Helpers ── */

export function formatTau(tau) {
  const d = new Date(tau + 3600000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatTauCourt(tau) {
  return formatTau(tau).replace(':', 'h');
}

function slotInfo(t, override) {
  const s = slotAvecOverride(t, override);
  if (!s) return null;
  const dates = getConfig().DATES;
  const idx = dates.indexOf(s.date);
  return idx === -1 ? null : {
    date: s.date,
    creneau: s.creneau,
    jour: idx + 1,
    label: `Jour ${idx + 1} · ${s.creneau === 'matin' ? 'Matin' : 'Midi'}`,
    labelCourt: `J${idx + 1} ${s.creneau === 'matin' ? 'Matin' : 'Midi'}`,
  };
}

/* ── 4 bandes ── */

function template() {
  return `
<div id="screen-scan">
  <div id="scan-counter">
    <span id="scan-counter-left"></span>
    <span id="scan-counter-right"></span>
  </div>
  <div id="scan-camera">
    <video id="camera-feed" autoplay playsinline></video>
    <canvas id="roi-canvas" style="display:none"></canvas>
    <div id="scan-reticle">
      <div class="ret-c ret-tl"></div>
      <div class="ret-c ret-tr"></div>
      <div class="ret-c ret-bl"></div>
      <div class="ret-c ret-br"></div>
    </div>
    <button id="scan-torch" type="button" hidden>Lampe</button>
    <div id="scan-selector">
      <button class="sel-btn active" data-val="auto">Auto</button>
      <button class="sel-btn" data-val="matin">Matin</button>
      <button class="sel-btn" data-val="midi">Midi</button>
    </div>
  </div>
  <div id="scan-result">
    <div id="scan-result-inner">Présentez un badge</div>
  </div>
  <details id="scan-diag">
    <summary>Diagnostic</summary>
    <div id="scan-diag-body">trames : 0 · lus : 0 · —</div>
    <button id="scan-diag-test" type="button">Tester le décodeur</button>
    <div id="scan-diag-test-result"></div>
  </details>
</div>`;
}

/* ── Compteur (bande 2) ── */

export function updateCounter(container, store, t, override) {
  const left = container.querySelector('#scan-counter-left');
  const right = container.querySelector('#scan-counter-right');
  const s = slotAvecOverride(t, override);
  if (!s) {
    left.textContent = 'Hors créneau';
    right.innerHTML = `<strong>&mdash;</strong> / ${PARTICIPANTS.length} pointés`;
    return;
  }
  const dates = getConfig().DATES;
  const idx = dates.indexOf(s.date);
  if (idx === -1) {
    left.textContent = 'Hors créneau';
    right.innerHTML = `<strong>&mdash;</strong> / ${PARTICIPANTS.length} pointés`;
    return;
  }
  const creneauLabel = s.creneau === 'matin' ? 'Matin' : 'Midi';
  left.textContent = `Jour ${idx + 1} · ${creneauLabel}`;
  const m = store.getPointages();
  const n = PARTICIPANTS.filter(p => etatCellule(m, p, s, t).type === 'present').length;
  right.innerHTML = `<strong>${n}</strong> / ${PARTICIPANTS.length} pointés`;
}

/* ── Panneau de retour (bande 4) — 6 états ── */

function etatOK(participant, si, tau) {
  const id = idDe(participant.numero);
  return {
    bg: 'var(--vert-500)',
    html:
      '<svg class="result-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
      `<div class="result-sub">Pointé · ${si.labelCourt} · ${formatTauCourt(tau)}</div>` +
      `<div class="result-name">${participant.nomComplet}</div>` +
      `<div class="result-id">${id}</div>`,
  };
}

function etatDejaPointe(tau, participant) {
  return {
    bg: '#ca8a04',
    html:
      `<div class="result-sub">Déjà pointé à ${formatTauCourt(tau)}</div>` +
      `<div class="result-name">${participant.nomComplet}</div>`,
  };
}

export const ERREUR_LABELS = { format: 'Format non reconnu', checksum: 'Checksum invalide', inconnu: 'Code inconnu' };

export function messagePourResultat(r) {
  switch (r.resultat) {
    case 'RIEN': return '';
    case 'OK': return 'Pointé';
    case 'DEJA_POINTE': return `Déjà pointé à ${formatTauCourt(r.tau)}`;
    case 'ERREUR': return ERREUR_LABELS[r.code] || 'Erreur inconnue';
    case 'HORS_SESSION': return 'Hors créneau';
    default: return '';
  }
}

function etatErreur(code) {
  return {
    bg: 'var(--danger)',
    html: `<div class="result-sub">${ERREUR_LABELS[code] || 'Erreur inconnue'}</div>`,
  };
}

function etatHorsSession() {
  return {
    bg: '#57534e',
    html: '<div class="result-sub">Hors créneau</div>',
  };
}

function etatRien() {
  return {
    bg: 'var(--surf-1)',
    html: '<div class="result-sub" style="color:var(--txt-3)">Présentez un badge</div>',
  };
}

export function renderEtatPanel(container, result, si, tau, participant) {
  const inner = container.querySelector('#scan-result-inner');
  const panel = container.querySelector('#scan-result');
  let etat;
  switch (result.resultat) {
    case 'OK':
      etat = etatOK(result.participant, si, tau);
      break;
    case 'DEJA_POINTE':
      etat = etatDejaPointe(result.tau, participant);
      break;
    case 'ERREUR':
      etat = etatErreur(result.code);
      break;
    case 'HORS_SESSION':
      etat = etatHorsSession();
      break;
    default:
      etat = etatRien();
      break;
  }
  panel.style.background = etat.bg;
  inner.innerHTML = etat.html;
}

/* ── Capture du payload décodé pour enrichir DEJA_POINTE ── */

let _lastDecodedPayload = null;
let _dernierDiag = 0;

function heureCourte(t) {
  const d = new Date(t);
  const p2 = (n) => String(n).padStart(2, '0');
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

function majDiag(container, t, force, dims) {
  const el = container.querySelector('#scan-diag-body');
  if (!el) return;
  if (!force && t - _dernierDiag < 1000) return;
  _dernierDiag = t;
  el.textContent = `trames : ${STATS.trames} · lus : ${STATS.lus} · ${dims || ''} · ${STATS.dernier}`;
}

async function _decodeTrack(img) {
  _lastDecodedPayload = await decode(img);
  if (_lastDecodedPayload !== null) STATS.lus++;
  return _lastDecodedPayload;
}

function participantDePayload(payload) {
  if (!payload) return null;
  const m = payload.match(/^BIM26-([0-9]{3})-/);
  if (!m) return null;
  const numero = parseInt(m[1], 10);
  return PARTICIPANTS.find(p => p.numero === numero) || null;
}

/**
 * Autotest du décodeur SUR L'APPAREIL : génère un vrai QR de badge
 * (même librairie que les badges imprimés), le rasterise et le décode
 * par le même chemin que le scan live.
 * - OK → le décodage marche : un échec live vient de la caméra/lumière.
 * - HS → le décodage est cassé sur cet appareil (repli : pointage manuel).
 * @returns {Promise<{ok: boolean, attendu?: string, lu?: string|null, erreur?: string}>}
 */
export async function autotestDecodeur() {
  try {
    const attendu = await genererPayload(idDe(1));
    const qr = qrcode(1, 'Q');
    qr.addData(attendu, 'Alphanumeric');
    qr.make();
    const n = qr.getModuleCount();
    const S = 10, M = 4;
    const size = (n + M * 2) * S;
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + M) * S, (r + M) * S, S, S);
      }
    }
    const lu = await decode(ctx.getImageData(0, 0, size, size), 5000);
    return { ok: lu === attendu, attendu, lu };
  } catch (e) {
    return { ok: false, erreur: String((e && e.message) || e) };
  }
}

/* ── screenScan ── */

export async function screenScan(container, store) {
  container.innerHTML = template();
  STATS.trames = 0;
  STATS.lus = 0;
  STATS.dernier = '—';
  _dernierDiag = 0;
  const video = container.querySelector('#camera-feed');
  const canvas = container.querySelector('#roi-canvas');
  const panel = container.querySelector('#scan-result');
  const inner = container.querySelector('#scan-result-inner');

  /* Sélecteur */
  const selector = container.querySelector('#scan-selector');
  selector.addEventListener('click', (e) => {
    const btn = e.target.closest('.sel-btn');
    if (!btn) return;
    selector.querySelectorAll('.sel-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const t = Date.now();
    const ov = btn.dataset.val;
    updateCounter(container, store, t, ov);
  });

  let stream = null;
  let controller = null;
  let _derniereT = 0;
  let visEcoute = false;
  let ouvert = true;
  let torchOn = false;

  async function appliquerTorche() {
    try {
      const track = stream && stream.getVideoTracks()[0];
      if (!track || !track.applyConstraints) return false;
      await track.applyConstraints({ advanced: [{ torch: torchOn }] });
      return true;
    } catch {
      return false;
    }
  }

  function configurerTorche() {
    const btn = container.querySelector('#scan-torch');
    if (!btn) return;
    torchOn = false;
    btn.classList.remove('on');
    btn.textContent = 'Lampe';
    let supportee = false;
    try {
      const track = stream && stream.getVideoTracks()[0];
      const caps = track && track.getCapabilities ? track.getCapabilities() : null;
      supportee = !!(caps && caps.torch);
    } catch {
      supportee = false;
    }
    btn.hidden = !supportee;
    btn.onclick = async () => {
      torchOn = !torchOn;
      if (!await appliquerTorche()) torchOn = !torchOn;
      btn.classList.toggle('on', torchOn);
      btn.textContent = torchOn ? 'Lampe : ON' : 'Lampe';
    };
  }

  async function suspendre() {
    // Pause sans toucher au panneau : libère la caméra (batterie,
    // révocation OS en arrière-plan) en gardant l'UI en place.
    torchOn = false;
    if (controller) { controller.stop(); controller = null; }
    if (stream) { stopCamera(stream); stream = null; }
  }

  async function arreterScan() {
    ouvert = false;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilite);
    }
    visEcoute = false;
    await suspendre();
    panel.style.background = 'var(--surf-1)';
    inner.innerHTML = 'Présentez un badge';
  }

  function onVisibilite() {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      // Mise en arrière-plan (verrouillage, changement d'app, pause
      // déjeuner) : on relâche proprement la caméra…
      suspendre();
    } else if (!stream && ouvert) {
      // …et on la ré-acquiert au retour. Sans ça, après la pause de midi
      // l'OS avait tué le flux et le scan restait muet tout l'après-midi.
      demarrerScan();
    }
  }

  if (typeof document !== 'undefined' && !visEcoute) {
    visEcoute = true;
    document.addEventListener('visibilitychange', onVisibilite);
  }

  const btnTest = container.querySelector('#scan-diag-test');
  const resTest = container.querySelector('#scan-diag-test-result');
  if (btnTest) {
    btnTest.addEventListener('click', async () => {
      resTest.textContent = 'Test en cours…';
      const r = await autotestDecodeur();
      resTest.textContent = r.ok
        ? `Décodeur OK (${r.lu}) — un échec live vient de la caméra/lumière.`
        : `Décodeur HS (attendu ${r.attendu || '?'}, lu ${r.lu ?? r.erreur}) — utilisez le pointage manuel.`;
    });
  }

  function cameraInterrompue(message) {
    // Le flux s'est terminé sans arrêt volontaire (OS, surchauffe,
    // révocation) : l'expliquer au lieu d'une vidéo noire muette.
    stream = null;
    if (controller) { controller.stop(); controller = null; }
    panel.style.background = 'var(--danger)';
    inner.textContent = message || 'Caméra interrompue — touchez ici pour relancer';
    panel.addEventListener('click', () => demarrerScan(), { once: true });
  }

  // Attend une vraie image (dimensions > 0) avant de lancer la boucle.
  // Sans ça, captureROI tournait sur du vide et tuait la boucle en silence.
  function attendreImage(video, delaiMs = 3000) {
    const t0 = Date.now();
    return new Promise(resolve => {
      const tick = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) return resolve(true);
        if (Date.now() - t0 >= delaiMs) return resolve(false);
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  let _demarrageEnCours = false;
  async function demarrerScan() {
    // Ré-entrant : le retour d'arrière-plan peut relancer pendant qu'un
    // getUserMedia précédent est encore en vol. Deux acquisitions
    // simultanées bloquent la caméra sur Android.
    if (_demarrageEnCours) return;
    _demarrageEnCours = true;
    inner.textContent = 'Démarrage de la caméra…';
    panel.style.background = '#555';

    // Flux précédent éventuellement mort (retour d'arrière-plan) : on nettoie.
    if (controller) { controller.stop(); controller = null; }
    if (stream) { stopCamera(stream); stream = null; }

    const audioOk = await initAudio();

    try {
      const s = await startCamera(video);
      // La vue a pu être quittée / cachée pendant l'attente de getUserMedia :
      // ne pas laisser une caméra ouverte en arrière-plan (batterie, 3 jours).
      if (!ouvert || (typeof document !== 'undefined' && document.hidden)) {
        stopCamera(s);
        return;
      }
      stream = s;
      // Interruption involontaire (track 'ended') → message + relance,
      // jamais de vidéo noire muette. L'arrêt volontaire (suspendre /
      // arreterScan) met stream à null AVANT : le rappel est ignoré.
      onStreamEnded(stream, () => { if (stream !== null) cameraInterrompue(); });
      // Source coupée sans 'ended' (mute OS) → même traitement après 2 s.
      onStreamMute(stream, () => { if (stream !== null) cameraInterrompue('Caméra coupée — touchez ici pour relancer'); });
      if (!await attendreImage(video)) {
        stream = null;
        stopCamera(s);
        cameraInterrompue('Caméra sans image — touchez ici pour relancer');
        return;
      }
      configurerTorche();
      _derniereT = Date.now();
      updateCounter(container, store, _derniereT, 'auto');
      inner.innerHTML = 'Présentez un badge';
      panel.style.background = 'var(--surf-1)';

      controller = lancerBoucle(video, canvas, async (roi) => {
        const ov = container.querySelector('.sel-btn.active').dataset.val;
        const t = Date.now();
        _derniereT = t;
        STATS.trames++;
        const dims = `${video.videoWidth}x${video.videoHeight}`;

        const si = slotInfo(t, ov);
        const result = await Scan(roi, t, ov, store, H_MAP, _decodeTrack);

        if (result.resultat === 'RIEN') {
          majDiag(container, t, false, dims);
          return;
        }
        STATS.dernier = `${heureCourte(t)} ${result.resultat}` +
          (result.code ? `/${result.code}` : '') +
          (_lastDecodedPayload ? ` ${_lastDecodedPayload.slice(0, 12)}` : '');
        majDiag(container, t, true, dims);

        /* enrichir DEJA_POINTE avec le participant via payload capturé */
        let participant = result.participant || null;
        if (result.resultat === 'DEJA_POINTE' && !participant) {
          participant = participantDePayload(_lastDecodedPayload);
        }

        renderEtatPanel(container, result, si, t, participant);
        updateCounter(container, store, t, ov);
        try { feedback(result); } catch (_) {}
        if (controller) controller.freeze(300);
      });
    } catch (e) {
      panel.style.background = 'var(--danger)';
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        inner.textContent = 'Caméra bloquée — autorisez-la dans Réglages > Safari, ou utilisez l\'écran Liste';
      } else if (e.name === 'NotFoundError') {
        inner.textContent = 'Aucune caméra trouvée';
      } else {
        inner.textContent = 'Caméra inaccessible';
      }
      try { feedback({ resultat: 'ERREUR', code: 'inconnu' }); } catch (_) {}
    } finally {
      _demarrageEnCours = false;
    }
  }

  demarrerScan();

  return {
    arreterScan,
    getOverrideValue: () => container.querySelector('.sel-btn.active').dataset.val,
  };
}
