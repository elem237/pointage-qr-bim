import { getConfig } from '../config.js';
import { PARTICIPANTS } from '../data.js';
import { etatCellule } from '../model/report.js';
import { tousLesSlots } from '../model/slots.js';
import { HEADER_BAND, FOOTER_BAND } from '../../assets/logos.js';

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

export function screenReport(container, m, tNow = Date.now()) {
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

  container.innerHTML = `<div class="page">
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
  </div>`;

  return {
    refresh: (newM, newTNow) => {
      screenReport(container, newM, newTNow || Date.now());
    },
  };
}
