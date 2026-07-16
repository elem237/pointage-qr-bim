import qrcode from '../vendor/qrcode.js';
import { PARTICIPANTS } from './data.js';
import { idDe, payload, precalcChecksums } from './model/ident.js';

export function pos(n) {
  return {
    page: Math.floor((n - 1) / 8) + 1,
    index: ((n - 1) % 8) + 1,
  };
}

export async function genererBadges() {
  await precalcChecksums();
  const badges = [];
  for (const p of PARTICIPANTS) {
    const id = idDe(p.numero);
    const pl = await payload(id);
    const qr = qrcode(1, 'Q');
    qr.addData(pl, 'Alphanumeric');
    qr.make();
    badges.push({
      participant: p,
      id,
      payload: pl,
      moduleCount: qr.getModuleCount(),
      svg: qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true }),
    });
  }
  return badges;
}

export async function renderBadges(container) {
  const badges = await genererBadges();
  let html = '';
  for (let page = 1; page <= 2; page++) {
    const pageBadges = badges.slice((page - 1) * 8, page * 8);
    html += '<div class="badge-page">';
    for (const b of pageBadges) {
      html += `<div class="badge">` +
        `<div class="badge-qr">${b.svg}</div>` +
        `<div class="badge-nom">${b.participant.nomComplet}</div>` +
        `<div class="badge-id">${b.id}</div>` +
        `</div>`;
    }
    html += '</div>';
  }
  container.innerHTML = html;
}
