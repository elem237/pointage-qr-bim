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
    <button class="nav-btn" data-screen="scan">🔍 Scan</button>
    <button class="nav-btn" data-screen="report">📋 Rapport</button>
    <button class="nav-btn" data-screen="list">📝 Liste</button>
    <button class="nav-btn" data-screen="setup">⚙️ Réglages</button>
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
