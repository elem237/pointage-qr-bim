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
| 13 | `badges.js` — planche A4 de 16 QR version 1-Q | `vendor/qrcode.js`, `js/badges.js`, `css/app.css`, `test/badges.test.js`, `test/badges-print.html`, `test/index.html` | 12/12 + scan physique BIM26-001-YJ ✅ | claude-opus-4-8 | 2026-07-16 |
| 14 | Écran Liste + import/export (§9 D1–D4, §6.5) | `js/ui/screen-list.js`, `js/db/backup.js`, `js/db/store.js` (+loadAllPointages), `test/backup.test.js`, `test/screen-list.test.js`, `test/index.html` | 234/234 (10 backup + 15 screen-list) | — | 2026-07-16 |
| 15 | 🔴 `sw.js`, `manifest` — PWA (cache-first, addAll) | `sw.js`, `manifest.webmanifest`, `index.html`, `js/main.js`, `assets/icon-192.png`, `assets/icon-512.png`, `test/pwa.test.js` | 9 tests 🔴 (statique ✓, navigateur nécessaire) | — | 2026-07-16 |
| 16 | Déploiement + install | `netlify.toml`, `test/deploy.test.js` | 9/9 (deploy config) | — | 2026-07-16 |
| AB-1 | Absences : calculs purs + seuil config | `js/model/absences.js`, `js/config.js`, `test/absences.test.js` | 13/13 | — | 2026-07-20 |
| AB-2 | store `absences` + migration IndexedDB | `js/db/store.js`, `test/store.test.js` | 21/21 store.test.js (dont ST-A1–A5 + ST-A2bis) + 114 tests amont inchangés | — | 2026-07-20 |
| AB-3 | saisie d'absence (écran Liste) + seuil paramétrable (Réglages) | `js/ui/screen-list.js`, `js/ui/screen-setup.js`, `js/db/store.js` (+`setSeuilAbsence`, hydratation seuil au boot), `js/main.js` (+`store` transmis à `screenSetup`), `css/app.css` | 73/73 purs + 21/21 store.test.js + 18/18 ui-list/ui-setup + smoke Playwright réel (signaler/retour/seuil persistant) | — | 2026-07-20 |
| AB-4 | bloc rapport + `print.css` + précache `absences.js` | `js/ui/screen-report.js` (+buildA4Html absences, store→screenReport), `css/print.css` (section ABSENCES NOUVELLE), `js/main.js` (+pass store), `sw.js` (+absences.js, bim-v8) | 24/24 screen-report.test.js (dont 6 AB4-R*) + 13/13 absences.test.js + RG1✅ RG3✅ RG4✅ | — | 2026-07-21 |

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

### `loadAllPointages` ajouté à store.js pour l'import (étape 14)
L'import avec fusion CRDT nécessite de remplacer atomiquement la Map mémoire ET la base IndexedDB. La spec backup.js importe `lattice.js` (fusion) et `store.js`, mais store.js n'offrait que `reg`/`cancel` unitaires. Décision : ajout de `loadAllPointages(newMap)` qui : clear la Map mémoire, la repeuple, clear l'objectStore `pointages`, puis put chaque entrée dans une transaction readwrite. L'atomicité est celle de la transaction IndexedDB — pas de bulk DEXie.

### Import/export sur l'écran Liste, pas Réglages (étape 14)
La spec §12 étape 13 dit « Écrans Liste + Réglages » mais l'écran Réglages était déjà complet (étape 12) sans import/export. Décision : exporter/importer est sur l'écran Liste, pas de modification intrusive du screen-setup.js existant. La fonction `importerFusion(store, json)` dans backup.js orchestre : deserialiser → fusion(lattice) → loadAllPointages.

### `importerFichier` et `exporterFichier` dans backup.js (étape 14)
Ces deux fonctions sont DOM-only (créent un `<a download>` ou un `<input type="file">`). La spec décrit backup.js comme module de sérialisation ; les fonctions navigateur y vivent pour centraliser toute la logique d'import. `importerFichier()` retourne une Promise<string> du contenu texte, pas le résultat parsé — le découplage permet de tester `deserialiser` sans DOM.

