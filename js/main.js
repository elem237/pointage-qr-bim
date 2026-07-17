import { hydrateConfig, getConfig, mergeConfig } from './config.js';
import { precalcChecksums } from './model/ident.js';
import { initDB } from './db/store.js';
import { screenScan } from './ui/screen-scan.js';
import { screenReport } from './ui/screen-report.js';
import { screenList } from './ui/screen-list.js';
import { screenSetup } from './ui/screen-setup.js';

let _store = null;
let _currentScreen = null;
let _screenCtrl = null;

function dateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function autoModeTest() {
  const cfg = getConfig();
  const t = new Date();
  const ts = dateStr(t);
  if (cfg.DATES.includes(ts)) return;
  const dates = [
    ts,
    dateStr(new Date(t.getTime() + 864e5)),
    dateStr(new Date(t.getTime() + 2 * 864e5)),
  ];
  mergeConfig({
    DATES: dates,
    H_DEBUT_MATIN: '00:00',
    H_BASCULE:     '12:00',
    H_FIN_MIDI:    '23:59',
  });
}

function montrerScreen(nom) {
  if (_currentScreen === nom) return;
  if (_screenCtrl && typeof _screenCtrl.arreterScan === 'function') {
    _screenCtrl.arreterScan();
  }
  _currentScreen = nom;
  const app = document.getElementById('app');
  const container = document.getElementById('screen-container');
  if (!container) return;
  container.innerHTML = '';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === nom));

  const m = _store ? _store.getPointages() : new Map();
  const tNow = Date.now();

  switch (nom) {
    case 'scan':
      _screenCtrl = screenScan(container, _store);
      break;
    case 'report':
      _screenCtrl = screenReport(container, m, tNow);
      break;
    case 'list':
      _screenCtrl = screenList(container, _store, m, tNow);
      break;
    case 'setup':
      _screenCtrl = screenSetup(container, {
        onClearAll: async () => {
          if (_store) {
            const m = _store.getPointages();
            const keys = [...m.keys()];
            for (const k of keys) {
              await _store.cancel(k);
            }
          }
        },
      });
      break;
  }
}

async function main() {
  hydrateConfig({});
  autoModeTest();
  await precalcChecksums();
  try {
    _store = await initDB();
  } catch (e) {
    console.warn('IndexedDB indisponible:', e);
  }
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
<div id="app-root">
  <nav id="nav-bar">
    <button class="nav-btn" data-screen="scan">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      <span class="nav-label">Scan</span>
    </button>
    <button class="nav-btn" data-screen="report">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span class="nav-label">Rapport</span>
    </button>
    <button class="nav-btn" data-screen="list">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      <span class="nav-label">Liste</span>
    </button>
    <button class="nav-btn" data-screen="setup">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      <span class="nav-label">Réglages</span>
    </button>
  </nav>
  <div id="screen-container"></div>
</div>`;
  app.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (btn && btn.dataset.screen) {
      montrerScreen(btn.dataset.screen);
    }
  });
  montrerScreen('scan');
}

main();
