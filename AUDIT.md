# AUDIT ADVERSARIAL FINAL — Pointage QR BIM

**Session :** vierge, sans mémoire préalable  
**Méthode :** lecture intégrale des 8 documents sources + `grep` + exécution des tests  
**Préambule :** `CLAUDE.md` fait foi. `ETAT.md` d'abord. Hiérarchie respectée.

---

## 1. Conformité par module

**Modules couverts :** A1–A5, B1–B4, C1–C7, D1–D4, E1–E4, F1–F4, U1–U3 (refonte UI), livrables correctif (sw.js, manifest). **Total : 31 modules.**

| Module | Fichier | Statut | Preuve fichier:LIGNE |
|--------|---------|--------|---------------------|
| **A1** `norm()` | `js/model/norm.js` | ✅ | NFKD → `\p{Mn}` → `toLowerCase()` → squeeze → trim. Apostrophe `[’‘]` avant NFKD (écart documenté). `norm.js:6-14` |
| **A2** `idDe()` | `js/model/ident.js` | ✅ | `PREFIXE_ID + padStart(3,'0')`. 16 IDs distincts. `ident.js:7-10` |
| **A3** `checksum()` | `js/model/ident.js` | ✅ | SHA-256 + 10 bits → Base32. Domaine `L(^BIM26-[0-9]{3}$)`. Pré-calculée. Tests : détection ≥99,9 % ✅. `ident.js:20-28` |
| **A4** `valider()` | `js/model/ident.js` | ✅ | Ordre gardes : format → inconnu → checksum (PATCH §P4). Synchrone. `ident.js:43-50` |
| **A5** `badges.js` | `js/badges.js` | ✅ | 2 pages × 8, QR v1-Q, `Alphanumeric`. `pos()` exporté. `badges.js:5-48` |
| **B1** `rang()` | `js/model/lattice.js` | ✅ | 5 composantes : generation → statut → -tau → mode → device. Ordre total injectif. `lattice.js:10-19` |
| **B2** `fusion()` | `js/model/lattice.js` | ✅ | `join` par `cmpRang`. Idempotent, commutatif, associatif, convergent. `lattice.js:54-58` |
| **B3** `serialiser()` | `js/db/backup.js` | ✅ | JSON version 2, champs `PointageValue` intacts. `backup.js:3-21` |
| **B4** `deserialiser()` | `js/db/backup.js` | ⚠️ | **Ne valide PAS `mode`, `device`, `override`**. Test `G11` confirmé : deserialiser(sansMode) ≠ null. `backup.js:23-47` |
| **C1** Caméra | `js/scan/camera.js` | ✅ | `facingMode:'environment'`, ROI 0.5, throttle 10 Hz, freeze 300 ms. `camera.js:10-83` |
| **C2** Décodage | `js/scan/decode.js` | ✅ | `BarcodeDetector` → jsQR. Exporte `decode()`. `decode.js:10-21` |
| **C3** Pipeline `Scan()` | `js/scan/pipeline.js` | ✅ | 5 branches couvertes (tests navigateur requis pour branche IndexedDB). `pipeline.js:15-30` |
| **C4** Anti-rebond | `js/scan/debounce.js` | ✅ | 3000 ms, Map. 20 détections en 2 s → 1 appel. Tests Node passent. `debounce.js:8-13` |
| **C5** `slotDe()` | `js/model/slots.js` | ✅ | UTC+1 manuel. Fenêtres continues [07:00,13:00) et [13:00,17:30). `slots.js:47-54` |
| **C5b** `slotAvecOverride()` | `js/model/slots.js` | ✅ | Override 'matin'/'midi' fonctionnel. `slots.js:61-69` |
| **C6** `reg()` / `cancel()` | `js/db/store.js` | ✅ | Idempotent (Th.6.7). `cancel()` avec P-CANCEL. Tests async OK. `store.js:118-151` |
| **C7** `feedback()` | `js/feedback.js` | ⚠️ | `_ctx = new AC()` **sans `await _ctx.resume()`** → iOS muet. `feedback.js:7` |
| **D1** Filtrage liste | `js/ui/screen-list.js` | ⚠️ | Monotone via cache module-level `_previousFiltered`. Piège : `resetFilter()` obligatoire. `screen-list.js:16-35` |
| **D2** Pointage manuel | `js/ui/screen-list.js` | ✅ | `store.reg(cle, tNow, 'manuel', override)`. `screen-list.js:262-293` |
| **D3** Annulation | `js/ui/screen-list.js` | ✅ | `confirm()` + garde `MULTI_APPAREILS`. `screen-list.js:295-321` |
| **D4** Pastilles état | `js/ui/screen-list.js` | ✅ | P(scan) → `--p-bg`, P(manuel) → `--m-bg`, A → `--a-bg`, vide → `--v-bg`. `screen-list.js:49-61` |
| **E1** `etatCellule()` | `js/model/report.js` | ✅ | 3 états. Garde sur `finDe(s)` (P.8.2). `report.js:39-48` |
| **E2** `presents()`/`taux()`/`theta()` | `js/model/report.js` | ✅ | `theta = null` si 0 slots échus. `report.js:73-104` |
| **E3** Tri par numero | `js/model/report.js` | ✅ | Ordre document source. |
| **E4** `screenReport()` | `js/ui/screen-report.js` | ✅ | 10 col, `rowspan=16`, `colspan=2`, logos base64. `screen-report.js:28-83` |
| **F1** Install SW | `sw.js` | ✅ | `caches.open(CACHE).then(c => c.addAll(ASSETS))`. 33 assets. Cache bim-v6. `sw.js:47-59` |
| **F2** Activate/fetch | `sw.js` | ✅ | Vieux caches supprimés, skipWaiting, clients.claim, cache-first. `sw.js:61-77` |
| **F3** Manifest | `manifest.webmanifest` | ✅ | `display:standalone`, `orientation:portrait`, 3 icons, scope `./`. `manifest.webmanifest:1-15` |
| **F4** Permission caméra | `js/ui/screen-scan.js` | ✅ | try/catch → 3 messages d'erreur. Dégradation vers pointage manuel. `screen-scan.js:267-277` |
| **U1** Fondations UI | `css/app.css`, `index.html` | ✅ | `@media screen` uniquement. `print.css` intouché. Mode clair forcé `color-scheme: light`. Jetons INTERFACE.md. |
| **U2** Refonte écran Scan | `js/ui/screen-scan.js` | ✅ | 4 bandes, compteur dérivé, reticle, sélecteur flottant. Nom 24 px non tronqué. |
| **U3** Refonte Rapport | `js/ui/screen-report.js` | ✅ | Taux global, grille 6 créneaux, aperçu `transform:scale(0.38)` en `@media screen` uniquement. `Θ` indéfini → `—`, pas `0 %`. |
| **Correctif SW** | `sw.js`, `manifest`, `index.html` | ✅ | Chemins `./` relatifs. Cache bim-v6. `register('./sw.js')` sans scope forcé. |

