/**
 * Étape 11 — Écran Rapport (E4)
 * Génération du rapport de présence en HTML + @media print → PDF.
 * Tableau tracé d'après LISTE DE PRÉSENCE.docx (8 colonnes).
 */
import { getConfig } from '../config.js';
import { PARTICIPANTS } from '../data.js';
import { etatCellule, presents, taux, theta, slotsEchus } from '../model/report.js';
import { LOGO_GREEN, LOGO_ACCA, LOGO_3D, LOGO_QR } from '../../assets/logos.js';

function formatTau(tau) {
  const d = new Date(tau + 3600000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}h${mm}`;
}

function stateLine(state) {
  if (state.type === 'present') {
    return `<span class="report-cell-p">P</span><br><span class="report-cell-h">${formatTau(state.tau)}</span>`;
  }
  if (state.type === 'absent') {
    return `<span class="report-cell-a">A</span>`;
  }
  return '';
}

function dayContent(pointages, participant, date, tNow) {
  const matin = etatCellule(pointages, participant, { date, creneau: 'matin' }, tNow);
  const midi  = etatCellule(pointages, participant, { date, creneau: 'midi' }, tNow);
  const matinHtml = stateLine(matin);
  const midiHtml  = stateLine(midi);
  if (!matinHtml && !midiHtml) return '';
  if (!matinHtml) return midiHtml;
  if (!midiHtml) return matinHtml;
  return matinHtml + '<br><br>' + midiHtml;
}

const DATES = getConfig().DATES;

export function screenReport(container, pointages, tNow = Date.now()) {
  const cfg = getConfig();
  const echus = slotsEchus(tNow);

  let rowsHtml = '';
  for (let i = 0; i < PARTICIPANTS.length; i++) {
    const p = PARTICIPANTS[i];
    const daysHtml = DATES.map(d => `<td>${dayContent(pointages, p, d, tNow)}</td>`).join('');

    if (i === 0) {
      rowsHtml += `<tr>
        <td class="report-cell-num" rowspan="${PARTICIPANTS.length}">${cfg.NUMERO_THEME}</td>
        <td class="report-cell-theme" rowspan="${PARTICIPANTS.length}">${cfg.THEME}</td>
        <td class="report-cell-lieu" rowspan="${PARTICIPANTS.length}">${cfg.LIEU}</td>
        <td class="report-cell-name">${p.numero}. ${p.nomComplet}</td>
        <td class="report-cell-effectif" rowspan="${PARTICIPANTS.length}">${PARTICIPANTS.length}</td>
        ${daysHtml}
      </tr>`;
    } else {
      rowsHtml += `<tr>
        <td class="report-cell-name">${p.numero}. ${p.nomComplet}</td>
        ${daysHtml}
      </tr>`;
    }
  }

  let thetaDisplay = '';
  if (echus.length > 0) {
    const t = theta(pointages, tNow);
    const statsHtml = echus.map(s => `<tr>
      <td>${s.date}</td>
      <td>${s.creneau}</td>
      <td>${presents(pointages, s)}</td>
      <td>${Math.round(taux(pointages, s) * 100)}%</td>
    </tr>`).join('');

    thetaDisplay = `<div class="report-stats">
      <h3>Statistiques</h3>
      <table>
        <thead><tr><th>Date</th><th>Créneau</th><th>Présents</th><th>Taux</th></tr></thead>
        <tbody>${statsHtml}</tbody>
      </table>
      <p><strong>Taux global (Θ)</strong> : ${t !== null ? Math.round(t * 100) + '%' : 'INDÉFINI'}</p>
    </div>`;
  }

  const dayHeaders = DATES.map((d, i) =>
    `<th>Jour ${i + 1} (${d.slice(5)})</th>`
  ).join('');

  container.innerHTML = `
<div id="screen-report">
  <div class="report-header">
    <div class="report-header-left">
      <img src="${LOGO_GREEN}" alt="GREEN INNOVATIVE'S">
    </div>
    <div class="report-header-center">
      <img src="${LOGO_ACCA}" alt="ACCA SOFTWARE">
    </div>
    <div class="report-header-right">
      <div class="report-bullets">
        Architecture, Design<br>
        BIM Management<br>
        Ingénierie Numérique<br>
        Digital Twin
      </div>
      <div class="report-header-corner">
        ${LOGO_QR ? `<img src="${LOGO_QR}" alt="" class="report-header-qr">` : ''}
        ${LOGO_3D ? `<img src="${LOGO_3D}" alt="" class="report-header-3d">` : ''}
      </div>
    </div>
  </div>

  <div class="report-title">LISTE DE PRÉSENCE</div>

  <table class="report-table">
    <thead>
      <tr>
        <th class="report-dir-header" colspan="8">DIRECTION DES AFFAIRES GÉNÉRALE</th>
      </tr>
      <tr>
        <th>N°</th>
        <th>THÈMES</th>
        <th>LIEU</th>
        <th>PERSONNELS</th>
        <th>EFFECTIFS</th>
        ${dayHeaders}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${thetaDisplay}
</div>
  `;

  return {
    refresh: (newPointages, newTNow) => {
      screenReport(container, newPointages, newTNow || Date.now());
    },
  };
}
