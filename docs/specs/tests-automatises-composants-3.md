# Spec — Tests automatisés (ProgrammeContext) — chantier 10

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Même principe que le chantier 9 (`AuthContext`/`RouteProtegee`), pour
`ProgrammeContext.jsx` — plus riche que prévu à la lecture : dépend
d'`AuthContext` (`useAuth()`) et contient un garde-fou corrigeant un vrai
bug historique (point 143, `docs/bugs.md`) — bon candidat de test de
non-régression, pas seulement un test de routine.

## Comportement attendu (cas nominal)

1. `ProgrammeContext.test.jsx` — `useAuth` simulé (`vi.mock`, même
   principe que `RouteProtegee.test.jsx`), `fetch`/`localStorage` simulés
   (même principe qu'`AuthContext.test.jsx`, car `ProgrammeProvider`
   passe par `apiFetch()` qui les utilise).
2. Le garde-fou du point 143 testé explicitement : tant qu'`AuthContext`
   n'a pas fini sa propre vérification (`chargementAuth: true`),
   `ProgrammeProvider` ne doit **rien** décider (ni charger, ni redescendre
   son propre `chargement` à `false`) — c'est exactement le bug d'origine
   (un utilisateur déjà connecté avec un programme déjà choisi se
   retrouvait renvoyé au choix de programme à chaque rechargement).
3. Comportement normal : pas d'utilisateur → pas de programme ; utilisateur
   sans `programmeId` stocké → pas de programme, pas d'appel réseau ;
   `programmeId` stocké et valide → programme restauré ; `programmeId`
   stocké mais invalide (programme supprimé entre-temps) → nettoyé,
   `programmeActif` à `null`.
4. `choisirProgramme()`/`changerDeProgramme()` : stockent/retirent
   `programmeId`, mettent à jour le contexte en conséquence.

## Impact sur l'existant

- **Fichiers concernés** : nouveau `ProgrammeContext.test.jsx` — aucun
  composant existant modifié.
- **Règle(s) métier existante(s) à ne pas casser** : aucune.
- **Test de non-régression** : `npm run dev` (Vite) toujours fonctionnel.

## Cas limites

- Le garde-fou `chargementAuth` (point 1 ci-dessus) — le cas limite le
  plus important de ce chantier, c'est un vrai bug déjà corrigé une fois.
- `programmeId` stocké mais la réponse API n'est pas `ok` (programme
  supprimé) → `localStorage.removeItem('programmeId')` bien appelé, pas
  seulement `programmeActif` mis à `null` sans nettoyer le stockage.

## Contraintes techniques

- Même outillage que les chantiers 6 et 9 — rien de nouveau.

## Points à trancher

- [ ] Aucun.

## Hors périmètre

- `Bandeau.jsx`/`ChoixProgramme.jsx` (consommateurs de ce contexte) —
  chantier de composants ultérieur si besoin.

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 (01/09/2026) :** générée avec succès du premier coup, aucun
  blocage. `ProgrammeContext.test.jsx` (7 tests), dont le test explicite
  du garde-fou anti-régression (point 143). `npm test` confirmé
  réellement exécuté : 77/77 côté client (7 nouveaux + 70 déjà là).
  Aucun écart de comportement trouvé. Non-régression vérifiée :
  `npm run dev` toujours fonctionnel.