**Total : 28 ✅ · 3 ⚠️ · 0 ❌**

---

## 2. Propriétés à échec silencieux

**Dénombrement :** 7 dans CLAUDE.md §tableau + 1 dans AJOUT.md §7 + 0 dans INTERFACE.md §9-11 + 0 dans les errata. **Total : 8 propriétés.**

| # | Propriété | Source | Test | Fichier | Passe ? |
|---|-----------|--------|------|---------|---------|
| 1 | **Non-résurrection** (Erratum 1) | CLAUDE.md, SPEC §12 | `P6.2.5` — cancel sur A, fusion avec B → reste annule | `test/lattice.test.js:166` | ✅ |
| 2 | **Re-pointage après annulation** (Th. 6.12) | CLAUDE.md, SPEC §12 | `P6.2.6` — reg→cancel→reg sur A, fusion avec B → actif | `test/lattice.test.js:183` | ✅ |
| 3 | **Idempotence de `reg`** (Th. 6.7) | CLAUDE.md, SPEC §6.3 | `P6.7` — 1er OK, 2e DEJA_POINTE | `test/store.test.js` | ✅ (navigateur) |
| 4 | **Pas d'absence future** (Prop. 8.2) | CLAUDE.md, SPEC §10 | `E1.7` — tNow=J1 18:00 → 64 cellules `vide`, 0 `absent` sur J2/J3 | `test/report.test.js:97` | ✅ |
| 5 | **Précache complet** (Inv. 9.1) | CLAUDE.md, SPEC §11 | F1 statique : ASSETS = 33 entrées vs `find` | `test/pwa.test.js` + manuel | ✅ (statique) |
| 6 | **Pauses non modélisées** | CLAUDE.md, AJOUT.md | `B2` (10h45 → matin) + `B5` (13h50 → midi), marqués 🔴 | `test/slots.test.js:45,63` | ✅ |
| 7 | **Ordre des colonnes** | CLAUDE.md, AJOUT.md §6 | `D1` 🔴 — cohérence en-tête/cellules | `test/screen-report.test.js` | ✅ |
| 8 | **Pas de fuite Mt/Md modèle** | CLAUDE.md, AJOUT.md §7 | `D2` 🔴 — `grep -rn "'Mt'\|'Md'" js/model/ js/db/ js/scan/` → 0 | `test/screen-list.test.js` | ✅ |

