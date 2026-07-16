# AJOUT — Mapping Mt / Md → créneaux

**Statut** : addendum à `SPECIFICATIONS.md` v1.1 · à lire avec `SKILL.md` (mise en page)
**Portée** : `js/config.js`, `js/model/slots.js`, `js/model/report.js`, `js/ui/screen-report.js`
**Version** : **2.0** du 15/07/2026 — horaires définitifs du client. Remplace la v1.0 : **bascule 12h30 → 13h00**.

---

## 1. Le déroulé réel de la journée

Horaires communiqués par le client, identiques les 4, 5 et 6 août :

```
08:00 ──────────── 10:30   Première partie
10:30 ──────────── 11:00   ☕ Pause
11:00 ──────────── 13:00   Reprise
13:00 ──────────── 14:00   🍽 Pause déjeuner
14:00 ──────────── 16:30   Reprise
```

Deux **demi-journées**, séparées par le déjeuner :

| Demi-journée | Séance | Durée effective |
|---|---|---|
| **Matin** (`Mt`) | 08:00 → 13:00, coupée d'une pause de 30 min | 4 h 30 |
| **Après-midi** (`Md`) | 14:00 → 16:30 | 2 h 30 |

---

## 2. Lexique

| Étiquette au tableau | Créneau | Valeur interne | Signification réelle |
|---|---|---|---|
| **Mt** | Matin | `'matin'` | pointage de la demi-journée du matin |
| **Md** | Midi | `'midi'` | pointage de la demi-journée d'après-déjeuner |

> ⚠️ **`Md` ne signifie pas « à midi ».** En français courant midi = 12h00 ; ici c'est la demi-journée d'après-déjeuner, **14:00 → 16:30**. Un pointage à 15h20 est un `Md`. Ne jamais coder `if (heure === 12)`.

### Règle de frontière — non négociable

> **`'Mt'` et `'Md'` n'apparaissent QUE dans la couche de rendu** (`screen-report.js`, le HTML du tableau).
> Le modèle, la base, le treillis et les clés n'utilisent **jamais** que `'matin'` et `'midi'`.

Interdit : `if (creneau === 'Mt')`, une clé `BIM26-001|2026-08-04|Mt`, un `PointageValue` contenant `Md`.
Motif : deux vocabulaires pour une même notion produisent tôt ou tard une comparaison qui échoue en silence. L'abréviation est une contrainte typographique du papier (8.54 mm de large, `SKILL.md` §3) — elle n'a rien à faire dans le modèle.

---

## 3. Fenêtres de pointage — RÉVISÉES

Les séances ne sont pas les fenêtres. Une **fenêtre de pointage** doit couvrir tout instant où une personne peut se présenter pour cette demi-journée.

```
07:00 ─────────────────────────────── 13:00 ─────────────────────────── 17:30
│                 Mt                  │                Md                │
│  ┌────────┐ ┌──┐ ┌───────────┐      │  ┌────────┐ ┌─────────────┐     │
│  │08→10:30│ │☕│ │11:00→13:00│      │  │🍽 déj.  │ │14:00→16:30  │     │
│  └────────┘ └──┘ └───────────┘      │  └────────┘ └─────────────┘     │
└─ arrivées ──────────────────────────┴──────────────────────── marge ──┘
   anticipées
```

| Créneau | Fenêtre | Constante |
|---|---|---|
| `matin` | **[07:00, 13:00)** | `H_DEBUT_MATIN` = `'07:00'` |
| `midi` | **[13:00, 17:30)** | `H_BASCULE` = `'13:00'`, `H_FIN_MIDI` = `'17:30'` |
| ⊥ | reste du temps | `HORS_SESSION` |

### Les trois décisions, et leurs raisons

**① La bascule est à 13:00, pas à 14:00.**
13:00 est le **dernier instant où une arrivée peut encore être une présence du matin**. Placer la bascule à 14:00 ferait pointer `Mt` quelqu'un qui arrive à 13h50 pour l'après-midi : un faux positif sur une demi-journée qu'il n'a pas suivie. L'heure du déjeuner appartient donc à `Md` — celui qui revient à 13h50 est déjà compté pour l'après-midi.

