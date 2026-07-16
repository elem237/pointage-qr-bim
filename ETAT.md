# État du projet — Pointage QR BIM

## Étapes terminées

| # | Étape | Fichiers | Tests | Modèle | Date |
|---|---|---|---|---|---|
| 1 | `config.js`, `data.js`, `norm.js` + harnais | `js/config.js`, `js/data.js`, `js/model/norm.js`, `test/index.html`, `test/harness.js`, `test/norm.test.js`, `test/data.test.js`, `test/config.test.js` | 16/16 | — | 2026-07-15 |
| 2 | `ident.js` (A2, A3, A4) 🔴 — payload + valider | `js/model/ident.js`, `test/ident.test.js` | 33/33 | — | 2026-07-15 |
| 3 | 🔴 `lattice.js` — rang, join, fusion | `js/model/lattice.js`, `test/lattice.test.js` | 17/17 | — | 2026-07-15 |
| 4 | 🔴 `store.js` — IndexedDB, reg, cancel | `js/db/store.js`, `test/store.test.js` | 22/22 | — | 2026-07-15 |
| 5 | `slots.js` — slotDe, slotAvecOverride | `js/model/slots.js`, `test/slots.test.js` | 13/13 | — | 2026-07-15 |
| 6 | `camera.js`, `decode.js`, `debounce.js` (scan brut) | `vendor/jsqr.js`, `js/scan/camera.js`, `js/scan/decode.js`, `js/scan/debounce.js`, `test/scan.test.js` | 12/12 | — | 2026-07-15 |
| 7 | 🔴 `pipeline.js` — `Scan()` | `js/scan/pipeline.js`, `test/pipeline.test.js`, `test/index.html` | 9/9 | — | 2026-07-15 |
| 8 | `feedback.js` — Audio + vibration (C7) | `js/feedback.js`, `test/feedback.test.js` | 8/8 | — | 2026-07-15 |
| 9 | Écran Scan — UI + sélecteur Auto/Matin/Midi | `js/ui/screen-scan.js`, `test/screen-scan.test.js` | 16/16 (22 fonctions pures+imports) | — | 2026-07-15 |
| 10 | 🔴 `report.js` — etatCellule, stats | `js/model/report.js`, `test/report.test.js` | 18/18 | — | 2026-07-15 |
| 11 | Écran Rapport + `@media print` → PDF | `js/ui/screen-report.js`, `css/app.css`, `assets/logos.js`, `test/screen-report.test.js`, `test/report-render.test.js` | 28/28 (183/183 total) | — | 2026-07-15 |
| 12 | Écran Réglages — DATES modifiables, Mode test, EFFACER | `js/ui/screen-setup.js`, `js/config.js`, `css/app.css`, `test/screen-setup.test.js`, `test/config.test.js`, `test/index.html` | 56/56 core + 8 DOM-only | — | 2026-07-16 |
| 13 | `badges.js` — planche A4 de 16 QR version 1-Q | `vendor/qrcode.js`, `js/badges.js`, `css/app.css`, `test/badges.test.js`, `test/badges-print.html`, `test/index.html` | 12/12 ⚠️ test physique en attente | claude-opus-4-8 | 2026-07-16 |

---

## Décisions prises hors spec

### `getConfig()` reste synchrone
La spec PATCH v1.1 §P2 décrit `getConfig()` comme lisant `meta.reglages` depuis IndexedDB, ce qui serait async. Mais le chemin de scan (`pipeline.js`) doit rester synchrone (PATCH §P4). Décision : `config.js` maintient un cache mémoire `_overrides` alimenté par `hydrateConfig(o)`, appelée une fois au boot par `main.js`. `getConfig()` est synchrone.

Conséquence : si `hydrateConfig` n'est pas appelée (étape 1 à 3), `getConfig() === DEFAULTS`.

### `package.json` pour les tests Node
Le projet interdit `npm install` / `node_modules`, mais un `package.json` contenant uniquement `{"type":"module"}` est nécessaire pour lancer les tests en Node. Ce fichier N'EST PAS versionné — créé/supprimé à chaque session de test CLI. Alternative : navigateur via `python3 -m http.server 8000`.

### Lanceur de tests en `http://localhost`
Les modules ES en `file://` sont bloqués par CORS. Décision (PATCH §P1) : servir via `python3 -m http.server 8000`. `localhost` est aussi un contexte sécurisé → `getUserMedia` marche en dev.