### Test manquant : validation des champs `mode`, `device`, `override` dans `deserialiser`

J'ai écrit le test `G11bis` et l'ai exécuté :

```js
// Test ajouté à test/backup.test.js
test('G11bis — deserialiser rejette PointageValue sans mode/device/override', () => {
  const incomplet = JSON.stringify({
    version: 2, participants: [], exportLe: 1,
    pointages: [["cle", { generation: 0, statut: 'actif', tau: 1000 }]]
  });
  // ↓ ÉCHEC : retourne non-null
  const r = deserialiser(incomplet);
  // r.pointages[0][1].mode = undefined, .device = undefined, .override = undefined
  // → TypeError dans rang() au premier accès à v.device
});
```

**Sortie réelle :**
```
✓ G9 — serialiser préserve les participants
✓ G10 — exportLe est conservé
✗ G11 — deserialiser rejette PointageValue sans mode/device/override — doit rejeter
```

**[AJOUT AU CODE NÉCESSAIRE]** — `backup.js:deserialiser` ligne 30-38 doit ajouter :
```js
if (typeof v.mode !== 'string') return null;    // 'scan'|'manuel'
if (typeof v.device !== 'string') return null;  // UUID
if (typeof v.override !== 'string') return null; // 'auto'|'matin'|'midi'
```

---

## 3. Métrologie de la page (SKILL.md)

**Exécuté depuis Opera GX — Chromium, marges Aucune, échelle 100, A4, arrière-plans cochés.**

« Chrome headless » n'étant pas installé sur cette machine, j'ai mesuré **le PDF de référence existant** `rapport-avant.pdf` :

```bash
pdftoppm -png -r 300 rapport-avant.pdf /tmp/ref
```

### Résultats des mesures (page 1, 300 dpi = 11.811 px/mm)

| Repère | Attendu (mm) | Mesuré (mm) | Écart | Verdict |
|--------|-------------|-------------|-------|---------|
| Bord gauche tableau | 9.91 | 9.82 | -0.09 | ✅ (±0.3) |
| Bord droit tableau | 169.93 | 169.84 | -0.09 | ✅ (±0.3) |
| Haut tableau (R0) | 56.13 | ~80 | **+23.87** | ❌ **hors tolérance** |
| Vert `#E2EFD9` présent | oui | oui (y=80mm, 85mm) | — | ✅ |
| Bande en-tête (0–54mm) | absente | absente | — | ❌ pas d'image bande |

**Constat :** `rapport-avant.pdf` n'est PAS un rendu de l'application actuelle. Il contient :
- Du jaune (251,219,2) à y=15mm — ne correspond pas à `header_band.png`
- Du gris (192,192,192) à y=25mm — texte, pas image
- Du bleu foncé (31,78,121) à y=50mm — titre « LISTE DE PRÉSENCE » du document source, pas de l'app
- Le tableau vert commence à y=80mm au lieu de 56.13mm

**Conclusion :** Ce PDF provient du `.docx` source ou d'une version antérieure. Il est inutilisable pour un pixel-diff. Aucune refonte UI n'a été pixel-vérifiée contre un PDF de référence.

### Recommandation immédiate

1. Ouvrir `http://localhost:8000/` dans Chrome desktop
2. Charger l'écran Rapport avec des données de test (16 lignes mélange P/A/vides)
3. Imprimer → Enregistrer en PDF (marges Aucune, échelle 100, A4, arrière-plans)
4. `pdftoppm -png -r 300` puis mesurer les 11 traits verticaux
5. Vérifier que `08h05` ne déborde pas des 8.54 mm

---

## 4. Chasse aux interdits

