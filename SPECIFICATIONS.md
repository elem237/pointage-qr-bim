# Spécifications d'implémentation — Pointage QR

**Projet** : Initiation au processus BIM dans la gestion des projets immobiliers
**Client** : GREEN INNOVATIVE'S — **Lieu** : DOUALA — **Dates** : 4, 5, 6 août 2026
**Cible** : PWA hors-ligne, Android + iOS — **Version spec** : 1.0 du 15/07/2026

**Document de référence** : `FORMALISATION_MATHEMATIQUE_v2.md` (figé). En cas de contradiction, **la présente spec gouverne le code** ; la formalisation gouverne le *pourquoi*. Les errata de la formalisation sont **déjà intégrés ici**.

## PATCH v1.1 — 15/07/2026

Modifications décidées avant la première ligne de code. Remplacent les sections
correspondantes en cas de conflit.

### P1 — Arborescence (§2)
- Ajout de `js/db/backup.js` (serialiser, deserialiser, exporterFichier, importerFichier).
- Le lanceur de tests s'ouvre via `python3 -m http.server 8000` puis
  `http://localhost:8000/test/index.html` — ni `file://` ni npm.

### P2 — Constantes (§3)
- `config.js` exporte `DEFAULTS` gelé par `Object.freeze()`.
- Les réglages runtime vivent dans le store `meta`, clé `'reglages'`.
- `getConfig()` → `{ ...DEFAULTS, ...(meta.reglages ?? {}) }`.
- Tous les modules appellent `getConfig()`, jamais `DEFAULTS` directement.
- Modifiables : `DATES`, `H_DEBUT_MATIN`, `H_BASCULE`, `H_FIN_MIDI`, `DEBOUNCE_MS`,
  `BADGES_PAR_PAGE`, `MULTI_APPAREILS`. Les autres invalideraient les badges.
- Ajout de `MULTI_APPAREILS: false` (défaut).

### P3 — DEVICE_ID (§4.3)
Généré au premier lancement, stocké dans `meta` clé `'device'`, jamais
régénéré. `crypto.randomUUID()` si présent, sinon fallback
`crypto.getRandomValues`.

### P4 — Ordre des gardes de `valider` (§A4)
Nouvel ordre : format → inconnu → checksum. `checksum` n'est plus appelée hors
des 16 ids :
```
valider(w):
    si ¬REGEX.test(w)        retourner 'format'
    (id, k) ← extraire
    si id ∉ IDS_CONNUS       retourner 'inconnu'
    si CHECKSUMS.get(id) ≠ k retourner 'checksum'
    retourner 'ok'
```

### P5 — P-CANCEL (§6.4)
- Suppression du drapeau `meta.fusionEnAttente` (incalculable).
- `MULTI_APPAREILS=false` : cancel libre, sans confirmation, P-CANCEL sans objet.
- `MULTI_APPAREILS=true` : dialogue « Avez-vous fusionné les appareils depuis
  le dernier export ? [Oui, annuler] [Non] » avant cancel.
- Le treillis reste complet même en mono-appareil (protège la restauration de
  sauvegarde — téléphone perdu au J2).

### P6 — regM avec override (§8.5)
`regM(m, k, t, o) = reg(m, k, t, 'manuel', o)` où `o` = valeur du sélecteur
Auto/Matin/Midi. L'Invariant 4.6 ne contraint que `mode='scan' ∧ o='auto'` :
aucun conflit.

### P7 — backup.js (§4.5, nouveau fichier)
`js/db/backup.js` contient `serialiser`, `deserialiser`, `exporterFichier`,
`importerFichier`. Importe `lattice.js` (fusion) et `store.js`.

---

## 0. Instructions pour l'agent de codage

Lis cette section avant d'écrire une ligne.

1. **Pas de framework, pas de bundler, pas de `npm install`.** Vanilla JS en modules ES, servi statiquement. Toute dépendance est vendorée dans `vendor/`. Motif : l'app doit fonctionner hors-ligne depuis un cache de service worker ; chaque outil de build ajoute un mode de défaillance sans rien apporter à 16 participants.
2. **Aucun CDN au runtime.** Viole l'Invariant 9.2. Un `<script src="https://...">` casse l'app en salle, sans réseau.
3. **Aucun `localStorage`** pour les données de pointage : IndexedDB uniquement (transactions atomiques). `localStorage` est réservé aux préférences UI non critiques.
4. **Écris les tests d'abord** pour les modules marqués 🔴. Leur échec est silencieux en salle et irrécupérable après coup.
5. **Ne « simplifie » pas** le schéma de `PointageValue` (§4.2). Chaque champ porte une propriété prouvée. Retirer `generation` casse l'annulation ; retirer `device` casse le déterminisme de la fusion.
6. **Ordre de construction** : suis le §12. Chaque étape est testable isolément.
7. Si une spec te paraît contradictoire ou impossible, **arrête-toi et signale-le** plutôt que d'inventer un comportement.

---

## 1. Contraintes non négociables