**② Les pauses ne découpent PAS les fenêtres.**
La fenêtre `Mt` est **continue** de 07:00 à 13:00 : elle traverse la pause de 10:30. Un retardataire qui arrive à 10h45, pendant le café, doit être pointé `Mt`. Exclure la pause creuserait un trou de 30 minutes où tout scan renverrait `HORS_SESSION`, sans recours pour l'opérateur. **Ne jamais modéliser les pauses dans `slots.js`** : elles n'existent que dans le planning papier.

**③ Les marges (07:00 et 17:30) sont gratuites.**
Une heure avant le début, une heure après la fin. Le risque de faux positif est nul — personne n'est dans la salle — et le coût d'une fenêtre trop étroite est élevé : un scan refusé alors que le participant est physiquement là.

---

## 4. Les 6 cellules du tableau ↔ les 6 slots

```
│ Jour 1  │ Jour 2  │ Jour 3  │
│ Mt │ Md │ Mt │ Md │ Mt │ Md │
   0    1    2    3    4    5     ← index de colonne
```

| Index | Colonne | Date | Créneau | Clé de pointage |
|---|---|---|---|---|
| 0 | Jour 1 · Mt | `2026-08-04` | `matin` | `BIM26-0NN\|2026-08-04\|matin` |
| 1 | Jour 1 · Md | `2026-08-04` | `midi` | `BIM26-0NN\|2026-08-04\|midi` |
| 2 | Jour 2 · Mt | `2026-08-05` | `matin` | `BIM26-0NN\|2026-08-05\|matin` |
| 3 | Jour 2 · Md | `2026-08-05` | `midi` | `BIM26-0NN\|2026-08-05\|midi` |
| 4 | Jour 3 · Mt | `2026-08-06` | `matin` | `BIM26-0NN\|2026-08-06\|matin` |
| 5 | Jour 3 · Md | `2026-08-06` | `midi` | `BIM26-0NN\|2026-08-06\|midi` |

L'ordre est **date croissante, puis `matin` avant `midi`**. Il doit correspondre exactement à l'ordre des `<td>` du HTML.

### `js/config.js` — patch

```js
// AVANT (v1.0, obsolète)          // APRÈS (v2.0, horaires définitifs)
H_DEBUT_MATIN: '06:00',            H_DEBUT_MATIN: '07:00',
H_BASCULE:     '12:30',            H_BASCULE:     '13:00',
H_FIN_MIDI:    '19:00',            H_FIN_MIDI:    '17:30',
```

Ces trois constantes restent **modifiables depuis l'écran Réglages**, via `getConfig()` — jamais `DEFAULTS` en direct.

### `js/model/slots.js`

```js
import { getConfig } from '../config.js';

export const CRENEAUX = Object.freeze(['matin', 'midi']);

/** Étiquettes du document. Couche de RENDU uniquement. */
export const LABEL_CRENEAU = Object.freeze({ matin: 'Mt', midi: 'Md' });

/**
 * Les 6 slots, dans l'ORDRE DES COLONNES du tableau (gauche → droite).
 * L'index dans ce tableau EST l'index de colonne.
 */
export function tousLesSlots() {
  const out = [];
  getConfig().DATES.forEach((date, i) => {
    for (const creneau of CRENEAUX) {
      out.push({ date, creneau, jour: i + 1, label: LABEL_CRENEAU[creneau] });
    }
  });
  return out;   // longueur 6 = |DATES| × |CRENEAUX|
}

/** Clé de pointage. SEUL format autorisé. */
export function cle(id, slot) {
  return `${id}|${slot.date}|${slot.creneau}`;
}

/** Heure → slot. Fenêtres CONTINUES : les pauses ne sont pas modélisées. */
export function slotDe(t) {
  const c = getConfig();
  const { date, heure } = localDouala(t);          // t + 3600000, UTC+1 sans DST
  if (!c.DATES.includes(date)) return null;
  if (heure >= c.H_DEBUT_MATIN && heure < c.H_BASCULE)  return { date, creneau: 'matin' };
  if (heure >= c.H_BASCULE     && heure < c.H_FIN_MIDI) return { date, creneau: 'midi'  };
  return null;
}
```