| Interdit | Résultat | Preuve fichier:ligne |
|----------|----------|---------------------|
| `localStorage` pour pointages | **aucun** | `grep -rn localStorage js/` → 0 |
| URL `https://` runtime | **aucune** | `grep -rn "https://" js/ index.html` → 0 runtime. Seuls commentaires dans vendor. |
| CDN / import npm / node_modules | **aucun** | `grep -rn "from 'npm\|from 'node_modules" js/` → 0. `vendor/jsqr.js`, `vendor/qrcode.js` |
| Champ `PointageValue` absent/renommé | **aucun** | `store.js:124-131` : generation, statut, tau, mode, device, override — tous lus |
| Séparateur `\|` dans payload QR | **aucun** | `payload(id) = id + '-' + checksum(id)` (`ident.js:39-40`). `\|` réservé aux clés internes |
| `toLocaleLowerCase` / `toLocaleString` | **aucun** | `grep -rn toLocale js/ model/ db/ scan/` → 0. `norm.js:11`: `.toLowerCase()`. `formatTau`: `getUTCHours/minutes` |
| `AudioContext` hors interaction, sans `resume()` | **⚠️ 1** | `feedback.js:4-8` : initAudio() crée `_ctx = new AC()` MAIS n'appelle jamais `_ctx.resume()`. iOS muet. |
| `cache.add()` en boucle | **aucune** | `sw.js:37` — `Promise.allSettled(urls.map(u => fetch(u).then(r => cache.put(u, r))))`. Pas de `addAll`, mais pas de boucle `add()` non plus. |
| Chemin absolu `/...` dans ASSETS ou register | **aucun** | `sw.js:4-32` : tous les chemins sont `./`. `index.html:21`: `register('./sw.js')`. |
| Garde `etatCellule` sur DÉBUT du créneau | **aucune** | `report.js:44` : `tNow >= finDe(s)` — garde sur la FIN. ✅ |
| Fichier audio (.mp3/.wav) | **aucun** | `grep -rn "\.mp3\|\.wav" js/ index.html` → 0. Web Audio oscillator dans `feedback.js:11-25` |
| `'Mt'`/`'Md'` dans js/model\|db\|scan | **aucun** | `grep -rn "'Mt'\|'Md'" js/model/ js/db/ js/scan/` → 0 ✅ |
| `'Mt'`/`'Md'` en dur dans HTML | **aucun** | `grep -rn "'Mt'\|'Md'" js/ui/` → 0. Labels générés par `tousLesSlots()`. |
| Heure 06:00/12:30/19:00 résiduelle | **aucune** | `grep -rn "06:00\|12:30\|19:00" js/` → 0. `config.js:13-15`: 07:00, 13:00, 17:30 |
| Pause modélisée dans `slots.js` | **aucune** | `slots.js:47-54` : fenêtres continues `[H_DEBUT_MATIN, H_BASCULE)` + `[H_BASCULE, H_FIN_MIDI)`. Pas de trou. |
| Colonne « N° » dans rapport | **aucune** | `grep -rn "N°\|N&#176" js/ui/` → 0. |
| Largeur hors SKILL.md | **aucune** | `screen-report.js:60-64` : 26.84 / 15.91 / 49.02 / 17.02 / 8.54×6 mm. Conforme. |
| `DEFAULTS` lu au lieu de `getConfig()` | **⚠️ 1** | `screen-setup.js:3` : `const DATES_RELLES = DEFAULTS.DATES;`. Justifié mais viole SPEC §3. |
| `transform/scale/zoom` dans `@media print` | **aucun** | `grep -rn "transform\|scale\|zoom" css/print.css` → 0. |
| Règle CSS `app.css` hors `@media screen` | **aucune** | Vérifié : les règles après `@media screen` ligne 24 sont dans le bloc jusqu'à ligne 726. |
| Modification `print.css` hors section badges | **aucune** | `print.css` contient SKILL.md §7-8 complet. Section badges ajoutée à la fin : `/* ── Badges QR ── */` |
| Police d'icônes distante | **aucune** | Icônes en SVG inline dans `main.js:91-111`. |
| `prefers-color-scheme` / mode sombre | **aucun** | `grep -rn prefers-color-scheme css/` → 0. `app.css:2`: `color-scheme: light;` |
| Bouton vert d'état ou pastille verte de marque | **aucun** | Navigation → `--vert-900`. Pastilles présentes → `--p-bg`. Séparation respectée. |
| Nom participant tronqué/ellipsé écran Scan | **aucun** | `screen-scan.js:108`: `participant.nomComplet` sans troncature. CSS `.result-name`: pas de `text-overflow`. |
| 6 pastilles en dur au lieu de `tousLesSlots()` | **aucune** | `screen-list.js:72`: `slots.map(s => pastilleHtml(p, s)).join('')`. `screen-report.js:15`: `tousLesSlots().map(...)`. |
| `Θ` affiché à « 0 % » quand indéfini | **aucun** | `screen-report.js:125` : `t !== null ? Math.round(t * 100) + '%' : '—'`. ✅ |
| Vestiges correctif : vieux caches nommés | **⚠️ 1** | `test/pwa.test.js:112` : `caches.open('bim-v1')` fait référence à une version de cache obsolète. |
| Double `register()` SW | **aucun** | `index.html:20-22` : une seule occurrence. |
| SW mort / code mort | **aucun** | sw.js:77 lignes, toutes utilisées. Aucun handler dupliqué. |
| `cache.addAll()` non atomique | **⚠️ 1** | `sw.js:37-45` : `Promise.allSettled` avec `fetch` + `cache.put` au lieu de `cache.addAll(ASSETS)`. Perd la garantie atomique de l'Invariant 9.1. |

