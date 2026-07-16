---
name: page-liste-presence
description: Reproduire à l'identique la page LISTE DE PRÉSENCE de GREEN INNOVATIVE'S en HTML/CSS imprimable. À utiliser dès que le code touche à l'écran de rapport, au PDF, à l'impression, ou à la mise en page du tableau de présence. Toutes les valeurs de ce fichier sont MESURÉES sur le .docx source — ne jamais les estimer, arrondir ou « améliorer ».
---

# Page LISTE DE PRÉSENCE — reproduction exacte

## Règle unique

Le client a fourni `LISTE_DE_PRÉSENCE.docx` et exige **cette page, sans rien changer**.
Ce n'est pas un travail de design. C'est un travail de **reproduction métrologique**.

> **Toutes les valeurs de ce document sont mesurées au pixel sur le rendu 300 dpi du .docx source.**
> Elles ne sont ni estimées, ni arrondies, ni négociables.
> Si une valeur te paraît bizarre (ex. le tableau déborde de la marge gauche), c'est parce que le document est comme ça. **Reproduis, ne corrige pas.**

**Interdits absolus** : changer une largeur, « centrer proprement », harmoniser les colonnes, ajouter un logo, retirer une colonne, ajouter un bloc de statistiques, changer une couleur, « moderniser » quoi que ce soit.

---

## 1. Ce qui est statique vs dynamique

| Zone | Nature | Traitement |
|---|---|---|
| Bande d'en-tête (logos + titre) | **100 % statique** | **image** `header_band.png` |
| Tableau | **dynamique** | HTML `<table>` |
| Bande de pied de page | **100 % statique** | **image** `footer_band.png` |

> **Pourquoi les bandes sont des images.** L'en-tête contient **10 objets graphiques ancrés** (logo GREEN INNOVATIVE'S, logo ACCA, zone de texte à puces, visuel 3D, QR décoratif, 5 rectangles arrondis) avec des positions négatives et des chevauchements. Les reconstruire en CSS produirait une approximation. Les rastériser à 300 dpi produit une **copie exacte**, et ces zones ne changent jamais.
>
> Bonus décisif : le pied de page utilise **Bauhaus 93**, et l'en-tête **Aptos Display** — deux polices absentes d'Android et d'iOS, et non redistribuables. En image, le problème disparaît entièrement.

Les deux PNG sont fournis. Les convertir en base64 dans `assets/logos.js` (`export const HEADER_BAND = "data:image/png;base64,…"`). Aucun fichier externe : violerait l'Invariant 9.2 (précache hors-ligne).

---

## 2. Géométrie de la page — MESURÉE

```
Format         A4 portrait, 210 × 297 mm
Marges Word    25 mm partout  (w:pgMar = 1417 twips)
```

⚠️ **Le tableau ignore la marge gauche.** Word applique `tblInd = -856 twips` : le tableau démarre à **9.91 mm** du bord physique, pas à 25 mm. **C'est voulu. Ne pas « corriger ».**

| Repère | Position (mm depuis le haut) |
|---|---|
| Bande d'en-tête | 0 → 54.00 |
| **Bord supérieur du tableau** | **56.13** |
| Bord inférieur du tableau | 218.52 |
| Bande de pied de page | 262.00 → 297.00 |
| (contenu visible du pied) | 283.2 → 293.0 |

| Repère | Position (mm depuis la gauche) |
|---|---|
| Bord gauche du tableau | **9.91** |
| Bord droit du tableau | **169.93** |
| **Largeur totale du tableau** | **160.02** |

---

## 3. Colonnes — MESURÉES

**8 colonnes visibles, 10 colonnes de grille** (les 3 colonnes `Jour` ont chacune `colspan=2`).

Positions des traits verticaux, en mm depuis le bord gauche de la page :

```
9.91 ── 36.75 ── 52.66 ── 101.68 ── 118.70 ─┬─ 127.25 ─┬─ 135.81 ─┬─ 144.27 ─┬─ 152.82 ─┬─ 161.29 ─┬─ 169.93
  THÈMES   LIEU    PERSONNELS   EFFECTIFS    Mt    Md      Mt    Md      Mt    Md
                                             └─ Jour 1 ─┘└─ Jour 2 ─┘└─ Jour 3 ─┘
```

