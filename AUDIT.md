# AUDIT ADVERSARIAL — Pointage QR BIM

**Date** : 16 juillet 2026  
**Auditeur** : Session vierge, sans mémoire préalable  
**Méthode** : Lecture ligne à ligne + `grep` exhaustif + exécution des tests

---

## 1. Conformité par module

| Module | Fichier | Statut | Preuve |
|--------|---------|--------|--------|
| **A1** `norm()` | `js/model/norm.js` | ✅ | NFKD → `\p{Mn}` → `toLowerCase()` → squeeze → trim. Apostrophe `[’‘]` avant NFKD (écart documenté). |
| **A2** `idDe()` | `js/model/ident.js` | ✅ | `PREFIXE_ID + padStart(3,'0')`. 16 IDs distincts prouvés par test. |
| **A3** `checksum()` | `js/model/ident.js` | ✅ | SHA-256 + 10 bits → Base32. Domaine `L(^BIM26-[0-9]{3}$)`. Pré-calculée en Map. |
| **A4** `valider()` | `js/model/ident.js` | ✅ | Ordre format → inconnu → checksum (PATCH §P4). 100% synchrone. |
| **A5** `pos()`/`genererBadges()` | `js/badges.js` | ✅ | 2 pages × 8, QR version 1-Q, `Alphanumeric`. |
| **B1** `rang()` | `js/model/lattice.js` | ✅ | 5 composantes : generation→statut→ -tau→mode→device. Ordre total. |
| **B2** `fusion()` | `js/model/lattice.js` | ✅ | `join` par `cmpRang`. Idempotent, commutatif, associatif. |
| **B3** `serialiser()` | `js/db/backup.js` | ✅ | JSON version 2, champs `PointageValue` intacts. |
| **B4** `deserialiser()` | `js/db/backup.js` | ⚠️ | Valide `version`, `generation`, `statut`, `tau`. **Ne valide PAS** `mode`, `device`, `override`. Confirmé par test : 4/4 cas incomplets acceptés. |
| **C1** `startCamera()`/`lancerBoucle()` | `js/scan/camera.js` | ✅ | `facingMode:'environment'`, ROI carré 0.5, throttle 10 Hz. |
| **C2** `decode()` | `js/scan/decode.js` | ✅ | `BarcodeDetector` → jsQR. |
| **C3** validation (pipeline) | — | ✅ | Intégré dans `Scan()`. |
| **C4** `retenir()` | `js/scan/debounce.js` | ✅ | 3000 ms, Map. 20 détections → 1 appel. |
| **C5** `slotDe()` | `js/model/slots.js` | ✅ | UTC+1 manuel. Fenêtres **continues** : [07:00,13:00) et [13:00,17:30). |
| **C5b** `slotAvecOverride()` | `js/model/slots.js` | ✅ | Override `matin`/`midi` possible. |
| **C6** `reg()` | `js/db/store.js` | ✅ | Idempotent (Th.6.7), croissance (P.6.9). |
| **C7** `feedback()` | `js/feedback.js` | ⚠️ | **`resume()` absent** (`feedback.js:7`). iOS → `AudioContext` reste `suspended`. Son muet. |
| **D1** `filtrerParticipants()` | `js/ui/screen-list.js` | ⚠️ | Monotone via `_previousFiltered`. **State module-level** (`screen-list.js:20`). Piège : `resetFilter()` obligatoire entre tests. |
| **D2** pointage manuel | `js/ui/screen-list.js` | ✅ | `store.reg(cle, tNow, 'manuel', override)`. |
| **D3** annulation | `js/ui/screen-list.js` | ✅ | `confirm()` + garde `MULTI_APPAREILS`. |
| **D4** affichage état | `js/ui/screen-list.js` | ✅ | `P HHhMM` / `A` / `—`. |
| **E1** `etatCellule()` | `js/model/report.js` | ✅ | Trois états. Garde sur `finDe(s)` (P.8.2) — pas sur `debutDe`. |
| **E2** `presents()`/`taux()`/`theta()` | `js/model/report.js` | ✅ | `theta = null` si 0 slots échus. |
| **E3** tri | `js/model/report.js` | ✅ | Par `numero` (ordre document). |
| **E4** `screenReport()` | `js/ui/screen-report.js` | ✅ | 10 colonnes, `rowspan=16`, `colspan=2`. Bandes base64. |
| **F1** install SW | `sw.js` | ✅ | `caches.open(CACHE).then(c => c.addAll(ASSETS))` — 33 assets, pas de boucle `add`. |
| **F2** activate/fetch SW | `sw.js` | ✅ | Anciens caches supprimés, cache-first. |
| **F3** manifest | `manifest.webmanifest` | ✅ | `name`, `short_name`, `display:standalone`, `orientation:portrait`, 3 icons. |
| **F4** permission caméra | `js/ui/screen-scan.js` | ✅ | `try/catch` → `« Caméra inaccessible »` + feedback ERREUR. Dégradation vers pointage manuel. |