| # | Contrainte | Conséquence |
|---|---|---|
| C1 | Fonctionne **sans aucun réseau** en salle | Précache exhaustif, aucun appel externe |
| C2 | Android **et** iOS, sans app store | PWA installée depuis un hébergement HTTPS |
| C3 | La caméra exige `https:` ou `localhost` | ⚠️ **Un `.html` ouvert en `file://` ne marchera JAMAIS.** Déployer une fois sur Netlify/GitHub Pages, ouvrir sur le téléphone avec réseau, « Ajouter à l'écran d'accueil ». Ensuite : hors-ligne total. |
| C4 | Aucune donnée ne quitte le téléphone | Pas de backend. Tout en IndexedDB. |
| C5 | Le PDF doit reproduire le document source | En-tête GREEN INNOVATIVE'S + ACCA, logos embarqués en base64 |
| C6 | Multi-appareils possible | Fusion CRDT par fichier JSON (§6.4) |

---

## 2. Arborescence

```
/
├── index.html               # coque unique, 4 écrans
├── manifest.webmanifest     # F3
├── sw.js                    # F1, F2 — service worker
├── css/
│   └── app.css
├── js/
│   ├── main.js              # routeur d'écrans, câblage
│   ├── config.js            # §3 — toutes les constantes
│   ├── data.js              # §4.1 — les 16 participants
│   ├── model/
│   │   ├── norm.js          # A1
│   │   ├── ident.js         # A2, A3, A4 (payload)
│   │   ├── slots.js         # C5, C5b — temps et créneaux
│   │   ├── lattice.js       # 🔴 B — rang, jointure, CRDT
│   │   └── report.js        # E1, E2, E3
│   ├── db/
│   │   ├── store.js         # 🔴 B1–B4 — IndexedDB
│   │   └── backup.js         # serialiser, deserialiser, export/import
│   ├── scan/
│   │   ├── camera.js        # C1
│   │   ├── decode.js        # C2
│   │   ├── debounce.js      # C4
│   │   └── pipeline.js      # 🔴 §7 — Scan() de bout en bout
│   ├── ui/
│   │   ├── screen-scan.js
│   │   ├── screen-list.js   # D1–D4
│   │   ├── screen-report.js # E4
│   │   └── screen-setup.js
│   ├── feedback.js          # C7 — audio + vibration
│   └── badges.js            # A5 — planche de QR
├── vendor/
│   ├── jsqr.js              # fallback de décodage
│   └── qrcode.js            # génération (badges)
├── assets/
│   └── logos.js             # base64 des 3 logos du .docx
└── test/
    ├── index.html           # lanceur, http://localhost:8000/test/index.html
    └── *.test.js
```

**Pourquoi un lanceur de tests HTML** : pas de Node, pas de Jest, pas d'install. On lance `python3 -m http.server 8000`, on ouvre `http://localhost:8000/test/index.html`, on voit vert ou rouge. Les modules `model/` sont des fonctions pures : ils se testent sans DOM ni caméra. `localhost` est un contexte sécurisé : `getUserMedia` marche aussi en dev.

---

## 3. Constantes — `js/config.js`

`config.js` exporte `DEFAULTS` (gelé par `Object.freeze`) et une fonction `getConfig()` qui fusionne les réglages runtime stockés dans le store `meta` (clé `'reglages'`). Tous les modules appellent `getConfig()`, jamais `DEFAULTS` directement.

```js
export const DEFAULTS = Object.freeze({
  // Identité — §11 formalisation
  PREFIXE_ID:   'BIM26-',
  SEL:          'GI-BIM-DLA-2026',   // ⚠️ NON SECRET (Erratum, §3.3 form.)
  SEPARATEUR:   '-',                  // PAS '|' : hors jeu alphanumérique QR
  QR_EC:        'Q',

  // Session
  THEME:   'Initiation au processus BIM dans la gestion des projets Immobiliers',
  LIEU:    'DOUALA',
  NUMERO_THEME: 3,
  DATES:   ['2026-08-04', '2026-08-05', '2026-08-06'],
  TZ_OFFSET_MIN: 60,                  // Africa/Douala = UTC+1, sans DST

  // Créneaux (modifiables en salle)
  H_DEBUT_MATIN: '06:00',
  H_BASCULE:     '12:30',
  H_FIN_MIDI:    '19:00',

  // Scan
  FREQ_HZ:      10,
  DEBOUNCE_MS:  3000,
  ROI_RATIO:    0.5,

  // Badges
  BADGES_PAR_PAGE: 8,

  // Multi-appareils
  MULTI_APPAREILS: false,

  // Schéma
  SCHEMA_VERSION: 2,
});

export function getConfig() {
  // appel asynchrone — lire meta.reglages depuis IndexedDB, fusionner
}
```

**Modifiables depuis l'écran Réglages** : `DATES`, `H_DEBUT_MATIN`, `H_BASCULE`, `H_FIN_MIDI`, `DEBOUNCE_MS`, `BADGES_PAR_PAGE`, `MULTI_APPAREILS`. Les autres sont figées ; les changer invalide les badges déjà imprimés.

> **`SEL` n'est pas un secret.** Il est lisible dans le bundle JS par quiconque ouvre les outils de développement — c'est inhérent à une PWA, pas un défaut de paramétrage. Il sert à la **détection d'erreur** (QR étranger, badge d'un autre lot), pas à la sécurité. Le seul anti-fraude réel est l'opérateur qui voit le nom s'afficher (§8.4).

