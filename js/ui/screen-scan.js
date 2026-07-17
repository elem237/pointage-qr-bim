/**
 * U2 — Écran Scan (INTERFACE.md §5)
 * 4 bandes verticales : Navigation (U1) / Compteur / Caméra / Retour
 */
import { startCamera, stopCamera, lancerBoucle } from '../scan/camera.js';
import { Scan } from '../scan/pipeline.js';
import { decode } from '../scan/decode.js';
import { feedback, initAudio } from '../feedback.js';
import { slotAvecOverride } from '../model/slots.js';
import { etatCellule } from '../model/report.js';
import { PARTICIPANTS } from '../data.js';
import { idDe } from '../model/ident.js';
import { getConfig } from '../config.js';

const H_MAP = new Map();

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
    <div id="scan-selector">
      <button class="sel-btn active" data-val="auto">Auto</button>
      <button class="sel-btn" data-val="matin">Matin</button>
      <button class="sel-btn" data-val="midi">Midi</button>
    </div>
  </div>
  <div id="scan-result">
    <div id="scan-result-inner">Présentez un badge</div>
  </div>
</div>`;
}

/* ── Compteur (bande 2) ── */

export function updateCounter(container, store, t, override) {
  const left = container.querySelector('#scan-counter-left');
  const right = container.querySelector('#scan-counter-right');
  const s = slotAvecOverride(t, override);
  if (!s) {
    left.textContent = 'Hors créneau';
    right.innerHTML = '<strong>&mdash;</strong> / 16 pointés';
    return;
  }
  const dates = getConfig().DATES;
  const idx = dates.indexOf(s.date);
  if (idx === -1) {
    left.textContent = 'Hors créneau';
    right.innerHTML = '<strong>&mdash;</strong> / 16 pointés';
    return;
  }
  const creneauLabel = s.creneau === 'matin' ? 'Matin' : 'Midi';
  left.textContent = `Jour ${idx + 1} · ${creneauLabel}`;
  const m = store.getPointages();
  const n = PARTICIPANTS.filter(p => etatCellule(m, p, s, t).type === 'present').length;
  right.innerHTML = `<strong>${n}</strong> / 16 pointés`;
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

async function _decodeTrack(img) {
  _lastDecodedPayload = await decode(img);
  return _lastDecodedPayload;
}

function participantDePayload(payload) {
  if (!payload) return null;
  const m = payload.match(/^BIM26-([0-9]{3})-/);
  if (!m) return null;
  const numero = parseInt(m[1], 10);
  return PARTICIPANTS.find(p => p.numero === numero) || null;
}

/* ── screenScan ── */

export async function screenScan(container, store) {
  container.innerHTML = template();
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

  async function arreterScan() {
    if (controller) { controller.stop(); controller = null; }
    if (stream) { stopCamera(stream); stream = null; }
    panel.style.background = 'var(--surf-1)';
    inner.innerHTML = 'Présentez un badge';
  }

  async function demarrerScan() {
    inner.textContent = 'Démarrage de la caméra…';
    panel.style.background = '#555';

    const audioOk = await initAudio();

    try {
      stream = await startCamera(video);
      _derniereT = Date.now();
      updateCounter(container, store, _derniereT, 'auto');
      inner.innerHTML = 'Présentez un badge';
      panel.style.background = 'var(--surf-1)';

      controller = lancerBoucle(video, canvas, async (roi) => {
        const ov = container.querySelector('.sel-btn.active').dataset.val;
        const t = Date.now();
        _derniereT = t;

        const si = slotInfo(t, ov);
        const result = await Scan(roi, t, ov, store, H_MAP, _decodeTrack);

        if (result.resultat === 'RIEN') return;

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
    }
  }

  demarrerScan();

  return {
    arreterScan,
    getOverrideValue: () => container.querySelector('.sel-btn.active').dataset.val,
  };
}
