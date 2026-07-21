# ABSENCES.md — Signalement des absences dans le rapport

**Statut** : addendum à `SPECIFICATIONS.md` · **Version** 1.0
**Portée autorisée** : `js/config.js`, un NOUVEAU fichier `js/model/absences.js`, `js/db/store.js` (ajout d'un store, sans toucher aux stores existants), `js/ui/screen-list.js`, `js/ui/screen-setup.js`, `js/ui/screen-report.js` (bas de page uniquement), `css/print.css` (section NOUVELLE dédiée). **RIEN d'autre.**

## Place dans la hiérarchie

```
CLAUDE.md > SKILL.md > AJOUT.md > INTERFACE.md > ABSENCES.md > SPECIFICATIONS.md
```

En cas de conflit avec `SKILL.md` (mise en page du tableau) : **`SKILL.md` gagne toujours**. Le bloc d'absences vit SOUS le tableau, il n'y touche pas.

---

## 1. Le besoin

Le client veut que chaque absence prolongée d'un participant soit mentionnée dans le rapport final — **pas dans le tableau**, mais **plus bas**, sous la forme d'une phrase. L'intention : rendre visibles les absences au vu de la « mentalité de certains ».

**Approche retenue (B) : l'absence est CONSTATÉE par l'opérateur, pas pointée par le participant.** C'est un choix de conception : la personne qui « triche » ne scannerait pas sa propre sortie. L'autorité est donc placée sur l'opérateur qui surveille, jamais sur le badge.

---

## 2. Règle absolue — zéro régression sur les présences

> **Une absence est un objet NOUVEAU et SÉPARÉ. Elle ne touche pas au treillis des présences, ni à `PointageValue`, ni à `reg`/`cancel`/`join`, ni à `etatCellule`.**

Les présences et les absences sont deux systèmes indépendants qui ne se rencontrent qu'au moment du rendu du rapport. Interdits :
- modifier `PointageValue`, `lattice.js`, `report.js` (fonction `etatCellule`), `slots.js`
- faire dépendre une absence d'un pointage, ou l'inverse
- « profiter » de l'occasion pour retoucher la logique de présence → **signaler, ne pas toucher**

Contrôle après chaque étape :
```bash
git diff --name-only | grep -E '^js/model/(lattice|slots|report)\.js|^js/db/.*lattice' && echo "❌ VIOLATION"
```
(`report.js` n'est PAS dans la portée : le rendu des absences vit dans `screen-report.js`, la couche UI. Si une fonction de calcul d'absence doit être pure, elle va dans le nouveau `absences.js`, jamais dans `report.js`.)

---

## 3. Le modèle de données

### 3.1 L'objet Absence

```js
/**
 * @typedef {Object} Absence
 * @property {string}  id        identifiant unique (crypto.randomUUID())
 * @property {number}  numero    le numero (1..16) du participant concerné
 * @property {string}  dateJour  'YYYY-MM-DD' — le jour de l'absence
 * @property {number}  depart    epoch ms — début de l'absence (constaté)
 * @property {number|null} retour epoch ms — fin, ou null si toujours absent
 * @property {string}  motif     texte libre, '' si aucun motif donné au départ
 */
```

- `retour: null` signifie **« parti·e, non revenu·e au moment du rapport »**.
- `numero` (et non l'id `BIM26-…`) relie l'absence au participant : c'est la clé de tri du document, cohérente avec le reste du projet.
- `motif` n'est renseigné QUE si la personne a donné un motif **au départ** (règle du client). Il n'est jamais demandé au retour.

### 3.2 Store IndexedDB — `js/db/store.js`

Ajouter UN store, sans toucher aux stores `participants`, `pointages`, `meta` existants.

| Store | keyPath | Index | Contenu |
|---|---|---|---|
| `absences` | `id` | `numero`, `dateJour` | les objets Absence |

> ⚠️ L'ajout d'un object store nécessite d'**incrémenter la version d'IndexedDB** (`onupgradeneeded`). Créer UNIQUEMENT le nouveau store dans le upgrade ; ne pas recréer ni vider les stores existants. Tester qu'une base déjà remplie de pointages survit à la migration sans perte.

Fonctions à ajouter dans `store.js` (à côté des existantes, sans les modifier) :
```
ajouterAbsence(absence)        → écrit, retourne l'id
cloturerAbsence(id, retour)    → renseigne le champ retour
modifierMotifAbsence(id, motif)→ met à jour le motif
supprimerAbsence(id)           → efface (erreur de saisie)
listerAbsences(dateJour?)      → toutes, ou celles d'un jour
```

---

## 4. Le calcul — `js/model/absences.js` (NOUVEAU, fonctions pures)

Aucune dépendance à IndexedDB ni au DOM : ce fichier se teste sans navigateur.

### 4.1 Durée

```js
/**
 * Durée d'une absence en minutes. null si toujours absente (retour null).
 * @param {Absence} a
 * @param {number} tNow  instant de référence (pour une absence en cours, sert
 *                       à un affichage live éventuel — PAS au rapport final)
 * @returns {number|null}
 */
export function dureeMinutes(a) {
  if (a.retour == null) return null;
  return Math.round((a.retour - a.depart) / 60000);
}
```

### 4.2 Filtre de seuil — appliqué À L'AFFICHAGE, jamais à la saisie

```js
/**
 * Une absence est-elle RAPPORTABLE dans le PDF ?
 * - absence terminée : durée >= seuil
 * - absence non terminée (retour null) : TOUJOURS rapportée (disparition totale)
 * @param {Absence} a
 * @param {number} seuilMin  CONFIG.SEUIL_ABSENCE_MIN
 */
export function estRapportable(a, seuilMin) {
  if (a.retour == null) return true;              // non revenu·e → toujours signalé
  return dureeMinutes(a) >= seuilMin;
}
```

> **Pourquoi filtrer à l'affichage et non à la saisie.** L'opérateur enregistre TOUTE absence qu'il constate, même courte. Une absence de 18 min notée, puis prolongée à 40, ne doit pas avoir été perdue à la saisie. On capture tout, on filtre au rapport. C'est la règle centrale de cette fonctionnalité.

### 4.3 Formatage de la durée

```js
/** minutes → "HH:MM". 47 → "00:47", 95 → "01:35". */
export function formatDuree(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
```

### 4.4 Génération de la phrase

```js
/**
 * Phrase d'absence pour le rapport. Formule NEUTRE (point médian).
 * @param {Absence} a
 * @param {string} nomComplet  verbatim, depuis PARTICIPANTS
 * @returns {{ phrase: string, motif: string|null }}
 */
export function phraseAbsence(a, nomComplet) {
  const jour = formatDateLongue(a.dateJour);       // "4 août 2026"
  let phrase;
  if (a.retour == null) {
    const hDep = formatHeure(a.depart);            // "10h15"
    phrase = `${nomComplet} s'est absenté·e à partir de ${hDep} le ${jour}, non revenu·e.`;
  } else {
    const d = formatDuree(dureeMinutes(a));        // "00:47"
    phrase = `${nomComplet} s'est absenté·e pour ${d} le ${jour}.`;
  }
  return { phrase, motif: a.motif.trim() || null };
}
```

**Les deux formes exactes attendues :**
- Terminée : `NGOUDJO Fabrice Patrick s'est absenté·e pour 00:47 le 4 août 2026.`
- Non revenu·e : `NGOUDJO Fabrice Patrick s'est absenté·e à partir de 10h15 le 4 août 2026, non revenu·e.`

