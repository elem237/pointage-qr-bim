import { DEFAULTS, getConfig, mergeConfig } from '../config.js';
import { renderBadges } from '../badges.js';
import { serialiser, exporterFichier, importerFichier, importerFusion } from '../db/backup.js';

const DATES_RELLES = DEFAULTS.DATES;
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function estModeTest(dates) {
  return dates.join(',') !== DATES_RELLES.join(',');
}

function formatRange(dates) {
  const jours = dates.map(d => parseInt(d.split('-')[2], 10));
  const m = parseInt(dates[0].split('-')[1], 10) - 1;
  return jours[0] + '\u2013' + jours[2] + ' ' + MOIS[m];
}

function dateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function aujourdHuiPlus2() {
  const t = new Date();
  return [dateStr(t), dateStr(new Date(t.getTime() + 864e5)), dateStr(new Date(t.getTime() + 2 * 864e5))];
}

function lireDates(container) {
  return Array.from(container.querySelectorAll('.setup-date')).map(inp => inp.value);
}

function lireCreneaux(container) {
  return {
    H_DEBUT_MATIN: container.querySelector('#setup-h-debut').value,
    H_BASCULE: container.querySelector('#setup-h-bascule').value,
    H_FIN_MIDI: container.querySelector('#setup-h-fin').value,
  };
}

async function getCacheStatus() {
  try {
    if (typeof caches === 'undefined') return null;
    const keys = await caches.keys();
    let total = 0;
    for (const name of keys) {
      const c = await caches.open(name);
      const reqs = await c.keys();
      total += reqs.length;
    }
    return total;
  } catch {
    return null;
  }
}

function mettreAJourBanner(container) {
  const cfg = getConfig();
  const modeTest = estModeTest(cfg.DATES);
  let banner = container.querySelector('.setup-banner');
  if (modeTest) {
    const currentRange = formatRange(cfg.DATES);
    const realRange = formatRange(DATES_RELLES);
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'setup-banner';
      container.insertBefore(banner, container.firstChild);
    }
    banner.innerHTML =
      '<svg class="setup-banner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
      '<div class="setup-banner-text">' +
        '<div class="setup-banner-line1">Mode test \u2014 dates simul\u00e9es</div>' +
        '<div class="setup-banner-line2">' + currentRange + ' au lieu du ' + realRange + '</div>' +
      '</div>';
  } else if (banner) {
    banner.remove();
  }
}

function appliquerDates(container) {
  const dates = lireDates(container);
  mergeConfig({ DATES: dates });
  mettreAJourBanner(container);
}

function appliquerCreneaux(container) {
  const c = lireCreneaux(container);
  mergeConfig(c);
}

async function imprimerPlanche() {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:white;overflow:auto;';
  await renderBadges(div);
  document.body.appendChild(div);
  setTimeout(() => {
    window.print();
    setTimeout(() => document.body.removeChild(div), 500);
  }, 500);
}