| # | Colonne | Largeur (mm) |
|---|---|---|
| 1 | THÈMES | **26.84** |
| 2 | LIEU | **15.91** |
| 3 | PERSONNELS | **49.02** |
| 4 | EFFECTIFS | **17.02** |
| 5–10 | Mt / Md × 6 | **8.54** chacune (total 51.23) |

Somme : 26.84 + 15.91 + 49.02 + 17.02 + 51.23 = **160.02 mm** ✓

> Les 6 cases mesurées valent 8.55 / 8.56 / 8.46 / 8.55 / 8.47 / 8.64 — ces écarts sont du bruit d'arrondi en twips. Utiliser **8.54 mm** uniformément : la somme reste exacte à 0.02 mm.

---

## 4. Lignes — MESURÉES

| Rangée | Contenu | Hauteur (mm) |
|---|---|---|
| R0 | `DIRECTION DES AFFAIRES GÉNÉRALE` (colspan 10, fond vert) | **5.08** |
| R1 | `THÈMES · LIEU · PERSONNELS · EFFECTIFS · Jour 1 · Jour 2 · Jour 3` | **8.47** |
| R2 | 4 cellules vertes vides + `Mt · Md · Mt · Md · Mt · Md` | **8.38** |
| R3–R18 | les 16 participants | **8.78** en moyenne (140.46 / 16) |

⚠️ **R1 et R2 ne sont PAS fusionnées verticalement.** Word n'utilise pas de `rowspan` ici : R2 contient **4 vraies cellules vides au fond vert** sous THÈMES / LIEU / PERSONNELS / EFFECTIFS. L'effet visuel de fusion vient uniquement de la couleur identique. **Reproduire ce montage, pas un `rowspan=2`** — sinon le trait horizontal entre R1 et R2 disparaîtrait sous ces 4 colonnes, alors qu'il est absent dans le rendu Word par coïncidence de couleur, pas par fusion.

En revanche, **THÈMES, LIEU et EFFECTIFS utilisent bien `vMerge` sur les 16 lignes participants** → `rowspan="16"` en HTML.

---

## 5. Typographie et couleurs — EXTRAITES DU XML

| Élément | Valeur |
|---|---|
| Police du tableau | **Aptos Display**, `w:sz=20` → **10 pt** |
| `DIRECTION DES AFFAIRES GÉNÉRALE` | 10 pt, **gras**, centré |
| `THÈMES / LIEU / PERSONNELS / EFFECTIFS / Jour n / Mt / Md` | 10 pt, **gras**, centré |
| Cellule THÈMES (le thème) | 10 pt, **gras**, centré |
| `DOUALA`, `16` | 10 pt, normal, centré |
| Noms des participants | 10 pt, normal, **justifié** (`w:jc="both"`), liste numérotée auto (`numId=2`, `ind left=319 hanging=259` twips → retrait 5.6 mm, négatif 4.6 mm) |
| Fond vert (R0 + les 4 cellules de R2) | **`#E2EFD9`** |
| Bordures | `single`, `w:sz=4` → **0.5 pt**, noir, **toutes** (extérieures + intérieures) |
| Titre `LISTE DE PRÉSENCE` | 10 pt, gras, souligné épais, `#1F4E79` — **déjà dans l'image d'en-tête** |
| Pied de page | Bauhaus 93, 8 pt, gras, `#006600` / `#005C2B` — **déjà dans l'image de pied** |

### ⚠️ Le seul écart inévitable : Aptos Display

**Aptos Display n'existe ni sur Android ni sur iOS**, et sa licence Microsoft interdit de l'embarquer en woff2. Le tableau étant dynamique, il ne peut pas être rastérisé.

Pile de repli à utiliser :
```css
font-family: "Aptos Display", "Aptos", "Carlito", "Calibri", sans-serif;
```
Sur téléphone, le rendu tombera sur le repli système. **C'est le seul écart assumé de toute la page.** Ne pas tenter de le masquer, ne pas substituer une autre police « qui rend mieux ». Si le client exige le pixel exact sur le tableau aussi, la seule voie est de générer le PDF côté Word — hors périmètre de cette app.

---