---

## 4. Données

### 4.1 Les 16 participants — `js/data.js`

**Verbatim du document source. Ne pas corriger l'orthographe, ne pas réordonner, ne pas séparer nom et prénom.** L'ordre `numero` est la clé de tri du rapport officiel.

```js
export const PARTICIPANTS = [
  { numero: 1,  nomComplet: "YEBGA Jacques Albert" },
  { numero: 2,  nomComplet: "ANYOUZO'A Marc Thyrille" },
  { numero: 3,  nomComplet: "NGOUDJO Fabrice Patrick" },
  { numero: 4,  nomComplet: "AKOLEO Lionel" },
  { numero: 5,  nomComplet: "ENAM NDONGO Benjamin Davy" },
  { numero: 6,  nomComplet: "BELLA Thierry Martial" },
  { numero: 7,  nomComplet: "LOMIE MPELLE Kenny Borel" },
  { numero: 8,  nomComplet: "BUINDA Theophilus YUKBANWI" },
  { numero: 9,  nomComplet: "MVA Cherel Christian" },
  { numero: 10, nomComplet: "NDJOMO Christian Stéphane" },
  { numero: 11, nomComplet: "KOMOL MONGO Joseph" },
  { numero: 12, nomComplet: "BAYOKOLAK Guy Robert" },
  { numero: 13, nomComplet: "NTOLO Daniel Olivier" },
  { numero: 14, nomComplet: "MBIDA EYENGA Rollin" },
  { numero: 15, nomComplet: "ELANG BEYEME Wilfried" },
  { numero: 16, nomComplet: "MBIAHEU Stéphanie Merveille" },
];
```

⚠️ `ANYOUZO'A` contient une **apostrophe typographique U+2019** (`’`), pas une apostrophe droite. Copier tel quel. `Stéphane`, `Stéphanie` portent des accents.

### 4.2 Types

```js
/**
 * @typedef {Object} Participant
 * @property {number} numero        1..16, clé de tri du rapport
 * @property {string} nomComplet    verbatim, casse préservée
 */

/**
 * Clé de pointage. Chaîne "id|date|creneau", ex. "BIM26-001|2026-08-04|matin".
 * @typedef {string} Cle
 */

/**
 * Valeur du treillis. TOUS les champs sont obligatoires.
 * @typedef {Object} PointageValue
 * @property {number} generation   0,1,2… — incrémenté à chaque cancel/re-reg. Domine le rang.
 * @property {'actif'|'annule'} statut
 * @property {number} tau          epoch ms du pointage
 * @property {'scan'|'manuel'} mode
 * @property {string} device       UUID de l'appareil, départage final
 * @property {'auto'|'matin'|'midi'} override   ← Erratum 2 : rend l'Invariant 4.6 vérifiable
 */
```

> **Ne retire aucun champ.** `generation` porte le Théorème 6.12 (re-pointage). `device` rend le rang injectif, donc la fusion déterministe. `override` rend l'Invariant 4.6 observable (Erratum 2 de la formalisation).

### 4.3 IndexedDB — `js/db/store.js`

Base `bim-pointage`, version 2.

| Store | keyPath | Index | Contenu |
|---|---|---|---|
| `participants` | `numero` | `nomNormalise` | les 16 |
| `pointages` | `cle` | — | `Cle → PointageValue` |
| `meta` | `k` | — | `device`, `schemaVersion`, `reglages` |

**La clé composite est ce qui rend l'anti-doublon gratuit** : l'unicité est garantie par la base, pas par du code applicatif.

**DEVICE_ID** : généré au premier lancement, stocké dans `meta` clé `'device'`, jamais régénéré. `crypto.randomUUID()` si présent, sinon `crypto.getRandomValues()`.

**Sauvegarde** : `js/db/backup.js` contient `serialiser`, `deserialiser`, `exporterFichier`, `importerFichier` (cf. PATCH v1.1 §P7).

---

## 5. Module A — Préparation

### A1 — `norm(x)` — `js/model/norm.js`

**But** : normaliser pour l'indexation et la recherche. **Jamais pour l'affichage.**

```
Contrat : string → string
norm = trim ∘ squeeze ∘ lowerInvariant ∘ stripDiacritiques ∘ NFKD
```

```js
export function norm(x) {
  return x.normalize('NFKD')                 // NFKD, pas NFD : décompose aussi les ligatures
          .replace(/\p{Mn}/gu, '')           // retire les diacritiques
          .toLowerCase()                     // JAMAIS toLocaleLowerCase()
          .replace(/\s+/g, ' ')
          .trim();
}
```

**Cas limites**
- `norm("NDJOMO Christian Stéphane")` → `"ndjomo christian stephane"`
- `norm("ANYOUZO’A Marc Thyrille")` → `"anyouzo’a marc thyrille"` — ⚠️ **l'apostrophe U+2019 survit** (ce n'est pas un `Mn`). La recherche `"anyouzo'a"` avec apostrophe droite **échouera**. Si c'est gênant, ajouter `.replace(/[’‘]/g, "'")` — mais alors `norm` n'est plus celle de la formalisation. **Décision : l'ajouter**, et le noter comme écart assumé.
- `toLocaleLowerCase()` est interdit : sur un téléphone en locale turque, `I` → `ı`, ce qui casse la recherche.

