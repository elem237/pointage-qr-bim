import { PARTICIPANTS } from '../data.js';
import { idDe } from '../model/ident.js';
import { getConfig } from '../config.js';

const DB_NAME = 'bim-pointage';
const DB_VERSION = 2;

function participantDeCle(cle) {
  const id = cle.split('|')[0];
  return PARTICIPANTS.find(p => idDe(p.numero) === id) || null;
}

function openDB(name) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(name, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('participants')) {
        const ps = db.createObjectStore('participants', { keyPath: 'numero' });
        ps.createIndex('nomNormalise', 'nomNormalise', { unique: false });
      }
      if (!db.objectStoreNames.contains('pointages')) {
        db.createObjectStore('pointages', { keyPath: 'cle' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'k' });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function getAll(store) {
  return new Promise((resolve, reject) => {
    const r = store.getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function getMeta(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const r = tx.objectStore('meta').get(key);
    r.onsuccess = () => resolve(r.result ? r.result.v : undefined);
    r.onerror = () => reject(r.error);
  });
}

function setMeta(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    tx.objectStore('meta').put({ k: key, v: value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getOrCreateDeviceId(db) {
  const existing = await getMeta(db, 'device');
  if (existing) return existing;
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : (() => {
        const a = new Uint32Array(4);
        crypto.getRandomValues(a);
        return a.join('-');
      })();
  await setMeta(db, 'device', id);
  return id;
}

function loadPointages(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pointages', 'readonly');
    const r = tx.objectStore('pointages').getAll();
    r.onsuccess = () => {
      const rows = r.result || [];
      const m = new Map();
      for (const row of rows) {
        const { cle, generation, statut, tau, mode, device, override } = row;
        m.set(cle, { generation, statut, tau, mode, device, override });
      }
      resolve(m);
    };
    r.onerror = () => reject(r.error);
  });
}

function savePointage(db, cle, v) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pointages', 'readwrite');
    tx.objectStore('pointages').put({ cle, ...v });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function deletePointage(db, cle) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pointages', 'readwrite');
    tx.objectStore('pointages').delete(cle);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function initDB(dbName) {
  if (dbName === undefined) dbName = DB_NAME;
  const db = await openDB(dbName);
  const pointages = await loadPointages(db);
  const deviceId = await getOrCreateDeviceId(db);

  return {
    _dbName: dbName,

    async reg(cle, tau, mode, override) {
      const v = pointages.get(cle);
      if (v != null && v.statut === 'actif') {
        return { resultat: 'DEJA_POINTE', tau: v.tau };
      }
      const g = (v == null) ? 0 : v.generation + 1;
      const vp = {
        generation: g,
        statut: 'actif',
        tau,
        mode,
        device: deviceId,
        override,
      };
      pointages.set(cle, vp);
      await savePointage(db, cle, vp);
      const participant = participantDeCle(cle);
      return { resultat: 'OK', participant };
    },

    async cancel(cle) {
      const v = pointages.get(cle);
      if (v == null || v.statut !== 'actif') {
        return { resultat: 'ERREUR' };
      }
      const vp = {
        ...v,
        generation: v.generation + 1,
        statut: 'annule',
      };
      pointages.set(cle, vp);
      await savePointage(db, cle, vp);
      return { resultat: 'OK' };
    },

    getPointages() {
      return pointages;
    },

    getDeviceId() {
      return deviceId;
    },

    close() {
      db.close();
    },
  };
}