### `filtrerParticipants` exporté avec module-level `_previousFiltered` (étape 14)
La monotonie (D1) est garantie par un cache module-level `_previousFiltered`. La fonction est exportée pour les tests ; `resetFilter()` est appelée au début de chaque test. `screenList()` appelle `resetFilter()` à chaque rendu initial, et `refresh()` aussi. Le cache est préservé entre les appels de `filtrerParticipants` dans un même rendu, ce qui réalise la monotonie : chaque frappe restreint le set précédent.

### Chemins absolus dans le manifest et index.html (étape 15)
Les tests PWA sont lancés depuis `/test/index.html`. Si le manifest utilise des chemins relatifs (`assets/icon-192.png`), la résolution depuis `/test/index.html` donne `/test/assets/icon-192.png` → 404. Décision : tous les chemins (`manifest` `src`, `index.html` `apple-touch-icon`, `favicon`, `css`, `manifest` `href`) sont absolus (`/assets/icon-192.png`). Fonctionne depuis n'importe quelle page.

### Icônes PWA redimensionnées depuis le logo client (étape 15)
`assets/icon-192.png` et `assets/icon-512.png` sont générés par redimensionnement PIL (LANCZOS) de `assets/Logo Green Forme seule sans fond.png` (fichier fourni par le client), pas des carrés verts unis créés arbitrairement.

### `main.js` minimal, pas de routeur (étape 15)
`main.js` n'appelle que `hydrateConfig({})` et `precalcChecksums()`. Le routeur d'écrans est laissé à une étape ultérieure. Le SW est enregistré dans `<script>` inline dans `index.html` pour garantir un enregistrement précoce, avant que le module `main.js` ne soit chargé.

### Nom du cache `bim-v1` (étape 15)
Conforme SPEC §11 note : incrémenter `CACHE` à chaque déploiement. `v1` est la première version. Actuellement `bim-v7` (post-audit 2026-07-17).

### Tests PWA non automatisables en headless
Les tests de registration SW et de précache (caches.open, cache.match) nécessitent un navigateur réel avec support SW. La vérification statique (HTTP 200, contenu des fichiers) est automatisée ; les tests de précache nécessitent une ouverture manuelle dans le navigateur.

### Portrait choisi sans mesure réelle (étape 11)
Tableau d'essai créé (`test/tableau-essai.html`) mais pas imprimé. Décision : portrait. Si l'impression montre un problème → `@page landscape`.

### `DB_VERSION` 2 → 3, store `absences` créé conditionnellement (AB-2)
`onupgradeneeded` ajoute UNIQUEMENT `if (!db.objectStoreNames.contains('absences'))`, comme les 3 stores existants. Aucun store existant n'est recréé ni vidé. ST-A1 vérifie qu'une base pleine de pointages (actifs et annulés) + un `device` en `meta` survit intégralement à la migration.

### `ajouterAbsence` génère l'`id` en interne (AB-2)
ABSENCES.md §6.1 appelle `ajouterAbsence({ numero, dateJour, depart, retour: null, motif })` sans `id` : le champ n'est pas fourni par l'appelant. Décision : la fonction génère l'`id` (même stratégie `crypto.randomUUID()` + repli que `getOrCreateDeviceId`) et le retourne.

