## Hiérarchie des sources
AGENTS.md > SKILL.md > AJOUT.md > SPECIFICATIONS.md > FORMALISATION_MATHEMATIQUE_v2.md
PÉRIMÉS, ne pas suivre : SPECIFICATIONS.md §10 (→ SKILL.md) et les heures du §3 (→ AJOUT.md v2).

# Règles du projet — Pointage QR BIM

`SPECIFICATIONS.md` fait foi pour le code. `FORMALISATION_MATHEMATIQUE_v2.md`
explique le pourquoi. En cas de contradiction : SPECIFICATIONS.md gagne.

## Interdits absolus
- Aucun framework, aucun bundler, aucun `npm install`, aucun `node_modules`.
- Aucun CDN au runtime. Toute dépendance est vendorée dans `vendor/`.
- Aucun `localStorage` pour les pointages. IndexedDB uniquement.
- Ne JAMAIS retirer un champ de `PointageValue` (generation, statut, tau, mode,
  device, override). Chacun porte une propriété prouvée. Les retirer casse
  l'annulation ou le déterminisme de la fusion.
- Aucun fichier audio. Le ding est synthétisé en Web Audio.
- Ne jamais "simplifier", "optimiser" ou "améliorer" une structure de la spec.
  Si elle paraît trop complexe : SIGNALER, ne pas modifier.

## Langage
JavaScript ES2020+, modules ES natifs. Types en JSDoc `@typedef`, pas TypeScript.

## Discipline
- Une étape du §12 à la fois. Ne jamais anticiper sur la suivante.
- Modules 🔴 : écrire les tests AVANT le code.
- Si une spec est ambiguë ou impossible : ARRÊTER et demander. Ne pas inventer.
- Ne pas écrire de code non demandé par l'étape en cours.