### `precalcChecksums()` appelée explicitement (pas à l'import)
La spec §A3 dit « Pré-calculer les 16 checksums au démarrage ». Comme `hydrateConfig()`, `precalcChecksums()` est une fonction exportée appelée explicitement par les tests (et par `main.js`). Pas de side-effect à l'import.
Conséquence : chaque test qui utilise `valider` appelle `await precalcChecksums()` d'abord. `genererBadges()` l'appelle internalement.

### `store.reg` et `store.cancel` sont async (persistance IndexedDB)
La spec décrit `reg`/`cancel` comme des fonctions pures synchrones. Mais IndexedDB est async. Décision : méthodes async, `await` avant le retour. Durabilité prime sur pureté.

### Le Store encapsule la Map
La spec dit `retourner { m, DEJA_POINTE(v.tau) }`. Le Store possède la Map en interne et expose `getPointages()`. Les résultats de `reg`/`cancel` ne contiennent pas la Map — seulement le statut et les payloads.

### `valider` hardcode `'BIM26-'` dans la REGEX
`REGEX = /^BIM26-([0-9]{3})-([A-Z2-7]{2})$/` n'est pas paramétré par `PREFIXE_ID`. Si PREFIXE_ID change, le format QR change et la REGEX doit être réécrite de toute façon. Décision : suivre la spec à la lettre.

### jsQR converti de UMD → ES module (`vendor/jsqr.js`)
Le wrapper webpack UMD a été remplacé par `const _jsQR = (function() { … })(); export default _jsQR;`. Modification ligne 1 et ligne 10101.

### `vendor/qrcode.js` converti de UMD → ES module (étape 13)
Source : qrcode-generator v1.4.4 (kazuhikoarase), téléchargé depuis jsDelivr. Les 9 dernières lignes (wrapper UMD AMD/CJS) supprimées, remplacées par `export default qrcode;`. `qrcode(typeNumber, errorCorrectionLevel)` est une factory (sans `new`) — retourne `_this = {}`. Avec `typeNumber=1`, `make()` saute l'auto-détection et force la version 1 (21×21 modules).

### `badges.js` — payload encodé en mode Alphanumeric QR (étape 13)
`qr.addData(pl, 'Alphanumeric')` force le mode alphanumérique (jeu 45 chars : `0-9 A-Z $%*+-./:` + espace). Le payload `BIM26-001-XY` (12 chars) utilise uniquement majuscules, chiffres et tirets — tous dans le jeu. Capacité version 1-Q en alphanumérique : 16 chars → 12 ≤ 16 ✓. Sans ce mode, la bibliothèque aurait pu choisir le mode Byte et forcer la version 2.

### `renderBadges(container)` — SVG inline via innerHTML (étape 13)
Le rendu HTML est construit en string et injecté via `innerHTML`. Les SVG QR sont inline (pas de `<img src="blob:...">`). Compatible hors-ligne, aucun asset externe.

### `retenir` hardcode 3000 ms (pas `DEBOUNCE_MS`)
La spec §C4 donne `3000` littéral. Suivi à la lettre.

### Geler la boucle : `freeze()` externe via le contrôleur
`lancerBoucle` retourne un contrôleur avec `freeze(ms)`. `pipeline.js` décide quand geler.

### `Scan()` prend `_decode` injectable en 6e paramètre
Pour tester les 5 branches sans vrai QR. La signature publique (5 params) correspond à la spec.

### ROI extraite avant pipeline.js
`camera.js:lancerBoucle` extrait la ROI avant `onFrame(roi)`. Pipeline reçoit l'ImageData déjà rogné.

### `cle` construite inline dans Scan
Pas de fonction `cle()` définie dans les modules §2. Construite inline depuis le payload validé.

### `feedback.js` ne gère que Son + Vibration
Étape 8 intitulée « Audio + vibration ». Couleur et message texte gérés par `screen-scan.js` (étape 9).

### Gap de 100ms entre les deux tones DEJA_POINTE
Spec dit « 660 Hz ×2, 80 ms » sans préciser l'intervalle. Choix : 180ms pour le 2e tone. Vibration `[30, 100, 30]`.

### `initAudio()` protégée contre l'absence de `window` en Node
Garde `typeof window !== 'undefined' &&` avant `window.AudioContext`.

### Couleurs hex du feedback visuel
`#4caf50` (vert), `#ff9800` (orange), `#f44336` (rouge), `#9e9e9e` (gris). Material Design.

### Messages d'erreur ERREUR choisis librement
« Format non reconnu », « Checksum invalide », « Code inconnu ».

