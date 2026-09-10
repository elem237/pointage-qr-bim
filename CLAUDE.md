# CLAUDE.md — Pointage QR · GREEN INNOVATIVE'S

> Ce fichier fait foi. `AGENTS.md` doit se réduire à : *« Lire CLAUDE.md »*.
> Deux fichiers de règles finiraient par se contredire.


---

## Le projet en 6 lignes

PWA de pointage par QR pour une formation **BIM** de GREEN INNOVATIVE'S, à **DOUALA**, pour **13 participants** (liste révisée par le client le 8 sept. 2026 — les n° 14-15-16 retirés ; `EFFECTIFS = PARTICIPANTS.length`, jamais un nombre en dur).
Scanner un badge → identifier → marquer présent sur le bon créneau → ding → à la fin, générer un PDF **strictement identique** à la liste de présence du client.

**Contrainte reine : aucun réseau en salle.** Tout est local, hors-ligne, dans le téléphone.
**Dates :** la formation, initialement prévue les 4-5-6 août 2026, a été **reportée par le client à une date non fixée**. `DEFAULTS.DATES = []` : les 3 dates se saisissent dans l'écran Réglages et sont persistées en IndexedDB. Tant qu'elles sont vides, l'app ouvre Réglages au boot (voir « Garde-fou dates »).
**Le risque du projet :** la conception est finie et sur-travaillée. Ce qui reste fragile, c'est le **scan sur téléphones réels** (Android surtout : fluidité, reprise après la pause déjeuner, lumière déclinante — cf. `ETAT.md`, itérations bim-v11→v18) et **l'impression du rapport à l'échelle 100 %**, jamais mesurée sur une vraie imprimante.

---

## ⚠️ Hiérarchie des sources

```
CLAUDE.md  >  SKILL.md  >  AJOUT.md  >  SPECIFICATIONS.md  >  FORMALISATION_MATHEMATIQUE_v2.md
```

| Fichier | Autorité |
|---|---|
| `CLAUDE.md` | ce fichier — les règles |
| `ETAT.md` | **à lire en premier à chaque session** : où en est le projet, décisions déjà prises |
| `SKILL.md` | la page du rapport, mesurée au 1/100 mm. Fait foi sur toute question de mise en page |
| `AJOUT.md` | Mt/Md, créneaux, horaires. Fait foi sur toute question de temps |
| `SPECIFICATIONS.md` | l'architecture et le §12 (ordre de construction) |
| `FORMALISATION_MATHEMATIQUE_v2.md` | 🔒 **figé**. Le *pourquoi*, jamais le *quoi*. Lire ses **errata** avant de s'y fier |
| `INTERFACE.md` | les 4 écrans. Gouverne l'apparence à l'écran, RIEN d'autre. |
| `ABSENCES.md` | signalement des absences. Système SÉPARÉ des présences. |

Hiérarchie : CLAUDE.md > SKILL.md > AJOUT.md > INTERFACE.md > SPECIFICATIONS.md
⚠️ La refonte UI ne touche JAMAIS js/model/, js/db/, js/scan/, ni print.css.

### ⚠️ Sections périmées — un code qui les suit est en faute

- **`SPECIFICATIONS.md` §10 « Rapport PDF »** → entièrement remplacé par `SKILL.md`.
  Ses valeurs (« ~96 mm », « ~14 mm », « marges 15 mm », « 180 mm utiles ») sont **fausses**, et la colonne **« N° » qu'il décrit n'existe plus** : le client a mis à jour son `.docx` (plus de N°, et les colonnes Jour sont déjà divisées en Mt/Md).
