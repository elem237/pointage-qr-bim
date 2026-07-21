# CORRECTIF-IMPRESSION.md — Assainir le rapport imprimé

**Statut** : correctif de mise en page · **Version** 1.0
**Portée autorisée** : `css/print.css`, `js/ui/screen-report.js` (structure DOM du rapport uniquement), `index.html` si le rapport a besoin d'un conteneur dédié. **RIEN d'autre** — aucune logique, aucun autre écran, aucune donnée.

## Place dans la hiérarchie

```
CLAUDE.md > SKILL.md > AJOUT.md > INTERFACE.md > CORRECTIF-IMPRESSION.md > SPECIFICATIONS.md
```

En cas de conflit avec `SKILL.md` sur les dimensions du tableau : **`SKILL.md` gagne toujours**. Ce correctif ne change PAS le tableau — il assainit ce qui l'entoure.

---

## 1. Le diagnostic

Le PDF imprimé actuel a trois défauts, tous issus d'**une seule cause** : des éléments d'écran fuient dans l'impression.

| Symptôme observé | Cause |
|---|---|
| En haut de page : onglets (Scan/Rapport/Liste/Réglages), grille des 6 créneaux (« aucun créneau échu », « Jour 1 · Mt »…) | Éléments d'INTERFACE ÉCRAN non masqués en `@media print` |
| En bas : « Toucher pour agrandir », bouton « Imprimer le rapport », note « rendu à 88 % » | Idem : contrôles d'écran qui s'impriment |
| Tableau et en-tête « désaxés », poussés vers le bas | CONSÉQUENCE : les blocs écran ci-dessus occupent le haut de la feuille et repoussent l'en-tête + le tableau |
| Pied de page (coordonnées GREEN INNOVATIVE'S) flottant au milieu de la page 2 | Le pied n'est pas ancré en bas de page ; il suit le flux |

> **Une seule correction de fond règle les trois premiers : masquer TOUT l'écran à l'impression.** Le « désaxage » n'est pas un problème de mesure du tableau (SKILL.md est correct) — c'est que des blocs parasites le poussent. Retire les parasites, le tableau remonte à sa place.

---

## 2. Le principe — ce qui s'imprime vs ce qui reste à l'écran

> **Règle d'or : en `@media print`, TOUT est masqué SAUF le rapport imprimable.**
> On ne masque pas élément par élément (on en oublierait). On masque tout par défaut, puis on ré-affiche uniquement le rapport.

Ce qui DOIT s'imprimer, dans cet ordre exact :
1. **En-tête** : logos GREEN INNOVATIVE'S + ACCA + liste à puces + visuel 3D + QR décoratif (l'image `HEADER_BAND` de SKILL.md)
2. **Titre** « LISTE DE PRÉSENCE »
3. **Tableau** (gouverné par SKILL.md — INTOUCHABLE)
4. **Bloc absences** s'il existe (ABSENCES.md)
5. **Pied de page** : coordonnées GREEN INNOVATIVE'S SARL, ancré en BAS

Ce qui NE DOIT JAMAIS s'imprimer :
- la barre d'onglets de navigation
- la grille des 6 créneaux / le taux global / les stats d'écran
- l'aperçu miniature, « Toucher pour agrandir »
- le bouton « Imprimer le rapport »
- la note « Impression depuis iPhone : rendu à 88 % »
- tout autre contrôle d'interface

---

## 3. La structure DOM à viser

Le rapport imprimable doit être **un conteneur isolé et identifiable**, séparé des contrôles d'écran. Cible dans `screen-report.js` :

```html
<!-- Contrôles ÉCRAN : stats, aperçu, boutons, note 88% — hors du bloc imprimable -->
<div class="report-screen-only">
  … taux global, grille 6 créneaux, aperçu, bouton imprimer, note 88% …
</div>

<!-- LE SEUL bloc qui s'imprime -->
<div class="report-print">
  <header class="print-header">…HEADER_BAND (logos + 3D)…</header>
  <h1 class="print-title">LISTE DE PRÉSENCE</h1>
  <table class="presence">…</table>          <!-- SKILL.md, intouché -->
  <section class="bloc-absences">…</section>   <!-- ABSENCES.md, si absences -->
  <footer class="print-footer">…coordonnées GREEN INNOVATIVE'S…</footer>
</div>
```

> Si l'aperçu écran (« Toucher pour agrandir ») rend une miniature de `.report-print` via `transform: scale`, garde ce mécanisme MAIS enferme-le dans `.report-screen-only` — l'aperçu est de l'écran, pas de l'impression.

---

## 4. Le CSS d'impression — `css/print.css`

⚠️ La section TABLEAU existante de `print.css` (dimensions SKILL.md) reste **intacte à l'octet près**. On ajoute/ajuste autour.

