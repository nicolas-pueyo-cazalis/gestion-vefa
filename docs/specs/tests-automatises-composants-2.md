# Spec — Tests automatisés (composants avec API/contexte) — chantier 9

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Étendre les tests de composants (chantier 6/point D déjà fait, composants
purement présentationnels) à un composant/contexte qui appelle l'API et
un composant qui consomme ce contexte — le périmètre explicitement laissé
de côté au chantier D.

## Comportement attendu (cas nominal)

1. **`AuthContext.jsx`** (`AuthProvider` + `useAuth`) : teste la vraie
   logique métier (vérification de session au chargement via
   `fetch('/api/auth/moi')`, connexion via `fetch('/api/auth/connexion')`,
   déconnexion) avec `fetch` et `localStorage` simulés — même pattern déjà
   établi pour `apiFetch` (chantier A).
2. **`RouteProtegee.jsx`** : teste le comportement de garde (redirige vers
   `/connexion` si personne n'est connecté, affiche le contenu protégé
   `<Outlet />` sinon, n'affiche rien pendant le chargement initial) —
   `useAuth` **simulé directement** (`vi.mock`) plutôt que de passer par un
   vrai `AuthProvider` (plus simple, teste `RouteProtegee` en isolation,
   sans dépendre du bon fonctionnement d'`AuthContext` en même temps —
   celui-ci a ses propres tests séparés au point 1). `MemoryRouter` utilisé
   pour fournir le contexte de routage nécessaire (`useLocation`,
   `Navigate`, `Outlet`).

## Impact sur l'existant

- **Fichiers concernés** : nouveaux fichiers de test colocalisés
  (`AuthContext.test.jsx`, `RouteProtegee.test.jsx`) — aucun composant
  existant modifié.
- **Règle(s) métier existante(s) à ne pas casser** : aucune.
- **Test de non-régression** : `npm run dev` (Vite) toujours fonctionnel
  après l'ajout de ces tests.

## Cas limites

- `AuthContext` : session au chargement avec un jeton stocké mais devenu
  invalide (`/api/auth/moi` répond une erreur) → jeton et utilisateur
  retirés du `localStorage`, pas d'utilisateur connecté. Connexion avec
  identifiants refusés par le serveur → l'erreur du serveur est relancée
  (`throw`), rien n'est stocké.
- `RouteProtegee` : `chargement: true` → n'affiche rien (pas de flash de
  redirection avant que la session soit vérifiée) ; `chargement: false` +
  `utilisateur: null` → redirige vers `/connexion` en mémorisant le chemin
  d'origine (`state.depuis`) ; `utilisateur` renseigné → affiche le
  contenu protégé.

## Contraintes techniques

- Même outillage que le chantier 6 (`@testing-library/react`, `jsdom`,
  annotation `// @vitest-environment jsdom` par fichier).
- `react-router-dom` : `MemoryRouter` pour fournir un contexte de routage
  en test, sans navigateur réel.
- `vi.mock('../context/AuthContext.jsx')` pour `RouteProtegee` — teste le
  composant en isolation, pas une intégration complète avec le vrai
  contexte (déjà couvert séparément par les tests d'`AuthContext`
  lui-même).

## Points à trancher

- [ ] Aucun — périmètre déjà cadré par la question posée à Nicolas
      (composant avec API/contexte), deux candidats naturels et complets
      l'un avec l'autre (le contexte + un composant qui le consomme).

## Hors périmètre

- `ProgrammeContext.jsx` (même principe qu'`AuthContext`, mais pour le
  programme actif) — pourrait être un chantier de composants ultérieur
  similaire.
- Pages entières qui utilisent ces contextes (`Bandeau.jsx`,
  `ChoixProgramme.jsx`...) — trop larges pour ce chantier, plus proche des
  god components déjà trackés comme dette.

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 (01/09/2026) :** générée avec succès du premier coup, aucun
  blocage. `AuthContext.test.jsx` (6 tests, `renderHook` +
  `localStorage`/`fetch` simulés) et `RouteProtegee.test.jsx` (3 tests,
  `useAuth` simulé via `vi.mock` + `MemoryRouter`). `npm test` confirmé
  réellement exécuté : 70/70 côté client (9 nouveaux + 61 déjà là).
  Aucun écart de comportement trouvé. Non-régression vérifiée :
  `npm run dev` (Vite) toujours fonctionnel.
