import { PARTICIPANTS } from '../data.js';
import { getConfig } from '../config.js';
import { norm } from '../model/norm.js';
import { idDe } from '../model/ident.js';
import { tousLesSlots, slotDe, cle as slotCle } from '../model/slots.js';
import { etatCellule } from '../model/report.js';
import { serialiser, exporterFichier, importerFichier, importerFusion } from '../db/backup.js';

function formatTau(tau) {
  const d = new Date(tau + 3600000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}h${mm}`;
}

function nomNormalise(p) {
  return norm(p.nomComplet);
}

let _previousFiltered = null;

export function filtrerParticipants(query) {
  if (_previousFiltered === null) _previousFiltered = PARTICIPANTS;
  const source = query === ''
    ? PARTICIPANTS
    : (_previousFiltered.length <= 3 ? PARTICIPANTS : _previousFiltered);
  if (!query) {
    _previousFiltered = PARTICIPANTS;
    return PARTICIPANTS;
  }
  const q = norm(query);
  const out = source.filter(p => nomNormalise(p).includes(q));
  _previousFiltered = out;
  return out;
}

export function resetFilter() {
  _previousFiltered = null;
}

function statutHtml(m, participant, slot, tNow) {
  const e = etatCellule(m, participant, slot, tNow);
  switch (e.type) {
    case 'present':
      return `<span class="ls-statut ls-present">P ${formatTau(e.tau)}</span>`;
    case 'absent':
      return `<span class="ls-statut ls-absent">A</span>`;
    case 'vide':
      return `<span class="ls-statut ls-vide">&mdash;</span>`;
  }
}

export function screenList(container, store, m, tNow = Date.now()) {
  const cfg = getConfig();
  const slots = tousLesSlots();
  let localM = m;

  resetFilter();

  function renderRows(query) {
    const tbody = container.querySelector('#list-tbody');
    if (!tbody) return;
    const list = filtrerParticipants(query);
    tbody.innerHTML = list.map(p => {
      const statuses = slots.map(s => {
        const e = etatCellule(localM, p, s, tNow);
        let cls, txt;
        if (e.type === 'present') {
          cls = 'ls-present';
          txt = `P ${formatTau(e.tau)}`;
        } else if (e.type === 'absent') {
          cls = 'ls-absent';
          txt = 'A';
        } else {
          cls = 'ls-vide';
          txt = '\u2014';
        }
        const canCancel = e.type === 'present';
        return `<td class="ls-cell ${cls}" data-numero="${p.numero}" data-slot-idx="${slots.indexOf(s)}">${txt}${canCancel ? '<button class="ls-cancel-btn" data-action="cancel" title="Annuler">&times;</button>' : ''}</td>`;
      }).join('');
      return `<tr data-numero="${p.numero}">
        <td class="ls-nom">${p.numero}. ${p.nomComplet}</td>
        ${statuses}
        <td class="ls-action"><button class="ls-pointer-btn" data-action="pointer">Pointer</button></td>
      </tr>`;
    }).join('');
  }

  function render() {
    const slots = tousLesSlots();
    const headerCells = slots.map(s => `<th>J${s.jour} ${s.label}</th>`).join('');

    container.innerHTML = `
<div id="screen-list">
  <h2>Liste des participants</h2>
  <div class="ls-bar">
    <input type="text" id="ls-search" placeholder="Rechercher un participant..." autocomplete="off">
    <span class="ls-override">
      <label><input type="radio" name="ls-ov" value="auto" checked> Auto</label>
      <label><input type="radio" name="ls-ov" value="matin"> Matin</label>
      <label><input type="radio" name="ls-ov" value="midi"> Midi</label>
    </span>
    <button id="ls-export">Exporter</button>
    <button id="ls-import">Importer</button>
  </div>
  <div id="ls-status-bar"></div>
  <table id="list-table">
    <thead><tr><th>Participant</th>${headerCells}<th>Action</th></tr></thead>
    <tbody id="list-tbody"></tbody>
  </table>
</div>`;

    renderRows('');
  }

  render();

  const searchInput = container.querySelector('#ls-search');
  const statusBar = container.querySelector('#ls-status-bar');

  searchInput.addEventListener('input', () => {
    renderRows(searchInput.value);
  });

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const tr = btn.closest('tr');
    if (!tr) return;
    const numero = parseInt(tr.dataset.numero, 10);
    const participant = PARTICIPANTS.find(p => p.numero === numero);
    if (!participant) return;

    const action = btn.dataset.action;

    if (action === 'pointer') {
      const override = container.querySelector('input[name="ls-ov"]:checked').value;
      let slot;
      if (override === 'auto') {
        slot = slotDe(tNow);
      } else {
        const cfg = getConfig();
        const d = new Date(tNow + 3600000);
        const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        if (!cfg.DATES.includes(date)) {
          statusBar.textContent = 'HORS_SESSION : date hors formation';
          return;
        }
        slot = { date, creneau: override };
      }
      if (!slot) {
        statusBar.textContent = 'HORS_SESSION';
        return;
      }
      const k = slotCle(idDe(numero), slot);
      const result = await store.reg(k, tNow, 'manuel', override);
      if (result.resultat === 'OK') {
        localM = store.getPointages();
        statusBar.textContent = `✓ ${participant.nomComplet} pointé`;
        renderRows(searchInput.value);
      } else if (result.resultat === 'DEJA_POINTE') {
        statusBar.textContent = `${participant.nomComplet} déjà pointé à ${formatTau(result.tau)}`;
      } else {
        statusBar.textContent = 'Erreur lors du pointage';
      }
    }

    if (action === 'cancel') {
      const td = btn.closest('td');
      const slotIdx = parseInt(td.dataset.slotIdx, 10);
      if (isNaN(slotIdx)) return;
      const slot = tousLesSlots()[slotIdx];
      if (!slot) return;
      const k = slotCle(idDe(numero), slot);
      const cfg = getConfig();
      let canProceed = true;
      if (cfg.MULTI_APPAREILS) {
        canProceed = confirm('Avez-vous fusionné les appareils depuis le dernier export ? [OK = Oui, annuler, Annuler = Non]');
      }
      if (!canProceed) {
        statusBar.textContent = 'Annulation annulée — fusionnez d\'abord';
        return;
      }
      if (!confirm(`Annuler le pointage de ${participant.nomComplet} pour ${slot.date} ${slot.creneau} ?`)) {
        return;
      }
      const result = await store.cancel(k);
      if (result.resultat === 'OK') {
        localM = store.getPointages();
        statusBar.textContent = `✗ ${participant.nomComplet} annulé pour ${slot.date} ${slot.creneau}`;
        renderRows(searchInput.value);
      } else {
        statusBar.textContent = 'Erreur : pointage introuvable';
      }
    }
  });

  container.addEventListener('click', async (e) => {
    if (e.target.id === 'ls-export') {
      const json = serialiser(PARTICIPANTS, localM);
      exporterFichier(json);
      statusBar.textContent = 'Fichier exporté';
    }
    if (e.target.id === 'ls-import') {
      try {
        const json = await importerFichier();
        const result = await importerFusion(store, json);
        if (result.resultat === 'OK') {
          localM = store.getPointages();
          statusBar.textContent = `${result.nb} pointages importés et fusionnés`;
          renderRows(searchInput.value);
        } else {
          statusBar.textContent = 'Import échoué : format de fichier invalide (version ?)';
        }
      } catch (err) {
        statusBar.textContent = 'Import annulé ou erreur de lecture';
      }
    }
  });

  return {
    refresh: (newM, newTNow) => {
      localM = newM || store.getPointages();
      tNow = newTNow || Date.now();
      _previousFiltered = null;
      renderRows(searchInput ? searchInput.value : '');
    },
  };
}