```css
@media print {
  @page { size: A4 portrait; margin: 0; }

  /* 1) TOUT masquer par défaut */
  body * { visibility: hidden; }

  /* 2) Ré-afficher UNIQUEMENT le rapport imprimable et ses descendants */
  .report-print, .report-print * { visibility: visible; }

  /* 3) Le rapport occupe la page, calé en haut à gauche */
  .report-print {
    position: absolute;
    top: 0; left: 0;
    width: 210mm;
  }

  /* 4) Ceinture + bretelles : ces blocs écran ne s'impriment jamais */
  .report-screen-only,
  .app-nav,                /* la barre d'onglets */
  .report-stats,           /* taux + grille 6 créneaux */
  .report-preview,         /* aperçu miniature + "Toucher pour agrandir" */
  .btn-print,              /* bouton "Imprimer le rapport" */
  .note-88 {               /* note "rendu à 88%" */
    display: none !important;
  }

  /* 5) En-tête imprimé : l'image logos+3D, en haut, pleine largeur */
  .print-header {
    display: block;
    width: 210mm;
    margin: 0;
  }

  /* 6) PIED DE PAGE ancré en bas de CHAQUE page */
  .print-footer {
    position: fixed;
    bottom: 0; left: 0;
    width: 210mm;
    text-align: center;
  }

  /* 7) Réserver l'espace du pied pour qu'il ne chevauche pas le contenu
        (le rapport fait potentiellement 2 pages avec les absences) */
  .report-print { padding-bottom: 22mm; }   /* ≈ hauteur du pied */

  /* 8) Couleurs de fond (vert du tableau) conservées à l'impression */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

### Notes techniques

- **`visibility:hidden` puis `visible`** (et non `display:none` global) : cette technique préserve la mise en page du `.report-print` tout en effaçant le reste. On complète avec `display:none` ciblé (bloc 4) sur les éléments écran connus, pour qu'ils ne réservent même pas d'espace.
- **Pied `position:fixed; bottom:0`** : se répète en bas de chaque page à l'impression. C'est la méthode compatible tous navigateurs / moteurs PDF.
- **`padding-bottom` sur `.report-print`** : réserve la place du pied. Sans lui, sur un rapport de 2 pages, le pied chevaucherait le contenu (piège confirmé par la doc). Ajuster à la hauteur réelle du pied (mesurer).
- **La position exacte du tableau** (top 56.13mm, left 9.91mm…) reste définie par la section SKILL.md de `print.css`. Puisque l'en-tête imprimé occupe désormais le haut, vérifier que le tableau tombe à la bonne position — voir §6.

---

## 5. Le pied de page — contenu

Reproduire les coordonnées telles quelles :
```
GREEN INNOVATIVE'S SARL
BP 1982 Douala Tél:(237)6 94 21 91 80 / 6 75 49 51 28   N°C : M022118500032F RCCM/DLA/02-2024/M/01093
E-mail greeninnovatives46@gmail.com   2e entrée côté Station Total Ndog-bong avant Lycée Technique
```
Police, tailles et couleur : reprendre celles de l'image de pied fournie dans les assets (SKILL.md), OU le rendre en texte si l'asset image du pied existe déjà — dans ce cas, l'utiliser comme image, comme l'en-tête. **Ne pas réinventer la mise en forme** : c'est le pied officiel de l'entreprise.

> Si un asset image `FOOTER_BAND` existe déjà (généré avec `HEADER_BAND`), l'utiliser directement dans `.print-footer` : fidélité garantie, polices Bauhaus 93 non requises.

---

## 6. Vérification métrologique — obligatoire

Après correction, le tableau ne doit pas avoir bougé d'un millimètre par rapport à SKILL.md.

```
1. Générer le PDF du rapport depuis Opera GX (Chromium) :
   marges = Aucune, échelle = 100, arrière-plans = COCHÉS.
2. pdftoppm -png -r 300 rapport.pdf audit
3. Mesurer au pixel (tolérance ±0.3 mm) :
   - bord gauche du tableau     9.91 mm
   - bord droit du tableau    169.93 mm
   - haut du tableau           56.13 mm
   - largeur d'une case Mt/Md   8.54 mm
4. Vérifier À L'ŒIL sur le PDF :
   - AUCUN onglet, AUCUNE grille de créneaux, AUCUN bouton, AUCUNE note 88%
   - l'en-tête (logos + 3D) est EN HAUT
   - le pied (coordonnées) est EN BAS de la/les page(s)
   - le fond vert #E2EFD9 du tableau est présent
```

Si le tableau n'est plus à 56.13 mm du haut : c'est que l'en-tête imprimé a une hauteur différente de celle prévue par SKILL.md. Ajuster la hauteur de `.print-header` pour que le haut du tableau retombe à 56.13 mm — **ne pas** déplacer le tableau lui-même.

---

## 7. Definition of done

- [ ] Le PDF ne contient AUCUN élément d'écran (onglets, grille créneaux, aperçu, boutons, note 88%)
- [ ] L'en-tête (logos + visuel 3D) est en haut de la page 1
- [ ] Le tableau est à sa position SKILL.md exacte (mesure au pixel, ±0.3 mm)
- [ ] Le pied de page (coordonnées GREEN INNOVATIVE'S) est ancré en bas de CHAQUE page
- [ ] Sur un rapport de 2 pages, le pied ne chevauche pas le contenu
- [ ] Le bloc absences (s'il existe) s'affiche entre le tableau et le pied
- [ ] La section tableau de `print.css` est identique à l'octet près (git diff)
- [ ] L'aperçu écran et le bouton imprimer fonctionnent toujours À L'ÉCRAN
- [ ] **Physique** : imprimer depuis le téléphone, vérifier l'alignement à la règle
