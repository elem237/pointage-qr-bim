# État du projet — Pointage QR BIM

## Étapes terminées

| # | Étape | Fichiers | Tests | Date |
|---|---|---|---|---|
| 1 | `config.js`, `data.js`, `norm.js` + harnais | `js/config.js`, `js/data.js`, `js/model/norm.js`, `test/index.html`, `test/harness.js`, `test/norm.test.js`, `test/data.test.js`, `test/config.test.js` | 16/16 | 2026-07-15 |
| 2 | `ident.js` (A2, A3, A4) 🔴 — payload + valider | `js/model/ident.js`, `test/ident.test.js` | 33/33 | 2026-07-15 |

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

### `valider` hardcode `'BIM26-'` dans la REGEX
La spec §A4 donne `REGEX = /^BIM26-([0-9]{3})-([A-Z2-7]{2})$/`. Idem pour `id = 'BIM26-' + m[1]`. Ce n'est PAS paramétré par `PREFIXE_ID`. Raison : si PREFIXE_ID change, le format QR change, et la REGEX doit être réécrite de toute façon — ce n'est pas un réglage runtime. Décision : suivre la spec à la lettre, hardcoder.

## Écarts assumés par rapport à la spec

### `norm()` — remplacement des apostrophes courbes (§5 A1)
La formalisation définit `norm = trim ∘ squeeze ∘ lowerInvariant ∘ stripDiacritiques ∘ NFKD` sans prétraitement des apostrophes. Or `ANYOUZO'A` ν2 contient U+2019, qu'un clavier d'ordinateur ne tape pas. Un opérateur cherchant `anyouzo'a` (apostrophe droite U+0027) ne trouverait jamais ν2.

Décision (spécifiée dans la SPEC §5 A1 « Cas limites », confirmée par PATCH v1.1) : ajouter `.replace(/[’‘]/g, "'")` **avant** NFKD. C'est un écart délibéré, documenté ici pour qu'une session future ne le « corrige » pas en revenant à la formalisation.

## Dettes / TODO laissés derrière

- Aucun pour l'étape 1.
- `hydrateConfig()` sera appelée par `main.js` à l'étape 4 — pour l'instant `_overrides` reste vide.
- `precalcChecksums()` sera appelée par `main.js` à l'étape 4 — pour l'instant les tests l'appellent manuellement.

## Pièges rencontrés

1. **Apostrophe U+2019 dans le copier-coller.** Le fichier `data.js` doit contenir l'apostrophe typographique U+2019 et non U+0027. Le test `ν2 contient U+2019` la détecte. Au clavier, difficile à taper : utiliser `\u2019`.
2. **`file://` et modules ES.** Les tests ne s'ouvrent pas en `file://` — toujours utiliser le serveur HTTP Python. Ne pas perdre de temps à debugger CORS en local.
3. **Node.js et imports ESM `.js`.** Node requiert un `package.json` avec `"type":"module"` pour importer des fichiers `.js` contenant des `export`/`import`. Sans ça, tout est traité en CJS. La façon la plus propre est de créer `package.json` temporairement pour les runs CLI, ou d'utiliser le navigateur.
4. **`Object.freeze` est superficiel.** `DEFAULTS.DATES` est un tableau gelé en référence, mais ses éléments ne le sont pas. Pour l'étape 1, c'est suffisant car `DATES` n'est jamais modifié.
5. **`crypto.subtle.digest` est async.** `checksum` et `payload` retournent des Promises. `valider` reste synchrone car elle lit `CHECKSUMS` pré-calculée. Ne pas oublier d'`await` les appels à `payload` ou `checksum` dans les étapes suivantes.
6. **Base32 alphabet.** L'alphabet de la spec est `"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"` (RFC 4648, sans padding). Attention à ne pas utiliser un alphabet Base32 URL-safe ou hex qui changerait les checksums et invaliderait tous les badges imprimés.
7. **Taux de détection probabiliste.** Le test « faux positifs < 20 sur 10⁴ » peut techniquement échouer une fois sur des millions de runs (probabilité ~10⁻¹⁶). Si ça arrive, relancer.

## Prochaine étape

**Étape 3** 🔴 — `js/model/lattice.js` (rang, join, fusion).
Ce qu'elle attend de l'existant :
- `js/data.js` pour `PARTICIPANTS` (utilisé indirectement via les clés)
- `js/model/ident.js` pour `idDe()` et `IDS_CONNUS` (pour générer les clés de test)
- `test/harness.js` pour le lanceur
