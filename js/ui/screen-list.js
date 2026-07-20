import { PARTICIPANTS } from '../data.js';
import { getConfig } from '../config.js';
import { norm } from '../model/norm.js';
import { idDe } from '../model/ident.js';
import { tousLesSlots, slotDe, cle as slotCle } from '../model/slots.js';
import { etatCellule, slotsEchus } from '../model/report.js';
import { serialiser, exporterFichier, importerFichier, importerFusion } from '../db/backup.js';

function formatTau(tau) {
  const d = new Date(tau + 3600000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}h${mm}`;
}

function jourCourant(tNow) {
  const d = new Date(tNow + 3600000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeInput(ms) {
  const d = new Date(ms + 3600000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseTimeInput(timeStr, dateStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const [y, mo, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, mo - 1, d, h, m) - 3600000;
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

  resetFilter();

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
    const today = jourCourant(tNow);
    const todayAbsences = store && typeof store.listerAbsences === 'function' ? store.listerAbsences(today) : [];
    listEl.innerHTML = list.map(p => {
      const pastilles = slots.map(s => pastilleHtml(p, s)).join('');
      const pAbsences = todayAbsences.filter(a => a.numero === p.numero);
      let absenceHtml = '';
      if (pAbsences.length > 0) {
        const openA = pAbsences.find(a => a.retour === null);
        if (openA) {
          absenceHtml = '<div class="ls-absence-info"><span class="ls-absence-tag">absent\u00b7e depuis ' + formatTau(openA.depart) + '</span>' +
            '<button class="ls-absence-action" data-action="marquer-retour-rapide" data-absence-id="' + openA.id + '" data-numero="' + p.numero + '">Marquer le retour</button></div>';
        } else {
          const n = pAbsences.length;
          absenceHtml = '<div class="ls-absence-info"><span class="ls-absence-tag">' + n + ' absence' + (n > 1 ? 's' : '') + ' signal\u00e9e' + (n > 1 ? 's' : '') + '</span></div>';
        }
      }
      return '<div class="ls-row" data-numero="' + p.numero + '">' +
        '<span class="ls-num">' + String(p.numero).padStart(2, '0') + '</span>' +
        '<span class="ls-name">' + p.nomComplet + '</span>' +
        '<button class="ls-menu-btn" data-action="menu" data-numero="' + p.numero + '" aria-label="Actions">\u22ef</button>' +
        '<div class="ls-pastilles">' + pastilles + '</div>' +
        absenceHtml +
      '</div>';
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

    const today = jourCourant(tNow);
    const todayAbsences = store && typeof store.listerAbsences === 'function' ? store.listerAbsences(today) : [];
    const openAbsence = todayAbsences.find(a => a.numero === numero && a.retour === null);
    const closedAbsences = todayAbsences.filter(a => a.numero === numero && a.retour !== null);

    const popup = document.createElement('div');
    popup.className = 'ls-menu-popup';

    let html = '<button class="ls-menu-item" data-action="pointer" data-numero="' + numero + '">Pointer manuellement</button>';

    if (openAbsence) {
      html += '<div class="ls-menu-item ls-menu-section">Absence en cours</div>' +
        '<button class="ls-menu-item" data-action="marquer-retour" data-absence-id="' + openAbsence.id + '" data-numero="' + numero + '">Marquer le retour</button>' +
        '<button class="ls-menu-item" data-action="modifier-motif" data-absence-id="' + openAbsence.id + '" data-numero="' + numero + '">Modifier le motif</button>' +
        '<button class="ls-menu-item" data-action="supprimer-absence" data-absence-id="' + openAbsence.id + '" data-numero="' + numero + '">Supprimer l\u2019absence</button>';
    } else {
      html += '<button class="ls-menu-item" data-action="signaler-absence" data-numero="' + numero + '">Signaler une absence</button>';
    }

    for (const a of closedAbsences) {
      const h = formatTau(a.depart);
      html += '<button class="ls-menu-item" data-action="modifier-motif" data-absence-id="' + a.id + '" data-numero="' + numero + '">Modifier motif (' + h + ')</button>' +
        '<button class="ls-menu-item" data-action="supprimer-absence" data-absence-id="' + a.id + '" data-numero="' + numero + '">Supprimer absence (' + h + ')</button>';
    }

    html += '<button class="ls-menu-item" data-action="cancel-open" data-numero="' + numero + '">Annuler</button>';

    popup.innerHTML = html;
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

  function absenceForm(numero) {
    const existing = container.querySelector('.ls-menu-popup');
    if (existing) existing.remove();

    const participant = PARTICIPANTS.find(p => p.numero === numero);
    if (!participant) return;

    const btn = container.querySelector(`.ls-menu-btn[data-numero="${numero}"]`);
    if (!btn) return;

    const popup = document.createElement('div');
    popup.className = 'ls-menu-popup ls-menu-popup--wide';
    popup.innerHTML =
      '<div class="ls-menu-item ls-menu-section">Signaler une absence</div>' +
      '<div class="ls-absence-field"><label>Heure de d\u00e9part</label><input type="time" id="ls-abs-depart" value="' + formatTimeInput(tNow) + '"></div>' +
      '<div class="ls-absence-field"><label>Motif (facultatif)</label><input type="text" id="ls-abs-motif" placeholder="Motif si communiqu\u00e9 (facultatif)"></div>' +
      '<button class="ls-menu-item ls-menu-action" data-action="do-signaler-absence" data-numero="' + numero + '">Enregistrer l\u2019absence</button>';
    btn.parentNode.appendChild(popup);

    const closePopup = (e) => {
      if (!popup.contains(e.target) && e.target !== btn) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    };
    setTimeout(() => document.addEventListener('click', closePopup), 0);
  }

  function motifEditForm(absenceId) {
    const a = store && typeof store.listerAbsences === 'function' ? store.listerAbsences().find(x => x.id === absenceId) : null;
    const existing = container.querySelector('.ls-menu-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'ls-menu-popup ls-menu-popup--wide';
    popup.innerHTML =
      '<div class="ls-menu-item ls-menu-section">Modifier le motif</div>' +
      '<div class="ls-absence-field"><label>Motif</label><input type="text" id="ls-abs-motif-edit" value="' + (a ? a.motif : '') + '"></div>' +
      '<button class="ls-menu-item ls-menu-action" data-action="do-modifier-motif" data-absence-id="' + absenceId + '">Enregistrer</button>';
    const targetBtn = a ? container.querySelector(`.ls-menu-btn[data-numero="${a.numero}"]`) : null;
    if (targetBtn && targetBtn.parentNode) targetBtn.parentNode.appendChild(popup);
    else container.appendChild(popup);

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

    const actionEl = e.target.closest('[data-action]');
    if (actionEl && actionEl.dataset.action === 'marquer-retour-rapide') {
      const id = actionEl.dataset.absenceId;
      if (store && typeof store.cloturerAbsence === 'function') {
        store.cloturerAbsence(id, Date.now()).then(() => {
          const search = container.querySelector('#ls-search');
          renderRows(search ? search.value : '', _currentFilter);
          renderFilterPills();
        });
      }
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

    if (action === 'signaler-absence') {
      const num = parseInt(menuItem.dataset.numero, 10);
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      absenceForm(num);
      return;
    }

    if (action === 'do-signaler-absence') {
      const num = parseInt(menuItem.dataset.numero, 10);
      const popup = menuItem.closest('.ls-menu-popup');
      const departEl = popup ? popup.querySelector('#ls-abs-depart') : null;
      const motifEl = popup ? popup.querySelector('#ls-abs-motif') : null;
      if (popup) popup.remove();
      if (!departEl) return;
      const today = jourCourant(tNow);
      const departMs = parseTimeInput(departEl.value, today);
      const motif = motifEl ? motifEl.value : '';
      const id = crypto.randomUUID();
      if (store && typeof store.ajouterAbsence === 'function') {
        store.ajouterAbsence({ id, numero: num, dateJour: today, depart: departMs, retour: null, motif }).then(() => {
          const search = container.querySelector('#ls-search');
          renderRows(search ? search.value : '', _currentFilter);
          renderFilterPills();
        });
      }
      return;
    }

    if (action === 'marquer-retour') {
      const id = menuItem.dataset.absenceId;
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      if (store && typeof store.cloturerAbsence === 'function') {
        store.cloturerAbsence(id, Date.now()).then(() => {
          const search = container.querySelector('#ls-search');
          renderRows(search ? search.value : '', _currentFilter);
          renderFilterPills();
        });
      }
      return;
    }

    if (action === 'do-modifier-motif') {
      const id = menuItem.dataset.absenceId;
      const popup = menuItem.closest('.ls-menu-popup');
      const motifEl = popup ? popup.querySelector('#ls-abs-motif-edit') : null;
      if (popup) popup.remove();
      if (store && typeof store.modifierMotifAbsence === 'function' && motifEl) {
        store.modifierMotifAbsence(id, motifEl.value).then(() => {
          const search = container.querySelector('#ls-search');
          renderRows(search ? search.value : '', _currentFilter);
          renderFilterPills();
        });
      }
      return;
    }

    if (action === 'modifier-motif') {
      const id = menuItem.dataset.absenceId;
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      motifEditForm(id);
      return;
    }

    if (action === 'supprimer-absence') {
      const id = menuItem.dataset.absenceId;
      const num = parseInt(menuItem.dataset.numero, 10);
      const participant = PARTICIPANTS.find(p => p.numero === num);
      const popup = menuItem.closest('.ls-menu-popup');
      if (popup) popup.remove();
      if (!confirm('Supprimer l\u2019absence de ' + (participant ? participant.nomComplet : '') + ' ?')) return;
      if (store && typeof store.supprimerAbsence === 'function') {
        store.supprimerAbsence(id).then(() => {
          const search = container.querySelector('#ls-search');
          renderRows(search ? search.value : '', _currentFilter);
          renderFilterPills();
        });
      }
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
      const search = container.querySelector('#ls-search');
      renderRows(search ? search.value : '', _currentFilter);
      renderFilterPills();
    },
  };
}