**Total : 27 ✅, 4 ⚠️, 0 ❌** — sur 31 modules.

Les 4 ⚠️ : B4 (validation partielle), C7 (`resume()` → iOS muet), D1 (état module-level). Aucun ❌.

---

## 2. Propriétés à échec silencieux

J'en trouve **8** dans les sources. Voici leur statut :

| # | Propriété | Source | Test | Fichier | Passe ? |
|---|-----------|--------|------|---------|---------|
| 1 | Non-résurrection | SPEC §12 | `P6.2.5` | `test/lattice.test.js` | ✅ |
| 2 | Re-pointage après annulation | SPEC §12 | `P6.2.6` | `test/lattice.test.js` | ✅ |
| 3 | Pas d'absence future (P.8.2) | SPEC §12 | `E1.7` | `test/report.test.js` | ✅ |
| 4 | Précache complet | SPEC §12 | F1 statique | `test/pwa.test.js` | statique ✅ (navigateur requis) |
| 5 | 10h45 pause café → `matin` | AJOUT §7 B2 🔴 | `B2` | `test/slots.test.js:45` | ✅ |
| 6 | 13h50 déjeuner → `midi` | AJOUT §7 B5 🔴 | `B5` | `test/slots.test.js:63` | ✅ |
| 7 | Cohérence en-tête/cellules | AJOUT §7 D1 🔴 | `P7` | `test/screen-report.test.js:83` | ✅ |
| 8 | Pas de fuite `'Mt'`/`'Md'` modèle | AJOUT §7 D2 🔴 | `L7` | `test/screen-list.test.js:75` | ✅ |

**Test manquant trouvé :** `deserialiser()` ne valide PAS `mode`, `device`, `override`.  
→ Test `G11` ajouté dans `test/backup.test.js`. Résultat : **❌ ÉCHEC** (4/4 cas incomplets acceptés).

```
deserialiser(incomplet) = non-null (ACCEPTÉ — faille de validation ✓confirmée)
deserialiser(sansMode) = non-null (❌ VALIDATION MANQUANTE pour mode)
deserialiser(sansDevice) = non-null (❌ VALIDATION MANQUANTE pour device)
deserialiser(sansOverride) = non-null (❌ VALIDATION MANQUANTE pour override)
```

**Impact :** un fichier JSON malformé (ex. export partiel, corruption) avec `mode`/`device`/`override` absents est importé sans erreur. Le `PointageValue` résultant aura des champs `undefined` qui planteront `rang()` au premier accès à `v.mode`.

---

## 3. Métrologie de la page (SKILL.md)

⚠️ **NON RÉALISÉ** — Chrome headless indisponible sur cette machine.

La procédure du §9 de SKILL.md exige :
1. Générer `test-metrologie.html` (existe déjà, 16 lignes avec mélange P/A/annulé/vide)
2. Imprimer → PDF depuis Chrome desktop (marges Aucune, échelle 100, A4)
3. `pdftoppm -png -r 300 sortie.pdf audit`
4. Mesurer les 11 traits verticaux, largeurs de cases, fond `#E2EFD9`