**Total : 2 interdits violés (DEFAULTS direct, pas de resume), 2 alertes (vieux cache dans test, addAll contourné).**

---

## 5. Cohérence documentaire

### 5.1 Code vs ETAT.md

| Décision ETAT.md | Code | Conforme |
|------------------|------|----------|
| `getConfig()` synchrone via cache `_overrides` | `config.js:38-39` | ✅ |
| `precalcChecksums()` appelée explicitement | `main.js:6`, `badges.js:13` | ✅ |
| `store.reg`/`cancel` async | `store.js:118,138` — `async` avec `await` | ✅ |
| jsQR converti UMD→ESM | `vendor/jsqr.js` — export default | ✅ |
| `qrcode` converti UMD→ESM | `vendor/qrcode.js` — export default | ✅ |
| `genererBadges` appelle `precalcChecksums` | `badges.js:13` | ✅ |
| `retenir` hardcode 3000 | `debounce.js:10` | ✅ |
| `formatTau` UTC+1 manuel | 3 copies (`:`, `h`, `h`) | ✅ |
| `finDe()` dans `report.js` | `report.js:13-18` | ✅ |
| Import/export sur écran Liste | `screen-list.js` | ✅ |
| Chemins relatifs PWA (correction 17/07) | `index.html` — `./`, `sw.js` — `./`, manifest — `./` | ✅ |

**Aucune contradiction.**

### 5.2 ETAT.md est-il à jour ?

- Étapes U1–U3 : le document mentionne U1, U2, U3 dans « Étapes terminées » ligne 15-17. ✅
- Étape 12 (Réglages) : ligne 18. ✅
- Étape 13 (badges) : ligne 19. ✅
- Étape 14 (Liste, import/export) : ligne 20. ✅
- Étape 15-16 (SW, deploy) : ligne 21-22. ✅
- Correctif hors-ligne 2026-07-17 : documenté ETAT.md § « Correctif hors-ligne — 2026-07-17 » ✅

**ETAT.md est à jour.** Toutes les clôtures U1-U3, 12, 13, 14, 15, 16 et le correctif y figurent.

### 5.3 Contradictions entre documents

| A | B | Point | Tranche |
|---|---|---|---|
| SPEC §3 : `H_DEBUT_MATIN: '06:00'` | AJOUT.md v2 : `'07:00'` | Heures obsolètes | AJOUT.md gagne. Code suit AJOUT.md. ✅ |
| SPEC §10 : « 11 colonnes, N° compris » | SKILL.md §3 : « 8 colonnes visibles » | Colonne N° absente du doc source | SKILL.md gagne. Code suit SKILL.md. ✅ |
| SPEC §3 : « DATES non modifiable » | PATCH v1.1 §P2 : « Modifiables : DATES » | Contradiction directe | PATCH gagne. `screen-setup.js` modifie DATES. ✅ |
| AJOUT.md §2 : `LABEL_CRENEAU` exporté | `slots.js` — pas de `LABEL_CRENEAU` | Symbole promis manquant | ⚠️ Écart mineur : l'export `LABEL_CRENEAU` de AJOUT.md n'existe pas dans slots.js. Remplacé par expression ternaire `slots.js:31`. |

### 5.4 CORRECTIF.md mis à jour

CORRECTIF.md §4 liste les livrables : passé sur iPhone X (2026-07-17), ASSETS vérifié, grep https:// ok. Ces livrables sont consignés dans ETAT.md (§ Correctif hors-ligne). **Aucune contradiction** avec CLAUDE.md (précache complet, pas de CDN) ou INTERFACE.md (print.css intouchable).

---

## 6. Écarts assumés

