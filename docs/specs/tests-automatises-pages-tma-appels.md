# Spec — Extraction + tests des fonctions pures de Tma.jsx et AppelsDeFonds.jsx — chantier 14

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Suite du chantier 13 (`Lots.jsx`) : même approche validée par Nicolas
(extraire les fonctions pures plutôt que tester la page comme une boîte
noire), appliquée aux deux pages restantes déjà identifiées comme "hors
périmètre" à l'époque — `Tma.jsx` et `AppelsDeFonds.jsx`. Contrairement à
`Lots.jsx`, ces deux pages n'ont que 2-3 fonctions module-level chacune
(le reste de leur logique est interne au composant, fermé sur l'état —
hors périmètre comme pour `Lots.jsx`).

## Comportement attendu (cas nominal)

1. **`Tma.jsx`** — 2 fonctions exportées en place, testées dans un nouveau
   `Tma.test.js` :
   - `tmaObsolete(tma)` : vrai si le client d'origine de la TMA (figé à la
     création) ne correspond plus à l'acquéreur actuel du lot.
   - `texteRechercheTma(tma)` : texte concaténé utilisé par la recherche,
     mêmes formatages que l'affichage (référence, client si pas obsolète,
     dates, montants, statut, commentaire).
2. **`AppelsDeFonds.jsx`** — 1 fonction exportée en place, testée dans un
   nouveau `AppelsDeFonds.test.js` :
   - `texteRechercheAppel(appel)` : même principe que `texteRechercheTma`
     (référence du lot, phase, pourcentage, montant, dates, statut,
     commentaire).
3. Aucune autre fonction module-level dans ces deux fichiers — tout le
   reste (exports PDF/Excel, calculs de récapitulatifs, gestion des
   panneaux) est interne au composant, fermé sur l'état/les props
   (`tmaList`, `appels`, `programme`...), donc hors périmètre comme pour
   `Lots.jsx`.

## Impact sur l'existant

- **Fichiers concernés** : `Tma.jsx` et `AppelsDeFonds.jsx` modifiés
  (`export` ajouté sur les fonctions listées ci-dessus, aucune logique
  changée) ; nouveaux `Tma.test.js` et `AppelsDeFonds.test.js`.
- **Règle(s) métier existante(s) à ne pas casser** : aucune — extraction
  pure, comportement identique avant/après.
- **Test de non-régression à prévoir** : suite `client/` complète verte,
  `oxlint` sur les 2 fichiers modifiés, recompilation Vite sans erreur.

## Cas limites

- `tmaObsolete` : lot revenu "Libre" (`tma.lot?.acquereur` absent) → vrai
  (`null !== id_acquereur_origine`) ; lot toujours au même acquéreur →
  faux.
- `texteRechercheTma` : TMA obsolète → nom du client ORIGINE absent du
  texte de recherche (remplacé par `null`, filtré) — cohérent avec
  l'affichage (`tmaObsolete(tma) ? '—' : nomAcquereur(...)`).
- `texteRechercheAppel` : `appel.commentaire` absent → pas de `null`/
  `undefined` littéral dans le texte concaténé (filtré par `.filter(Boolean)`).

## Contraintes techniques

- Vitest, environnement `node` (fonctions pures, pas de rendu JSX).
- Aucune fonction interne aux composants `Tma()`/`AppelsDeFonds()` n'est
  touchée.

## Points à trancher

Aucun — approche, fichiers et périmètre déjà actés lors du chantier 13.

## Hors périmètre

- Fonctions internes aux composants (exports PDF/Excel, récapitulatifs,
  gestion des panneaux d'édition) — non extractibles sans refactor plus
  large (rejoint la dette des "god components", point 236).

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 :** implémentée et vérifiée. `tmaObsolete` et `texteRechercheTma`
  exportées en place et testées dans `Tma.test.js` (5 tests) ;
  `texteRechercheAppel` exportée en place et testée dans
  `AppelsDeFonds.test.js` (2 tests). Aucun bug trouvé cette fois (juste de
  l'extraction, comme pour les 11 fonctions "simples" du chantier 13).
  **Vérifications** : suite complète `client/` verte (130 tests, 17
  fichiers) ; `oxlint` sur les 2 fichiers modifiés → 0 erreur (5
  avertissements, dont un nouveau type `only-export-components` — normal
  et déjà présent ailleurs dès qu'une fonction non-composant est exportée
  d'un fichier de page, comme sur `Lots.jsx` depuis le chantier 13 ; les
  autres sont les mêmes `useEffect` exhaustive-deps pré-existants et sans
  rapport) ; serveur de dev Vite relancé, les deux fichiers se
  recompilent sans erreur (`curl` → 200). **Clôture le sujet "pages
  entières" ouvert au point 290** : les 3 god components (`Lots.jsx`,
  `Tma.jsx`, `AppelsDeFonds.jsx`) ont maintenant toutes leurs fonctions
  module-level pures extraites et testées ; seule leur logique interne
  aux composants reste hors périmètre (dette des "god components", point
  236, un vrai refactor, pas un chantier de tests).
