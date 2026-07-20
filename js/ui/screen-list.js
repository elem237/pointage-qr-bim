import { PARTICIPANTS } from '../data.js';
import { getConfig } from '../config.js';
import { norm } from '../model/norm.js';
import { idDe } from '../model/ident.js';
import { tousLesSlots, slotDe, cle as slotCle } from '../model/slots.js';
import { etatCellule, slotsEchus } from '../model/report.js';
import { serialiser, exporterFichier, importerFichier, importerFusion } from '../db/backup.js';
import { dureeMinutes, formatDuree } from '../model/absences.js';

function formatTau(tau) {
  const d = new Date(tau + 3600000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}h${mm}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  const out = source.filter(p => norm(p.nomComplet).includes(q));
  _previousFiltered = out;
  return out;
}

export function resetFilter() {
  _previousFiltered = null;
}

export function screenList(container, store, m, tNow = Date.now()) {
  const echus = slotsEchus(tNow);
  const slots = tousLesSlots();
  let localM = m;
  let localAbsences = [];

  resetFilter();

  function jourCourant() {
    const d = new Date(tNow + 3600000);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }

  function loadAbsences() {
    if (!store || typeof store.listerAbsences !== 'function') {
      localAbsences = [];
      return Promise.resolve();
    }
    return store.listerAbsences(jourCourant()).then(list => {
      localAbsences = list || [];
    });
  }

  function absencesDe(numero) {
    return localAbsences.filter(a => a.numero === numero);
  }

  function absenceIndicatorHtml(numero) {
    const abs = absencesDe(numero);
    if (abs.length === 0) return '';
    const open = abs.find(a => a.retour == null);
    if (open) {
      return '<div class="ls-abs-indicator">absent·e depuis ' + formatTau(open.depart) + '</div>';
    }
    const total = abs.reduce((s, a) => s + (dureeMinutes(a) || 0), 0);
    const n = abs.length;
    return '<div class="ls-abs-indicator">' + n + ' absence' + (n > 1 ? 's' : '') +
      ' signalée' + (n > 1 ? 's' : '') + ' (' + formatDuree(total) + ')</div>';
  }

  function rafraichirApresMutation() {
    return loadAbsences().then(() => {
      const search = container.querySelector('#ls-search');
      renderRows(search ? search.value : '', _currentFilter);
      renderFilterPills();
    });
  }

  function absentsCount() {
    const e = slotsEchus(tNow);
    return PARTICIPANTS.filter(p => e.some(s => etatCellule(localM, p, s, tNow).type === 'absent')).length;
  }

  function pastilleHtml(participant, slot) {
    const k = slotCle(idDe(participant.numero), slot);
    const v = localM.get(k);
    if (v && v.statut === 'actif') {
      const modeCls = v.mode === 'manuel' ? 'ls-pastille--manuel' : 'ls-pastille--present';
      return `<div class="ls-pastille ${modeCls}" data-cle="${k}" data-present="1">${formatTau(v.tau)}</div>`;
    }
    const isEchu = echus.some(e => e.date === slot.date && e.creneau === slot.creneau);
    if (isEchu) {
      return `<div class="ls-pastille ls-pastille--absent" data-cle="${k}">A</div>`;
    }
    return `<div class="ls-pastille ls-pastille--vide" data-cle="${k}">\u2014</div>`;
  }

  function renderRows(query, filterMode) {
    const listEl = container.querySelector('#ls-rows');
    if (!listEl) return;
    let list = filtrerParticipants(query);
    if (filterMode === 'absents') {
      const e = slotsEchus(tNow);
      list = list.filter(p => e.some(s => etatCellule(localM, p, s, tNow).type === 'absent'));
    }
    listEl.innerHTML = list.map(p => {
      const pastilles = slots.map(s => pastilleHtml(p, s)).join('');
      const absHtml = absenceIndicatorHtml(p.numero);
      return `<div class="ls-row" data-numero="${p.numero}">
        <span class="ls-num">${String(p.numero).padStart(2, '0')}</span>
        <span class="ls-name">${p.nomComplet}</span>
        <button class="ls-menu-btn" data-action="menu" data-numero="${p.numero}" aria-label="Actions">\u22ef</button>
        <div class="ls-pastilles">${pastilles}</div>
        ${absHtml}
      </div>`;
    }).join('');
  }

  function renderFilterPills() {
    const allBtn = container.querySelector('#ls-filter-all');
    const absBtn = container.querySelector('#ls-filter-abs');
    if (allBtn) allBtn.innerHTML = `Tous \u00b7 16`;
    if (absBtn) absBtn.innerHTML = `Absents \u00b7 ${absentsCount()}`;
  }

  function updateMenuPopup(numero) {
    const existing = container.querySelector('.ls-menu-popup');
    if (existing) existing.remove();

    const participant = PARTICIPANTS.find(p => p.numero === numero);
    if (!participant) return;

    const btn = container.querySelector(`.ls-menu-btn[data-numero="${numero}"]`);
    if (!btn) return;

    const abs = absencesDe(numero).slice().sort((a, b) => a.depart - b.depart);
    const open = abs.find(a => a.retour == null) || null;
    const active = open || (abs.length ? abs[abs.length - 1] : null);

    let absItems = '<button class="ls-menu-item" data-action="abs-add" data-numero="' + numero + '">Signaler une absence</button>';
    if (open) {
      absItems += '<button class="ls-menu-item" data-action="abs-close" data-id="' + open.id + '" data-numero="' + numero + '">Marquer le retour</button>';
    }
    if (active) {
      absItems += '<button class="ls-menu-item" data-action="abs-motif-open" data-id="' + active.id + '" data-numero="' + numero + '">Modifier le motif</button>';
      absItems += '<button class="ls-menu-item" data-action="abs-delete" data-id="' + active.id + '" data-numero="' + numero + '">Supprimer l’absence</button>';
    }

    const popup = document.createElement('div');
    popup.className = 'ls-menu-popup';
    popup.innerHTML =
      '<button class="ls-menu-item" data-action="pointer" data-numero="' + numero + '">Pointer manuellement</button>' +
      '<button class="ls-menu-item" data-action="cancel-open" data-numero="' + numero + '">Annuler</button>' +
      '<div class="ls-menu-sep"></div>' +
      absItems;
    btn.parentNode.appendChild(popup);

    const closePopup = (e) => {
      if (!popup.contains(e.target) && e.target !== btn) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    };
    setTimeout(() => document.addEventListener('click', closePopup), 0);
  }

  function cancelSubmenu(numero) {
    const existing = container.querySelector('.ls-menu-popup');
    if (existing) existing.remove();

    const participant = PARTICIPANTS.find(p => p.numero === numero);
    if (!participant) return;

    const slots = tousLesSlots();
    const presentSlots = slots.filter(s => {
      const k = slotCle(idDe(numero), s);
      const v = localM.get(k);
      return v && v.statut === 'actif';
    });

    if (presentSlots.length === 0) {
      const popup = document.createElement('div');
      popup.className = 'ls-menu-popup';
      popup.innerHTML = '<div class="ls-menu-item ls-menu-item--disabled">Aucun pointage \u00e0 annuler</div>';
      const btn = container.querySelector(`.ls-menu-btn[data-numero="${numero}"]`);
      if (btn && btn.parentNode) btn.parentNode.appendChild(popup);
      const closePopup = (e) => {
        if (!popup.contains(e.target) && e.target !== btn) {
          popup.remove();
          document.removeEventListener('click', closePopup);
        }
      };
      setTimeout(() => document.addEventListener('click', closePopup), 0);
      return;
    }

    const popup = document.createElement('div');
    popup.className = 'ls-menu-popup ls-menu-popup--wide';
    popup.innerHTML = presentSlots.map(s => {
      const k = slotCle(idDe(numero), s);
      const v = localM.get(k);
      return '<button class="ls-menu-item" data-action="do-cancel" data-cle="' + k + '" data-numero="' + numero + '" data-slot-date="' + s.date + '" data-slot-creneau="' + s.creneau + '">Annuler ' + s.date + ' ' + (s.creneau === 'matin' ? 'Matin' : 'Midi') + ' (' + formatTau(v.tau) + ')</button>';
    }).join('');
    const btn = container.querySelector(`.ls-menu-btn[data-numero="${numero}"]`);
    if (btn && btn.parentNode) btn.parentNode.appendChild(popup);
    const closePopup = (e) => {
      if (!popup.contains(e.target) && e.target !== btn) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    };
    setTimeout(() => document.addEventListener('click', closePopup), 0);
  }

  function pointerSubmenu(numero) {
    const existing = container.querySelector('.ls-menu-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'ls-menu-popup ls-menu-popup--wide';
    popup.innerHTML =
      '<div class="ls-menu-item ls-menu-section">Override :</div>' +
      '<label class="ls-menu-item ls-menu-radio"><input type="radio" name="ls-popup-ov" value="auto" checked> Auto</label>' +
      '<label class="ls-menu-item ls-menu-radio"><input type="radio" name="ls-popup-ov" value="matin"> Matin</label>' +
      '<label class="ls-menu-item ls-menu-radio"><input type="radio" name="ls-popup-ov" value="midi"> Midi</label>' +
      '<button class="ls-menu-item ls-menu-action" data-action="do-pointer" data-numero="' + numero + '">Pointer</button>';
    const btn = container.querySelector(`.ls-menu-btn[data-numero="${numero}"]`);
    if (btn && btn.parentNode) btn.parentNode.appendChild(popup);
    const closePopup = (e) => {
      if (!popup.contains(e.target) && e.target !== btn) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    };
    setTimeout(() => document.addEventListener('click', closePopup), 0);
  }

  function absAddForm(numero) {
    const existing = container.querySelector('.ls-menu-popup');
    if (existing) existing.remove();

    const now = new Date(tNow + 3600000);
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');

    const popup = document.createElement('div');
    popup.className = 'ls-menu-popup ls-menu-popup--wide ls-abs-popup';
    popup.innerHTML =
      '<div class="ls-menu-item ls-menu-section">Signaler une absence</div>' +
      '<label class="ls-abs-field">Heure de départ <input type="time" class="ls-abs-depart" value="' + hh + ':' + mm + '"></label>' +
      '<label class="ls-abs-field">Motif <input type="text" class="ls-abs-motif" placeholder="Motif si communiqué (facultatif)"></label>' +
      '<button class="ls-menu-item ls-menu-action" data-action="abs-save" data-numero="' + numero + '">Enregistrer l’absence</button>' +
      '<button class="ls-menu-item" data-action="abs-form-cancel">Annuler</button>';
    const btn = container.querySelector(`.ls-menu-btn[data-numero="${numero}"]`);
    if (btn && btn.parentNode) btn.parentNode.appendChild(popup);
    const closePopup = (e) => {
      if (!popup.contains(e.target) && e.target !== btn) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    };
    setTimeout(() => document.addEventListener('click', closePopup), 0);
  }

  function absMotifForm(numero, id, currentMotif) {
    const existing = container.querySelector('.ls-menu-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'ls-menu-popup ls-menu-popup--wide ls-abs-popup';
    popup.innerHTML =
      '<div class="ls-menu-item ls-menu-section">Modifier le motif</div>' +
      '<label class="ls-abs-field">Motif <input type="text" class="ls-abs-motif" value="' + escapeHtml(currentMotif || '') + '"></label>' +
      '<button class="ls-menu-item ls-menu-action" data-action="abs-motif-save" data-id="' + id + '">Enregistrer</button>' +
      '<button class="ls-menu-item" data-action="abs-form-cancel">Annuler</button>';
    const btn = container.querySelector(`.ls-menu-btn[data-numero="${numero}"]`);
    if (btn && btn.parentNode) btn.parentNode.appendChild(popup);
    const closePopup = (e) => {
      if (!popup.contains(e.target) && e.target !== btn) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    };
    setTimeout(() => document.addEventListener('click', closePopup), 0);
  }

  function render() {
    const slots = tousLesSlots();
    container.innerHTML =
      '<div id="screen-list">' +
        '<div class="ls-search-wrap">' +
          '<svg class="ls-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input id="ls-search" type="text" placeholder="Rechercher un nom\u2026" autocomplete="off">' +
        '</div>' +
        '<div class="ls-filters">' +
          '<button class="ls-filter ls-filter--active" id="ls-filter-all" data-filter="all">Tous \u00b7 16</button>' +
          '<button class="ls-filter" id="ls-filter-abs" data-filter="absents">Absents \u00b7 ' + absentsCount() + '</button>' +
          '<div class="ls-filter-spacer"></div>' +
          '<button id="ls-export" class="ls-icon-btn" title="Exporter">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
          '</button>' +
          '<button id="ls-import" class="ls-icon-btn" title="Importer">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
          '</button>' +
        '</div>' +
        '<div id="ls-rows"></div>' +
        '<div class="ls-legend">' +
          '<span><span class="ls-dot" style="background:var(--p-bg)"></span> pr\u00e9sent</span> \u00b7 ' +
          '<span><span class="ls-dot" style="background:var(--m-bg)"></span> manuel</span> \u00b7 ' +
          '<span><span class="ls-dot" style="background:var(--a-bg)"></span> absent</span> \u00b7 ' +
          '<span><span class="ls-dot" style="background:var(--v-bg)"></span> non tenu</span>' +
        '</div>' +
      '</div>';

    renderRows('', 'all');
    renderFilterPills();
    loadAbsences().then(() => {
      const search = container.querySelector('#ls-search');
      renderRows(search ? search.value : '', _currentFilter);
      renderFilterPills();
    });
  }

  render();

  let _currentFilter = 'all';

  container.addEventListener('click', (e) => {
    const filterBtn = e.target.closest('.ls-filter');
    if (filterBtn) {
      container.querySelectorAll('.ls-filter').forEach(b => b.classList.remove('ls-filter--active'));
      filterBtn.classList.add('ls-filter--active');
      _currentFilter = filterBtn.dataset.filter;
      const search = container.querySelector('#ls-search');
      renderRows(search ? search.value : '', _currentFilter);
      renderFilterPills();
      return;
    }

    const menuBtn = e.target.closest('.ls-menu-btn');
    if (menuBtn) {
      const num = parseInt(menuBtn.dataset.numero, 10);
      updateMenuPopup(num);
      return;
    }

    const menuItem = e.target.closest('.ls-menu-item');
    if (!menuItem) return;

    const action = menuItem.dataset.action;

    if (action === 'pointer') {
      const num = parseInt(menuItem.dataset.numero, 10);
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      pointerSubmenu(num);
      return;
    }

    if (action === 'cancel-open') {
      const num = parseInt(menuItem.dataset.numero, 10);
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      cancelSubmenu(num);
      return;
    }

    if (action === 'do-pointer') {
      const num = parseInt(menuItem.dataset.numero, 10);
      const popup = menuItem.closest('.ls-menu-popup');
      const override = popup ? popup.querySelector('input[name="ls-popup-ov"]:checked')?.value || 'auto' : 'auto';
      if (popup) popup.remove();

      const participant = PARTICIPANTS.find(p => p.numero === num);
      if (!participant) return;

      let slot;
      if (override === 'auto') {
        slot = slotDe(tNow);
      } else {
        const cfg = getConfig();
        const d = new Date(tNow + 3600000);
        const date = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
        if (!cfg.DATES.includes(date)) return;
        slot = { date, creneau: override };
      }
      if (!slot) return;

      const k = slotCle(idDe(num), slot);
      store.reg(k, tNow, 'manuel', override).then(result => {
        if (result.resultat === 'OK') {
          localM = store.getPointages();
        }
        const search = container.querySelector('#ls-search');
        renderRows(search ? search.value : '', _currentFilter);
        renderFilterPills();
      });
      return;
    }

    if (action === 'do-cancel') {
      const cle = menuItem.dataset.cle;
      const num = parseInt(menuItem.dataset.numero, 10);
      const participant = PARTICIPANTS.find(p => p.numero === num);
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();

      const cfg = getConfig();
      let canProceed = true;
      if (cfg.MULTI_APPAREILS) {
        canProceed = confirm('Avez-vous fusionné les appareils depuis le dernier export ? [OK = Oui, annuler, Annuler = Non]');
      }
      if (!canProceed) return;

      if (!confirm('Annuler le pointage de ' + participant.nomComplet + ' pour ' + menuItem.dataset.slotDate + ' ' + menuItem.dataset.slotCreneau + ' ?')) return;

      store.cancel(cle).then(result => {
        if (result.resultat === 'OK') {
          localM = store.getPointages();
        }
        const search = container.querySelector('#ls-search');
        renderRows(search ? search.value : '', _currentFilter);
        renderFilterPills();
      });
      return;
    }

    if (action === 'abs-add') {
      const num = parseInt(menuItem.dataset.numero, 10);
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      absAddForm(num);
      return;
    }

    if (action === 'abs-form-cancel') {
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      return;
    }

    if (action === 'abs-save') {
      const num = parseInt(menuItem.dataset.numero, 10);
      const popup = menuItem.closest('.ls-menu-popup');
      const hhmm = popup ? popup.querySelector('.ls-abs-depart')?.value : null;
      const motif = popup ? (popup.querySelector('.ls-abs-motif')?.value || '') : '';
      if (popup) popup.remove();
      if (!hhmm) return;

      const [hh, mm] = hhmm.split(':').map(Number);
      const jour = jourCourant();
      const [y, mo, d] = jour.split('-').map(Number);
      const depart = Date.UTC(y, mo - 1, d, hh, mm) - 3600000;

      store.ajouterAbsence({ numero: num, dateJour: jour, depart, retour: null, motif })
        .then(rafraichirApresMutation);
      return;
    }

    if (action === 'abs-close') {
      const id = menuItem.dataset.id;
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      store.cloturerAbsence(id, tNow).then(rafraichirApresMutation);
      return;
    }

    if (action === 'abs-motif-open') {
      const num = parseInt(menuItem.dataset.numero, 10);
      const id = menuItem.dataset.id;
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      const abs = localAbsences.find(a => a.id === id);
      absMotifForm(num, id, abs ? abs.motif : '');
      return;
    }

    if (action === 'abs-motif-save') {
      const id = menuItem.dataset.id;
      const popup = menuItem.closest('.ls-menu-popup');
      const motif = popup ? (popup.querySelector('.ls-abs-motif')?.value || '') : '';
      if (popup) popup.remove();
      store.modifierMotifAbsence(id, motif).then(rafraichirApresMutation);
      return;
    }

    if (action === 'abs-delete') {
      const id = menuItem.dataset.id;
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      if (!confirm('Supprimer cette absence ?')) return;
      store.supprimerAbsence(id).then(rafraichirApresMutation);
      return;
    }
  });

  const searchInput = container.querySelector('#ls-search');
  searchInput.addEventListener('input', () => {
    renderRows(searchInput.value, _currentFilter);
    renderFilterPills();
  });

  container.addEventListener('click', async (e) => {
    if (e.target.id === 'ls-export' || e.target.closest('#ls-export')) {
      const json = serialiser(PARTICIPANTS, localM);
      exporterFichier(json);
      return;
    }
    if (e.target.id === 'ls-import' || e.target.closest('#ls-import')) {
      try {
        const json = await importerFichier();
        const result = await importerFusion(store, json);
        if (result.resultat === 'OK') {
          localM = store.getPointages();
          const search = container.querySelector('#ls-search');
          renderRows(search ? search.value : '', _currentFilter);
          renderFilterPills();
        }
      } catch (_) {}
      return;
    }
  });

  return {
    refresh: (newM, newTNow) => {
      localM = newM || store.getPointages();
      tNow = newTNow || Date.now();
      _previousFiltered = null;
      loadAbsences().then(() => {
        const search = container.querySelector('#ls-search');
        renderRows(search ? search.value : '', _currentFilter);
        renderFilterPills();
      });
    },
  };
}
