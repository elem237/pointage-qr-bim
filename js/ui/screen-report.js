import { getConfig } from '../config.js';
import { PARTICIPANTS } from '../data.js';
import { etatCellule, theta, slotsEchus, presents } from '../model/report.js';
import { tousLesSlots } from '../model/slots.js';
import { HEADER_BAND, FOOTER_BAND } from '../../assets/logos.js';
import { estRapportable, phraseAbsence, trierAbsences } from '../model/absences.js';

function formatTau(tau) {
  const d = new Date(tau + 3600000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}h${mm}`;
}

function cellulesJour(participant, tNow, m) {
  return tousLesSlots().map(slot => {
    const e = etatCellule(m, participant, slot, tNow);
    switch (e.type) {
      case 'present':
        return `<td class="cell-jour"><span class="pa">P</span><span class="heure">${formatTau(e.tau)}</span></td>`;
      case 'absent':
        return `<td class="cell-jour"><span class="pa">A</span></td>`;
      case 'vide':
        return `<td class="cell-jour"></td>`;
    }
  }).join('');
}

function buildAbsencesBlock(absences) {
  const listItems = absences.map(a => {
    const p = PARTICIPANTS.find(pp => pp.numero === a.numero);
    const nom = p ? p.nomComplet : `Participant n\u00b0${a.numero}`;
    const { phrase, motif } = phraseAbsence(a, nom);
    let html = `<div class="abs">\u2022\u00a0\u00a0${phrase}`;
    if (motif) {
      html += `<div class="motif">Motif : ${motif}.</div>`;
    } else {
      html += `<div class="motif">Motif : ________________________________</div>`;
    }
    html += `</div>`;
    return html;
  }).join('');
  return `<div class="bloc-absences"><h2>Absences signal\u00e9es</h2>${listItems}</div>`;
}

export function buildA4Html(m, tNow, absences = []) {
  const cfg = getConfig();
  const slots = tousLesSlots();

  const rangeeCreneaux = slots.map(s => `<td class="h">${s.label}</td>`).join('');
  const rangeeJours = cfg.DATES.map((_, i) => `<td class="h" colspan="2">Jour ${i + 1}</td>`).join('');

  let rowsHtml = '';
  for (let i = 0; i < PARTICIPANTS.length; i++) {
    const p = PARTICIPANTS[i];
    const jours = cellulesJour(p, tNow, m);

    if (i === 0) {
      rowsHtml += `<tr>
        <td rowspan="16" class="theme">${cfg.THEME}</td>
        <td rowspan="16" class="lieu">${cfg.LIEU}</td>
        <td class="perso">${p.numero}. ${p.nomComplet}</td>
        <td rowspan="16" class="eff">${PARTICIPANTS.length}</td>
        ${jours}
      </tr>`;
    } else {
      rowsHtml += `<tr>
        <td class="perso">${p.numero}. ${p.nomComplet}</td>
        ${jours}
      </tr>`;
    }
  }

  const absencesHtml = absences.length > 0 ? buildAbsencesBlock(absences) : '';

  return `<div class="page">
    <img class="band" src="${HEADER_BAND}" alt="">
    <table class="presence">
      <colgroup>
        <col style="width:26.84mm"><col style="width:15.91mm">
        <col style="width:49.02mm"><col style="width:17.02mm">
        <col style="width:8.54mm"><col style="width:8.54mm">
        <col style="width:8.54mm"><col style="width:8.54mm">
        <col style="width:8.54mm"><col style="width:8.54mm">
      </colgroup>
      <tbody>
        <tr class="r0"><td colspan="10" class="vert">DIRECTION DES AFFAIRES G\u00c9N\u00c9RALE</td></tr>
        <tr class="r1">
          <td class="h">TH\u00c8MES</td><td class="h">LIEU</td>
          <td class="h">PERSONNELS</td><td class="h">EFFECTIFS</td>
          ${rangeeJours}
        </tr>
        <tr class="r2">
          <td class="vert"></td><td class="vert"></td>
          <td class="vert"></td><td class="vert"></td>
          ${rangeeCreneaux}
        </tr>
        ${rowsHtml}
      </tbody>
    </table>
    <img class="band footer" src="${FOOTER_BAND}" alt="">
  </div>${absencesHtml}`;
}

function agrandir(a4Html) {
  const old = document.querySelector('.report-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.className = 'report-overlay';
  overlay.innerHTML = `<div class="report-overlay-inner"><button class="report-overlay-close" aria-label="Fermer">&times;</button>${a4Html}</div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('report-overlay-close')) {
      overlay.remove();
    }
  });
  overlay.querySelector('.report-overlay-inner').addEventListener('click', (e) => {
    e.stopPropagation();
  });
  document.body.appendChild(overlay);
}

export function screenReport(container, m, tNow = Date.now(), store = null) {
  const t = theta(m, tNow);
  const echus = slotsEchus(tNow);
  const slots = tousLesSlots();
  let a4Html = buildA4Html(m, tNow);

  const gridHtml = slots.map(slot => {
    const isEchu = echus.some(e => e.date === slot.date && e.creneau === slot.creneau);
    if (isEchu) {
      const count = presents(m, slot);
      return `<div class="report-grid-cell report-grid-cell--echu">
        <div class="report-grid-label">Jour ${slot.jour} &middot; ${slot.label}</div>
        <div class="report-grid-count">${count}</div>
      </div>`;
    }
    return `<div class="report-grid-cell report-grid-cell--vide">
      <div class="report-grid-label">Jour ${slot.jour} &middot; ${slot.label}</div>
      <div class="report-grid-count report-grid-count--na">—</div>
    </div>`;
  }).join('');

  container.innerHTML = `<div id="screen-report">
    <div id="report-taux">
      <div id="report-taux-value">${t !== null ? Math.round(t * 100) + '%' : '—'}</div>
      <div id="report-taux-label">${t !== null ? 'taux global &middot; ' + echus.length + ' cr\u00e9neaux \u00e9chus' : 'aucun cr\u00e9neau \u00e9chu'}</div>
    </div>
    <div id="report-grid">
      ${gridHtml}
    </div>
    <div id="report-preview">
      <div id="report-preview-container">
        ${a4Html}
      </div>
      <div id="report-tap-hint">Toucher pour agrandir</div>
    </div>
    <button id="report-print">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Imprimer le rapport
    </button>
    <div id="report-note">Impression depuis iPhone : rendu \u00e0 88 % &middot; Proportions exactes</div>
  </div>`;

  const preview = container.querySelector('#report-preview');
  preview.addEventListener('click', () => agrandir(a4Html));

  container.querySelector('#report-print').addEventListener('click', () => window.print());

  if (store) {
    store.listerAbsences().then(allAbsences => {
      const cfg = getConfig();
      const seuil = cfg.SEUIL_ABSENCE_MIN;
      const rapportable = trierAbsences(allAbsences.filter(a => estRapportable(a, seuil)));
      if (rapportable.length === 0) return;
      a4Html = buildA4Html(m, tNow, rapportable);
      const previewContainer = container.querySelector('#report-preview-container');
      if (previewContainer) previewContainer.innerHTML = a4Html;
    });
  }

  return {
    refresh: (newM, newTNow) => {
      screenReport(container, newM, newTNow || Date.now(), store);
    },
  };
}
