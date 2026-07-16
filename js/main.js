import { hydrateConfig } from './config.js';
import { precalcChecksums } from './model/ident.js';

hydrateConfig({});

precalcChecksums();

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `<p style="padding:2em;font-family:sans-serif;text-align:center;color:#555;">
    Pointage BIM — GREEN INNOVATIVE'S<br>
    <small>Chargement…</small>
  </p>`;
}