---

## 5. Exemples déroulés

| Scan | Créneau | Case | Contenu | Situation |
|---|---|---|---|---|
| 4 août, 07h50 | `matin` | J1 · **Mt** | `P` / `07h50` | arrivée en avance |
| 4 août, 08h05 | `matin` | J1 · **Mt** | `P` / `08h05` | nominal |
| 4 août, **10h45** | `matin` | J1 · **Mt** | `P` / `10h45` | **retardataire, pendant la pause café** |
| 4 août, 12h55 | `matin` | J1 · **Mt** | `P` / `12h55` | fin de séance du matin |
| 4 août, **12h59** | `matin` | J1 · **Mt** | | ⚠️ borne |
| 4 août, **13h00** | `midi` | J1 · **Md** | | ⚠️ borne |
| 4 août, **13h50** | `midi` | J1 · **Md** | `P` / `13h50` | **retour de déjeuner** |
| 4 août, 14h05 | `midi` | J1 · **Md** | `P` / `14h05` | nominal |
| 4 août, 15h20 | `midi` | J1 · **Md** | `P` / `15h20` | retardataire après-midi |
| 4 août, 16h40 | `midi` | J1 · **Md** | `P` / `16h40` | après la fin, dans la marge |
| 4 août, 06h50 | ⊥ | — | `HORS_SESSION` | avant ouverture |
| 4 août, 17h35 | ⊥ | — | `HORS_SESSION` | après la marge |
| 7 août, 09h00 | ⊥ | — | `HORS_SESSION` | date hors formation |

> **12h59 → Mt, 13h00 → Md.** Bornes fermées à gauche, ouvertes à droite : `[07:00, 13:00)` puis `[13:00, 17:30)`. Aucune minute n'appartient à deux créneaux, aucune n'est perdue entre eux (formalisation, Propriété 2.2).

### L'override reste indispensable

La bascule à 13:00 supprime l'ancien cas du « retardataire de 12h35 ». Deux situations continuent pourtant d'exiger le sélecteur `Auto | Matin | Midi` :

- **Badge oublié le matin.** Le participant était là de 08:00 à 13:00, mais son badge est resté chez lui. Il le rapporte à 14h10 → `Auto` écrirait `Md` et laisserait `Mt` à `A`. L'opérateur force **Matin** pour enregistrer la demi-journée réellement suivie, puis rescanne en `Auto` pour le `Md`.
- **Horloge du téléphone dérivée.** Si l'appareil croit qu'il est 13h05 alors qu'il est 12h50, tous les pointages basculent en `Md`. L'override est le seul recours en salle.

Le champ `override` du `PointageValue` conserve la trace de chaque forçage (Erratum 2 de la formalisation).

---

## 6. Rendu du tableau — `js/ui/screen-report.js`

Les 6 `<td>` d'une ligne participant sont générés **en itérant `tousLesSlots()`**, jamais en dur.

```js
import { tousLesSlots } from '../model/slots.js';
import { etatCellule } from '../model/report.js';

function cellulesJour(participant, tNow) {
  return tousLesSlots().map(slot => {
    const e = etatCellule(participant, slot, tNow);
    switch (e.type) {
      case 'present':
        return `<td class="cell-jour"><span class="pa">P</span>` +
               `<span class="heure">${hhMM(e.tau)}</span></td>`;   // "08h05"
      case 'absent':
        return `<td class="cell-jour"><span class="pa">A</span></td>`;
      case 'vide':
        return `<td class="cell-jour"></td>`;                      // ⚠️ VIDE, jamais "A"
    }
  }).join('');
}
```

