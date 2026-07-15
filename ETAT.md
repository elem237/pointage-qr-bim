# État du projet — Pointage QR BIM

## Étapes terminées

| # | Étape | Fichiers | Tests | Date |
|---|---|---|---|---|
| 1 | `config.js`, `data.js`, `norm.js` + harnais | `js/config.js`, `js/data.js`, `js/model/norm.js`, `test/index.html`, `test/harness.js`, `test/norm.test.js`, `test/data.test.js`, `test/config.test.js` | 16/16 | 2026-07-15 |
| 2 | `ident.js` (A2, A3, A4) 🔴 — payload + valider | `js/model/ident.js`, `test/ident.test.js` | 33/33 | 2026-07-15 |
| 3 | 🔴 `lattice.js` — rang, join, fusion | `js/model/lattice.js`, `test/lattice.test.js` | 17/17 | 2026-07-15 |
| 4 | 🔴 `store.js` — IndexedDB, reg, cancel | `js/db/store.js`, `test/store.test.js` | 22/22 | 2026-07-15 |
| 5 | `slots.js` — slotDe, slotAvecOverride | `js/model/slots.js`, `test/slots.test.js` | 13/13 | 2026-07-15 |
| 6 | `camera.js`, `decode.js`, `debounce.js` (scan brut) | `vendor/jsqr.js`, `js/scan/camera.js`, `js/scan/decode.js`, `js/scan/debounce.js`, `test/scan.test.js` | 12/12 | 2026-07-15 |
| 7 | 🔴 `pipeline.js` — `Scan()` | `js/scan/pipeline.js`, `test/pipeline.test.js`, `test/index.html` | 9/9 | 2026-07-15 |
| 8 | `feedback.js` — Audio + vibration (C7) | `js/feedback.js`, `test/feedback.test.js` | 8/8 | 2026-07-15 |
| 9 | Écran Scan — UI + sélecteur Auto/Matin/Midi | `js/ui/screen-scan.js`, `test/screen-scan.test.js` | 16 (22 fonctions pures+imports) | 2026-07-15 |
| 10 | 🔴 `report.js` — etatCellule, stats | `js/model/report.js`, `test/report.test.js` | 18/18 | 2026-07-15 |
| 11 | Écran Rapport + `@media print` → PDF | `js/ui/screen-report.js`, `css/app.css`, `assets/logos.js`, `test/screen-report.test.js` | 27/27 | 2026-07-15 |

## Décisions prises hors spec

### `getConfig()` reste synchrone
La spec PATCH v1.1 §P2 décrit `getConfig()` comme lisant `meta.reglages` depuis IndexedDB, ce qui serait async. Mais le chemin de scan (`pipeline.js`) doit rester synchrone (PATCH §P4). Décision : `config.js` maintient un cache mémoire `_overrides` alimenté par `hydrateConfig(o)`, appelée une fois au boot par `main.js` à l'étape 4. `getConfig()` est synchrone.

Conséquence : si `hydrateConfig` n'est pas appelée (étape 1 à 3), `getConfig() === DEFAULTS`. Les modules des étapes 1-3 n'ont pas besoin du store meta.

### `package.json` pour les tests Node
Le projet interdit `npm install` / `node_modules`, mais un `package.json` contenant uniquement `{"type":"module"}` est nécessaire pour lancer les tests en Node (les sources sont en `.js` ESM). Ce fichier N'EST PAS versionné — supprimé après chaque run. Alternative : utiliser `test/run.mjs` (`.mjs` est toujours ESM) mais il importe des `.js` qui, sans `package.json`, sont traités en CJS par Node. Solution de contournement : créer/effacer `package.json` à chaque session de test, ou utiliser le lanceur navigateur (`python3 -m http.server 8000`).

### Lanceur de tests en `http://localhost`
La spec §2 disait « ouvrable au navigateur ». En réalité, les modules ES en `file://` sont bloqués par CORS. Décision (PATCH §P1) : servir via `python3 -m http.server 8000` et ouvrir `http://localhost:8000/test/index.html`. `localhost` est aussi un contexte sécurisé, donc `getUserMedia` marche en dev.

### `test/run.mjs` hors spec
Fichier utilitaire créé pour exécuter les tests en ligne de commande (sortie plus rapide que le navigateur). Non listé dans l'arborescence §2. Supprimé avant commit. Peut être recréé au besoin.

