# SKILL-IMPRESSION-V2.md — Mise à jour métrologique du rapport

**Statut** : correctif de mesures · remplace les valeurs de colonnes de `SKILL.md`
**Portée autorisée** : `css/print.css` (section tableau) et le `<colgroup>` du tableau dans `js/ui/screen-report.js`. **RIEN d'autre.**

## Place dans la hiérarchie

Ce document **corrige** les largeurs de colonnes de `SKILL.md`. Sur ces valeurs précises (colonnes du tableau), **SKILL-IMPRESSION-V2.md fait foi**. Tout le reste de `SKILL.md` (structure, en-tête image, pied, couleurs, la technique de rendu) reste valable.

---

## 1. Pourquoi cette mise à jour

Le fichier `LISTE_DE_PRÉSENCE.docx` fourni a été **modifié** par rapport à la version sur laquelle `SKILL.md` avait été mesuré. Les largeurs de colonnes ont changé. Toutes les valeurs ci-dessous sont **re-mesurées au pixel** sur le nouveau document (rendu 300 dpi) et **confirmées par la grille XML** du `.docx` (source de vérité, en twips).

**Ce qui n'a PAS changé** (valeurs de `SKILL.md` toujours exactes) :
- Format A4 portrait, marges Word 25 mm
- Début du tableau : **9,91 mm** du bord gauche (le tableau déborde la marge, `tblInd = -856 twips` — voulu)
- Haut du tableau : **56,13 mm**
- Largeur totale du tableau : **160,02 mm**, bord droit à **169,93 mm**
- Fond vert `#E2EFD9`, en-tête et pied en images

**Ce qui a changé** : la répartition interne des 10 colonnes, et surtout les 6 cases Mt/Md ne sont **plus uniformes**.

---

## 2. Les largeurs de colonnes — VALEURS EXACTES

Source : grille XML du document (`<w:gridCol>`), en twips, convertie en mm (1440 twips = 25,4 mm). Confirmée par mesure pixel à ±0,05 mm.

| # | Colonne | Twips | **Largeur (mm)** |
|---|---|---|---|
| 1 | THÈMES | 1395 | **24,61** |
| 2 | LIEU | 1028 | **18,13** |
| 3 | PERSONNELS | 2902 | **51,19** |
| 4 | EFFECTIFS | 843 | **14,87** |
| 5 | Jour 1 · Mt | 485 | **8,55** |
| 6 | Jour 1 · Md | 487 | **8,59** |
| 7 | Jour 2 · Mt | 450 | **7,94** |
| 8 | Jour 2 · Md | 510 | **9,00** |
| 9 | Jour 3 · Mt | 450 | **7,94** |
| 10 | Jour 3 · Md | 522 | **9,21** |
| | **TOTAL** | 9072 | **160,02** |

> ⚠️ **Les six cases Mt/Md ne sont PAS égales.** Elles vont de 7,94 mm à 9,21 mm. C'est ce qui produit le désalignement actuel : le code applique probablement une largeur uniforme (8,54 mm) héritée de l'ancienne version. Il faut appliquer ces dix valeurs exactes, une par une.

### Colonnes « Jour » entières (Mt + Md), pour information
- Jour 1 : 8,55 + 8,59 = **17,14 mm**
- Jour 2 : 7,94 + 9,00 = **16,93 mm**
- Jour 3 : 7,94 + 9,21 = **17,14 mm**

---

## 3. Écart avec ce que le code applique aujourd'hui