En-tête à deux niveaux (`SKILL.md` §7) — les `Mt`/`Md` viennent **de la même source** :

```js
const rangeeJours = getConfig().DATES
  .map((_, i) => `<td class="h" colspan="2">Jour ${i + 1}</td>`).join('');
const rangeeCreneaux = tousLesSlots()
  .map(s => `<td class="h">${s.label}</td>`).join('');
```

> **Une seule source d'ordre.** Écrire `Mt`/`Md` en dur dans le HTML tout en générant les cellules par boucle créerait deux ordres indépendants : le jour où l'un change, les présences glissent d'une colonne et **le PDF reste parfaitement plausible**. Aucun test ne rougit, personne ne le voit avant la signature du client. C'est le mode de défaillance le plus coûteux de ce module.

---

## 7. Tests

`test/slots.test.js` et `test/report.test.js`.

| # | Test | Attendu |
|---|---|---|
| A1 | `tousLesSlots().length` | `6` |
| A2 | Ordre des slots | `[04/matin, 04/midi, 05/matin, 05/midi, 06/matin, 06/midi]` |
| A3 | Labels dans l'ordre | `['Mt','Md','Mt','Md','Mt','Md']` |
| A4 | Bijection index ↔ slot | `tousLesSlots()[2]` = `{date:'2026-08-05', creneau:'matin'}` |
| B1 | 4 août 08h05 | `matin` |
| B2 | 4 août **10h45** (pause café) | `matin` — **pas ⊥** 🔴 |
| B3 | 4 août **12h59** (borne) | `matin` 🔴 |
| B4 | 4 août **13h00** (borne) | `midi` 🔴 |
| B5 | 4 août **13h50** (déjeuner) | `midi` — **pas ⊥** 🔴 |
| B6 | 4 août 15h20 | `midi` |
| B7 | 4 août 16h40 (marge) | `midi` |
| B8 | 4 août 06h59 | `null` |
| B9 | 4 août 17h30 | `null` |
| B10 | 7 août 09h00 | `null` |
| C1 | Override `matin` à 14h10 | slot `matin`, `override:'matin'` conservé |
| D1 | 🔴 **Cohérence en-tête / cellules** | pour chaque index 0→5, le label de l'en-tête correspond au créneau du slot |
| D2 | 🔴 **Pas de fuite de vocabulaire** | `grep -rn "'Mt'\|'Md'" js/model/ js/db/ js/scan/` → **aucun résultat** |
| E1 | Rendu `present` | `P` et `HHhMM` sur deux lignes |
| E2 | Rendu `vide` | `<td>` **vide** — Propriété 8.2 |

**B2 et B5 sont marqués 🔴** : ce sont les tests des pauses. Ils échoueraient si quelqu'un « modélisait proprement » le planning en excluant les pauses des fenêtres — l'erreur la plus tentante de tout cet addendum.

**D1 et D2 sont marqués 🔴** : ils ne testent pas un calcul mais une **cohérence structurelle**, le type de défaut invisible à l'écran et découvert sur le PDF signé.

---

## 8. Récapitulatif

1. Journée : **08:00–13:00** (pause café 10:30–11:00), déjeuner **13:00–14:00**, **14:00–16:30**.
2. `Mt` = demi-journée du matin, `Md` = demi-journée d'après-déjeuner (**pas 12h00**).
3. Fenêtres : `matin` = **[07:00, 13:00)**, `midi` = **[13:00, 17:30)**. Bascule à **13:00**.
4. **Les pauses sont dans les fenêtres, jamais modélisées.** 10h45 → `Mt`. 13h50 → `Md`.
5. Le modèle ne connaît que `'matin'` / `'midi'`. `Mt`/`Md` vivent dans le HTML, point.
6. Colonnes : `(J1,Mt) (J1,Md) (J2,Mt) (J2,Md) (J3,Mt) (J3,Md)` — `tousLesSlots()` est **la** source unique.
7. L'override rattrape le badge oublié et la dérive d'horloge.