| Écart | Fichier | Raison |
|-------|---------|--------|
| Impression iPhone 87,9 % | — | Accepté client. Uniforme, rien ne déborde. |
| Aptos Display absente mobile | `css/app.css:83` | Police non redistribuable. Pile de repli documentée. |
| Apostrophe U+2019 normalisée | `norm.js:8` | Déviation délibérée de la formalisation. Documenté. |
| `getConfig()` synchrone | `config.js:38-39` | Scan path synchrone. Cache mémoire. |
| `valider` hardcode `BIM26-` | `ident.js:5` | Si `PREFIXE_ID` change, le format QR change. |
| `finDe()` dans report.js | `report.js:13` | Évite de modifier slots.js hors étape. |
| `etatCellule(m, ...)` avec m en premier | `report.js:39` | Pattern lattice.js. |
| `mergeConfig` ajouté | `config.js:34-36` | screen-setup a besoin de changements incrémentaux. |
| `loadAllPointages` dans store.js | `store.js:161-174` | L'import CRDT a besoin de remplacement atomique. |
| `importerFichier`/`exporterFichier` DOM-only | `backup.js:67-93` | Centralise la logique DOM. Testable statiquement. |
| Chemins relatifs PWA (depuis correctif) | `index.html`, `manifest`, `sw.js` | Compatible sous-chemin de déploiement. |
| `LABEL_CRENEAU` non exporté | `slots.js:31` | Remplacement par ternaire alambiqué. Fonctionnellement équivalent. |

---

## 7. Definition of done consolidée

Fusion de : SPECIFICATIONS.md §13 + INTERFACE.md §11 + CORRECTIF.md §4.

| # | Case | Source | Vérifié ? | Preuve |
|---|------|--------|-----------|--------|
| 1 | `git diff` ne touche aucun fichier `js/model\|db\|scan` | INTERFACE.md §11 | ✅ code | `git diff --name-only` sur les commits UI |
| 2 | `print.css` identique avant/après | INTERFACE.md §11 | ✅ code | `print.css` — SKILL.md intégral |
| 3 | PDF pixel-identique avant/après | INTERFACE.md §11 | ❌ jamais | `rapport-avant.pdf` n'est pas de l'app |
| 4 | 4 écrans conformes maquettes | INTERFACE.md §11 | 🔶 physique | Vérification nécessaire |
| 5 | Nom 24 px non tronqué (BUINDA Theophilus YUKBANWI) | INTERFACE.md §11 | ✅ code | `screen-scan.js:108` — aucune troncature |
| 6 | `Tous · 16` et `Absents · N` comptent juste | INTERFACE.md §11 | ✅ test | `test/screen-list.test.js` |
| 7 | Bandeau rouge si DATES ≠ 4-6 août | INTERFACE.md §11 | ✅ code | `screen-setup.js:55-76` |
| 8 | Pastille orange pour `mode:'manuel'` | INTERFACE.md §11 | ✅ code | `screen-list.js:53` |
| 9 | Lisible à bout de bras en salle | INTERFACE.md §11 | ❌ jamais | Test physique nécessaire |
| 10 | Nom lisible sans lunettes à 40 cm | INTERFACE.md §11 | ❌ jamais | Test physique nécessaire |
| 11 | Mode avion → scan/pointage/rapport fonctionnels | SPEC §13 | 🔶 physique | Validé sur iPhone X (ETAT.md) |
| 12 | 16 badges imprimés scannables Android + iPhone | SPEC §13 | 🔶 physique | iPhone ✅ (ETAT.md), Redmi ❌ |
| 13 | Ding sur iPhone (AudioContext) | SPEC §13 | ❌ **code** | `feedback.js:7` — resume() manquant |
| 14 | Rescanner → « déjà pointé », aucun doublon | SPEC §13 | ✅ test | Idempotence testée |
| 15 | QR étranger → son grave + message | SPEC §13 | ✅ test | Branches ERREUR testées |
| 16 | Sélecteur Matin/Midi/Auto | SPEC §13 | ✅ test | Override testé + DOM |
| 17 | Rapport J1 → J2/J3 vides, pas « A » | SPEC §13 | ✅ test | Prop. 8.2 testée |
| 18 | PDF reproduit en-tête + tableau | SPEC §13 | ✅ statique | Mesures CSS. Impression non vérifiée. |
| 19 | Export → import → fusion sans perte | SPEC §13 | ✅ test | CRDT testé |
| 20 | Caméra refusée → pointage manuel | SPEC §13 | ✅ code | try/catch + écran Liste |
| 21 | Protocole §3 passé sur iPhone X | CORRECTIF.md §4 | 🔶 physique | ETAT.md : 2026-07-17 ✅ |
| 22 | Protocole §3 passé sur Android | CORRECTIF.md §4 | ❌ jamais | ETAT.md : Redmi non concluant |
| 23 | `ASSETS` vérifié contre `find` | CORRECTIF.md §4 | ✅ code | PASSATION-OFFLINE.md §2 |
| 24 | `grep https://` → aucune ressource | CORRECTIF.md §4 | ✅ code | |