export function screenSetup(container, opts = {}) {
  const { onClearAll } = opts;
  const cfg = getConfig();
  const modeTest = estModeTest(cfg.DATES);
  const currentRange = formatRange(cfg.DATES);
  const realRange = formatRange(DATES_RELLES);

  const bannerHtml = modeTest
    ? '<div class="setup-banner">' +
        '<svg class="setup-banner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        '<div class="setup-banner-text">' +
          '<div class="setup-banner-line1">Mode test \u2014 dates simul\u00e9es</div>' +
          '<div class="setup-banner-line2">' + currentRange + ' au lieu du ' + realRange + '</div>' +
        '</div>' +
      '</div>'
    : '';

  const dateFields = cfg.DATES.map((d, i) =>
    '<label>Date ' + (i + 1) + ' <input type="date" class="setup-date" data-idx="' + i + '" value="' + d + '"></label>'
  ).join('');

  container.innerHTML =
    '<div id="screen-setup">' +
      bannerHtml +
      '<section class="setup-card">' +
        '<h3 class="setup-card-title">Dates de session</h3>' +
        '<div class="setup-dates">' + dateFields + '</div>' +
        '<div class="setup-card-actions">' +
          '<button id="setup-reset-dates" class="setup-btn setup-btn--primary">R\u00e9tablir les dates r\u00e9elles</button>' +
          '<button id="setup-today-plus-2" class="setup-btn setup-btn--outline">Dates = aujourd\u2019hui + 2 jours</button>' +
        '</div>' +
      '</section>' +
      '<section class="setup-card">' +
        '<h3 class="setup-card-title">Cr\u00e9neaux</h3>' +
        '<div class="setup-creneaux">' +
          '<label>D\u00e9but matin <input type="time" id="setup-h-debut" value="' + cfg.H_DEBUT_MATIN + '"></label>' +
          '<label class="setup-creneau-focus">Bascule <input type="time" id="setup-h-bascule" value="' + cfg.H_BASCULE + '"></label>' +
          '<label>Fin midi <input type="time" id="setup-h-fin" value="' + cfg.H_FIN_MIDI + '"></label>' +
        '</div>' +
        '<div class="setup-creneaux-info">Matin 07:00\u201313:00 \u00b7 Midi 13:00\u201317:30</div>' +
        '<div class="setup-creneaux-note">Les pauses sont incluses dans les cr\u00e9neaux.</div>' +
      '</section>' +
      '<section class="setup-card">' +
        '<h3 class="setup-card-title">Absences</h3>' +
        '<label class="setup-abs-field">Seuil de signalement (minutes) <input type="number" id="setup-seuil-absence" min="0" step="1" value="' + cfg.SEUIL_ABSENCE_MIN + '"></label>' +
        '<div class="setup-creneaux-note">Une absence plus courte n’apparaît pas dans le rapport. Une absence sans retour est toujours signalée.</div>' +
      '</section>' +
      '<section class="setup-card">' +
        '<h3 class="setup-card-title">Badges et sauvegarde</h3>' +
        '<div class="setup-card-actions">' +
          '<button id="setup-print-badges" class="setup-btn setup-btn--primary">Imprimer la planche</button>' +
          '<button id="setup-export" class="setup-btn setup-btn--outline">Exporter</button>' +
          '<button id="setup-import" class="setup-btn setup-btn--outline">Importer</button>' +
        '</div>' +
      '</section>' +
      '<section class="setup-card setup-card--danger">' +
        '<h3 class="setup-card-title" style="color:var(--danger)">Zone dangereuse</h3>' +
        '<p>Taper <strong>SUPPRIMER</strong> pour confirmer :</p>' +
        '<input type="text" id="setup-confirm-input" placeholder="Taper SUPPRIMER pour confirmer">' +
        '<div class="setup-card-actions">' +
          '<button id="setup-clear-all" class="setup-btn setup-btn--danger-outline" disabled>EFFACER TOUTES LES DONN\u00c9ES</button>' +
        '</div>' +
      '</section>' +
      '<div class="setup-footer" id="setup-footer">Hors-ligne : non configur\u00e9</div>' +
    '</div>';

  getCacheStatus().then(nb => {
    const footer = container.querySelector('#setup-footer');
    if (nb !== null && nb > 0) {
      footer.textContent = 'Hors-ligne pr\u00eat \u00b7 ' + nb + ' objets en cache';
    } else if (nb !== null) {
      footer.textContent = 'Hors-ligne pr\u00eat \u00b7 0 objet en cache';
    }
  });

  container.addEventListener('change', (e) => {
    if (e.target.classList.contains('setup-date')) {
      appliquerDates(container);
    }
    if (e.target.id === 'setup-h-debut' || e.target.id === 'setup-h-bascule' || e.target.id === 'setup-h-fin') {
      appliquerCreneaux(container);
    }
    if (e.target.id === 'setup-seuil-absence') {
      const val = parseInt(e.target.value, 10);
      if (Number.isNaN(val)) return;
      const store = opts.store;
      if (store && typeof store.setSeuilAbsence === 'function') {
        store.setSeuilAbsence(val);
      } else {
        mergeConfig({ SEUIL_ABSENCE_MIN: val });
      }
    }
  });

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.id === 'setup-today-plus-2') {
      const dates = aujourdHuiPlus2();
      const inputs = container.querySelectorAll('.setup-date');
      inputs.forEach((inp, i) => { inp.value = dates[i]; });
      appliquerDates(container);
      return;
    }

    if (btn.id === 'setup-reset-dates') {
      const inputs = container.querySelectorAll('.setup-date');
      inputs.forEach((inp, i) => { inp.value = DATES_RELLES[i]; });
      appliquerDates(container);
      return;
    }

    if (btn.id === 'setup-print-badges') {
      imprimerPlanche();
      return;
    }

    if (btn.id === 'setup-export') {
      const store = opts.store;
      if (!store) return;
      const json = serialiser([], store.getPointages());
      exporterFichier(json);
      return;
    }

    if (btn.id === 'setup-import') {
      const store = opts.store;
      if (!store) return;
      try {
        const json = await importerFichier();
        await importerFusion(store, json);
      } catch (_) {}
      return;
    }

    if (btn.id === 'setup-clear-all') {
      if (typeof onClearAll === 'function') {
        onClearAll();
      }
      const input = container.querySelector('#setup-confirm-input');
      if (input) input.value = '';
      btn.disabled = true;
      return;
    }
  });

  container.addEventListener('input', (e) => {
    if (e.target.id === 'setup-confirm-input') {
      const btn = container.querySelector('#setup-clear-all');
      btn.disabled = e.target.value !== 'SUPPRIMER';
    }
  });

  return {
    refresh: () => {
      const cfg = getConfig();
      const inputs = container.querySelectorAll('.setup-date');
      inputs.forEach((inp, i) => { inp.value = cfg.DATES[i]; });
      const hd = container.querySelector('#setup-h-debut');
      const hb = container.querySelector('#setup-h-bascule');
      const hf = container.querySelector('#setup-h-fin');
      if (hd) hd.value = cfg.H_DEBUT_MATIN;
      if (hb) hb.value = cfg.H_BASCULE;
      if (hf) hf.value = cfg.H_FIN_MIDI;
      const seuil = container.querySelector('#setup-seuil-absence');
      if (seuil) seuil.value = cfg.SEUIL_ABSENCE_MIN;
      mettreAJourBanner(container);
    },
  };
}