### H_MAP (debounce) module-level dans screen-scan.js
`const H_MAP = new Map()` privée au module. Un seul écran de scan à la fois.

### `formatTau` calcule HH:MM en UTC+1 manuel
Ajoute 3600000 ms à l'epoch, lit `getUTCHours/minutes`. Pas de `toLocaleString`. Dupliqué dans `screen-scan.js` (séparateur `:`) et `screen-report.js` (séparateur `h`).

### `finDe()` définie dans `report.js`, pas dans `slots.js`
Nécessaire à `etatCellule` et `slotsEchus`. Aurait modifié un module existant hors étape.

### Signature `etatCellule(m, participant, slot, tNow)`
Spec donne `(participant, slot, tNow)` mais le pseudo-code lit `m.get(...)`. `m` en premier paramètre, pattern lattice.js.

### `presents` implémentation directe
Itère directement sur `m.get(cle(numero, slot))` sans appeler `etatCellule` 16 fois avec `tNow=Infinity`.

### `mergeConfig` ajouté pour les mises à jour incrémentales (étape 12)
`hydrateConfig(o)` remplace `_overrides` en totalité. `screen-setup.js` a besoin de ne changer que `DATES` → `mergeConfig(partial)` fusionne dans `_overrides` existant.

### `screenSetup` synchrone, retourne `{ refresh }` (étape 12)
Pas d'opération async. `onClearAll` passé en option. Changements de dates appliqués immédiatement via `mergeConfig`.

### "EFFACER TOUTES LES DONNÉES" via callback (étape 12)
`store.clearAll()` n'existe pas encore. Le bouton appelle `onClearAll()` si fourni.

### Seulement DATES dans l'écran Réglages (étape 12)
Les 6 autres champs modifiables (`H_DEBUT_MATIN`, `H_BASCULE`, `H_FIN_MIDI`, `DEBOUNCE_MS`, `BADGES_PAR_PAGE`, `MULTI_APPAREILS`) sont laissés à une étape ultérieure.

### Logos extraits du .docx (étape 11)
5 logos (LOGO_GREEN, LOGO_ACCA, LOGO_ICON, LOGO_3D, LOGO_QR) intégrés dans `assets/logos.js`. Tableau rapport réécrit en 8 colonnes (THÈMES, LIEU, PERSONNELS, EFFECTIFS, Jour 1-3) avec `rowspan=16` sur les 4 premières colonnes.

### Portrait choisi sans mesure réelle (étape 11)
Tableau d'essai créé (`test/tableau-essai.html`) mais pas imprimé. Décision : portrait. Si l'impression montre un problème → `@page landscape`.

---

## Écarts assumés par rapport à la spec

### `norm()` — remplacement des apostrophes courbes (§5 A1)
La formalisation n'inclut pas ce remplacement. Décision : `.replace(/['']/g, "'")` avant NFKD, pour que la recherche `anyouzo'a` (apostrophe droite) trouve `ANYOUZO'A` (U+2019). Documenté pour qu'une session future ne le « corrige » pas.

---

## Mesures physiques

| Mesure | Résultat | Décision |
|---|---|---|
| iPhone/Safari · impression rapport | barre = 88 mm au lieu de 100 mm. Safari ignore `@page margin:0` → échelle 87.9 %. | ✅ ACCEPTÉ (échelle uniforme, rien ne déborde). Ne pas rouvrir. |
| iPhone · caméra HTTPS + PWA standalone | — | ✅ FONCTIONNE |
| iPhone · ding AudioContext | Audible mais state = 'suspended' | DETTE : `await ctx.resume()` dans `initAudio()` |
| Badges QR · impression + scan physique | — | ⚠️ EN ATTENTE |
| Rapport PDF · impression réelle (largeurs) | — | ⚠️ EN ATTENTE avant le jour J |

---

## Dettes / TODO laissés derrière