## 6. Contenu des cellules

### Colonne PERSONNELS
Numérotation automatique `1.` à `16.`, puis le `nomComplet` **verbatim** de `js/data.js`.
Texte **justifié**, comme dans le source (c'est ce qui produit les grands espaces dans `ANYOUZO'A    Marc Thyrille`). **Reproduire la justification**, ne pas passer en aligné à gauche « parce que c'est plus joli ».

### Colonnes Mt / Md — le contenu dynamique
Alimentées par `etatCellule(participant, slot, tNow)` de `js/model/report.js` :

| `type` | Rendu | Rappel |
|---|---|---|
| `present` | `P` (ligne 1) + `08h42` (ligne 2) | |
| `absent` | `A` | |
| `vide` | **rien** | ⚠️ Propriété 8.2 : créneau non échu → cellule VIDE, jamais `A` |

### ⚠️ Contrainte de largeur — MESURÉE, et elle est serrée

Une case Mt/Md fait **8.54 mm**. Les marges de cellule Word par défaut (0.19 cm de chaque côté) en consommeraient 3.8 mm, ne laissant que **4.7 mm** — or `08h42` en Aptos 10 pt fait ≈ **9 mm**. **Ça ne rentre pas.**

Réglages obligatoires :
```css
.cell-jour { padding: 0 0.3mm; }        /* et non les 1.9mm par défaut */
.cell-jour .heure { font-size: 7pt; }   /* ≈ 6.3mm → passe dans 7.94mm utiles */
.cell-jour .pa    { font-size: 8pt; }
```

Le rendu **bi-ligne n'est pas une préférence esthétique : c'est une nécessité géométrique**. `P 08h42` sur une seule ligne est impossible dans 8.54 mm.

**Vérifier par l'impression, pas par l'œil sur écran** : imprimer une page test avec les 16 lignes remplies de `P 08h42`, mesurer à la règle qu'aucun texte ne déborde ni ne se coupe.

---

## 7. Squelette HTML

```html
<div class="page">
  <img class="band" src="data:image/png;base64,…" alt="">   <!-- HEADER_BAND -->

  <table class="presence">
    <colgroup>
      <col style="width:26.84mm"><col style="width:15.91mm">
      <col style="width:49.02mm"><col style="width:17.02mm">
      <col style="width:8.54mm"><col style="width:8.54mm">
      <col style="width:8.54mm"><col style="width:8.54mm">
      <col style="width:8.54mm"><col style="width:8.54mm">
    </colgroup>
    <tbody>
      <tr class="r0"><td colspan="10" class="vert">DIRECTION DES AFFAIRES GÉNÉRALE</td></tr>
      <tr class="r1">
        <td class="h">THÈMES</td><td class="h">LIEU</td>
        <td class="h">PERSONNELS</td><td class="h">EFFECTIFS</td>
        <td class="h" colspan="2">Jour 1</td>
        <td class="h" colspan="2">Jour 2</td>
        <td class="h" colspan="2">Jour 3</td>
      </tr>
      <tr class="r2">
        <td class="vert"></td><td class="vert"></td>
        <td class="vert"></td><td class="vert"></td>
        <td class="h">Mt</td><td class="h">Md</td>
        <td class="h">Mt</td><td class="h">Md</td>
        <td class="h">Mt</td><td class="h">Md</td>
      </tr>
      <!-- 1re ligne participant : porte les rowspan -->
      <tr>
        <td rowspan="16" class="theme">Initiation au processus BIM dans la gestion des projets Immobiliers</td>
        <td rowspan="16" class="lieu">DOUALA</td>
        <td class="perso">1. YEBGA Jacques Albert</td>
        <td rowspan="16" class="eff">16</td>
        <td class="cell-jour">…</td> <!-- ×6 -->
      </tr>
      <!-- lignes 2 à 16 : 1 cellule perso + 6 cellules jour -->
    </tbody>
  </table>

  <img class="band footer" src="data:image/png;base64,…" alt="">   <!-- FOOTER_BAND -->
</div>
```

## 8. CSS de base

```css
@page { size: A4 portrait; margin: 0; }   /* marges gérées par la mise en page interne */

.page { position: relative; width: 210mm; height: 297mm; }

.band        { position: absolute; left: 0; width: 210mm; display: block; }
.band:first-child { top: 0; height: 54mm; }
.band.footer      { top: 262mm; height: 35mm; }

table.presence {
  position: absolute;
  top: 56.13mm;
  left: 9.91mm;
  width: 160.02mm;
  table-layout: fixed;
  border-collapse: collapse;
  font-family: "Aptos Display", "Aptos", "Carlito", "Calibri", sans-serif;
  font-size: 10pt;
}
table.presence td { border: 0.5pt solid #000; vertical-align: middle; padding: 0 1mm; }

tr.r0 { height: 5.08mm; }  tr.r1 { height: 8.47mm; }  tr.r2 { height: 8.38mm; }
tr.p  { height: 8.78mm; }

.vert  { background: #E2EFD9; }
.r0 td { background: #E2EFD9; font-weight: bold; text-align: center; }
.h     { font-weight: bold; text-align: center; }
.theme { font-weight: bold; text-align: center; }
.lieu, .eff { text-align: center; }
.perso { text-align: justify; padding-left: 5.6mm; text-indent: -4.6mm; }
.cell-jour { text-align: center; padding: 0 0.3mm; line-height: 1.05; }
.cell-jour .pa    { font-size: 8pt; display: block; }
.cell-jour .heure { font-size: 7pt; display: block; }

@media print {
  body { margin: 0; }
  table.presence { break-inside: avoid; }
  tr { break-inside: avoid; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }  /* sinon le vert #E2EFD9 ne s'imprime pas */
}
```

⚠️ `print-color-adjust: exact` est **obligatoire** : sans lui, Chrome et Safari suppriment les fonds de couleur à l'impression et les bandes vertes disparaissent.

---

## 9. Protocole de vérification — obligatoire

Ne jamais déclarer la page conforme « à l'œil ». Procédure :

1. Générer la page HTML avec des données de test (16 lignes, mélange de `P`, `A`, vides).
2. Imprimer → Enregistrer en PDF depuis le navigateur.
3. Rastériser à 300 dpi : `pdftoppm -png -r 300 sortie.pdf test`
4. Rastériser le .docx de référence à 300 dpi (même commande sur le PDF issu de Word).
5. **Superposer les deux images en calques** (ou différence de pixels).
6. Vérifier :
   - [ ] Bord gauche du tableau à 9.91 mm (± 0.3)
   - [ ] Bord droit à 169.93 mm (± 0.3)
   - [ ] Haut du tableau à 56.13 mm (± 0.3)
   - [ ] Les 11 traits verticaux tombent aux positions du §3
   - [ ] Le fond vert `#E2EFD9` est présent sur R0 **et** sur les 4 cellules de R2
   - [ ] Aucun `08h42` ne déborde ni ne se coupe
   - [ ] Les bandes d'en-tête et de pied sont pixel-identiques (ce sont les mêmes images)

Les seuls écarts tolérés : le rendu du texte du tableau (police de repli, §5).

---

## 10. Erreurs déjà commises sur ce document — ne pas les refaire

| Erreur | Réalité |
|---|---|
| Ajouter un en-tête « République du Cameroun / MINHDU » | **N'existe pas.** L'en-tête est GREEN INNOVATIVE'S + ACCA. `DIRECTION DES AFFAIRES GÉNÉRALE` est une **ligne interne du tableau**. |
| Ajouter une colonne `N°` | Le document **n'en a pas**. La numérotation `1.` à `16.` est dans la colonne PERSONNELS. |
| Estimer les largeurs (« ~96 mm », « ~14 mm ») | **Faux.** Les cases Jour font 8.54 mm, pas 14. Mesurer, toujours. |
| Supposer 15 mm de marge | **Faux.** 25 mm — et le tableau déborde à gauche jusqu'à 9.91 mm. |
| Ajouter un bloc de statistiques dans le PDF | Décision client : **non**. Les stats restent à l'écran. |
| Passer la page en paysage | **Inutile** : les mesures montrent que le portrait passe avec le bi-ligne à 7 pt. |
| Reproduire R1/R2 avec `rowspan=2` | **Faux montage.** Ce sont 4 cellules vertes distinctes (§4). |