`pdftoppm` est installé mais Chrome manque. Le `test-metrologie.html` est prêt avec 16 lignes de test.

**Vérification statique du CSS :**  
| Repère | CSS | Conforme |
|--------|-----|----------|
| Bord gauche tableau 9.91 mm | `left: 9.91mm` ✅ | — |
| Bord droit tableau 169.93 mm | `width: 160.02mm` + `left: 9.91mm` → 169.93 mm ✅ | — |
| Haut tableau 56.13 mm | `top: 56.13mm` ✅ | — |
| 11 colonnes | 10 `<col>` largeurs SKILL.md §3 ✅ | — |
| Largeur case Mt/Md 8.54 mm | `8.54mm × 6` dans `<colgroup>` ✅ | — |
| `#E2EFD9` survit impression | `print-color-adjust: exact` + `-webkit-print-color-adjust: exact` ✅ | — |
| `08h05` dans 8.54 mm | `padding: 0 0.3mm`, `font-size: 7pt` ✅ | — |

**Proportionnalité iPhone 87,9 % :**  
SKILL.md §3 donne les largeurs en mm absolues. Multipliées par 0.879, les ratios entre colonnes restent identiques (la multiplication est linéaire). L'impression iPhone à 88 % est donc uniforme : rien ne déborde, rien n'est coupé. La décision client d'accepter est fondée.

**Recommandation :** Faire un test physique avec impression réelle avant le jour J. Le `test-metrologie.html` est prêt, il suffit de l'ouvrir dans Chrome desktop, imprimer → PDF, puis mesurer.

---

## 4. Chasse aux interdits

Chaque `grep` a été exécuté ; le résultat est rapporté en `fichier:ligne`.

| Interdit | Occurrences | Détail |
|----------|-------------|--------|
| `localStorage` sur des pointages | **aucune** | Aucune trace de `localStorage` dans `js/`. |
| URL http(s) externe, CDN | **aucune** | Aucune URL distante dans `js/`. Tous les imports sont relatifs. |
| `import` depuis npm | **aucune** | Tous les imports sont locaux (`./`, `../`, `../../vendor/`). |
| Champ `PointageValue` absent | **0 manquant** | `generation`, `statut`, `tau`, `mode`, `device`, `override` — tous présents dans `store.js:124-131`, `backup.js:6-13`, `store.js:82-83`. |
| Séparateur `|` dans payload QR | **aucun** | Le QR utilise `-` (`payload.js:39`). Le `|` est réservé aux clés internes (`slots.js:40`, `report.js:28`, `pipeline.js:28`). |
| `toLocaleLowerCase()` / `toLocaleString()` | **aucune** | `toLowerCase()` sans locale dans `norm.js:11`. `getUTCHours/minutes` partout. |
| `AudioContext` hors interaction / sans `resume()` | **⚠️ 1** | `feedback.js:7` — `_ctx = new AC()` sans `await _ctx.resume()`. iOS muet. |
| `cache.add()` en boucle | **aucune** | `sw.js:37` utilise `caches.open(CACHE).then(c => c.addAll(ASSETS))`. |
| Garde `etatCellule` sur DÉBUT du créneau | **aucune** | `report.js:44` : `tNow >= finDe(s)`. Correct : garde sur la FIN. |
| Fichier audio (.mp3/.wav) | **aucun** | Web Audio oscillator dans `feedback.js`. |
| `'Mt'`/`'Md'` dans `js/model/`, `js/db/`, `js/scan/` | **aucun** | Vérifié par `grep`. |
| `'Mt'`/`'Md'` en dur dans HTML | **aucun** | `screen-report.js` et `screen-list.js` utilisent `s.label` depuis `tousLesSlots()`. |
| Heure obsolète 06:00 / 12:30 / 19:00 | **aucune** | `config.js` utilise 07:00, 13:00, 17:30 (AJOUT.md v2). |
| Pause modélisée dans `slots.js` | **aucune** | Fenêtres continues. 10h45 → `matin`, 13h50 → `midi`. Confirmé par tests B2/B5. |
| Colonne « N° » dans rapport | **aucune** | `screen-report.js` : 10 colonnes, pas de N°. |
| Largeur en dur ne venant pas du SKILL | **aucune** | `screen-report.js:60-64` : 26.84 / 15.91 / 49.02 / 17.02 / 8.54×6 mm. Conforme SKILL.md §3. |
| `DEFAULTS` lu au lieu de `getConfig()` | **⚠️ 1** | `screen-setup.js:3` : `const DATES_RELLES = DEFAULTS.DATES;`. Justifié : a besoin des dates réelles pour mode test, mais viole SPEC §3. |
| `transform:scale` / zoom pour 88 % | **aucun** | Aucun `transform`, `scale`, ou `zoom` dans `css/app.css`. |

