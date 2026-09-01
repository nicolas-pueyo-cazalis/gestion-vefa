# Spec — Tests automatisés (composants React) — chantier 6 (point D)

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Premier chantier de tests de composants React — point D de l'inventaire
"tests au bout du bout" (`docs/demandes.md`, point 281). Nouvel
outillage nécessaire (jsdom + React Testing Library), distinct des 5
chantiers précédents qui ne testaient que du JavaScript pur.

## Comportement attendu (cas nominal)

1. `jsdom`, `@testing-library/react` et `@testing-library/jest-dom`
   installés comme dépendances de développement dans `client/`.
2. Environnement `jsdom` activé **uniquement pour les fichiers de test de
   composants** (annotation `// @vitest-environment jsdom` en tête de
   fichier), pas globalement — les tests déjà existants
   (`statuts.test.js`, `recherche.test.js`...) restent en environnement
   `node` par défaut, plus rapide, pas besoin d'un DOM simulé pour du
   JavaScript pur.
3. Premier lot de tests ciblé sur 3 candidats simples et déjà bien choisis
   (composants purement présentationnels, sans appel API ni contexte
   React) :
   - `Badge` (`client/src/components/Badge.jsx`)
   - `StatCard` (`client/src/components/StatCard.jsx`)
   - `useFermerAvecEchap` (`client/src/hooks/useFermerAvecEchap.js`,
     testé avec `renderHook`, pas un composant mais du même outillage)

## Impact sur l'existant

- **Fichiers concernés** : `client/package.json` (3 nouvelles
  dépendances) ; nouveaux fichiers de test colocalisés
  (`Badge.test.jsx`, `StatCard.test.jsx`, `useFermerAvecEchap.test.js`).
- **Règle(s) métier existante(s) à ne pas casser** : aucune — tests en
  lecture seule, aucun composant modifié.
- **Test de non-régression à prévoir** : vérifier que `npm run dev`
  (Vite) démarre toujours normalement après l'ajout des dépendances, et
  que les tests déjà existants (fonctions pures) tournent toujours aussi
  vite qu'avant (pas ralentis par un environnement `jsdom` qu'ils
  n'utilisent pas).

## Cas limites

- `Badge` : la classe CSS suit exactement le `statut` reçu (`badge
  emis`, `badge refuse`...) — vérifier que le texte affiché ET la classe
  générée correspondent bien aux props.
- `StatCard` : `pourcentage` absent (`undefined`/non fourni) → aucun bloc
  pourcentage affiché ; `pourcentage` à `0` (falsy mais une vraie valeur,
  même piège que les chantiers précédents) → le bloc doit quand même
  s'afficher, pas être masqué comme "absent" (`pourcentage != null` dans
  le code source, pas un simple `if (pourcentage)`) ; `statut` absent →
  classe `carte` seule, pas de `carte--undefined`.
- `useFermerAvecEchap` : la touche Échap déclenche bien le callback ;
  une autre touche (ex: Entrée) ne le déclenche pas ; l'écouteur est bien
  retiré au démontage (pas de fuite mémoire/écouteur fantôme).

## Contraintes techniques

- React Testing Library plutôt qu'Enzyme (obsolète, plus maintenu pour
  React 19) — standard actuel pour tester du React avec Vitest.
- Philosophie Testing Library à respecter : tester ce qu'un utilisateur
  voit/fait (texte affiché, rôle accessible), pas les détails
  d'implémentation interne du composant.
- `jsdom` seulement là où c'est nécessaire (annotation par fichier), pour
  ne pas ralentir inutilement les tests déjà existants.

## Points à trancher

- [ ] Aucun — 3 candidats déjà simples et sans dépendance lourde
      (contexte, API), même logique de sélection "haute valeur/faible
      effort" que les chantiers précédents.

## Hors périmètre (pour ce chantier)

- Composants avec appel API ou contexte React (`AuthContext`,
  `ProgrammeContext`) — nécessiteraient de mocker `apiFetch`/le contexte,
  chantier de composants ultérieur, plus lourd.
- Pages entières (`Lots.jsx`, `Tma.jsx`...) — beaucoup trop volumineuses
  pour un premier chantier de composants, à ne jamais faire d'un coup de
  toute façon (voir dette technique déjà trackée, "god components").

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 (01/09/2026) :** générée avec succès, avec un vrai blocage
  rencontré et corrigé en cours de route. `@testing-library/react`,
  `@testing-library/jest-dom` et `jsdom` installés. 3 fichiers de test
  (`Badge.test.jsx`, `StatCard.test.jsx`, `useFermerAvecEchap.test.js`),
  annotés `// @vitest-environment jsdom` individuellement — les tests déjà
  existants restent en environnement `node`, pas ralentis.
  **Blocage rencontré** : `React is not defined` sur chaque test de
  composant — Vitest n'appliquait pas le plugin `@vitejs/plugin-react` de
  `vite.config.js` (JSX compilé en runtime "classique" au lieu du runtime
  automatique de React 19). Corrigé par la création de
  `client/vitest.config.js` (fusionne `vite.config.js` via `mergeConfig`
  + `esbuild.jsx: 'automatic'` explicite). Import `@testing-library/jest-dom`
  également corrigé : le point d'entrée générique suppose un `expect`
  global façon Jest — utiliser `@testing-library/jest-dom/vitest`, pensé
  pour Vitest. `npm test` confirmé réellement exécuté : 61/61 côté client
  (12 nouveaux + 49 déjà là). Non-régression vérifiée : `npm run dev`
  (Vite) toujours fonctionnel, `oxlint` toujours 0 erreur.
