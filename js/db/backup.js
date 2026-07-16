import { fusion } from '../model/lattice.js';

export function serialiser(participants, m) {
  const pointages = [];
  for (const [cle, v] of m) {
    pointages.push([cle, {
      generation: v.generation,
      statut: v.statut,
      tau: v.tau,
      mode: v.mode,
      device: v.device,
      override: v.override,
    }]);
  }
  return JSON.stringify({
    version: 2,
    participants: participants.map(p => ({ numero: p.numero, nomComplet: p.nomComplet })),
    pointages,
    exportLe: Date.now(),
  });
}

export function deserialiser(json) {
  try {
    const o = JSON.parse(json);
    if (!o || typeof o !== 'object') return null;
    if (o.version !== 2) return null;
    if (!Array.isArray(o.pointages)) return null;
    if (!Array.isArray(o.participants)) return null;
    for (const entry of o.pointages) {
      if (!Array.isArray(entry) || entry.length !== 2) return null;
      const [cle, v] = entry;
      if (typeof cle !== 'string') return null;
      if (!v || typeof v !== 'object') return null;
      if (typeof v.generation !== 'number') return null;
      if (v.statut !== 'actif' && v.statut !== 'annule') return null;
      if (typeof v.tau !== 'number') return null;
    }
    return {
      participants: o.participants,
      pointages: o.pointages,
      exportLe: o.exportLe,
    };
  } catch {
    return null;
  }
}

export function pointagesMap(pointages) {
  const m = new Map();
  for (const [cle, v] of pointages) {
    m.set(cle, { ...v });
  }
  return m;
}

export async function importerFusion(store, json) {
  const data = deserialiser(json);
  if (data === null) return { resultat: 'ERREUR', code: 'format' };
  const imported = pointagesMap(data.pointages);
  const current = store.getPointages();
  const merged = fusion(current, imported);
  await store.loadAllPointages(merged);
  return { resultat: 'OK', nb: data.pointages.length };
}

export function exporterFichier(jsonStr, filename = 'pointages-bim.json') {
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importerFichier() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) { reject(new Error('Aucun fichier sélectionné')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}