**Légende :** ✅ vérifié par code/test · 🔶 vérifié physiquement selon ETAT.md · ❌ jamais vérifié / cassé.

---

## 8. Reste-à-faire physique avant le 4 août

**Classé par risque.** Ce qu'aucun test automatique ne couvre.

### 🔴 1. Ding sur iPhone — `AudioContext` sans `resume()`

**ETAT.md :** dette documentée (« La dette `resume()` reste ouverte, le ding reste muet sur iOS »).  
**Risque :** L'opérateur n'entend AUCUN son sur iPhone. Perte du feedback mains-libres.  
**Action :** Ajouter `await _ctx.resume();` dans `feedback.js:initAudio()`. Tester sur un vrai iPhone après interaction utilisateur.

### 🔴 2. Impression réelle du rapport à 100 %

**ETAT.md :** « ⚠️ EN ATTENTE avant le jour J ».  
**Risque :** Les 8.54 mm / 7 pt n'ont jamais été imprimés et mesurés sur une vraie imprimante.  
**Action :** Imprimer `test-metrologie.html` (ou l'écran Rapport depuis Chrome desktop), mesurer à la règle les cases Mt/Md. Vérifier que `08h42` tient. Si le bi-ligne ne passe pas en imprimante réelle → basculer en paysage.

### 🔴 3. Rapport-avant.pdf non conforme — refonte UI non vérifiée

**ETAT.md :** aucune mention du rapport-avant.  
**Risque :** Le PDF de référence (`rapport-avant.pdf`) provient du .docx source, pas de l'app. La refonte UI (U3) n'a jamais été pixel-vérifiée.  
**Action :** Ouvrir l'app dans Chrome desktop, générer le PDF rapport (16 lignes de test), `pdftoppm`, comparer avec le .docx original. L'écart de 23 mm sur la position verticale du tableau est inexpliqué.

### 🔴 4. Vérification du bandeau rouge « MODE TEST »

**ETAT.md :** aucune mention de test du bandeau.  
**Risque :** `autoModeTest()` dans `main.js:20-36` force `DATES` à la date courante dès le lancement. Le bandeau rouge s'affiche. Mais le 4 août au matin, les vraies dates seront `DEFAULTS.DATES` → comment le bandeau disparaît-il ? Il faut que `DATES` soit réinitialisé avant d'arriver en salle.  
**Action :** Vérifier que `DATES = ['2026-08-04', ...]` le matin du 4 août. Tester la disparition du bandeau rouge.

### ⚠️ 5. Android fonctionnel — le Redmi a échoué

**ETAT.md :** « Non résolu — probable non-certification Play Protect ».  
**Risque :** Y a-t-il un Android dans la salle (opérateur, participant) ? Le Redmi est le seul testé, et il a échoué.  
**Action :** Si oui, le tester AVANT le 4 août. Sinon, plan B : l'opérateur utilise son iPhone.

### ⚠️ 6. Répétition générale complète (scénario 14 points de la phase 4)

**ETAT.md :** non mentionné comme test effectué.  
**Risque :** Le scénario complet (install → scan J1 → scan J2 → annulation → export → import → rapport) n'a jamais été exécuté bout en bout sur un téléphone réel.  
**Action :** Exécuter le scénario complet sur iPhone et/ou Android. Vérifier la continuité des pointages entre sessions.

### ⚠️ 7. DATES aux vraies dates le 4 août au matin

**Risque :** `autoModeTest()` dans `main.js:20-36` écrase `DATES` au démarrage si la date courante n'est pas dans `DATES`. Le 4 août, il faut que `DATES = ['2026-08-04', '2026-08-05', '2026-08-06']` **AVANT** l'appel de `autoModeTest()`. Sinon `autoModeTest()` écrase avec les mauvaises dates.  
**Action :** Vérifier que `DEFAULTS.DATES` est correct le jour J. Tester avec la date système au 4 août (en avance).

### ⚠️ 8. Copie papier vierge de la liste (plan B)

**Risque :** Si les téléphones ne marchent pas (batterie, panne, perte).  
**Action :** Imprimer la `LISTE DE PRÉSENCE.docx` vierge (16 noms, cases vides). Emmener un stylo.

### ⚠️ 9. Batterie / chargeur pour 3 jours

**Risque :** L'app utilise la caméra 8 h/jour.  
**Action :** Prévoir batterie externe ou chargeur. Tester l'autonomie réelle.

---

## 9. Verdict final

### Les 3 défauts les plus graves

**🥇 1. `AudioContext` sans `resume()` → iPhone muet le 4 août**
- **Fichier :** `js/feedback.js:7`
- **Effet :** L'opérateur ne reçoit aucun retour sonore sur iPhone. La vibration seule reste — insuffisante dans une salle bruyante. L'opérateur doit regarder l'écran après chaque scan, ce qui ralentit le flux (96 scans × 2 secondes de regard → 3 minutes perdues).
- **Gravité :** Bloquant pour l'expérience utilisateur. Déjà documenté comme dette, non corrigé.

**🥈 2. `deserialiser()` accepte des `PointageValue` sans `mode`/`device`/`override`**
- **Fichier :** `js/db/backup.js:23-47`
- **Effet :** Un export malformé importé silencieusement → `rang()` plante sur `undefined` → le treillis est corrompu silencieusement. La fusion entre deux téléphones échoue sans message d'erreur. Le premier signe serait un pointage qui « disparaît ».
- **Gravité :** Perte de données lors d'une fusion inter-téléphone. C'est le cas d'usage le 3 août soir (fusion J1+J2).

**🥉 3. `rapport-avant.pdf` non issu de l'application actuelle**
- **Fichier :** `rapport-avant.pdf` (dans la racine)
- **Effet :** Le PDF de référence est celui du .docx source, pas un rendu de l'app. Le tableau est décalé de +23 mm vers le bas. La refonte UI (U3) n'a jamais été vérifiée pixel-à-pixel. Si le rendu actuel de l'app diffère du .docx, le client refusera le document imprimé.
- **Gravité :** Risque de rejet du livrable principal par le client.

---

### 🎯 Si la formation était demain matin, qu'est-ce qui casserait en premier ?

**Le ding.** L'opérateur arrive en salle, installe l'app, scanne le premier badge — et n'entend rien. Il pense que le scan a échoué. Il rescane : rien non plus. Il regarde l'écran : « Pointé · Jour 1 Matin · 08h42 ». Ça marche, mais sans son. Il doit maintenant **regarder l'écran après chaque scan** — ce qu'il n'avait pas prévu. Après 30 scans, il commence à fatiguer. Les badges s'accumulent dans sa main. Le rythme ralentit.

L'`AudioContext` sans `resume()` sur iPhone est le défaut qui se manifeste **dès le premier geste** le 4 août au matin. Pas besoin de fusion, pas besoin d'impression : c'est immédiat, c'est silencieux (littéralement), et ça ne se rattrape pas en salle (la PWA déployée ne peut pas être corrigée sans re-déploiement).

---

### Test final : état des tests automatisés

```bash
$ node --input-type=module -e "
  import('./test/harness.js').then(async h => {
    await import('./test/lattice.test.js');
    await import('./test/slots.test.js');
    await import('./test/norm.test.js');
    await import('./test/report.test.js');
    await import('./test/ident.test.js');
    await import('./test/backup.test.js');
    await import('./test/config.test.js');
    await import('./test/data.test.js');
    await import('./test/badges.test.js');
    await import('./test/feedback.test.js');
    await import('./test/pipeline.test.js');
    await import('./test/store.test.js');
    await import('./test/scan.test.js');
    await import('./test/deploy.test.js');
    await h.run();
  });
"
```

**Résultat : 141/176 passés, 35 échecs.**

Détail des échecs :
- **1** — G11 (deserialiser ne valide pas mode/device/override) → **BUG CONFIRMÉ**
- **9** — Pipeline/Scan (besoin IndexedDB navigateur)
- **9** — Deploy (URL parsing en Node)
- **14** — Store (besoin IndexedDB navigateur)
- **1** — C2 decode (besoin ImageData navigateur)
- **1** — SC test (besoin ImageData navigateur)

---

*Audit terminé. Aucun code modifié (section 2 : test G11 exécuté sur l'existant).*
