# INTERFACE.md — Refonte UI

**Statut** : addendum à `SPECIFICATIONS.md` · **Version** 1.0 du 16/07/2026
**Portée** : `css/app.css`, `js/ui/*.js`, `index.html` — **et rien d'autre**
**Maquettes** : approuvées par le client le 16/07/2026

## Place dans la hiérarchie

```
CLAUDE.md > SKILL.md > AJOUT.md > INTERFACE.md > SPECIFICATIONS.md > FORMALISATION
```

`INTERFACE.md` gouverne **l'apparence à l'écran**. Il ne gouverne **rien d'autre**.
En cas de conflit avec `SKILL.md` : **`SKILL.md` gagne toujours** (voir §2).

---

## 1. Règle absolue — zéro logique

> **Cette refonte ne touche QUE la présentation.**
> Aucun fichier de `js/model/`, `js/db/`, `js/scan/` ne doit être modifié. Pas d'une ligne.

Si un écran a besoin d'une donnée qui n'existe pas encore (ex. le compteur `7/16`), elle se **dérive** de ce que le modèle expose déjà. Elle ne se calcule pas dans l'UI et ne s'ajoute pas au modèle.

**Interdits, sans exception :**
- modifier `PointageValue`, `reg`, `cancel`, `join`, `etatCellule`, `slotDe`, `tousLesSlots`
- déplacer une règle métier dans un fichier `js/ui/`
- introduire `'Mt'` ou `'Md'` ailleurs que dans le rendu (règle D2 d'`AJOUT.md`)
- « profiter » de la refonte pour corriger un bug logique → **signaler, ne pas corriger**

Contrôle après chaque étape :
```bash
git diff --name-only | grep -E '^js/(model|db|scan)/' && echo "❌ VIOLATION" || echo "✅ UI seulement"
```

---

## 2. ⚠️ Le pare-feu d'impression

> **`@media print` est INTOUCHABLE.**

Les valeurs de `SKILL.md` sont mesurées au 1/100 mm sur le `.docx` du client. Une seule règle CSS mal placée les détruit — silencieusement, et personne ne le voit avant le PDF signé.

**Séparation physique obligatoire, dans deux fichiers distincts :**

| Fichier | Contenu | Modifiable par cette refonte |
|---|---|---|
| `css/app.css` | tout l'écran, dans `@media screen` | **oui** |
| `css/print.css` | tout le `@media print`, gouverné par `SKILL.md` | **NON** |

```html
<link rel="stylesheet" href="css/app.css"  media="screen">
<link rel="stylesheet" href="css/print.css" media="print">
```

**Chaque règle de `app.css` est enfermée dans `@media screen`.** Une règle nue s'appliquerait aussi à l'impression.

**Interdits dans `print.css`** : `transform`, `scale`, `zoom`, `flex`, `grid`, toute unité relative sur la géométrie du tableau. Les mm de `SKILL.md` sont des mm.

Test après chaque étape UI :
```bash
git diff --stat css/print.css && echo "❌ print.css modifié — INTERDIT"
```

---

## 3. Fondations

### 3.1 Mode clair forcé

```css
:root { color-scheme: light; }
```

iOS inverse les couleurs en mode sombre et transformerait les pastilles d'état en bouillie. L'app est utilisée debout, dans une salle éclairée : **pas de mode sombre**, pas de `prefers-color-scheme`.

### 3.2 Jetons

```css
:root {
  --vert-950:#0f3d24; --vert-900:#14532d; --vert-700:#1d7a45;
  --vert-500:#16a34a; --vert-400:#4ade80; --vert-300:#a7d4bb; --vert-100:#dcfce7;

  --p-bg:#e1f5ee; --p-fg:#0f6e56;   /* présent      */
  --m-bg:#faeeda; --m-fg:#854f0b;   /* manuel       */
  --a-bg:#fcebeb; --a-fg:#a32d2d;   /* absent       */
  --v-bg:#f4f4f2; --v-fg:#9a9a95;   /* non tenu     */
  --danger:#a32d2d; --danger-100:#f2cfcf; --danger-border:#f0c0c0;

  --txt:#1a1a18; --txt-2:#6b6b66; --txt-3:#9a9a95;
  --bord:#ececea; --bord-2:#d8d8d4;
  --surf:#ffffff; --surf-1:#f4f4f2;

  --r:8px; --r-card:12px;
  --font:-apple-system,"Segoe UI",system-ui,sans-serif;
  --mono:ui-monospace,SFMono-Regular,monospace;
}
```

### 3.3 Règle de couleur — non négociable

| Rôle | Usage |
|---|---|
| **Vert de marque** (`--vert-900`, `--vert-700`) | navigation et action principale **uniquement** |
| **Vert d'état** (`--p-bg`) | présence **uniquement** |

Ne jamais les mélanger : un bouton vert et une pastille verte ne veulent pas dire la même chose. Un bouton `--p-bg` ou une pastille `--vert-900` est un bug visuel.

### 3.4 Typographie

11 px minimum · 12 px libellés · 13 px boutons · 15 px noms · 24 px nom pointé · 26 px taux.
**Deux graisses : 400 et 500.** Jamais 600 ni 700.

### 3.5 Cibles tactiles

44 × 44 px minimum sur tout élément touchable. L'opérateur a une main occupée par les badges.

---

## 4. Navigation — commune aux 4 écrans

Barre supérieure, fond `--vert-900`, 4 onglets égaux.

| État | Fond | Texte | Icône |
|---|---|---|---|
| actif | `--vert-700` | `#fff` | 18 px, au-dessus du libellé |
| inactif | transparent | `--vert-300` | idem |

Ordre : **Scan · Rapport · Liste · Réglages**. Libellés 11 px sous l'icône. Icônes en **SVG inline vendorées** — aucune police d'icônes distante (Invariant 9.2).

---

## 5. Écran Scan — `js/ui/screen-scan.js`

**L'écran qui compte.** Le seul utilisé 96 fois. L'opérateur est debout, une main prise.

### Structure verticale

| Bande | Hauteur | Contenu |
|---|---|---|
| Navigation | auto | 4 onglets |
| **Compteur** | ~34 px | fond `--vert-950` |
| **Caméra** | `flex: 1` | vidéo plein cadre + réticule + sélecteur |
| **Retour** | ~150 px | panneau coloré |

### 5.1 Bande compteur

```
Jour 1 · Matin                    7 / 16 pointés
```
- gauche : slot courant, 12 px, `--vert-300`
- droite : `7` en 15 px/500 blanc, ` / 16 pointés` en 12 px `--vert-300`

**Dérivation, sans toucher au modèle :**
```js
const slot = slotAvecOverride(Date.now(), overrideCourant);
const n = slot ? PARTICIPANTS.filter(p => etatCellule(p, slot, Date.now()).type === 'present').length : 0;
```
Si `slot === null` → afficher `Hors créneau` et `— / 16`.

### 5.2 Caméra

Vidéo en `object-fit: cover`, fond `#1c1c1c`. **Réticule** : carré 150 px centré, 4 angles de 26 px, trait 3 px `--vert-400`, rayon 6 px. Purement décoratif — la ROI réelle reste celle de `camera.js`, **ne pas y toucher**.

### 5.3 Sélecteur de créneau

Segmented control flottant, 12 px au-dessus du bas de la zone caméra.
Conteneur `rgba(0,0,0,0.62)`, rayon 20 px, padding 3 px.
Segment actif : fond `#fff`, texte `--vert-900`, 13 px/500. Inactif : texte `#e5e5e5`.
Ordre : **Auto · Matin · Midi**.

> Il n'occupe plus une barre pleine largeur : on y touche trois fois en trois jours, pas 96.

### 5.4 Panneau de retour

Mappé sur `js/feedback.js` — **le mapping existe déjà, ne le redéfinis pas**.

| Résultat | Fond | Contenu |
|---|---|---|
| `OK(p)` | `--vert-500` | icône check 22 px · `Pointé · Jour 1 Matin · 08h42` (12 px `--vert-100`) · **nom en 24 px/500 blanc, 2 lignes** · id en mono 12 px `#bbf7d0` |
| `DEJA_POINTE(τ)` | `#ca8a04` | `Déjà pointé à 08h42` + nom 24 px |
| erreurs | `--danger` | libellé de `feedback.js` |
| `HORS_SESSION` | `#57534e` | `Hors créneau` |
| `RIEN` | `--surf-1` | `Présentez un badge` en `--txt-3` |

> **Le nom en 24 px est le seul contrôle anti-fraude réel du système** (`SKILL.md` §3.3 / `CLAUDE.md`). Il ne rétrécit jamais. Sur un nom long comme `BUINDA Theophilus YUKBANWI`, il passe à 3 lignes — il ne se tronque pas, il ne passe pas en ellipse.

Le panneau reste affiché **300 ms minimum** (`camera.js` gèle déjà la boucle — ne pas la retoucher).

---

## 6. Écran Rapport — `js/ui/screen-report.js`

> ⚠️ **Ce fichier contient le rendu imprimé.** Ne modifie que la partie écran. Le `<table>` A4 et son CSS de `print.css` sont gouvernés par `SKILL.md`.

### Structure

1. **Taux global** — 26 px/500 + `taux global · N créneaux échus` en 12 px `--txt-2`. Si `Θ` indéfini → afficher `—` et `aucun créneau échu`, **jamais `0 %`** (Propriété 8.2 / `AJOUT.md`).
2. **Grille 6 créneaux** — `grid-template-columns: repeat(6,1fr)`, gap 5 px. Échu → fond `--p-bg`, libellé 11 px et compte 15 px/500 en `--p-fg`. Non échu → fond `--surf-1`, `—` en `--v-fg`.
3. **Aperçu A4** — miniature dans un cadre blanc, rayon 8 px. `Toucher pour agrandir` en 11 px `--txt-3`.
4. **Bouton d'impression** — pleine largeur, `--vert-900`, 14 px de padding, 15 px/500, icône imprimante.
5. **Note** — `Impression depuis iPhone : rendu à 88 % · Proportions exactes`, 11 px `--txt-3`, centré.

### 6.1 L'aperçu

**L'écran cesse de prétendre afficher une A4 sur 390 px.** Deux options :

- **A (recommandée)** — `<div>` conteneur `overflow: hidden`, la vraie page en `transform: scale(0.38); transform-origin: top left`. Un seul rendu, aucune divergence possible.
- **B** — miniature schématique. Plus simple, mais deux rendus à maintenir : rejeté.

> ⚠️ Le `transform: scale` de l'aperçu vit **exclusivement dans `@media screen`**. Un `scale` qui fuit dans `@media print` détruirait les 8,54 mm. C'est le risque numéro un de cet écran.

---

## 7. Écran Liste — `js/ui/screen-list.js`

### Structure

**Barre de recherche** — bordure `--bord-2`, rayon 8 px, icône loupe 16 px `--txt-3`, placeholder `Rechercher un nom…`. Branchée sur `match()` existante.

**Filtres** — pastilles rayon 14 px, 12 px :
- `Tous · 16` actif → fond `--vert-900`, texte blanc
- `Absents · 4` inactif → bordure `--bord-2`, texte `--txt-2`
- à droite : icônes export ↓ et import ↑, 17 px `--txt-2`

**Ligne participant** :
```
01   YEBGA Jacques Albert                    ⋯
     ┌──────┬──────┬────┬────┬────┬────┐
     │08h42 │13h05 │ —  │ —  │ —  │ —  │
     └──────┴──────┴────┴────┴────┴────┘
```
- numéro : 11 px mono `--txt-3`, largeur mini 16 px
- nom : **15 px, `flex: 1`, une seule ligne**
- `⋯` : ouvre les actions (pointer manuellement, annuler)
- pastilles : `display:flex; gap:4px; padding-left:24px`, chacune `flex:1`, rayon 5 px, 11 px, centré

> **Le nom reprend toute la largeur.** Dans la version actuelle, six colonnes l'écrasent sur trois lignes — or c'est la donnée qu'on cherche.

### 7.1 Pastilles — la source unique

**Généré en itérant `tousLesSlots()`.** Jamais 6 `<td>` en dur.

| État | Fond | Texte | Contenu |
|---|---|---|---|
| `present` + `mode:'scan'` | `--p-bg` | `--p-fg` | `08h42` |
| `present` + `mode:'manuel'` | `--m-bg` | `--m-fg` | `13h22` |
| `absent` | `--a-bg` | `--a-fg` | `A` |
| `vide` | `--v-bg` | `--v-fg` | `—` |

> **L'orange « manuel » est nouveau.** `mode: 'manuel'` est déjà dans `PointageValue` mais l'UI ne l'exploitait pas. Voir d'un coup d'œil qui a été pointé sans badge a une vraie valeur le jour J. **Aucun changement de modèle** : la donnée existe.

**Légende en pied de liste** : carrés 8 px + `présent · manuel · absent · non tenu`, 11 px `--txt-3`.

---

## 8. Écran Réglages — `js/ui/screen-setup.js`

**Bandeau mode test** — visible si `DATES ≠ ['2026-08-04','2026-08-05','2026-08-06']`.
Fond `--danger`, icône alerte 20 px, deux lignes :
```
Mode test — dates simulées
16–18 juil. au lieu du 4–6 août
```
> Un bandeau qui dit seulement « mode test » n'aide pas à s'en sortir. La seconde ligne dit **quoi** et **au lieu de quoi**.

**Cartes** — bordure `--bord`, rayon 12 px, padding 13 px, titre 15 px/500 :

1. **Dates de session** — 3 champs · bouton plein `--vert-900` `Rétablir les dates réelles` · bouton contour `Dates = aujourd'hui + 2 jours`
2. **Créneaux** — 3 champs. **La bascule est mise en évidence** : fond `--p-bg`, texte `--p-fg`. Sous les champs, 11 px `--txt-2` : `Matin 07:00–13:00 · Midi 13:00–17:30` puis `Les pauses sont incluses dans les créneaux.`
3. **Badges et sauvegarde** — imprimer la planche · exporter · importer
4. **Zone dangereuse** — bordure `--danger-border`, titre `--danger`. Champ `Taper SUPPRIMER pour confirmer`. Bouton contour rouge, **jamais plein** : un bouton rouge plein invite au clic.
5. **Pied** — 11 px `--txt-3` : `Hors-ligne prêt · N objets en cache` / `Appareil e1f4…c7 · schéma v2`

> La ligne sur les pauses n'est pas décorative : c'est le seul endroit où l'opérateur peut comprendre pourquoi un scan à 10h45 tombe en `Mt`.

---

## 9. Étapes — même discipline

Insérées **avant** l'étape 12 : `sw.js` (étape 14) précache le CSS, il doit être définitif. Une étape à la fois, tests, clôture, commit.

| # | Étape | Fichiers | Tests |
|---|---|---|---|
| **U1** | Fondations : jetons, `@media screen`, split `print.css`, barre d'onglets | `css/app.css`, `css/print.css`, `index.html` | 🔴 `print.css` inchangé · aucune règle CSS hors `@media screen` dans `app.css` · `git diff` ne touche pas `js/model|db|scan` |
| **U2** | Refonte écran Scan | `js/ui/screen-scan.js` | compteur dérivé correct · 5 états de retour rendus · nom 24 px non tronqué sur `BUINDA Theophilus YUKBANWI` |
| **U3** | Refonte écran Rapport | `js/ui/screen-report.js` | 🔴 **le `<table>` imprimé est identique avant/après (diff PDF)** · Θ indéfini → `—` et non `0 %` · le `scale` de l'aperçu n'existe pas dans le PDF |

**L'étape 13 (`Liste` + `Réglages`) n'est pas encore faite** → elle se code **directement** au nouveau design, pas de refonte. Amender son libellé au §12 : *« écrans Liste + Réglages, conformes à INTERFACE.md §7 et §8 »*.

**Ordre final** : U1 → U2 → U3 → 12 → 13 → 14 → 15.

### 🔴 Le test qui protège tout

Avant U3, générer et archiver le PDF de référence :
```bash
# AVANT la refonte
pdftoppm -png -r 300 rapport-avant.pdf ref
# APRÈS
pdftoppm -png -r 300 rapport-apres.pdf new
python3 -c "
from PIL import Image, ImageChops
a=Image.open('ref-1.png'); b=Image.open('new-1.png')
d=ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
print('IDENTIQUE ✅' if not d.getbbox() else '❌ LE PDF A CHANGÉ — la refonte a cassé SKILL.md')
"
```
Générer les deux PDF **depuis Chrome desktop**, marges Aucune, échelle 100. Depuis un iPhone tout serait à 87,9 % et la comparaison n'aurait aucun sens.

---

## 10. Chasse aux interdits — spécifique UI

À ajouter au prompt de clôture pour U1 à U3 et l'étape 13 :

```
- une modification dans js/model/, js/db/ ou js/scan/     ← INTERDIT ABSOLU
- une règle CSS de app.css hors @media screen
- toute modification de print.css
- transform/scale/zoom atteignant @media print
- une police d'icônes distante, un CDN, un woff2 externe
- prefers-color-scheme ou un mode sombre
- un bouton vert d'état, ou une pastille au vert de marque
- une cible tactile sous 44px
- le nom du participant tronqué ou en ellipse sur l'écran Scan
- 'Mt'/'Md' en dur au lieu de tousLesSlots()
- 6 pastilles en dur au lieu d'une boucle
- Θ affiché à 0 % quand il est indéfini
```

---

## 11. Terminé quand

- [ ] `git diff` sur U1–U3 ne touche **aucun** fichier de `js/model|db|scan`
- [ ] `print.css` identique à l'octet près avant/après
- [ ] Le PDF de rapport est **pixel-identique** avant/après (test §9)
- [ ] Les 4 écrans correspondent aux maquettes approuvées
- [ ] Le nom en 24 px tient sans troncature sur le plus long des 16 noms
- [ ] `Tous · 16` et `Absents · N` comptent juste
- [ ] Le bandeau rouge apparaît dès que `DATES ≠ 4-6 août`, avec les dates réelles citées
- [ ] Pastille orange sur un pointage `mode:'manuel'`
- [ ] **Physique** : lisible à bout de bras, en salle, une main occupée
- [ ] **Physique** : le nom se lit sans lunettes à 40 cm