### `precalcChecksums()` appelée explicitement (pas à l'import)
La spec §A3 dit « Pré-calculer les 16 checksums au démarrage dans une Map ». Suivant le même pattern que `hydrateConfig()` (config.js), `precalcChecksums()` est une fonction exportée appelée explicitement par les tests (et plus tard par `main.js`). Elle n'est PAS appelée automatiquement à l'import du module — ce serait un side-effect caché hors de contrôle.
Conséquence pour le test : chaque test qui utilise `valider` appelle `await precalcChecksums()` d'abord.

### `store.reg` et `store.cancel` sont async (persistance IndexedDB)
La spec §6.3/§6.4 décrit `reg` et `cancel` comme des fonctions pures synchrones sur une `Map<Cle, PointageValue>`. Mais `store.js` doit persister en IndexedDB (API asynchrone). Décision : les méthodes du Store sont `async` ; la sauvegarde DB est `await`-ée avant le retour. La garantie de durabilité prime sur la pureté.

### Le Store encapsule la Map (pas de retour de `m` dans les résultats)
La spec §6.3 dit `retourner { m, DEJA_POINTE(v.tau) }` — le Map modifié est dans le résultat. Le Store possède la Map en interne et expose `getPointages()` pour y accéder. Les résultats de `reg`/`cancel` ne contiennent pas la Map — seulement le statut (`OK`/`DEJA_POINTE`/`ERREUR`) et les payloads (participant, tau). Si pipeline.js (étape 7) a besoin de la pure fonction, elle sera extraite à ce moment-là.

### `valider` hardcode `'BIM26-'` dans la REGEX
La spec §A4 donne `REGEX = /^BIM26-([0-9]{3})-([A-Z2-7]{2})$/`. Idem pour `id = 'BIM26-' + m[1]`. Ce n'est PAS paramétré par `PREFIXE_ID`. Raison : si PREFIXE_ID change, le format QR change, et la REGEX doit être réécrite de toute façon — ce n'est pas un réglage runtime. Décision : suivre la spec à la lettre, hardcoder.

### jsQR converti de UMD → ES module (vendor/jsqr.js)
Le fichier téléchargé est un UMD webpack. Pour l'importer depuis `decode.js` en module ES natif, le wrapper UMD a été remplacé par `const _jsQR = (function() { … })(); export default _jsQR;`. Alternative (chargement via `<script>` HTML) aurait cassé la régularité du système de modules. Décision : conversion à la ligne 1 (suppression du wrapper) et ligne 10101 (ajout de l'export).

### `retenir` hardcode 3000 ms (pas `DEBOUNCE_MS`)
La spec §C4 donne la pseudo-code avec `3000` littéral, pas `getConfig().DEBOUNCE_MS`. Suivi la spec à la lettre. Si pipeline.js (étape 7) a besoin d'un seuil configurable, `retenir` prendra un paramètre supplémentaire.

### Geler la boucle : freeze() externe via le contrôleur
La spec §C1 dit « Geler la boucle pendant l'affichage du résultat (300 ms) ». `lancerBoucle` retourne un contrôleur avec `freeze(ms)` appelable par pipeline.js. Décision : ne pas coder le gel dans la boucle elle-même — pipeline.js décide quand geler (après un scan réussi).