- **`SPECIFICATIONS.md` §3, heures `06:00 / 12:30 / 19:00`** → remplacées par `AJOUT.md` v2 : **`07:00 / 13:00 / 17:30`**.
- **`SPECIFICATIONS.md` §3, « DATES non modifiable »** → **faux**. Les badges n'encodent aucune date (`BIM26-0NN-XX`). `DATES` **doit** être modifiable. Depuis le report de la formation : `DEFAULTS.DATES = []`, saisie + persistance en Réglages (`store.setReglages`), pas de dates par défaut.
- **`SPECIFICATIONS.md` §4.1 + `FORMALISATION_MATHEMATIQUE_v2.md`, « N = 16 »** → **13** depuis le 8 sept. 2026. `|K| = 78` pointages, 52 absences fictives possibles si la garde Prop. 8.2 casse.

---

## Interdits absolus

- Aucun framework, bundler, `npm install`, `node_modules`, dépendance de build.
- Aucun CDN ni URL externe **au runtime** — casse le hors-ligne (Invariant 9.2).
- Aucun `localStorage` pour les pointages. **IndexedDB uniquement** (transactions atomiques).
- Aucun fichier audio. Le ding est **synthétisé** en Web Audio.
- Ne **jamais** retirer un champ de `PointageValue` : `generation, statut, tau, mode, device, override`. Chacun porte une propriété prouvée.
- Ne jamais « simplifier », « optimiser » ou « moderniser » une structure des specs. Si elle paraît trop complexe : **signaler, ne pas modifier**.
- Ne jamais inventer une largeur, une marge ou une heure. Elles sont **toutes mesurées** dans `SKILL.md` §2–4 et `AJOUT.md` §3.

---

## Langage et pile