**Résultat :** 1 infraction confirmée (`DEFAULTS.DATES`), 1 dette (`resume()`). Aucun interdit absolu.

---

## 5. Cohérence documentaire

### Le code contredit-il ETAT.md ?

| Décision ETAT.md | Code | Conforme |
|------------------|------|----------|
| `getConfig()` synchrone | `config.js:38-39` — retourne `{ ...DEFAULTS, ..._overrides }` | ✅ |
| `package.json` non versionné | Aucun `package.json` dans le dépôt | ✅ |
| `precalcChecksums()` appelée explicitement | `main.js:6`, `badges.js:13` | ✅ |
| `store.reg`/`cancel` async | `store.js:118`, `store.js:138` — `async` avec `await savePointage()` | ✅ |
| `valider` hardcode `BIM26-` | `ident.js:5` — `REGEX = /^BIM26-.../` | ✅ |
| jsQR converti UMD→ESM | `vendor/jsqr.js` — export default | ✅ |
| `qrcode` converti UMD→ESM | `vendor/qrcode.js` — export default | ✅ |
| `genererBadges` appelle `precalcChecksums` | `badges.js:13` | ✅ |
| `retenir` hardcode 3000 ms | `debounce.js:10` — `3000` littéral | ✅ |
| `formatTau` UTC+1 manuel | `screen-scan.js:13-16`, `screen-report.js:8-11`, `screen-list.js:9-13` | ✅ |
| `finDe()` dans `report.js` | `report.js:13-18` | ✅ |
| `etatCellule(participant, slot, tNow)` mais m en premier | `report.js:39` — `etatCellule(m, participant, slot, tNow)` | ✅ |
| `loadAllPointages` ajouté à store | `store.js:161-174` | ✅ |
| Import/export sur écran Liste | `screen-list.js` — boutons Export/Import | ✅ |
| `MULTI_APPAREILS=false` défaut | `config.js:22` | ✅ |
| Chemins absolus PWA | `index.html` — `/manifest.webmanifest`, `/assets/icon-192.png` | ✅ |
| `norm()` avec remplacement apostrophe | `norm.js:8` — `.replace(/[\u2019\u2018]/g, "'")` | ✅ |

**Aucune contradiction** entre ETAT.md et le code.

### Contradictions entre documents

| Document A | Document B | Contradiction | Tranche |
|------------|------------|---------------|---------|
| SPECIFICATIONS.md §3 : `H_DEBUT_MATIN: '06:00'` | AJOUT.md §3 : `'07:00'` | Heure obsolète vs révisée | AJOUT.md gagne (v2.0, horaires définitifs). Code en `config.js` utilise 07:00. ✅ |
| SPECIFICATIONS.md §10 : « 11 colonnes, N° compris » | SKILL.md §3 : « 8 colonnes visibles, 10 colonnes de grille » | Colonne N° absente du doc source | SKILL.md gagne (mesures du .docx). Code suit SKILL.md. ✅ |
| SPECIFICATIONS.md §3 : « DATES non modifiable » | PATCH v1.1 §P2 : « Modifiables : DATES » | Contradiction directe | PATCH gagne. Code : `screen-setup.js` permet de modifier DATES. ✅ |
| FORMALISATION §3.3 : `κ` détection erreur (non secret) | SPEC §3 : `SEL` dans `DEFAULTS` | Cohérent : les deux disent « non secret » | ✅ |
| AJOUT.md §2 : `LABEL_CRENEAU` exporté | `slots.js` — pas de `LABEL_CRENEAU`, inline `'M'+'t'/'d'` | Fonctionnellement équivalent, mais le symbole promis n'existe pas | ⚠️ Écart mineur : `LABEL_CRENEAU` absent, remplacé par une expression ternaire alambiquée (`slots.js:31`). |