**Tests**
- Idempotence : `norm(norm(ν)) === norm(ν)` sur les 16 noms
- `norm("stephane") ⊑ norm("NDJOMO Christian Stéphane")` → vrai
- `norm("  A   B  ") === "a b"`

### A2 — `idDe(numero)` — `js/model/ident.js`

```
Contrat : number → string
idDe(n) = "BIM26-" + String(n).padStart(3, '0')
```

**Test** : injective — `new Set(PARTICIPANTS.map(p => idDe(p.numero))).size === 16`

### A3 — `checksum(id)` — 🔴

```
Contrat : Cle_id → string (2 caractères Base32)
Domaine : L(^BIM26-[0-9]{3}$)  ← PAS seulement les 16 ids réels (Erratum, §3.3)
```

```
checksum(id):
    h ← SHA-256(id + CONFIG.SEL)          // crypto.subtle.digest, async
    n ← 10 premiers bits de h
    retourner base32_2(n)                  // alphabet "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
```

**Cas limite critique** : `checksum` doit fonctionner sur `"BIM26-999"` (id de forme valide, inexistant). Si elle lève une exception hors des 16 ids, `valider()` casse sur un badge inconnu. **C'était l'erreur E2 de la v1.**

`crypto.subtle` est **asynchrone** : `checksum` retourne une Promise. Pré-calculer les 16 checksums au démarrage dans une Map pour que le chemin de scan reste synchrone.

**Tests** : `checksum("BIM26-999")` ne lève pas ; taux de détection ≥ 99,9 % (10⁴ payloads aléatoires de forme valide → < 20 acceptés).

### A4 — `payload(id)` et `valider(w)` — 🔴

```
payload(id) = id + "-" + checksum(id)        // ex. "BIM26-001-A7"
REGEX = /^BIM26-([0-9]{3})-([A-Z2-7]{2})$/
```

> **Le séparateur est `-`, pas `|`.** Le `|` n'appartient pas au jeu alphanumérique QR (ISO/IEC 18004 : `0-9 A-Z espace $ % * + - . / :`) et forcerait le mode octet, +45 % de charge. Avec `-`, les 12 caractères tiennent en **version 1-Q (21×21)** : tous les badges ont la même taille physique.