- `hydrateConfig()` sera appelée par `main.js` — pour l'instant `_overrides` reste vide.
- `precalcChecksums()` sera appelée par `main.js` — pour l'instant les tests l'appellent manuellement (sauf `genererBadges()` qui l'appelle internalement).
- `js/model/lattice.js` : `@typedef {import('../data.js').PointageValue}` mais `PointageValue` n'est défini nulle part en JSDoc. Sans conséquence runtime.
- `store.js` importe `getConfig()` mais ne l'utilise pas encore.
- `deletePointage()` dans `store.js` est exporté inutilisé — réservé pour l'étape écran Liste.
- `camera.js` : `captureROI` et `lancerBoucle` non testables en Node (manque DOM/getUserMedia).
- `decode.js` non testable en Node (`ImageData`, `BarcodeDetector` inexistants).
- `pipeline.js` branche 1 (decode réel) ne tourne qu'au navigateur.
- `screen-scan.js` : 4 tests DOM ne tournent qu'au navigateur.
- `report.js` : `cle()` privée dupliquée de `pipeline.js`. Si une refactor exporte `cle()`, mettre à jour les deux.
- `assets/logos.js` : `LOGO_ICON` non utilisé dans le rapport — réservé.
- `css/app.css` : styles scan, liste, badges (impression) à affiner. Pas de styles pour screen-list.
- `screen-setup.js` : 6 champs modifiables manquants.
- `store.clearAll()` n'existe pas.
- Tests DOM de `screen-setup.test.js` (8 tests P1-P8) uniquement navigateur.
- `feedback.js` : dette AudioContext — `await ctx.resume()` + un seul contexte réutilisé (piège iOS).
- `badges.js` : `test/badges-print.html` est une page de prévisualisation hors spec, à supprimer ou intégrer dans `main.js` quand le routeur existera.

---

## Pièges rencontrés

1. **Apostrophe U+2019 dans le copier-coller.** `data.js` doit contenir U+2019, pas U+0027. Utiliser `’`.
2. **`file://` et modules ES.** CORS bloqué. Toujours utiliser le serveur HTTP Python.
3. **Node.js et imports ESM `.js`.** Requiert `package.json` avec `"type":"module"`. Créer/supprimer à chaque session CLI.
4. **`Object.freeze` est superficiel.** `DEFAULTS.DATES` est un tableau gelé en référence, ses éléments ne le sont pas.
5. **`crypto.subtle.digest` est async.** `checksum` et `payload` retournent des Promises. `valider` reste synchrone via `CHECKSUMS` pré-calculée.
6. **Base32 alphabet.** `"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"` (RFC 4648). Ne pas utiliser un alphabet URL-safe.
7. **Taux de détection probabiliste.** Test « faux positifs < 20 sur 10⁴ » peut échouer une fois sur 10¹⁶ runs. Si ça arrive, relancer.
8. **IndexedDB : fermeture avant fin de transaction.** `await` systématique avant `store.close()`.
9. **Noms de base uniques par test.** Chaque test génère un nom unique `bim-test-{timestamp}-{random}`.
10. **`replaceAll` sur `await` crée des doubles `await`.** Vérifier après remplacement global.
11. **Conversion UMD → ES module pour jsQR.** 10102 lignes. Modifier ligne 1 (supprimer wrapper) et dernière ligne (ajouter export).
12. **Tests décodage/caméra impossible en Node.** `ImageData`, `getUserMedia`, `BarcodeDetector` sont des API navigateur.
13. **`window` non défini en Node → ReferenceError.** Garde `typeof window !== 'undefined' &&`.
14. **`globalThis.navigator` en Node est un getter read-only.** Utiliser `Object.defineProperty`.
15. **Nœuds texte entre `<tr>` cassent `:last-child`.** Utiliser `thead > tr` ou `:last-of-type`.
16. **`rowspan=16` est dans le `tbody` (1ʳᵉ ligne), pas dans le `thead`.**
17. **Playwright ne peut pas se connecter si le serveur Python est tué entre deux appels bash.**
18. **`qrcode(typeNumber, errorCorrectionLevel)` est une factory, pas un constructeur.** Appeler sans `new`. `typeNumber=1` force la version 1 — `make()` saute l'auto-détection seulement si `typeNumber >= 1`. Passer `'Alphanumeric'` en mode `addData` ou la bibliothèque peut choisir Byte et forcer la version 2.

---

## Prochaine étape

À déterminer par l'opérateur. Reste à faire (liste non priorisée) :
- ⚠️ Test physique badges : imprimer `http://localhost:8000/test/badges-print.html`, découper, scanner avec l'app
- ⚠️ Test métrologie rapport : imprimer sur imprimante réelle, mesurer les largeurs
- `main.js` (routeur d'écrans, câblage `hydrateConfig` + `precalcChecksums`)
- `screen-list.js` (liste chronologique D1–D4)
- `backup.js` (export/import JSON, fusion CRDT)
- `store.clearAll()` + 6 champs modifiables dans screen-setup.js
- `sw.js` + `manifest.webmanifest` (PWA, précache)
- Déploiement HTTPS (Netlify/GitHub Pages) + installation Android/iOS