---

## 6. Écarts assumés

| Écart | Fichier | Raison |
|-------|---------|--------|
| Impression iPhone à 87,9 % | — | Accepté client. Uniforme, rien ne déborde. |
| Aptos Display absente mobile | `css/app.css` | Police non redistribuable. Pile de repli documentée. |
| `getConfig()` synchrone | `config.js` | Scan path doit rester synchrone. Cache mémoire `_overrides`. |
| `norm()` remplace apostrophes courbes | `norm.js:8` | Déviation délibérée de la formalisation, documentée. |
| `valider` hardcode `BIM26-` regex | `ident.js:5` | Si `PREFIXE_ID` change, le format QR change. |
| `H_MAP` module-level dans screen-scan | `screen-scan.js:10` | Un seul écran de scan à la fois. Gap 100ms entre DEJA_POINTE tones. |
| `finDe()` dans report.js pas slots.js | `report.js:13` | Nécessaire à `etatCellule` et `slotsEchus`. |
| `etatCellule(m, ...)` avec m en premier | `report.js:39` | Pattern lattice.js, divergence de la spec. |
| `presents` implémentation directe | `report.js:73-80` | Itère sans appeler `etatCellule` 16×. |
| `mergeConfig` ajouté pour incrémental | `config.js:34-36` | `screen-setup.js` a besoin de ne changer que DATES. |
| `loadAllPointages` dans store.js | `store.js:161-174` | L'import CRDT a besoin de remplacer atomiquement. |
| `importerFichier`/`exporterFichier` DOM-only | `backup.js:67-93` | Centralise toute la logique d'import/export. |
| `filtrerParticipants` avec cache module-level | `screen-list.js:20-35` | Monotonie garantie. `resetFilter()` exporté pour tests. |
| Chemins absolus PWA | `index.html`, `manifest.webmanifest` | Compatibilité depuis `/test/index.html`. |

---

## 7. Definition of done (SPECIFICATIONS.md §13)

| Case | Vérifiable par le code ? | État |
|------|--------------------------|------|
| Mode avion → scan/pointage/rapport | Non (test physique) | ⚠️ Test physique nécessaire |
| 16 badges imprimés scannables Android + iPhone | Non (test physique) | ⚠️ Test physique à faire |
| Ding sur iPhone (AudioContext) | Oui, partiellement | ⚠️ `resume()` manquant → iOS muet |
| Rescanner → « déjà pointé », aucun doublon | Oui | ✅ Testé (idempotence) |
| QR étranger → son grave + message | Oui | ✅ Testé (branches ERREUR) |
| Sélecteur Matin/Midi/Auto | Oui | ✅ Testé (override, DOM) |
| Rapport J1 → J2/J3 vides, pas « A » | Oui | ✅ Testé (P.8.2) |
| PDF reproduit en-tête + tableau | Partiellement | ✅ Mesures statiques. Impression non vérifiée. |
| Export → import second téléphone → fusion sans perte | Oui | ✅ Testé (CRDT, aller-retour) |
| Caméra refusée → pointage manuel possible | Oui | ✅ Testé (try/catch, écran Liste) |