```
valider(w) → 'ok' | 'format' | 'inconnu' | 'checksum'

valider(w):
    si ¬REGEX.test(w)              retourner 'format'
    (id, k) ← extraire de w
    si id ∉ IDS_CONNUS             retourner 'inconnu'
    si CHECKSUMS.get(id) ≠ k       retourner 'checksum'
    retourner 'ok'

**Ordre des gardes (PATCH v1.1 §P4)** : format → inconnu → checksum. `checksum` n'est jamais appelée hors des 16 ids ; `valider` reste 100 % synchrone. Les chaînes `BIM26-999-*` (autre lot) comme `BIM26-999-ZZ` (garbage) donnent `'inconnu'` — l'action de l'opérateur est la même. Le domaine de `checksum` reste `L(^BIM26-[0-9]{3}$)` par sécurité défensive.

### A5 — Planche de badges — `js/badges.js`

```
pages = ceil(16 / 8) = 2
pos(n) = { page: floor((n-1)/8)+1, index: ((n-1) % 8)+1 }
```

Chaque badge : QR de `payload(id)`, + `nomComplet`, + `id` **en clair sous le QR** (secours si le scan échoue). Rendu HTML avec `@media print`, une page A4 par groupe de 8.

---

## 6. Module B — Persistance et fusion 🔴

**Le cœur du système. Tout se joue ici.**

### 6.1 Rang — `js/model/lattice.js`

```js
export function rang(v) {
  if (v == null) return null;                     // ⊥, minimum absolu
  return [
    v.generation,                                 // domine tout
    v.statut === 'annule' ? 1 : 0,                // à génération égale, annulé gagne
    -v.tau,                                       // à génération+statut égaux, τ MINIMAL gagne
    v.mode === 'manuel' ? 1 : 0,                  // départage
    v.device,                                     // départage final → rang injectif
  ];
}
```

> Les composantes 4 et 5 n'ont **aucune sémantique métier**. Leur seule fonction est de rendre `rang` injectif, donc la comparaison antisymétrique, donc `join` **fonctionnelle**. Sans elles, deux appareils peuvent obtenir des résultats de fusion différents — la v1 avait ce bug.

```js
function cmpRang(a, b) {   // -1, 0, 1 — comparaison lexicographique
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

export function join(v1, v2) {
  return cmpRang(rang(v1), rang(v2)) >= 0 ? v1 : v2;
}
```

### 6.2 Fusion d'états

```js
export function fusion(m1, m2) {          // Map<Cle, PointageValue> × idem → idem
  const out = new Map(m1);
  for (const [k, v] of m2) out.set(k, join(out.get(k) ?? null, v));
  return out;
}
```

**Tests 🔴**
- Idempotence : `fusion(m, m)` égale `m`
- Commutativité : `fusion(m1, m2)` égale `fusion(m2, m1)`
- Associativité : sur 3 états aléatoires, les deux parenthésages coïncident
- Convergence : 3 états, **toutes** les séquences de fusion → même résultat
- **Non-résurrection** : `cancel` sur A, fusion avec B non informé → reste `annule`
- **Re-pointage** : reg→cancel→reg sur A, fusion avec B → `actif`

### 6.3 `reg` — enregistrement idempotent 🔴

```
reg(m, cle, tau, mode, override) → { m', resultat }

reg(m, cle, tau, mode, override):
    v ← m.get(cle)
    si v ≠ ⊥ ET v.statut = 'actif':
        retourner { m, DEJA_POINTE(v.tau) }
    g ← (v = ⊥) ? 0 : v.generation + 1
    v' ← { generation: g, statut: 'actif', tau, mode, device: DEVICE_ID, override }
    retourner { m.set(cle, v'), OK(participant(cle)) }
```

**Théorème 6.7 — idempotence.** Un second appel retourne l'état inchangé et `DEJA_POINTE`. **C'est cela qui garantit l'absence de doublon, pas l'anti-rebond.** Tester les deux séparément.

**Propriété 6.9 — croissance.** `m ⪯ reg(m,…)` : branche 1 égalité ; branche 2, génération strictement supérieure ou passage depuis ⊥. C'est ce qui rend `reg` compatible avec la fusion.

### 6.4 `cancel` — annulation 🔴

```
cancel(m, cle):
    v ← m.get(cle)
    si v = ⊥ OU v.statut ≠ 'actif': retourner ERREUR
    retourner m.set(cle, { ...v, generation: v.generation + 1, statut: 'annule' })
```

> ⚠️ **Précondition P-CANCEL (Erratum 1 de la formalisation, PATCH v1.1 §P5).** Sur bases divergentes, une annulation peut être **silencieusement perdue** : si l'appareil A est à `g=2` et B (non fusionné) annule à `g=1`, la fusion retient `g=2` et l'annulation de B disparaît. Le drapeau `fusionEnAttente` étant incalculable (PATCH v1.1 §P5), la parade est :
> - `MULTI_APPAREILS = false` (défaut) : cancel libre, sans confirmation.
> - `MULTI_APPAREILS = true` : avant cancel, dialogue « Avez-vous fusionné les appareils depuis le dernier export ? [Oui, annuler] [Non] ». Puis rappel de revérifier après fusion.

### 6.5 Import / export

```
serialiser(participants, m) → JSON { version: 2, participants, pointages: [[cle, v], …], exportLe }
deserialiser(json) → { … } | ⊥   // rejette version ≠ 2
```

**Propriété 12.1 — rejet strict.** Un export v1 (sans tombstones) fusionné avec un v2 **ressusciterait** les annulations. `deserialiser` doit **rejeter**, jamais « interpréter au mieux ». Test : `deserialiser(exportV1)` → `⊥`.

**Import de la liste** : n'écrit **que** sur `participants`, jamais sur `pointages`. Un ré-import après le jour 1 préserve tous les pointages (Propriété 4.7).

---

## 7. Module C — Scan

### C1 — Caméra — `js/scan/camera.js`

```js
getUserMedia({ video: { facingMode: 'environment' } })
```
Boucle : `requestAnimationFrame` + throttle à **10 Hz** (`CONFIG.FREQ_HZ`). Extraire la ROI : carré central de côté `min(w,h) * 0.5` → 4× moins de pixels.

> 10 Hz et non 60 : le décodage est en `O(|image|)` par trame. À 60 Hz, coût ×6 pour un gain de latence perçue nul (seuil humain ≈ 100 ms). La contrainte est **thermique et énergétique**, pas algorithmique. Le téléphone doit tenir 3 jours.

**Geler la boucle** pendant l'affichage du résultat (300 ms).

### C2 — Décodage — `js/scan/decode.js`

`BarcodeDetector` si disponible (Chrome/Android), sinon **jsQR vendoré**. Interface unique : `decode(imageData) → string | null`.

> Le décodeur QR ne produit **pas** de faux mots : sous 25 % de corruption il retourne le mot exact, au-delà il retourne `null`. Le checksum n'a donc pas à couvrir la corruption optique — seulement les QR étrangers bien lus.

### C4 — Anti-rebond — `js/scan/debounce.js`

```
retenir(w, t, H):
    dernier ← H.get(w)
    si dernier ≠ ⊥ ET t - dernier < 3000: retourner faux
    H.set(w, t); retourner vrai
```

**Test** : 20 détections du même code en 2 s → **1 seul** appel à `reg`.

### C5 / C5b — Créneaux — `js/model/slots.js`

```
slotDe(t):                                   // t = epoch ms
    (d, h) ← localDouala(t)                  // UTC+1 fixe, sans DST
    si d ∉ DATES: retourner ⊥
    si H_DEBUT_MATIN ≤ h < H_BASCULE: retourner (d, 'matin')
    si H_BASCULE   ≤ h < H_FIN_MIDI:  retourner (d, 'midi')
    retourner ⊥

slotAvecOverride(t, o):
    si o = 'auto':                retourner slotDe(t)
    si o ∈ {matin,midi} ET date(t) ∈ DATES: retourner (date(t), o)
    retourner ⊥
```

> **UTC+1 fixe, sans heure d'été.** `localDouala` est donc bijective : aucun instant local n'est ambigu ni inexistant, `slotDe` est une fonction sans clause de désambiguïsation. **N'utilise pas `toLocaleString` avec un fuseau** : implémente le décalage à la main (`t + 3600000`) pour un comportement identique quel que soit le réglage du téléphone.

**Propriété 6.4 — couverture.** L'override garantit qu'**aucun slot n'est inatteignable** à une date de formation. Sans lui, le slot « matin » devient inaccessible dès 12h30 : le retardataire de 12h35 serait compté « midi » et son matin resterait `A`, sans recours.

**Sélecteur `Auto | Matin | Midi` visible en permanence sur l'écran de scan.** Non optionnel.

### §7 — Pipeline `Scan()` 🔴 — `js/scan/pipeline.js`

```
Scan(image, t, override, m, H):
    w ← decode(roi(image))
    si w = null:                  retourner (m, RIEN)                      (1)
    si ¬retenir(w, t, H):         retourner (m, RIEN)                      (2)
    e ← valider(w)
    si e ≠ 'ok':                  retourner (m, ERREUR(e))                 (3)
    s ← slotAvecOverride(t, override)
    si s = ⊥:                     retourner (m, HORS_SESSION)              (4)
    retourner reg(m, cle(w.id, s), t, 'scan', override)                    (5)
```

**Ordre des gardes.** Deux sont **imposés par le typage** : (1)→(2) car `retenir` exige un `w` ; (4)→(5) car `reg` exige `s ≠ ⊥`. Les deux autres sont des **choix d'ergonomie motivés** (et non des nécessités, contrairement à ce qu'affirmait la formalisation §7.2) :
- (2)→(3) : sinon un badge maintenu 2 s émet **20 sons d'erreur**.
- (3)→(4) : un ticket de caisse scanné hors créneau doit dire « code non reconnu », pas « hors session ».

**Test** : les 5 branches couvertes, `Scan` totale, aucun cas non traité.

---

## 8. Module C7 — Retour perceptif — `js/feedback.js`

| Résultat | Son | Vibration | Couleur | Message |
|---|---|---|---|---|
| `OK(p)` | 880 Hz, 120 ms | 50 ms | vert | **nomComplet** |
| `DEJA_POINTE(τ)` | 660 Hz ×2, 80 ms | 30 ms ×2 | orange | « déjà pointé à 08h42 » |
| `format` / `checksum` / `inconnu` | 220 Hz, 300 ms | 200 ms | rouge | message dédié |
| `HORS_SESSION` | 440 Hz, 200 ms | — | gris | « hors créneau » |
| `RIEN` | — | — | — | — |

**Web Audio, oscillateur — aucun fichier `.mp3`.** Un fichier audio est un asset de plus à précacher et à faire échouer.

> ⚠️ **iOS** : l'`AudioContext` doit être créé **dans le gestionnaire d'un événement d'interaction utilisateur**. L'initialiser au clic sur « Démarrer le scan », **jamais** au chargement de la page. Sinon : silence total sur iPhone, sans erreur visible.

Les 4 fréquences sont séparées d'au moins une quinte (rapport ≥ 3/2) : discriminables sans regarder l'écran.

> **`OK` affiche le nom complet en gros.** C'est le **seul contrôle anti-fraude réel du système** : l'opérateur voit le nom et le visage. Aucune propriété mathématique ne s'y substitue.

---

## 9. Modules D et E

### D1–D4 — Écran Liste

- Recherche incrémentale sur `norm(nomComplet)`, sous-chaîne.
- **Monotonie** : la frappe ne fait que restreindre → filtrer le résultat précédent, ne pas rebalayer.
- Pointage manuel → `reg(m, k, t, 'manuel', o)` où `o` = valeur du sélecteur Auto/Matin/Midi. Même idempotence. Invariant 4.6 ne contraint que `mode='scan' ∧ o='auto'`.
- Annulation → `cancel`, **avec confirmation** et le garde-fou P-CANCEL (§6.4).
- Affiche l'état du jour : `P 08h42` / `A` / `—`.

### E1 — État de cellule — `js/model/report.js` 🔴

```
etatCellule(participant, slot, tNow) → { type: 'present', tau } | { type: 'absent' } | { type: 'vide' }

etatCellule(p, s, tNow):
    v ← m.get(cle(idDe(p.numero), s))
    si v ≠ ⊥ ET v.statut = 'actif':   retourner { present, v.tau }
    si tNow ≥ finDe(s):               retourner { absent }
    retourner { vide }
```

**Trois états, pas deux.** ⚠️ **Propriété 8.2 — la garde porte sur `finDe(s)` (FIN du créneau), pas sur le début.**
- Sans ça, un rapport imprimé le soir du J1 affiche **64 absences fictives** (J2 et J3).
- Avec `debutDe(s)`, un rapport imprimé à 10h déclarerait absents les participants du **matin encore en cours**.

Un pointage `annule` → la garde 1 échoue → `absent` ou `vide`. **Le tombstone est transparent au rapport** : il vit dans le treillis, jamais sur le papier.

**Test 🔴** : `tNow = 2026-08-04 18:00` → 64 cellules `vide`, **0 `absent`** sur J2/J3.

### E2 — Statistiques

```
slotsEchus(tNow) = { s ∈ S : tNow ≥ finDe(s) }
presents(s) = |{ p : etatCellule(p,s).type = 'present' }|
taux(s) = presents(s) / 16
Θ = (slotsEchus ≠ ∅) ? Σ presents(s) / (16 × |slotsEchus|) : INDÉFINI
```

> **`Θ` indéfini, pas 0**, avant le premier créneau échu. Diviser par `16 × 6` au lieu de `16 × |slotsEchus|` afficherait **33 %** au lieu de 100 % pour une assiduité parfaite au soir du J1.

### E3 — Tris

Le rapport PDF officiel utilise **exclusivement** `numero` croissant. Les autres tris (alphabétique, assiduité) sont réservés à l'écran de consultation.

---

## 10. Rapport PDF — E4

### Génération
Écran de rapport en HTML + `@media print` → l'utilisateur fait **Partager → Imprimer → Enregistrer en PDF** (natif iOS et Android). Aucune bibliothèque PDF : elle serait un asset lourd à précacher pour reproduire ce que l'OS fait déjà.

### En-tête — reproduire le document source
Logos en base64 dans `assets/logos.js`, extraits du `.docx` :
- **GREEN INNOVATIVE'S** (« Demain c'est maintenant ») — à gauche
- **ACCA SOFTWARE — International Partner** — au centre
- Puces : *Architecture, Design · BIM Management · Ingénierie Numérique · Digital Twin* — à droite
- Visuel 3D + QR décoratif — coin supérieur droit

Puis le titre **LISTE DE PRÉSENCE** (centré, souligné, bleu foncé).

> ❌ **Pas d'en-tête ministériel.** Le document est celui de GREEN INNOVATIVE'S. « DIRECTION DES AFFAIRES GÉNÉRALE » est une **ligne interne du tableau**, pas un en-tête d'organisme.

### Tableau — 11 colonnes, en-tête à 2 niveaux

```
┌─────────────────────── DIRECTION DES AFFAIRES GÉNÉRALE ───────────────────────┐
├────┬────────┬──────┬─────────────┬────────┬───────────┬───────────┬───────────┤
│ N° │ THÈMES │ LIEU │ PERSONNELS  │ EFFEC- │  Jour 1   │  Jour 2   │  Jour 3   │
│    │        │      │             │ TIFS   ├─────┬─────┼─────┬─────┼─────┬─────┤
│    │        │      │             │        │Matin│Midi │Matin│Midi │Matin│Midi │
├────┼────────┼──────┼─────────────┼────────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 3  │Initia- │DOUALA│1. YEBGA …   │  16    │  P  │  P  │  P  │  A  │     │     │
│    │tion au │      │             │        │08h42│13h05│08h11│     │     │     │
│    │…       │      ├─────────────┤        ├─────┼─────┼─────┼─────┼─────┼─────┤
│    │(rowspan│(row  │2. ANYOUZO’A…│(rowspan│  A  │  A  │  P  │  P  │     │     │
│    │  = 16) │span) │             │  = 16) │     │     │08h57│12h48│     │     │
└────┴────────┴──────┴─────────────┴────────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

- `N°`, `THÈMES`, `LIEU`, `EFFECTIFS` : **`rowspan="16"`** (fusion verticale, comme le document source)
- `Jour k` : **`colspan="2"`**
- Cellule `present` → `P` sur une ligne, `08h42` sur la suivante
- Cellule `absent` → `A`
- Cellule `vide` → rien

### ⚠️ Orientation — à mesurer avant de coder
A4 portrait, marges 15 mm → 180 mm utiles. Les 5 premières colonnes en consomment **~96 mm** (estimation), laissant **~14 mm** par case, alors que `P 08h42` sur une ligne en 8 pt fait **~16 mm**.

**Ces deux nombres sont des estimations à l'œil, pas des mesures** (défaut 8.10 de la formalisation). **Première tâche du module** : imprimer un tableau d'essai et mesurer. Puis trancher :
- si le bi-ligne passe → **rester en portrait** (conforme au document source) ;
- sinon → **paysage** (267 mm utiles, ~28 mm/case) et signaler l'écart au client.

**Pagination** : `thead` + `display: table-header-group` (en-tête répété), `break-inside: avoid` sur chaque ligne. Pour 16 lignes, tout tient sur une page — la contrainte est prospective.

**Pas de bloc de statistiques dans le PDF** (décision client). Les stats restent à l'écran.

---

## 11. Module F — PWA

### F1/F2 — `sw.js`
```js
const CACHE = 'bim-v1';   // ⚠️ incrémenter à CHAQUE déploiement
const ASSETS = [ /* liste EXHAUSTIVE : html, css, js, vendor, assets */ ];

install  → event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
activate → supprimer tous les caches ≠ CACHE
fetch    → cache-first STRICT, aucun repli réseau
```

> **`addAll`, jamais une boucle de `add`.** `addAll` est tout-ou-rien : un précache partiel est le pire des états — l'app semble installée puis échoue en salle, hors réseau, sans recours (Invariant 9.1).
>
> **Incrémenter `CACHE` à chaque déploiement.** En cache-first strict, c'est la **seule** condition de mise à jour. Sans ça vous resterez bloqué sur une vieille version en salle (Propriété 9.3).

### F3 — `manifest.webmanifest`
```json
{
  "name": "Pointage BIM — GREEN INNOVATIVE'S",
  "short_name": "Pointage BIM",
  "start_url": "./index.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#006633",
  "icons": [
    { "src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
iOS exige en plus : `<meta name="apple-mobile-web-app-capable" content="yes">` et `<link rel="apple-touch-icon" href="assets/icon-192.png">`.

### F4 — Permission caméra
`perm = 'denied'` → **le module D reste totalement fonctionnel** : `regM` ne dépend ni du décodage ni de l'image. Message explicite + bascule automatique sur l'écran Liste. **Le système dégrade, il ne tombe jamais.**

---

## 12. Ordre de construction

Chaque étape est testable seule. Ne pas passer à la suivante avant que ses tests passent.

| # | Étape | Livrable | Tests |
|---|---|---|---|
| 1 | `config.js`, `data.js`, `norm.js` | fonctions pures | idempotence, accents |
| 2 | `ident.js` (A2, A3, A4) | payload + valider | injectivité, checksum hors domaine, détection |
| 3 | 🔴 `lattice.js` | rang, join, fusion | **demi-treillis, convergence, non-résurrection, re-pointage** |
| 4 | 🔴 `store.js` | IndexedDB, reg, cancel | **idempotence, croissance, P-CANCEL** |
| 5 | `slots.js` | slotDe, override | couverture des 6 slots, UTC+1 |
| 6 | `camera.js`, `decode.js`, `debounce.js` | scan brut | 20 détections → 1 reg |
| 7 | 🔴 `pipeline.js` | `Scan()` | **5 branches, totalité** |
| 8 | `feedback.js` | audio + vibration | ⚠️ **tester sur un vrai iPhone** |
| 9 | Écran Scan | UI + sélecteur Auto/Matin/Midi | bout en bout |
| 10 | 🔴 `report.js` | etatCellule, stats | **0 absence future**, tombstone transparent |
| 11 | Écran Rapport + `@media print` | PDF | **mesurer les largeurs**, imprimer |
| 12 | `badges.js` | planche A4 | 16 QR en version 1-Q, imprimer et scanner |
| 13 | Écrans Liste + Réglages | D1–D4, import/export | recherche, fusion |
| 14 | 🔴 `sw.js`, `manifest` | PWA | **mode avion → app fonctionnelle** |
| 15 | Déploiement + install | Netlify/GH Pages | install sur les téléphones réels |

**Les 4 tests dont l'échec est silencieux en salle** — à écrire en premier :
1. **Non-résurrection** (étape 3)
2. **Re-pointage après annulation** (étape 3)
3. **Pas d'absence future** (étape 10)
4. **Précache complet** (étape 14)

---

## 13. Définition du « terminé »

- [ ] Mode avion, après installation → scan, pointage, rapport fonctionnels
- [ ] Les 16 badges imprimés se scannent sur Android **et** iPhone
- [ ] Le ding se déclenche sur iPhone (piège de l'`AudioContext`)
- [ ] Rescanner le même badge → « déjà pointé à HH:MM », aucun doublon
- [ ] QR étranger → son grave + « code non reconnu »
- [ ] Sélecteur `Matin | Midi | Auto` opérationnel
- [ ] Rapport au soir du J1 → J2/J3 **vides**, pas « A »
- [ ] Le PDF reproduit l'en-tête GREEN INNOVATIVE'S + le tableau à 11 colonnes
- [ ] Export → import sur un second téléphone → fusion sans perte
- [ ] Caméra refusée → pointage manuel toujours possible

---

## 14. Risques

| Risque | Impact | Parade |
|---|---|---|
| `file://` → caméra bloquée | **Bloquant** | Déployer en HTTPS, installer avant le 4 août |
| `AudioContext` non débloqué sur iOS | Pas de ding | Init au clic « Démarrer » |
| Cache non invalidé | Vieille version en salle | Incrémenter `CACHE` |
| Précache partiel | App morte hors réseau | `addAll` atomique |
| Annulation perdue (Erratum 1) | Pointage fantôme | P-CANCEL + revérifier après fusion |
| Colonnes trop étroites | PDF illisible | Mesurer **avant** de coder |
| Badge perdu / caméra HS | Participant non pointé | Écran Liste, pointage manuel |
| Horloge du téléphone dérivée | Mauvais créneau | Override + vérifier l'heure le 4 au matin |

> **20 jours avant la formation.** Le risque n'est plus dans la conception — il est dans le code non écrit et la caméra non testée sur les téléphones réels. Faites l'étape 15 (déploiement + installation) **tôt**, même avec une app incomplète : c'est celle qui peut échouer d'une manière que le code ne rattrape pas.