Comparaison entre les largeurs actuelles (héritées de l'ancienne version, supposées uniformes) et les valeurs correctes :

| Colonne | Appliqué (ancien) | **Correct** | Écart |
|---|---|---|---|
| THÈMES | 26,84 | 24,61 | **−2,23 mm** |
| LIEU | 15,91 | 18,13 | **+2,22 mm** |
| PERSONNELS | 49,02 | 51,19 | **+2,17 mm** |
| EFFECTIFS | 17,02 | 14,87 | **−2,15 mm** |
| J1 · Mt | 8,54 | 8,55 | +0,01 |
| J1 · Md | 8,54 | 8,59 | +0,05 |
| J2 · Mt | 8,54 | 7,94 | **−0,60 mm** |
| J2 · Md | 8,54 | 9,00 | **+0,46 mm** |
| J3 · Mt | 8,54 | 7,94 | **−0,60 mm** |
| J3 · Md | 8,54 | 9,21 | **+0,67 mm** |

> Les quatre premières colonnes sont décalées de plus de 2 mm chacune — c'est très visible à l'impression. Les cases Mt/Md dérivent jusqu'à 0,67 mm. Ces écarts se cumulent en un désalignement net entre le contenu et la grille.

---

## 4. Le `<colgroup>` à appliquer — `js/ui/screen-report.js`

```html
<colgroup>
  <col style="width:24.61mm">  <!-- THÈMES -->
  <col style="width:18.13mm">  <!-- LIEU -->
  <col style="width:51.19mm">  <!-- PERSONNELS -->
  <col style="width:14.87mm">  <!-- EFFECTIFS -->
  <col style="width:8.55mm">   <!-- Jour 1 · Mt -->
  <col style="width:8.59mm">   <!-- Jour 1 · Md -->
  <col style="width:7.94mm">   <!-- Jour 2 · Mt -->
  <col style="width:9.00mm">   <!-- Jour 2 · Md -->
  <col style="width:7.94mm">   <!-- Jour 3 · Mt -->
  <col style="width:9.21mm">   <!-- Jour 3 · Md -->
</colgroup>
```

Le tableau garde `table-layout: fixed` (sans lui, le navigateur ignore ces largeurs). Position et largeur totale inchangées : `top:56.13mm; left:9.91mm; width:160.02mm`.

---

## 5. Hauteurs de lignes — vérifiées

Mesures pixel des lignes horizontales (mm depuis le haut) :

| Rangée | Haut (mm) | Hauteur (mm) |
|---|---|---|
| Bandeau vert « DIRECTION DES AFFAIRES GÉNÉRALE » | 56,13 | 5,08 |
| En-tête (THÈMES … Jour 1/2/3) | 61,21 | 12,53 |
| Sous-en-tête (Mt / Md) | 73,74 | 8,39 |
| Lignes participants | 82,13 → 189,74 | ~5,7 par ligne simple |

Bas du tableau : **189,74 mm**. Ces valeurs sont proches de `SKILL.md` ; l'essentiel du correctif porte sur les **colonnes** (§2), pas sur les lignes.

---

## 6. Vérification — obligatoire après correction

```
1. PDF du rapport depuis Opera GX (Chromium) : marges Aucune, échelle 100,
   arrière-plans cochés.
2. pdftoppm -png -r 300 rapport.pdf audit
3. Mesurer au pixel les 11 bords verticaux et comparer (tolérance ±0,3 mm).
   Cibles exactes (bord gauche + cumul des largeurs du §2) :

   9,90 · 34,50 · 52,63 · 103,82 · 118,69 · 127,25 · 135,84 · 143,77 ·
   152,77 · 160,71 · 169,92

4. Vérifier qu'aucun texte de cellule ne déborde de sa colonne.
5. Le tableau doit être pixel-identique au rendu du .docx de référence.
```

---

## 7. Definition of done

- [ ] Les 10 `<col>` portent les largeurs exactes du §2 (pas de valeur uniforme)
- [ ] `table-layout: fixed` conservé
- [ ] Position (9,91 / 56,13 mm) et largeur totale (160,02 mm) inchangées
- [ ] Mesure pixel : les 11 bords verticaux à ±0,3 mm des cibles du §6
- [ ] Aucun texte de cellule ne déborde
- [ ] Le reste de `SKILL.md` (en-tête image, pied, couleurs) intact
- [ ] `git diff` ne touche que le `<colgroup>` de screen-report.js et la section
      colonnes de print.css — rien d'autre
- [ ] **Physique** : imprimer, superposer au .docx original, vérifier l'alignement