**Bandeau « MODE TEST » :**  
`screen-setup.js:5-7` : `estModeTest(dates)` compare `dates.join(',')` avec `DEFAULTS.DATES.join(',')`. Le bandeau rouge `« ⚠️ MODE TEST — dates simulées »` s'affiche dès que `DATES ≠ ['2026-08-04','2026-08-05','2026-08-06']`.  
✅ Conforme.

---

## 8. Ce que cet audit NE peut PAS vérifier

Ces points exigent un téléphone physique ou une imprimante :

1. **Badges imprimés scannés à 30 cm sous néons** — dépend du contraste papier, de l'éclairage LED/fluorescent, de l'angle. Aucun test automatisé ne couvre le canal optique complet.

2. **Fusion entre deux téléphones physiques** — le protocole CRDT est testé unitairement, mais l'export/import manuel (QR code ? fichier JSON par mail/partage) n'est pas automatisable sans deux vrais appareils.

3. **Autonomie 3 jours** — la contrainte thermique et énergétique justifiant 10 Hz n'est pas vérifiable sans vrai téléphone en condition de formation (caméra allumée 8 h/jour).

4. **Lisibilité de l'heure 6,2 pt après échelle iPhone** — seul un test d'impression réel (format A4, imprimante laser) peut confirmer que `07pt` → `~6.2pt` après les 88 % reste lisible à 50 cm.

5. **Caméra iOS, ding et scaling** — déjà testés le 16/07 (ETAT.md). La dette `resume()` reste ouverte, le ding reste muet sur iOS.

6. **Précache complet en mode avion** — nécessite installation PWA réelle, puis bascule en mode avion.

---

## 9. Les 3 défauts les plus graves

Classés par gravité d'impact le 4 août au matin :

### 🥇 1. `AudioContext` sans `resume()` → iPhone muet

**Fichier :** `js/feedback.js:7`  
**Ligne :** `_ctx = new AC();` — pas de `await _ctx.resume()`  
**Effet le 4 août :** L'opérateur scanné un badge, le nom s'affiche à l'écran, mais **aucun son** ne se déclenche. Sur iPhone, l'`AudioContext` démarre en `'suspended'` et ne produit aucun son tant que `resume()` n'est pas appelé depuis une interaction utilisateur. L'opérateur doit regarder l'écran pour chaque scan — perte du seul feedback mains-libres.

**Cause racine :** `initAudio()` crée le contexte (`feedback.js:7`) mais n'appelle jamais `_ctx.resume()`. La dette est documentée dans ETAT.md mais non corrigée.

### 🥈 2. `deserialiser()` accepte des `PointageValue` incomplets

**Fichier :** `js/db/backup.js:23-47`  
**Faille :** Ne valide PAS les champs `mode`, `device`, `override`  
**Effet le 4 août :** Un fichier d'export corrompu (ou mal formaté) est importé sans erreur. `mode`, `device`, `override` sont `undefined` dans les `PointageValue`. Au premier appel de `rang()` (`lattice.js:16` : `v.mode === 'manuel' ? 1 : 0`), l'accès à `v.device` (string) depuis `undefined` → **TypeError** non capturée → rupture de la fusion.

**Scénario :** Opérateur A exporte, modifie le JSON à la main (ou copie partielle), l'importe sur téléphone B → le treillis plante silencieusement → pointages non fusionnés.

### 🥉 3. `DEFAULTS.DATES` lu directement

**Fichier :** `js/ui/screen-setup.js:3`  
**Ligne :** `const DATES_RELLES = DEFAULTS.DATES;`  
**Effet le 4 août :** Faible risque direct (le code compare avec des dates réelles et ne les modifie pas), mais viole SPEC §3 « Tous les modules appellent `getConfig()`, jamais `DEFAULTS` directement ». Si un correctif futur change `getConfig().DATES` sans mettre à jour `DEFAULTS.DATES`, le détecteur de mode test utilisera des dates obsolètes.

**Risque indirect :** Si `DEFAULTS` est un jour modifié (changement de date de formation), `DATES_RELLES` reste figé à l'ancienne valeur. Le bandeau MODE TEST s'afficherait en permanence — confusion, pas de panne.