### `Scan()` prend `_decode` injectable en 6e paramètre
La spec §7 donne la signature `Scan(image, t, override, m, H)`. Pour tester les 5 branches sans générer un vrai QR (pas de `vendor/qrcode.js` avant l'étape 12), le 6e paramètre `_decode = decode` permet l'injection d'un `fakeDecode` dans les tests. La signature publique (5 premiers paramètres) correspond à la spec ; le 6e ne change pas l'API.

### ROI extraite avant pipeline.js, pas dedans
La spec §7 montre `w ← decode(roi(image))` — `roi()` fait partie du pseudo-code de Scan. Mais `camera.js:lancerBoucle` extrait déjà la ROI (`captureROI`) avant d'appeler `onFrame(roi)`. L'architecture sépare : la caméra gère le prélèvement, le pipeline la logique métier. Le pipeline reçoit l'ImageData déjà rogné. Conséquence : si un futur appelant appelle `Scan` sans passer par la caméra, il doit fournir un `ImageData` déjà rogné (ou accepter le décodage hors ROI).

### `cle` construite inline dans Scan (pas de fonction dédiée)
La spéciﬁcation formelle note `cle(w.id, s)` pour la clé de pointage, mais aucune fonction `cle()` n'est définie dans les modules du §2. La clé `"BIM26-{d}|{date}|{creneau}"` est donc construite inline dans pipeline.js par extraction regex du `w` (garanti valide par `valider`). Si une session future exporte `cle()` depuis `ident.js` ou ailleurs, le code pourra être refactoré.

### `feedback.js` ne gère que Son + Vibration, pas Couleur + Message
La spec §8 (Module C7) donne un tableau à 5 colonnes (Son, Vibration, Couleur, Message). Mais l'étape 8 du §12 est intitulée « Audio + vibration (C7) » et l'étape 9 (« Écran Scan ») gère l'UI. Décision : `feedback.js` se limite au retour non-visuel (son + vibration). Couleur et message texte seront affichés par `screen-scan.js` à l'étape 9. Si une session future veut centraliser, `feedback.js` peut exporter un dictionnaire supplémentaire.

### Gap de 100ms entre les deux tones DEJA_POINTE
La spec dit « 660 Hz ×2, 80 ms » sans préciser l'intervalle. Choix : délai de 180ms pour le second tone (gap de 100ms entre la fin du premier tone et le début du second). La vibration suit un pattern `[30, 100, 30]` (gap cohérent de 100ms).

### `initAudio()` protégée contre l'absence de `window` en Node
`window` n'existe pas en Node → `window.AudioContext` lève ReferenceError. Décision : ajouter `typeof window !== 'undefined' &&` en garde. Même motif que `vibrer()` qui protège `typeof navigator`.

### Couleurs hex du feedback visuel non spécifiées
La spec §8 donne « vert », « orange », « rouge », « gris » sans valeurs hex. Choix : `#4caf50` (vert Material), `#ff9800` (orange), `#f44336` (rouge), `#9e9e9e` (gris). Cohérent avec Material Design. Si un thème métier exige d'autres teintes, changer les 4 constantes dans `screen-scan.js:couleurPourResultat()`.

### Messages d'erreur ERREUR choisis librement
La spec §8 dit « message dédié » pour `format`/`checksum`/`inconnu` sans préciser le texte. Choix : « Format non reconnu », « Checksum invalide », « Code inconnu ». Si le client veut des libellés différents, les changer dans `messagePourResultat()`.

### H_MAP (debounce) module-level dans screen-scan.js
L'historique anti-rebond `H` est une `Map` privée au niveau du module (`const H_MAP = new Map()`), partagée entre tous les appels à `screenScan()` sur la même page. Décision : pas besoin de la passer comme paramètre car il n'y a qu'un seul écran de scan à la fois. Si un futur routage d'écrans crée/détruit plusieurs instances, `H_MAP` devra être réinitialisé.

### formatTau calcule HH:MM en UTC+1 manuel
Pour afficher « déjà pointé à HH:MM », `formatTau()` ajoute 3600000 ms à l'epoch puis lit `getUTCHours/minutes`. Même pattern que `localDouala()` dans `slots.js`. Pas de `toLocaleString` (évite dépendance au fuseau OS). Décision : duplication du pattern plutôt que d'exporter `localDouala` depuis `slots.js` (modification d'un module existant hors étape 9).

### Overlay résultat en `position:absolute` en bas
La spec ne précise pas le placement du message de résultat. Choix : overlay positionné en bas de l'écran (`bottom:0`), semi-transparent si fond, pour ne pas masquer le flux caméra. Le sélecteur Auto/Matin/Midi est en haut. Le flux vidéo est en `display:block` derrière.

### `finDe()` définie dans `report.js`, pas dans `slots.js`
La spec §E1 mentionne `finDe(s)` sans préciser son module. Nécessaire à `etatCellule` et `slotsEchus`, toutes deux dans `report.js`. La mettre dans `slots.js` aurait modifié un module existant hors étape. Décision : définir `finDe` dans `report.js`. Si une étape future en a besoin ailleurs, extraire.

### Signature `etatCellule(m, participant, slot, tNow)`
La spec donne `(participant, slot, tNow)` mais le pseudo-code lit `m.get(...)`. Puisque `report.js` est un module pur, `m` est un paramètre (comme `reg(m, ...)` dans lattice.js). Décision : `m` en premier paramètre, `participant`, `slot`, `tNow` ensuite.

### `presents` implémentation directe (pas via `etatCellule`)
La spec définit `presents(s) = |{ p : etatCellule(p,s).type = 'present' }|`. L'implémentation itère directement sur `m.get(cle(numero, slot))` au lieu d'appeler `etatCellule` 16 fois avec un `tNow` factice. Même résultat, évite de passer `Infinity` comme tNow.

### E3 (tri) laissé à l'étape 11
La spec §E3 décrit les tris mais l'étape 10 livre seulement `etatCellule` et `stats`. `PARTICIPANTS` est déjà ordonné par `numero` en lecture. Les tris alphabétique/assiduité sont réservés à l'écran de consultation (`screen-report.js`, étape 11+). Aucune fonction de tri exportée de `report.js`.

### Portrait choisi sans mesure réelle (étape 11)
La spec §10 demande d'imprimer un tableau d'essai et de mesurer avant de trancher portrait/paysage. Le tableau d'essai a été créé (`test/tableau-essai.html`) mais aucune impression n'a été faite. Décision : portrait (bi-ligne `P` + `08h42` tient dans 14mm en 8pt condensé). Si l'impression montre un problème, passer au paysage avec un `@page` landscape.

### formatTau en "h" pour le rapport (pas ":" comme screen-scan)
Le format d'heure dans le tableau du rapport suit le document source qui montre "08h42" (avec "h"). L'écran de scan utilise "08:42" (avec ":"). Les deux `formatTau` sont dupliqués (`screen-scan.js` et `screen-report.js`) avec des séparateurs différents. Décision : suivre la spec pour chaque contexte.

### screenReport synchrone (pas async)
Contrairement à `screenScan` qui est async (démarrage caméra), `screenReport` n'a aucune opération asynchrone : elle lit les pointages depuis une Map en mémoire et génère du HTML. Décision : fonction synchrone, retourne un contrôleur avec `refresh()`. Si une étape future nécessite de charger des pointages depuis IndexedDB, l'appelant fera l'await avant d'appeler `screenReport`.

### Logos manquants : visuel 3D + QR décoratif
La spec §10 décrit un visuel 3D + QR décoratif en haut à droite. L'image n'a pas été fournie dans le .docx source. `assets/logos.js` exporte `LOGO_3D = null`. Le rendu ignore ce logo (pas d'élément `<img>` manquant). Si le fichier est fourni plus tard, l'ajouter.

## Écarts assumés par rapport à la spec

### `norm()` — remplacement des apostrophes courbes (§5 A1)
La formalisation définit `norm = trim ∘ squeeze ∘ lowerInvariant ∘ stripDiacritiques ∘ NFKD` sans prétraitement des apostrophes. Or `ANYOUZO'A` ν2 contient U+2019, qu'un clavier d'ordinateur ne tape pas. Un opérateur cherchant `anyouzo'a` (apostrophe droite U+0027) ne trouverait jamais ν2.

Décision (spécifiée dans la SPEC §5 A1 « Cas limites », confirmée par PATCH v1.1) : ajouter `.replace(/[’‘]/g, "'")` **avant** NFKD. C'est un écart délibéré, documenté ici pour qu'une session future ne le « corrige » pas en revenant à la formalisation.

## Dettes / TODO laissés derrière

- `hydrateConfig()` sera appelée par `main.js` (étape 10+) — pour l'instant `_overrides` reste vide.
- `precalcChecksums()` sera appelée par `main.js` (étape 10+) — pour l'instant les tests l'appellent manuellement.
- `js/model/lattice.js` référence `@typedef {import('../data.js').PointageValue}` mais `PointageValue` n'est défini nulle part en JSDoc (la spec §4.2 le donne en commentaire uniquement). Sans conséquence runtime, mais un `@typedef` dans `data.js` serait bien.
- `store.js` importe `getConfig()` (dépendance déclarée) mais ne l'utilise pas encore — nécessaire pour `reg` si `DEFAULTS` influence le comportement plus tard.
- `deletePointage()` dans `store.js` est exporté inutilisé — réservé pour l'étape 13+ (écran Liste, reset de pointage).
- `camera.js` importe `getConfig()` mais les tests Node ne peuvent pas vérifier `captureROI` et `lancerBoucle` (manque DOM/getUserMedia). Vérification uniquement du typage des exports.
- `decode.js` n'est pas testable en Node — `ImageData` inexistant, `BarcodeDetector` inexistant. Le test `decode(bruit) → null` ne tourne que dans un navigateur.
- `pipeline.js` branche 1 (decode réel + ImageData noise) ne tourne qu'au navigateur. Les branches 2-5 utilisent `_decode` injectable, testables en Node.
- `pipeline.js` n'appelle pas `roi()` — cohérent avec le fait que `camera.js` livre déjà l'ImageData rogné. Si l'étape 9 ou 13 appelle `Scan()` sans passer par `camera.js`, l'image ne sera pas rognée. Ce n'est pas un bug tant que l'appelant applique ROI avant.
- `screen-scan.js` : les tests DOM (structure, bouton, sélecteur) ne tournent qu'au navigateur (manque `document.createElement` en Node). Les 4 tests P2/P3/P15/P16 ne peuvent pas être vérifiés en CLI — seulement via `http://localhost:8000/test/index.html`.
- `report.js` : `cle()` est une fonction privée (non exportée) dupliquée de `pipeline.js` — les deux construisent la même clé `"id|date|creneau"`. Si une refactor future exporte `cle()` d'un module commun, les deux appels devront être mis à jour simultanément.
- `report.js` : `finDe` calcule la fin de matin à H_BASCULE et midi à H_FIN_MIDI. Si une étape future ajoute un créneau (ex. `soir`), `finDe` et `slotsEchus` devront être adaptées.
- `assets/logos.js` : `LOGO_3D = null` (visuel 3D + QR décoratif non fourni). Ajouter l'image base64 si elle est extraite du .docx.
- `screen-report.js` : `formatTau` dupliqué depuis `screen-scan.js` avec un séparateur "h" au lieu de ":". Si une refactor future centralise les formats, rapprocher les deux.
- `screen-report.js` : le choix portrait/paysage n'a pas été mesuré sur impression réelle. Vérifier sur une vraie imprimante avant le jour J. Si ça ne tient pas, ajouter une classe `.landscape` et changer `@page`.
- `css/app.css` : les écrans autres que le rapport (scan, liste) n'ont pas encore de styles. Le fichier ne contient que les styles du rapport.

## Pièges rencontrés

1. **Apostrophe U+2019 dans le copier-coller.** Le fichier `data.js` doit contenir l'apostrophe typographique U+2019 et non U+0027. Le test `ν2 contient U+2019` la détecte. Au clavier, difficile à taper : utiliser `\u2019`.
2. **`file://` et modules ES.** Les tests ne s'ouvrent pas en `file://` — toujours utiliser le serveur HTTP Python. Ne pas perdre de temps à debugger CORS en local.
3. **Node.js et imports ESM `.js`.** Node requiert un `package.json` avec `"type":"module"` pour importer des fichiers `.js` contenant des `export`/`import`. Sans ça, tout est traité en CJS. La façon la plus propre est de créer `package.json` temporairement pour les runs CLI, ou d'utiliser le navigateur.
4. **`Object.freeze` est superficiel.** `DEFAULTS.DATES` est un tableau gelé en référence, mais ses éléments ne le sont pas. Pour l'étape 1, c'est suffisant car `DATES` n'est jamais modifié.
5. **`crypto.subtle.digest` est async.** `checksum` et `payload` retournent des Promises. `valider` reste synchrone car elle lit `CHECKSUMS` pré-calculée. Ne pas oublier d'`await` les appels à `payload` ou `checksum` dans les étapes suivantes.
6. **Base32 alphabet.** L'alphabet de la spec est `"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"` (RFC 4648, sans padding). Attention à ne pas utiliser un alphabet Base32 URL-safe ou hex qui changerait les checksums et invaliderait tous les badges imprimés.
7. **Taux de détection probabiliste.** Le test « faux positifs < 20 sur 10⁴ » peut techniquement échouer une fois sur des millions de runs (probabilité ~10⁻¹⁶). Si ça arrive, relancer.
8. **IndexedDB : fermeture avant fin de transaction.** `reg` et `cancel` écrivent en IndexedDB. Si on ferme la DB (`close()`) avant la fin de la transaction, l'écriture est perdue. Solution : `await` systématique des appels à `savePointage()` dans `reg`/`cancel`, et `await store.reg(...)` avant `store.close()`.
9. **Noms de base uniques par test.** Les tests de persistance ouvrent/ferment/ré-ouvrent la même base. Si deux tests partagent le même nom de base, l'état IndexedDB peut contaminer l'autre test. Solution : chaque test génère un nom unique (`bim-test-{timestamp}-{random}`) et le supprime en sortie.
10. **`replaceAll` sur `s.reg(` crée des doubles `await`.** En faisant `replaceAll("s.reg(", "await s.reg(")`, une ligne déjà `await s.reg(` devient `await await s.reg(`. Solution : vérifier le fichier après remplacement global.
11. **Conversion UMD → ES module pour jsQR.** Le fichier jsQR est 10102 lignes. Le convertir demande de modifier la ligne 1 (supprimer le wrapper UMD) et la toute dernière ligne (ajouter `export default`). Le webpack bootstrap doit être exécuté et son résultat exporté : `const _jsQR = (function() { … })(); export default _jsQR;`. Ne pas toucher aux modules webpack internes.
12. **Tests de décodage et caméra impossible en Node.** `ImageData`, `navigator.mediaDevices.getUserMedia`, `BarcodeDetector` sont des API navigateur. Les tests C2/C1 de l'étape 6 ne tournent pas en Node — seulement le navigateur ou un test unitaire partiel (debounce uniquement). Pour une CI sans navigateur, la sortie Node des 7 tests debounce + 2 tests d'existence d'export est la meilleure approximation.
13. **`window` non défini en Node → ReferenceError.** En écrivant `window.AudioContext` dans `initAudio()`, le module planta en Node (test line). Solution : `typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)`.
14. **`globalThis.navigator` en Node est un getter read-only.** Impossible de l'assigner directement pour mocker `navigator.vibrate`. Solution : `Object.defineProperty(globalThis, 'navigator', { configurable: true, get: () => ({ vibrate: fn }) })`.
15. **Les nœuds texte entre `<tr>` dans `<thead>` cassent `:last-child` et `nth-child`.** Le sélecteur CSS `thead tr:last-child` ne trouve aucun élément car le dernier enfant de `<thead>` est un nœud texte (saut de ligne). Solution : utiliser `thead > tr` (qui ignore les nœuds texte) puis indexer par position, ou utiliser `:last-of-type`.
16. **`rowspan=16` est dans le `tbody` (1ʳᵉ ligne), pas dans le `thead`.** La spec dit « N° a rowspan=16 » — c'est une fusion verticale des 16 lignes du corps du tableau. Dans le `thead`, N°/THÈMES/LIEU/EFFECTIFS ont `rowspan=2` (les 2 lignes d'en-tête). Confusion facile : vérifier où est la rangée qui a 16 éléments avant d'écrire les tests.
17. **Playwright ne peut pas se connecter au serveur HTTP Python si le serveur est tué entre deux appels bash.** Le serveur python3 doit survivre entre les appels `bash` du domaine. Utiliser `nohup` avec `--directory` ou utiliser le même appel bash pour lancer le serveur ET le test.

## Prochaine étape

**Étape 12** — `badges.js` — planche A4 de 16 QR en version 1-Q.
Ce qu'elle attend de l'existant :
- `ident.js` (`payload()`, `idDe()`, `CHECKSUMS`) pour les données des badges
- `data.js` (`PARTICIPANTS`) pour les 16 noms
- `config.js` (`getConfig()` → `QR_EC`, `PREFIXE_ID`, `BADGES_PAR_PAGE`) pour les réglages QR
- `vendor/qrcode.js` (génération QR, à vendoriser)
- `css/app.css` (les styles `@media print` existent déjà depuis l'étape 11)
- Pas besoin de : `store.js`, `camera.js`, `pipeline.js`, `feedback.js`, `screen-scan.js`, `screen-report.js`, `report.js`, `lattice.js`, `slots.js`, `norm.js`
