import { DEFAULTS, getConfig, mergeConfig } from '../config.js';

const DATES_RELLES = DEFAULTS.DATES;

function estModeTest(dates) {
  return dates.join(',') !== DATES_RELLES.join(',');
}

function dateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function aujourdHuiPlus2() {
  const t = new Date();
  return [
    dateStr(t),
    dateStr(new Date(t.getTime() + 864e5)),
    dateStr(new Date(t.getTime() + 2 * 864e5)),
  ];
}

function lireDates(container) {
  return Array.from(container.querySelectorAll('.setup-date')).map(inp => inp.value);
}

function mettreAJourBanner(container) {
  const cfg = getConfig();
  const modeTest = estModeTest(cfg.DATES);
  let banner = container.querySelector('.setup-banner');
  if (modeTest) {
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'setup-banner warning';
      container.insertBefore(banner, container.firstChild);
    }
    banner.textContent = '⚠️ MODE TEST — dates simulées';
  } else if (banner) {
    banner.remove();
  }
}

function appliquerDates(container) {
  const dates = lireDates(container);
  mergeConfig({ DATES: dates });
  mettreAJourBanner(container);
}

export function screenSetup(container, opts = {}) {
  const { onClearAll } = opts;
  const cfg = getConfig();
  const modeTest = estModeTest(cfg.DATES);

  const bannerHtml = modeTest
    ? '<div class="setup-banner warning">⚠️ MODE TEST — dates simul\u00e9es</div>'
    : '';

  const dateFields = cfg.DATES.map((d, i) =>
    `<label>Date ${i + 1} <input type="date" class="setup-date" data-idx="${i}" value="${d}"></label>`
  ).join('');

  container.innerHTML = `
<div id="screen-setup">
  ${bannerHtml}
  <h2>R\u00e9glages</h2>
  <section>
    <h3>Mode test</h3>
    <div class="setup-dates">${dateFields}</div>
    <p><button id="setup-today-plus-2">Dates = aujourd\u2019hui + 2 jours</button>
    <button id="setup-reset-dates">R\u00e9initialiser aux dates r\u00e9elles (4-6 ao\u00fbt 2026)</button></p>
  </section>
  <section>
    <h3>⚠️ Zone dangereuse</h3>
    <p><button id="setup-clear-all" class="danger" disabled>EFFACER TOUTES LES DONN\u00c9ES</button></p>
    <p><label>Confirmer en tapant SUPPRIMER : <input type="text" id="setup-confirm-input"></label></p>
  </section>
</div>`;

  container.addEventListener('change', (e) => {
    if (e.target.classList.contains('setup-date')) {
      appliquerDates(container);
    }
  });

  container.addEventListener('click', (e) => {
    const btn = e.target;
    if (btn.id === 'setup-today-plus-2') {
      const dates = aujourdHuiPlus2();
      const inputs = container.querySelectorAll('.setup-date');
      inputs.forEach((inp, i) => { inp.value = dates[i]; });
      appliquerDates(container);
    } else if (btn.id === 'setup-reset-dates') {
      const inputs = container.querySelectorAll('.setup-date');
      inputs.forEach((inp, i) => { inp.value = DATES_RELLES[i]; });
      appliquerDates(container);
    } else if (btn.id === 'setup-clear-all') {
      if (typeof onClearAll === 'function') {
        onClearAll();
      }
      const input = container.querySelector('#setup-confirm-input');
      if (input) input.value = '';
      btn.disabled = true;
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
      mettreAJourBanner(container);
    },
  };
}
