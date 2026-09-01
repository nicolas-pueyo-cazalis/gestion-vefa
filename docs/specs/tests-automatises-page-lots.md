# Spec — Extraction + tests des fonctions pures de Lots.jsx — chantier 13

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Premier chantier sur une page entière, avec l'approche validée par
Nicolas : extraire les fonctions pures (pas de JSX, pas de hooks) plutôt
que de tester la page entière comme une boîte noire. `Lots.jsx` choisie
en premier — c'est la page qui a le plus de fonctions module-level déjà
séparées du composant (12), un candidat naturel.

## Comportement attendu (cas nominal)

1. **`nomAcquereur()`** — dupliquée à l'identique dans `Lots.jsx`,
   `Tma.jsx` et `AppelsDeFonds.jsx` (code smell déjà trackée, point 236)
   — extraite dans un nouveau fichier partagé
   `client/src/utils/acquereur.js`, importée depuis les **3** fichiers
   (pas seulement `Lots.jsx`) pour régler la duplication pour de bon, pas
   à moitié. Testée une seule fois dans `acquereur.test.js`.
2. **11 autres fonctions**, spécifiques à `Lots.jsx`, exportées en place
   (même principe que les chantiers serveur — un mot-clé `export` ajouté,
   rien déplacé) : `texteRechercheLot`, `prixParM2`, `formatteDecimales`,
   `afficheSurface`, `ligneSurfaces`, `ligneAnnexesType`,
   `afficheAnnexes`, `dateActuelle`, `offrePretManquante`, `nomClient`,
   `derniereDateAnnulation`. Testées dans un nouveau `Lots.test.js`
   (extension `.js`, pas `.jsx` — ce sont des fonctions pures, pas des
   tests de rendu JSX).
3. Les fonctions internes au composant `Lots()` (après la ligne
   `function Lots() {`, ex: `donneesExportTableau`) restent **hors
   périmètre** — elles ferment sur l'état/les props du composant, pas
   extractibles sans un vrai travail de refactor (rejoint la discussion
   plus large sur les "god components", point 236, pas ce chantier-ci).

## Impact sur l'existant

- **Fichiers concernés** : nouveau `client/src/utils/acquereur.js` ;
  `Lots.jsx` modifié (import de `nomAcquereur` depuis ce nouveau fichier
  + `export` ajouté sur 11 fonctions déjà existantes, aucune logique
  changée) ; `Tma.jsx` et `AppelsDeFonds.jsx` modifiés (import de
  `nomAcquereur` depuis le nouveau fichier partagé, suppression de leur
  copie locale identique) ; nouveaux `acquereur.test.js` et `Lots.test.js`.
- **Règle(s) métier existante(s) à ne pas casser** : aucune — extraction
  pure, comportement identique avant/après pour les 3 pages qui
  utilisaient `nomAcquereur`.
- **Test de non-régression à prévoir** : vérifier dans l'appli réelle que
  les 3 pages (Lots, TMA, Appels de fonds) affichent toujours
  correctement le nom d'un acquéreur après le changement d'import — pas
  seulement Lots.jsx, puisque Tma.jsx et AppelsDeFonds.jsx sont aussi
  touchées par ce chantier.

## Cas limites

- `nomAcquereur` : `acquereur` `null`/`undefined` → `'—'` ; civilité ou
  prénom manquants → les parties présentes seulement, jointes par un
  espace (pas de double espace).
- `afficheAnnexes` : toutes les catégories vides → tableau vide (pas de
  lignes "—" qui alourdiraient inutilement).
- `prixParM2` : `surfaceHabitable` absente/à 0 → `null`, pas une division
  par zéro qui donnerait `Infinity`.
- `dateActuelle`/`derniereDateAnnulation` : priorité acte > réservation >
  option — un lot avec seulement une option renseignée affiche cette
  date, pas "—".
- `offrePretManquante` : `false` si l'acquéreur a explicitement "sans
  prêt", même si `dateOffrePretRecue` est vide.

## Contraintes techniques

- Vitest, environnement `node` (pas de JSX testé ici, pas besoin de
  `jsdom`).
- Aucune fonction interne au composant `Lots()` n'est touchée — seules
  les fonctions déjà en dehors de `function Lots() {...}`.

## Points à trancher

- [x] Nom du nouveau fichier partagé : `client/src/utils/acquereur.js` —
      confirmé par Nicolas.

## Hors périmètre

- Fonctions internes au composant (`donneesExportTableau`, etc.) — non
  extractibles sans refactor plus large.
- `Tma.jsx`/`AppelsDeFonds.jsx` au-delà du changement d'import de
  `nomAcquereur` — leurs propres fonctions module-level (`tmaObsolete`,
  `texteRechercheTma`, `texteRechercheAppel`) restent pour un chantier
  ultérieur dédié à ces pages.

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 :** implémentée et vérifiée. `client/src/utils/acquereur.js` créé
  avec `nomAcquereur()` (4 tests), importé par `Lots.jsx`, `Tma.jsx` et
  `AppelsDeFonds.jsx` à la place des 3 copies locales identiques (point
  236 réglé pour de bon). 11 fonctions de `Lots.jsx` exportées en place
  et testées dans `Lots.test.js` (25 tests, `pluraliser` incluse — voir
  ci-dessous).
  **Bug de grammaire réel trouvé en écrivant les tests** :
  `ligneAnnexesType`/`ligneSurfaces` accordaient le pluriel en ajoutant
  un "s" à la fin de toute la phrase (`${mot}${suffix}`), ce qui donnait
  "Parking extérieurs" au lieu de "Parkings extérieurs" pour un libellé
  de 2 mots. Nicolas a demandé une vraie correction plutôt qu'un ajustement
  du test ("il faut que la grammaire soit correcte"). Corrigé avec un
  nouveau helper exporté `pluraliser(mot, pluriel)` qui accorde chaque
  mot du libellé (`mot.split(' ').map(m => m+'s').join(' ')`), utilisé
  par les deux fonctions, et testé indépendamment (3 tests).
  **Vérifications** : suite complète `client/` verte (123 tests, 15
  fichiers) ; `oxlint` sur les 4 fichiers modifiés → 0 erreur (15
  avertissements pré-existants, sans rapport avec ce chantier, sur des
  `useEffect` d'autres pages) ; serveur de dev Vite relancé, `Lots.jsx`
  se recompile sans erreur (`curl` → 200).
