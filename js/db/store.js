import { PARTICIPANTS } from '../data.js';
import { idDe } from '../model/ident.js';
import { getConfig, mergeConfig } from '../config.js';

const DB_NAME = 'bim-pointage';
const DB_VERSION = 3;

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
      if (!db.objectStoreNames.contains('absences')) {
        const as = db.createObjectStore('absences', { keyPath: 'id' });
        as.createIndex('numero', 'numero', { unique: false });
        as.createIndex('dateJour', 'dateJour', { unique: false });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function randomId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const a = new Uint32Array(4);
  crypto.getRandomValues(a);
  return a.join('-');
}

function putAbsence(db, absence) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('absences', 'readwrite');
    tx.objectStore('absences').put(absence);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getAbsence(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('absences', 'readonly');
    const r = tx.objectStore('absences').get(id);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}

function deleteAbsence(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('absences', 'readwrite');
    tx.objectStore('absences').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getAllAbsences(db, dateJour) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('absences', 'readonly');
    const os = tx.objectStore('absences');
    const req = dateJour === undefined
      ? os.getAll()
      : os.index('dateJour').getAll(dateJour);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
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
  const seuilStocke = await getMeta(db, 'seuilAbsenceMin');
  if (seuilStocke !== undefined) mergeConfig({ SEUIL_ABSENCE_MIN: seuilStocke });

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

    async loadAllPointages(newMap) {
      pointages.clear();
      for (const [cle, v] of newMap) pointages.set(cle, { ...v });
      const tx = db.transaction('pointages', 'readwrite');
      const os = tx.objectStore('pointages');
      os.clear();
      for (const [cle, v] of newMap) {
        os.put({ cle, generation: v.generation, statut: v.statut, tau: v.tau, mode: v.mode, device: v.device, override: v.override });
      }
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },

    async ajouterAbsence(absence) {
      const id = randomId();
      await putAbsence(db, { ...absence, id });
      return id;
    },

    async cloturerAbsence(id, retour) {
      const a = await getAbsence(db, id);
      if (a == null) return;
      await putAbsence(db, { ...a, retour });
    },

    async modifierMotifAbsence(id, motif) {
      const a = await getAbsence(db, id);
      if (a == null) return;
      await putAbsence(db, { ...a, motif });
    },

    async supprimerAbsence(id) {
      await deleteAbsence(db, id);
    },

    async listerAbsences(dateJour) {
      return getAllAbsences(db, dateJour);
    },

    async setSeuilAbsence(min) {
      await setMeta(db, 'seuilAbsenceMin', min);
      mergeConfig({ SEUIL_ABSENCE_MIN: min });
    },

    close() {
      db.close();
    },
  };
}