> Formule **neutre** par décision : les 16 participants sont une liste de noms sans genre stocké. Le point médian `·e` est la forme retenue. Ne pas inventer « Monsieur/Madame » — la donnée n'existe pas.

### 4.5 Tri des absences pour le rapport

Par `numero` croissant, puis par `depart` croissant (une même personne peut s'absenter deux fois). Cohérent avec l'ordre du tableau.

---

## 5. Constante — `js/config.js`

```js
SEUIL_ABSENCE_MIN: 20,   // minutes ; une absence terminée < seuil n'est pas imprimée
```

**Modifiable en Réglages** (le client dira peut-être 15 ou 30 le jour J), via `getConfig()`, jamais `DEFAULTS` en direct.

---

## 6. Saisie — écran Liste, `js/ui/screen-list.js`

Le menu ⋯ de chaque participant (déjà présent) gagne une entrée **« Signaler une absence »**.

### 6.1 Fiche d'absence (au départ)

Ouvre un petit formulaire :
- **Heure de départ** : pré-remplie à `Date.now()`, modifiable.
- **Motif** (optionnel) : champ texte. Placeholder « Motif si communiqué (facultatif) ». Rempli SEULEMENT si la personne l'a donné en partant.
- Boutons : **Enregistrer l'absence** · Annuler.

À l'enregistrement : `ajouterAbsence({ numero, dateJour: jourCourant, depart, retour: null, motif })`.

### 6.2 Marquer le retour

Un participant avec une absence en cours (`retour: null`) affiche un indicateur (ex. pastille « absent·e depuis 10h15 ») et une action **« Marquer le retour »** → `cloturerAbsence(id, Date.now())`.

### 6.3 Corrections

- **Modifier le motif** : possible tant que le rapport n'est pas figé.
- **Supprimer** (erreur de saisie) : avec confirmation.

> Toute la saisie passe par les fonctions de `store.js` du §3.2. Aucune écriture directe dans IndexedDB depuis l'UI.

### 6.4 Indicateur dans la liste

Sous les pastilles de créneau d'un participant, si absence(s) ce jour : une ligne discrète « 1 absence signalée (00:47) » ou « absent·e depuis 10h15 ». N'utilise PAS les couleurs d'état des créneaux (présent/manuel/absent) — c'est une information distincte, couleur neutre `--txt-2`.

---

## 7. Réglage — écran Réglages, `js/ui/screen-setup.js`

Dans la carte **Créneaux** (ou une nouvelle carte « Absences ») :
- champ **Seuil de signalement** : nombre de minutes, défaut 20.
- libellé : « Une absence plus courte n'apparaît pas dans le rapport. Une absence sans retour est toujours signalée. »

Passe par le store `meta` + `hydrateConfig`, jamais `DEFAULTS`.

---

## 8. Rapport — `js/ui/screen-report.js` (bas de page uniquement)

> ⚠️ Le `<table>` et son `print.css` sont gouvernés par `SKILL.md` et **INTOUCHABLES**. Le bloc d'absences s'ajoute APRÈS le tableau, dans une zone libre.

### 8.1 Contenu

Sous le tableau, un bloc titré **« Absences signalées »**, présent SEULEMENT s'il existe au moins une absence rapportable (sinon le bloc entier est absent — pas de titre vide).

Pour chaque absence rapportable (filtre `estRapportable`, tri du §4.5), une ligne :

```
•  NGOUDJO Fabrice Patrick s'est absenté·e pour 00:47 le 4 août 2026.
   Motif : rendez-vous médical.
```

Règles d'impression du motif :
- **motif renseigné** → ligne « Motif : {motif}. »
- **motif vide** → ligne « Motif : ________________________________ » (espace souligné à remplir à la main).

> Le client veut pouvoir compléter le motif au stylo si l'absence a été signalée sans motif. D'où l'espace à remplir, présent uniquement quand `motif === ''`.

### 8.2 Mise en page (`print.css`, section NOUVELLE)

Ajouter une section délimitée, SANS toucher à la section tableau :
```css
/* ═══════════ ABSENCES (ABSENCES.md §8) ═══════════ */
.bloc-absences { margin-top: 8mm; font-family: Carlito, Calibri, sans-serif; font-size: 10pt; }
.bloc-absences h2 { font-size: 11pt; font-weight: bold; margin-bottom: 3mm; }
.bloc-absences .abs { margin-bottom: 2.5mm; }
.bloc-absences .abs .motif { padding-left: 6mm; font-style: italic; }
.bloc-absences .abs { break-inside: avoid; }   /* ne pas couper une absence entre 2 pages */
```

> **Débordement sur une 2ᵉ page accepté** (décision client). Si les absences sont nombreuses, le bloc continue sur une page suivante. `break-inside: avoid` empêche seulement de couper une absence en deux.

Vérification que la section tableau de `print.css` est intacte :
```bash
git diff css/print.css   # SEULEMENT des lignes AJOUTÉES dans la section ABSENCES.
                          # Aucune ligne existante modifiée.
```

### 8.3 Aperçu écran

L'aperçu (miniature `transform: scale`) reflète automatiquement le bloc puisqu'il rend la vraie page. Rien de spécifique à coder, sauf s'assurer que le conteneur d'aperçu ne coupe pas le bloc.

---

## 9. Tests

### `test/absences.test.js` (fonctions pures — sans navigateur)

| # | Test | Attendu |
|---|---|---|
| AB1 | `dureeMinutes` absence 10h15→11h02 | 47 |
| AB2 | `dureeMinutes` retour null | null |
| AB3 | `formatDuree(47)` | "00:47" |
| AB4 | `formatDuree(95)` | "01:35" |
| AB5 | `estRapportable` durée 47, seuil 20 | true |
| AB6 | `estRapportable` durée 12, seuil 20 | **false** |
| AB7 | `estRapportable` durée 12, seuil 10 | true (seuil paramétrable) |
| AB8 | `estRapportable` retour null, seuil 20 | **true** (toujours signalé) |
| AB9 | `phraseAbsence` terminée | "…s'est absenté·e pour 00:47 le 4 août 2026." |
| AB10 | `phraseAbsence` non revenu·e | "…à partir de 10h15 le 4 août 2026, non revenu·e." |
| AB11 | `phraseAbsence` motif "rdv" | motif: "rdv" |
| AB12 | `phraseAbsence` motif "" | motif: null (→ espace à remplir au rendu) |
| AB13 | tri : numero croissant puis depart croissant | ordre correct |

### `test/store.test.js` (ajouts — navigateur)

| # | Test | Attendu |
|---|---|---|
| ST-A1 | migration : base pleine de pointages + nouveau store `absences` | pointages INTACTS |
| ST-A2 | `ajouterAbsence` puis `listerAbsences` | 1 absence |
| ST-A3 | `cloturerAbsence` | retour renseigné |
| ST-A4 | `supprimerAbsence` | 0 absence |
| ST-A5 | les stores `pointages`/`participants` inchangés après ces opérations | ✅ |

### Régression (le plus important)

| # | Test | Attendu |
|---|---|---|
| RG1 | `git diff` ne touche pas lattice.js, slots.js, report.js(etatCellule) | ✅ |
| RG2 | tous les tests de présence existants passent encore | ✅ |
| RG3 | `print.css` : section tableau identique à l'octet près | ✅ |
| RG4 | un rapport SANS aucune absence n'affiche AUCUN bloc (pas de titre vide) | ✅ |

---

## 10. Étape et ordre

Nouvelle étape, insérée APRÈS l'étape 13 (Liste + Réglages existants) et le correctif hors-ligne, mais AVANT un redéploiement final : le service worker doit précacher `absences.js`.

| Sous-étape | Livrable | Tests |
|---|---|---|
| AB-1 | `absences.js` (pur) + `config.js` (seuil) | AB1–AB13 |
| AB-2 | store `absences` + migration IndexedDB | ST-A1–A5, RG1 |
| AB-3 | saisie écran Liste + réglage seuil | visuel + RG2 |
| AB-4 | bloc rapport + `print.css` | RG3, RG4, rendu |

⚠️ Après AB-4 : **ajouter `js/model/absences.js` à la liste `ASSETS` de `sw.js`** et incrémenter `CACHE`, sinon la fonctionnalité casse le hors-ligne (le fichier ne serait pas en cache). C'est exactement le type d'oubli qui a causé la panne hors-ligne précédente.

---

## 11. Definition of done

- [x] Une absence de 47 min avec motif → phrase + motif dans le PDF
- [x] Une absence de 12 min (seuil 20) → **absente du PDF**
- [x] Une absence sans retour → « à partir de HH:MM, non revenu·e », toujours imprimée
- [x] Une absence sans motif → phrase + espace souligné à remplir
- [x] Seuil modifiable en Réglages, pris en compte au rapport
- [x] Aucune absence ce jour → aucun bloc « Absences signalées »
- [x] Le tableau du rapport est **pixel-identique** à avant (SKILL.md préservé)
- [x] Une base de pointages existante survit à la migration IndexedDB
- [x] `absences.js` est dans le précache du service worker, CACHE incrémenté
- [ ] **Physique** : signaler une absence, marquer un retour, imprimer, vérifier la phrase

> Les 9 premières cases sont couvertes par les tests AB4-R1–R6 et les tests de non-régression (RG1, RG3, RG4). La case « Physique » nécessite un test sur appareil réel.
