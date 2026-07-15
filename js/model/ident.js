import { PARTICIPANTS } from '../data.js';
import { getConfig } from '../config.js';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const REGEX = /^BIM26-([0-9]{3})-([A-Z2-7]{2})$/;

export function idDe(numero) {
  const p = getConfig().PREFIXE_ID;
  return p + String(numero).padStart(3, '0');
}

export const IDS_CONNUS = new Set(
  PARTICIPANTS.map(p => idDe(p.numero))
);

function base32_2(n) {
  return BASE32[(n >> 5) & 0x1F] + BASE32[n & 0x1F];
}

export async function checksum(id) {
  const config = getConfig();
  const encoder = new TextEncoder();
  const data = encoder.encode(id + config.SEL);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  const n = (bytes[0] << 2) | (bytes[1] >> 6);
  return base32_2(n);
}

export const CHECKSUMS = new Map();

export async function precalcChecksums() {
  CHECKSUMS.clear();
  for (const id of IDS_CONNUS) {
    CHECKSUMS.set(id, await checksum(id));
  }
}

export async function payload(id) {
  return id + '-' + await checksum(id);
}

export function valider(w) {
  const m = REGEX.exec(w);
  if (!m) return 'format';
  const id = 'BIM26-' + m[1];
  if (!IDS_CONNUS.has(id)) return 'inconnu';
  if (CHECKSUMS.get(id) !== m[2]) return 'checksum';
  return 'ok';
}
