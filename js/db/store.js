import { PARTICIPANTS } from '../data.js';
import { idDe } from '../model/ident.js';
import { getConfig } from '../config.js';

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
        const abs = db.createObjectStore('absences', { keyPath: 'id' });
        abs.createIndex('numero', 'numero', { unique: false });
        abs.createIndex('dateJour', 'dateJour', { unique: false });
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

function loadAbsences(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('absences', 'readonly');
    const r = tx.objectStore('absences').getAll();
    r.onsuccess = () => {
      const rows = r.result || [];
      const m = new Map();
      for (const row of rows) m.set(row.id, row);
      resolve(m);
    };
    r.onerror = () => reject(r.error);
  });
}

function saveAbsence(db, absence) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('absences', 'readwrite');
    tx.objectStore('absences').put(absence);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function deleteAbsenceFromDB(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('absences', 'readwrite');
    tx.objectStore('absences').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function initDB(dbName) {
  if (dbName === undefined) dbName = DB_NAME;
  const db = await openDB(dbName);
  const pointages = await loadPointages(db);
  const deviceId = await getOrCreateDeviceId(db);
  const absences = await loadAbsences(db);

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

    // ─── Absences (§3.2) ──────────────────────────────────

    async ajouterAbsence(absence) {
      absences.set(absence.id, absence);
      await saveAbsence(db, absence);
      return absence.id;
    },

    async cloturerAbsence(id, retour) {
      const a = absences.get(id);
      if (!a) throw new Error('Absence introuvable: ' + id);
      a.retour = retour;
      await saveAbsence(db, a);
    },

    async modifierMotifAbsence(id, motif) {
      const a = absences.get(id);
      if (!a) throw new Error('Absence introuvable: ' + id);
      a.motif = motif;
      await saveAbsence(db, a);
    },

    async supprimerAbsence(id) {
      absences.delete(id);
      await deleteAbsenceFromDB(db, id);
    },

    listerAbsences(dateJour) {
      const all = [...absences.values()];
      if (dateJour !== undefined) {
        return all.filter(a => a.dateJour === dateJour);
      }
      return all;
    },

    close() {
      db.close();
    },
  };
}