**JavaScript ES2020+**, modules ES natifs. Types en **JSDoc** `@typedef`, pas TypeScript (le compilateur réintroduirait le toolchain qu'on évite).
HTML5 · CSS pur (`@media print`) · IndexedDB · Web Audio · `getUserMedia` + `BarcodeDetector`, repli **jsQR vendoré**.

```bash
python3 -m http.server 8000
# code   → http://localhost:8000/
# tests  → http://localhost:8000/test/index.html
```

`file://` ne marche pas : les modules ES sont bloqués par CORS, et `getUserMedia` exige un contexte sécurisé. `localhost` en est un — la caméra fonctionne donc en dev local.

---

## 🔴 Les propriétés à échec silencieux

Leur échec **ne se voit pas en salle** et **ne se rattrape pas après**. Elles priment sur tout le reste.

| Propriété | Où | Effet si cassée |
|---|---|---|
| **Non-résurrection** (Erratum 1) | `js/model/lattice.js` | un pointage annulé revient à la fusion |
| **Re-pointage après annulation** (Th. 6.12) | `js/model/lattice.js` | le treillis se bloque après une annulation |
| **Idempotence de `reg`** (Th. 6.7) | `js/db/store.js` | doublons. ⚠️ **indépendante de l'anti-rebond** — tester les deux séparément |
| **Pas d'absence future** (Prop. 8.2) | `js/model/report.js` | le PDF du J1 affiche **52 absences fictives** (13 × J2 + J3) |
| **Reprise caméra après arrière-plan** (`visibilitychange`) | `js/ui/screen-scan.js` | après la pause déjeuner, le scan de l'après-midi (`midi`) reste **muet** — l'OS a tué le flux, rien ne le ré-acquiert (bug bim-v14→v17, corrigé v18) |
| **Précache complet** (Inv. 9.1) | `sw.js` | l'app semble installée puis meurt en salle, sans réseau |
| **Pauses non modélisées** (`AJOUT.md`) | `js/model/slots.js` | le retardataire de 10h45 est refusé, sans recours |
| **Ordre des colonnes** (`AJOUT.md` §6) | `js/ui/screen-report.js` | les présences glissent d'une colonne, **le PDF reste plausible** |

Pour tout module 🔴 : **écrire les tests d'abord**, vérifier qu'ils échouent, puis coder.

---

## Les pièges où un LLM tombe systématiquement

Chacun a déjà été commis sur ce projet.

| Tentation | Réalité |
|---|---|
| « Le tableau déborde de la marge gauche, je corrige » | **Non.** `tblInd = -856 twips`. Il commence à **9.91 mm**, c'est voulu. |
| « Je modélise proprement les pauses café et déjeuner » | **Non.** Les fenêtres sont **continues**. 10h45 → `Mt`. 13h50 → `Md`. |
| « `generation` et `device` semblent inutiles, je simplifie » | **Non.** `generation` porte le re-pointage ; `device` rend la fusion déterministe. |
| « `crypto.subtle` est async, je rends `valider()` async » | **Non.** L'ordre des gardes est `format → inconnu → checksum` : `checksum` n'est jamais appelée hors des 13 ids, la Map pré-calculée suffit, tout reste **synchrone**. |
| « J'écris `Mt`/`Md` dans le HTML, c'est plus lisible » | **Non.** Deux ordres indépendants = présences décalées, PDF plausible, personne ne le voit. `tousLesSlots()` est la source unique. |
| « J'ajoute React, ce sera plus propre » | **Non.** 13 participants, 78 pointages. Un `querySelector` suffit. |
| « J'ajoute un bloc de statistiques au PDF » | **Non.** Décision client : le document, rien que le document. |
| « Je passe la page en paysage, ce sera plus lisible » | **Non.** Mesuré : le portrait passe avec le bi-ligne à 7 pt. |
| « `Md` = midi = 12h00 » | **Non.** `Md` = demi-journée d'après-déjeuner, **14:00 → 16:30**. Un scan à 15h20 est un `Md`. |
| « Je mets un en-tête République du Cameroun / MINHDU » | **Il n'existe pas.** C'est GREEN INNOVATIVE'S + ACCA. « DIRECTION DES AFFAIRES GÉNÉRALE » est une **ligne interne du tableau**. |

---

## Vocabulaire — règle de frontière

> `'Mt'` et `'Md'` sont des **étiquettes d'affichage**. Elles n'existent que dans `js/ui/screen-report.js`.
> Le modèle, la base, le treillis et les clés ne connaissent que **`'matin'`** et **`'midi'`**.

Test permanent : `grep -rn "'Mt'\|'Md'" js/model/ js/db/ js/scan/` → **aucun résultat**.

---

## Chiffres à ne jamais inventer

| | Valeur | Source |
|---|---|---|
| Créneaux | `matin` = **[07:00, 13:00)** · `midi` = **[13:00, 17:30)** | `AJOUT.md` §3 |
| Fuseau | `Africa/Douala`, **UTC+1 fixe, sans DST** → `t + 3600000`, jamais `toLocaleString` | `AJOUT.md` §4 |
| Tableau | top **56.13 mm** · left **9.91 mm** · largeur **160.02 mm** | `SKILL.md` §2 |
| Colonnes | 26.84 / 15.91 / 49.02 / 17.02 / puis **6 × 8.54 mm** | `SKILL.md` §3 |
| Payload QR | `BIM26-001-A7` — séparateur **`-`**, jamais `|` (hors jeu alphanumérique QR) | `SPECIFICATIONS.md` §5 |
| Vert du tableau | `#E2EFD9` | `SKILL.md` §5 |

---

## Discipline

1. **Lire `ETAT.md` en premier.** Il contient les décisions des sessions précédentes. Ne pas les re-décider, ne pas les contredire. Si l'une paraît fausse : **signaler**, ne pas la changer.
2. **Une étape du `SPECIFICATIONS.md` §12 à la fois.** Ne rien anticiper.
3. **Ne pas écrire de code non demandé** par l'étape en cours.
4. **Si une spec est ambiguë, contradictoire ou impossible : ARRÊTER et demander.** Ne pas inventer. Cette règle a déjà fait remonter 7 vrais défauts — elle vaut plus que n'importe quelle ligne de code.
5. **Ne jamais déclarer conforme « à l'œil ».** Les cases font 8.54 mm : mesurer au pixel (`pdftoppm -png -r 300`) et rapporter des **écarts chiffrés**.
6. **Ne jamais cocher une case qui exige un appareil physique.** Décrire le test à faire, et attendre le résultat.
7. À la clôture d'une étape : mettre à jour `ETAT.md`, puis `git commit`.

---

## Ce qu'aucun test automatique ne couvre

À vérifier avec un vrai téléphone et une vraie imprimante — et à consigner dans `ETAT.md` :

- Caméra en PWA standalone sur **iOS**
- Le ding sur **iPhone** (`AudioContext` doit naître dans un gestionnaire d'interaction — sinon silence total, sans erreur)
- Badges imprimés, scannés à 30 cm **sous les néons de la salle**
- ⚠️ **La mise à l'échelle à l'impression depuis mobile** — *le risque le plus sérieux du projet*. Si Safari applique un « ajuster à la page », les 8.54 mm mesurés s'effondrent et toute la métrologie de `SKILL.md` avec. **Tester tôt.** Plan B : exporter le JSON, imprimer depuis un ordinateur.
- ⚠️ **Reprise du scan après la pause déjeuner** : verrouiller le téléphone / passer l'app en arrière-plan ~45 min, revenir → le scan `midi` doit repartir seul (ou sur un toucher du panneau rouge), jamais rester figé en silence. C'est le scénario qui a déjà cassé le pointage d'un après-midi entier.
- Fusion entre deux téléphones physiques
- Autonomie sur 3 jours

---

## Garde-fou « dates »

`DEFAULTS.DATES = []`. Les 3 dates de formation se saisissent dans l'écran Réglages et sont persistées en IndexedDB (`store.setReglages` → `meta.reglages`). Changer `DATES` **orpheline les pointages** (la date est dans la clé) : acceptable en recette, **jamais pendant la formation**.

> Tant que `DATES` est vide, `js/main.js` **ouvre l'écran Réglages au boot** au lieu du Scan. C'est le seul garde-fou : le **bandeau rouge « mode test » a été retiré** quand la formation a été reportée et les dates généralisées (voir `ETAT.md`, 21/07/2026).
> `main.js:autoModeTest()` élargit les créneaux (`00:00 / 12:00 / 23:59`) **uniquement** quand la date du jour n'est pas dans `DATES` — pour pouvoir tester hors des vraies dates. Le jour J, avec les bonnes dates saisies, il ne fait rien et les créneaux réels `07:00 / 13:00 / 17:30` s'appliquent.

---

## Déploiement

Site de production : **https://pointage-qr-bim.netlify.app/**.

- `publish = "."`, aucun build.
- **Pas de déploiement automatique sur `git push`.** Après chaque changement : dans le dashboard Netlify, **Trigger deploy** *puis* **Publish deploy** sur le bon build — sinon la prod reste figée sur l'ancien.
- **Incrémenter `CACHE` dans `sw.js` (`bim-vN`) à CHAQUE déploiement.** Sans ça, les téléphones gardent l'ancien précache et l'app peut ne plus démarrer hors-ligne. `netlify.toml` sert `sw.js` en `no-cache` (la règle `/sw.js` doit rester **après** la règle générique `*.js`).
- Après déploiement : rejouer le protocole hors-ligne (`CORRECTIF.md` §3) sur un iPhone physique.

---

## Écart assumé, ne pas le « corriger »

**Aptos Display** (la police du tableau) n'existe ni sur Android ni sur iOS, et sa licence interdit de l'embarquer en woff2. Le tableau étant dynamique, il ne peut pas être rastérisé — son texte tombera sur `Carlito` / `Calibri`. C'est le **seul** écart de toute la page. L'en-tête et le pied, eux, sont des images 300 dpi : fidélité exacte.

---

## État

**Où en est le projet → `ETAT.md`.** Ce fichier-ci ne contient que les règles ; il ne bouge pas.
