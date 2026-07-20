const TZ_MS = 60 * 60 * 1000;

const MOIS = [
  'janvier', 'f\u00e9vrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'ao\u00fbt', 'septembre', 'octobre', 'novembre', 'd\u00e9cembre',
];

function formatHeure(ms) {
  const t = new Date(ms + TZ_MS);
  const h = t.getUTCHours();
  const m = t.getUTCMinutes();
  return String(h).padStart(2, '0') + 'h' + String(m).padStart(2, '0');
}

function formatDateLongue(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MOIS[m - 1]} ${y}`;
}

export function dureeMinutes(a) {
  if (a.retour == null) return null;
  return Math.round((a.retour - a.depart) / 60000);
}

export function formatDuree(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export function estRapportable(a, seuilMin) {
  if (a.retour == null) return true;
  return dureeMinutes(a) >= seuilMin;
}

export function phraseAbsence(a, nomComplet) {
  const jour = formatDateLongue(a.dateJour);
  let phrase;
  if (a.retour == null) {
    const hDep = formatHeure(a.depart);
    phrase = `${nomComplet} s'est absent\u00e9\u00b7e \u00e0 partir de ${hDep} le ${jour}, non revenu\u00b7e.`;
  } else {
    const d = formatDuree(dureeMinutes(a));
    phrase = `${nomComplet} s'est absent\u00e9\u00b7e pour ${d} le ${jour}.`;
  }
  return { phrase, motif: a.motif.trim() || null };
}

export function trierAbsences(absences) {
  return [...absences].sort((a, b) => {
    if (a.numero !== b.numero) return a.numero - b.numero;
    return a.depart - b.depart;
  });
}