### `cloturerAbsence` / `modifierMotifAbsence` / `supprimerAbsence` ne retournent pas de statut (AB-2)
Contrairement à `reg`/`cancel` (qui retournent `{resultat}` pour piloter l'UI de scan), le §3.2 d'ABSENCES.md ne spécifie aucun contrat de retour pour ces trois fonctions. Décision : suivre le style de `deletePointage`/`savePointage` existants — des Promises qui se résolvent sans valeur. Si un `id` inconnu est passé à `cloturerAbsence`/`modifierMotifAbsence`, la fonction ne fait rien (pas d'erreur levée). Cette décision est ouverte à révision dès qu'AB-3 (saisie écran Liste) aura un besoin concret de feedback d'erreur.

### `listerAbsences(dateJour)` utilise l'index `dateJour` d'IndexedDB (AB-2)
`os.getAll()` sans argument liste tout ; `os.index('dateJour').getAll(dateJour)` filtre côté IndexedDB plutôt qu'en mémoire après un `getAll()` complet. Cohérent avec l'index créé au §3.2.

### `jourCourant()` dupliqué dans `screen-list.js` (AB-3)
Même pattern que `formatTau` (3 copies déjà existantes) : `slots.js` n'exporte pas de fonction « date locale Douala à partir d'un epoch », donc `screen-list.js` la recalcule inline (`new Date(tNow + 3600000)` → `getUTCFullYear/Month/Date`). Volontairement indépendant de `slotDe` : une absence doit pouvoir être signalée même hors fenêtre de créneau (ex. juste avant l'ouverture), alors que `slotDe(t)` retournerait `null`.

### `screen-list.js` charge les absences de façon asynchrone après le premier rendu (AB-3)
`store.listerAbsences(dateJour)` est une Promise (IndexedDB). Le premier `render()` peint la liste sans indicateur d'absence, puis `loadAbsences().then(...)` re-peint dès que la promesse résout — même schéma que `getCacheStatus()` dans `screen-setup.js` (étape 12). Aucun test existant ne dépend d'un rendu synchrone incluant les absences.

### Action « active » du menu ⋯ pour Modifier le motif / Supprimer (AB-3)
ABSENCES.md §6.3 ne précise pas quelle absence corriger quand plusieurs existent le même jour pour un participant (le §4.5 admet explicitement « une même personne peut s'absenter deux fois »). Décision : l'absence « active » est l'absence ouverte (`retour: null`) s'il y en a une, sinon la plus récente (triée par `depart`). Les actions Modifier le motif / Supprimer ciblent cette absence active ; Signaler une absence reste toujours disponible indépendamment (permet plusieurs absences par jour).

### Indicateur multi-absences : total des durées, pas la dernière seule (AB-3)
ABSENCES.md §6.4 donne un seul exemple (« 1 absence signalée (00:47) ») sans préciser le cas de plusieurs absences closes le même jour. Décision : `n absences signalées (SOMME des durées)`. Cohérent avec l'esprit du §4.2 (« on capture tout, on filtre au rapport ») — rien n'est masqué à l'opérateur.

### `store.setSeuilAbsence(min)` persiste dans `meta` puis appelle `mergeConfig`, jamais `hydrateConfig` (AB-3)
ABSENCES.md §7 dit « via store meta + hydrateConfig, jamais DEFAULTS » — lu comme « le mécanisme d'hydratation de config », pas littéralement l'appel `hydrateConfig(o)` (qui *remplace* tous les overrides). `mergeConfig` est le mécanisme incrémental déjà établi (étape 12, `DATES`) : il ne clobber pas les autres réglages (ex. `DATES` de mode test) au moment où `initDB()` relit le seuil stocké au boot.

### `main.js` corrigé pour transmettre `store` à `screenSetup` (AB-3, hors portée ABSENCES.md — validé explicitement)
Découvert en testant le seuil de bout en bout (Playwright réel + reload) : `montrerScreen('setup')` n'appelait jamais `screenSetup(container, { store: _store, ... })` — `opts.store` était `undefined`. Conséquence : le seuil (comme les boutons Exporter/Importer de Réglages, déjà présents avant AB-3) semblait fonctionner à l'écran mais ne persistait jamais en IndexedDB, silencieusement. `main.js` n'est pas dans la portée autorisée d'`ABSENCES.md` (« js/config.js, absences.js, store.js, screen-list.js, screen-setup.js, screen-report.js bas de page, print.css. RIEN d'autre. ») : la correction (1 ligne, ajout de `store: _store`) a été explicitement validée par l'utilisateur avant d'être appliquée, conformément à la règle CLAUDE.md §4 (arrêter et demander plutôt qu'étendre la portée seul).

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
| Badges QR · impression + scan physique | Les 16 badges scannés et lus correctement. QR version 1-Q lisible sur papier, ~30 cm, éclairage néons. | ✅ FORMAT CONFIRMÉ — tous les badges validés |
| Rapport PDF · impression réelle (largeurs) | — | ⚠️ EN ATTENTE avant le jour J |
| iPhone X · mode avion, protocole CORRECTIF.md §3 intégral (install icône → tuer app → relancer avion → Scan/Liste/Rapport) | Tous les points du protocole passés — revalidé 2026-07-22 après correctif `netlify.toml` sur `effulgent-sprite-fbf8eb.netlify.app` | ✅ HORS-LIGNE VALIDÉ (C1) |
| Android Redmi · installation PWA (icône écran d'accueil) | Play Store présent, menu ⋮ ne propose ni « Installer » ni « Ajouter à l'écran d'accueil », même après rechargement + attente + interaction | ⚠️ NON RÉSOLU — probable non-certification Play Protect de l'appareil (fréquent sur unités reflashées/importées). Le manifest, les icônes et le SW sont conformes et vérifiés en ligne (curl) : ce n'est pas un défaut de notre code. Repli : raccourci simple sans mode standalone. Ne pas rouvrir sans nouvel appareil Android à tester. |

---

## Correctif hors-ligne — 2026-07-17

**Contexte** : voir `CORRECTIF.md` et `PASSATION-OFFLINE.md` (agent précédent, échec non résolu, hypothèse de bug en aval du SW).

**Diagnostic refait à partir du code réel** (pas des verdicts de la passation) : reproduction du protocole CORRECTIF.md §3 en Chromium (Playwright, profil propre) sur le code déjà committé (`bim-v5`) → **succès intégral, zéro requête échouée, zéro erreur, les 4 écrans se rendent hors-ligne**. Aucune des 7 causes n'était donc en faute dans le code final ; l'échec rapporté dans la passation est très probablement dû à un état de navigateur non nettoyé entre les itérations `bim-v3→v4→v5` (chevauchement avec la Cause 5, qui prévient justement contre ce piège).

**Seule anomalie réelle trouvée** : `sw.js` avait été corrigé en chemins relatifs (`./...`) par la tentative précédente, mais `index.html` et `manifest.webmanifest` étaient restés en chemins absolus (`/...`), et `register()` forçait `{ scope: '/' }`. Incohérence issue d'un correctif partiellement appliqué — sans conséquence fonctionnelle tant que le site est servi à la racine (c'est le cas sur Netlify), mais violait la règle explicite de CORRECTIF.md §2 (« Tous les chemins en `./` relatif ») et restait fragile pour rien.

- **Fichiers modifiés** : `index.html` (chemins `./`, `register('./sw.js')` sans scope forcé), `manifest.webmanifest` (chemins `./`, `"scope": "./"` explicite), `sw.js` (CACHE bump uniquement)
- **CACHE incrémenté** : `bim-v5` → `bim-v6`
- **Vérifié en ligne** (`curl` sur `https://pointage-qr-bim.netlify.app/`) : manifest JSON valide, icônes 192×192 et 512×512 exactes (PNG RGBA), `sw.js` avec `Service-Worker-Allowed: /`, `index.html` avec les chemins relatifs corrects
- **Protocole §3** : passé intégralement sur **iPhone X** le 2026-07-17 ✅
- **Entrées en cache** : 29 (= 29 fichiers ASSETS), vérifié en local (Chromium clean) et via les en-têtes en ligne
- **Test régressé puis corrigé** : `test/pwa.test.js` — « icônes du manifest accessibles et PNG » supposait une résolution d'URL relative à la page de test, pas au manifest (contrairement au comportement réel des navigateurs). Corrigé pour résoudre `icon.src` via `new URL(icon.src, resp.url)`.
- **Android** : non résolu — voir tableau Mesures physiques ci-dessus. Cause probable hors code (certification Play Protect de l'appareil testé).

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
- ~~`feedback.js` : dette AudioContext — `await ctx.resume()` + un seul contexte réutilisé (piège iOS).~~ ✅ Corrigé le 2026-07-17.
- `badges.js` : `test/badges-print.html` est une page de prévisualisation hors spec, à supprimer ou intégrer dans `main.js` quand le routeur existera.
- `screen-list.js` : pas de styles CSS dédiés (utilise les styles navigateur par défaut pour le tableau). CSS à ajouter si l'UI doit être présentable.
- `screen-list.js` : la confirmation d'annulation utilise `confirm()` natif (modal bloquant). Une modale personnalisée serait plus jolie mais ajoute du code DOM.
- `screen-list.js` : `formatTau` dupliqué (séparateur `h` au lieu de `:` comme dans screen-scan.js). Troisième copie de la même fonction (screen-scan.js `:`, screen-report.js `h`, screen-list.js `h`).
- `backup.js` : `exporterFichier` et `importerFichier` non testables en Node (manque DOM). Les tests DOM ne passent qu'au navigateur.
- `backup.js` : `importerFusion` suppose que store a `loadAllPointages`. Si `store.clearAll()` est ajouté plus tard, refactorer pour l'utiliser.
- `test/pwa.test.js` : tests navigateur uniquement (SW registration, Cache API). Vérification statique automatisée, le test complet nécessite ouverture manuelle de `/test/index.html`.
- Suite de tests navigateur (`test/index.html`) : en Playwright headless, l'exécution se bloque silencieusement juste après `feedback.test.js`, avant `screen-scan.test.js` (probablement lié à `getUserMedia`/`AudioContext` sans device réel). Pré-existant, sans rapport avec AB-2. Contournement utilisé pour valider AB-2 : page de test isolée n'important que `store.test.js`, plus vérification que les 114 tests en amont (jusqu'à `feedback.test.js` inclus) passent toujours dans le run complet.
- `screen-report.js`: le chargement des absences est async (IndexedDB). Le premier rendu du rapport n'affiche pas d'absences ; elles apparaissent après résolution de `store.listerAbsences()`. L'aperçu cliquable (`agrandir`) utilise la variable `a4Html` mise à jour après chargement. Si l'utilisateur clique avant la fin du chargement, l'overlay montre la version sans absences — acceptable en pratique (IndexedDB local, < 10 ms).

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
19. **`confirm()` bloquant vs event loop.** Les `confirm()` natifs bloquent tout — pas de problème pour l'UX en salle mais empêche les tests automatisés de l'annulation (pas de mock de `window.confirm` dans le harnais).
20. **Module-level state dans screen-list.js.** `_previousFiltered` est module-level et persiste entre les appels de `filtrerParticipants`. Chaque test doit appeler `resetFilter()` explicitement, sinon les résultats des tests suivants deviennent indéterministes.
21. **`importerFichier()`/`exporterFichier()` dépendent du DOM.** Créent et cliquent des éléments HTML (`<a download>`, `<input type="file">`). Non testables en Node, ni dans le harnais actuel (pas de simulation de file dialog).
22. **`loadAllPointages` non atomique au niveau applicatif.** Si le navigateur plante entre `os.clear()` et le premier `os.put()`, les données sont perdues. Acceptable en PWA avec service worker (pas de crash intempestif en salle).
23. **~~Chemins absolus dans le manifest PWA~~ — corrigé le 2026-07-17, ne pas revenir en arrière.** Un navigateur résout les URLs du manifest (`start_url`, `icons[].src`) par rapport au **manifest lui-même**, pas par rapport à la page qui l'a chargé. Les chemins relatifs (`./assets/icon-192.png`) sont donc corrects et portables (marchent à n'importe quel sous-chemin de déploiement), contrairement aux chemins absolus (`/assets/...`) qui cassent tout déploiement hors racine. Le piège n'est pas dans le manifest : c'est `test/pwa.test.js` qui faisait `fetch(icon.src)` en le résolvant par rapport à la page de test (`/test/`) au lieu du manifest — corrigé via `new URL(icon.src, resp.url)`. Voir correctif hors-ligne du 2026-07-17.
24. **`test/index.html` complet se bloque en Playwright headless juste après `feedback.test.js`.** Aucune erreur affichée dans le harnais, aucun test suivant ne s'exécute (`screen-scan.test.js` et au-delà). Cause probable : `getUserMedia`/`AudioContext` sans device réel en tête de ces suites. Pour valider un module isolé (ex. `store.test.js`) en CLI, créer une page de test temporaire n'important que ce fichier plutôt que d'attendre la fin du run complet.

---

## Post-audit — 2026-07-17

**3 corrections appliquées :**

1. `feedback.js:initAudio()` — `async`, `await _ctx.resume()` après création/réutilisation, retourne `_ctx.state === 'running'` (booléen). iOS ding fonctionnel. Appelant `screen-scan.js:234` mis à jour en `const audioOk = await initAudio();` ; l'ancienne double garde `.state === 'suspended'/resume manuel remplacée.

2. `backup.js:deserialiser()` — 3 gardes ajoutées (`typeof v.mode !== 'string'`, `typeof v.device !== 'string'`, `typeof v.override !== 'string'` → `return null`). G11 (champs absents) passe, G11bis (mauvais types : `0`, `true`, `null`, `[]`) ajouté et passe.

3. `sw.js` — bloc `Promise.allSettled`/`fetch`/`cache.put` remplacé par `cache.addAll(ASSETS)` atomique. CACHE : `bim-v6` → `bim-v7`.

**Suppression :** `rapport-avant.pdf` (PDF du .docx source, pas de l'app — a faussé l'audit).

**Nouvelles dettes assumées :**
- `LABEL_CRENEAU` non exporté depuis `data.js` — nécessaire mais pas bloquant.
- `test/pwa.test.js:112` référence encore `bim-v1` — obsolète depuis `bim-v7`.

---

## Généralisation des dates — 2026-07-21

**Contexte** : la formation est reportée à date inconnue. Les dates `4-6 août 2026`
n'ont plus de sens. L'organisateur saisit lui-même 3 dates quelconques dans
l'écran Réglages.

### Changements

| Fichier | Modification |
|---|---|
| `js/config.js:10` | `DEFAULTS.DATES = []` (plus de dates par défaut) |
| `js/db/store.js:264–269` | `setReglages(partial)` — persiste n'importe quel réglage dans `meta.reglages` |
| `js/db/store.js:165–170` | `initDB()` restaure `meta.reglages` via `hydrateConfig()` au boot |
| `js/main.js:20–31` | `autoModeTest()` ne génère plus de dates. Si DATES vide → ne fait rien ; si aujourd'hui pas dans DATES → étend les créneaux (`00:00–23:59`) pour les tests |
| `js/main.js:83` | `autoModeTest()` déplacé APRÈS `initDB()` pour que les dates persistées soient déjà restaurées |
| `js/main.js:114–118` | Si `DATES.length === 0` au lancement → ouvre l'écran Réglages au lieu du Scan |
| `js/ui/screen-setup.js:5–11` | `datesValides(dates)` remplace `estModeTest()` / `DATES_RELLES`. Valide : 3 dates distinctes en `YYYY-MM-DD` |
| `js/ui/screen-setup.js` | Bandeau rouge supprimé (le concept de « mode test » n'existe plus). Le seul garde-fou est la redirection vers Réglages au boot si DATES vide |
| `js/ui/screen-setup.js:71–78` | `appliquerDates()` persiste via `store.setReglages({ DATES })` en IndexedDB, pas seulement en mémoire |
| `js/ui/screen-setup.js:124` | Bouton « Rétablir les dates réelles » → « Vider les dates » (remet les 3 champs à vide) |
| `test/*.test.js` | Ajout de `mergeConfig({ DATES: [...] })` dans les fichiers qui dépendent de dates spécifiques — aucun test supprimé, tous passent |

### Testé (Node, modules purs)

- `config.test.js` — 7/7 ✅
- `slots.test.js` — 23/23 ✅ (avec 2026-08-04…06 via mergeConfig)
- `report.test.js` — 27/27 ✅

### Testé manuellement (logique arbitraires)

Avec `mergeConfig({ DATES: ['2026-09-15', '2026-09-16', '2026-09-17'] })` :
- `tousLesSlots()` → 6 slots corrects (15/Mt, 15/Md, 16/Mt, 16/Md, 17/Mt, 17/Md)
- `slotDe(2026-09-15 08:30 Douala)` → `{ date: '2026-09-15', creneau: 'matin' }`
- `finDe()` / `slotsEchus()` / `etatCellule()` → résultats corrects
- DATES non contiguës acceptées (validation distinctes seulement)

### Nouvelle dette

- `screen-setup.js` nécessite `opts.store` pour persister les dates. Si `store.setReglages` est absent (test sans store), la persistance est silencieusement ignorée — les dates restent en mémoire seulement.

---

## Correctif hors-ligne — 2026-07-21 (régression post bim-v6)

**Symptôme rapporté** : sur iPhone/Safari, l'app **installée** (icône écran d'accueil) refuse de démarrer sans réseau — alors que le protocole CORRECTIF.md §3 avait été validé intégralement sur iPhone X le 2026-07-17 (`bim-v6`).

**Diagnostic refait à partir du code réel et du site live** (pas des verdicts précédents, cf. `MEMORY` sur ce piège) : rejeu du protocole en Chromium (Playwright, profil propre) sur le code local à jour (`bim-v8`) → **succès intégral**, 30/30 fichiers en cache, zéro requête échouée, 4 écrans OK hors-ligne. Donc **le code applicatif n'est pas en cause**. Comparaison ensuite du dépôt (`origin/master`, HEAD = `cf2bd64`) avec `https://pointage-qr-bim.netlify.app/` en production (`curl`) :

- `git diff HEAD origin/master -- sw.js` → vide (le commit `cf2bd64` avec `bim-v8` est bien poussé)
- Mais le `sw.js` **servi en ligne** répondait encore `CACHE = 'bim-v7'`, **sans `./js/model/absences.js`** dans `ASSETS` (fichier ajouté en `bim-v8`, AB-4), alors que `js/main.js` et une partie du reste du site servaient déjà le code de `cf2bd64`. Preuve d'un **déploiement figé/partiellement périmé au niveau du CDN**, pas d'un défaut de code.
- Cause trouvée dans `netlify.toml` : le bloc `[[headers]] for = "/sw.js"` (avec `Cache-Control: no-cache`) était déclaré **avant** le bloc générique `[[headers]] for = "*.js"` (avec `Cache-Control: public, max-age=86400`). Netlify applique les règles qui matchent un même chemin par **ordre de déclaration, la dernière l'emportant** pour une même clé d'en-tête — confirmé empiriquement : `curl -sI .../sw.js` renvoyait bien `cache-control: public,max-age=86400` en ligne, alors que la règle `/sw.js` explicite demandait `no-cache`.
- **Conséquence exacte du bug** : `sw.js` — le seul fichier qui DOIT toujours être resservi frais pour que le mécanisme de mise à jour de SW fonctionne — pouvait rester caché jusqu'à 24 h côté CDN/navigateur après chaque déploiement. Un téléphone resté sur un `sw.js` ancien (précache sans `absences.js`, requis statiquement par `screen-report.js` depuis AB-4) voit tout le graphe de modules ES échouer à se résoudre une fois hors-ligne → l'app ne démarre jamais sans réseau. Correspond exactement au symptôme rapporté.

**Correctif** : dans `netlify.toml`, le bloc `[[headers]] for = "/sw.js"` déplacé **après** les blocs génériques `*.js` / `*.css` / `*.png`, pour que sa règle `no-cache` soit la dernière à matcher `/sw.js` et l'emporte. Aucun autre fichier touché — `sw.js` reste à `bim-v8` (déjà correct localement, il ne pouvait simplement pas être vu par les téléphones).

- **Fichier modifié** : `netlify.toml` (réordonnancement uniquement, pas de valeur changée)
- **Testé** : rejeu de `test/deploy.test.js` (D1–D6, D8 ✅) + `test/pwa.test.js` (F1/F3, §11 iOS ✅) via Playwright sur une page de test isolée — D7 et D9 échouent mais **préexistant, sans rapport** (D7 attend un format `ASSETS` obsolète avec une entrée `'./'` littérale qui n'existe plus depuis les étapes suivantes ; D9 résout `fetch(m.start_url)` relativement à la page de test dans `/test/`, pas au manifest — même piège que celui déjà documenté et corrigé pour les icônes dans `pwa.test.js`, non encore appliqué à D9)
- **Protocole CORRECTIF.md §3** : rejoué intégralement en Chromium (Playwright, profil propre, dates configurées, mode avion) sur le code local `bim-v8` → ✅. **Pas encore re-testé sur iPhone physique après déploiement du correctif `netlify.toml`** — à faire dès que le déploiement Netlify est effectif (voir Mesures physiques)
- **Non touché** : `/index.html` garde `Cache-Control: public, max-age=86400` — risque du même ordre mais plus faible (le contenu servi hors-ligne dépend du précache SW, pas de l'HTTP cache, une fois le SW actif) ; laissé tel quel, hors du périmètre du bug confirmé. À surveiller si un symptôme similaire réapparaît malgré ce correctif.

### Déploiement — 2026-07-22

**Découverte en cours de vérification** : le site à jour n'est plus `pointage-qr-bim.netlify.app` mais `https://effulgent-sprite-fbf8eb.netlify.app/` — nouveau site Netlify, relié à GitHub mais **sans déploiement automatique sur push** : chaque déploiement doit être **déclenché puis publié manuellement** dans le dashboard Netlify (Deploys → Trigger deploy, puis « Publish deploy » sur le build voulu si non publié automatiquement). Ce point avait retardé la mise en ligne du correctif ci-dessus : le premier « Trigger deploy » avait bien reconstruit le bon commit, mais le déploiement de production servi restait l'ancien (CDN non basculé sur ce build). La publication manuelle explicite du déploiement le plus récent a résolu ce point.

**Vérifié en ligne après publication** (`curl` + Playwright sur `https://effulgent-sprite-fbf8eb.netlify.app/`) :
- `sw.js` → `Cache-Control: no-cache` ✅ (n'est plus recouvert par la règle `*.js`)
- `CACHE = 'bim-v8'`, 30/30 entrées dans `caches.open('bim-v8')` ✅
- Protocole hors-ligne (mode avion réel via `context.setOffline(true)`, reload, navigation Scan/Liste/Rapport/Réglages) → **zéro requête échouée, zéro erreur console, les 4 écrans s'affichent** ✅

**Protocole CORRECTIF.md §3 validé sur iPhone physique** — 2026-07-22 : confirmé par l'utilisateur, ça fonctionne hors-ligne sur `https://effulgent-sprite-fbf8eb.netlify.app/`. ✅ **HORS-LIGNE VALIDÉ (C1)**, régression du 2026-07-21 résolue.

### Nouvelle dette

- Confirmer avec l'organisateur si le nouveau site `effulgent-sprite-fbf8eb.netlify.app` remplace définitivement `pointage-qr-bim.netlify.app` (lequel reste, lui, périmé à `bim-v7`) — s'assurer qu'aucun lien/QR/bookmark ne pointe encore vers l'ancien.
- Ce site ne se déploie pas automatiquement sur push : penser à **déclencher ET publier manuellement** dans le dashboard Netlify après tout futur changement de code (sans quoi la prod reste figée sur un ancien build, comme le 2026-07-22).
- `test/deploy.test.js` D7 et D9 : tests obsolètes/fragiles, à corriger dans une session dédiée aux tests (hors périmètre de ce correctif).

---
## Prochaine étape

Aucune sur le hors-ligne — validé de bout en bout (code, CDN, iPhone physique). Recette finale avec le client sur `https://effulgent-sprite-fbf8eb.netlify.app/`.
