# Spec — Tests automatisés (Bandeau, ChoixProgramme) — chantier 12

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Suite des chantiers 9/10 (composants avec API/contexte) sur deux
composants supplémentaires, choisis pour leur taille raisonnable :
`Bandeau.jsx` (66 lignes) et `ChoixProgramme.jsx` (96 lignes) — nommés
explicitement par Nicolas. `Connexion.jsx`/`AlerteRetards.jsx` restent en
réserve pour un chantier ultérieur si besoin.

## Comportement attendu (cas nominal)

1. **`Bandeau.jsx`** : `useAuth`/`useProgramme` simulés (`vi.mock`, même
   principe que les chantiers 9/10), `useNavigate` simulé (mock partiel
   de `react-router-dom` — garde `NavLink`/`MemoryRouter` réels, seul
   `useNavigate` est remplacé par un espion). Vérifie l'affichage
   (programme actif, utilisateur, repères) et les deux actions
   (déconnexion, changement de programme).
2. **`ChoixProgramme.jsx`** : `useAuth`/`useProgramme` simulés,
   `apiFetch` simulé (`vi.mock('../utils/api.js')`, plus simple que de
   simuler `fetch`/`localStorage` — `apiFetch` a déjà ses propres tests
   séparés, chantier A). Vérifie le chargement de la liste, la sélection
   d'un programme, la création (avec le contrôle de rôle sur le
   formulaire), et le cas d'erreur serveur.

## Impact sur l'existant

- **Fichiers concernés** : nouveaux `Bandeau.test.jsx` et
  `ChoixProgramme.test.jsx` — aucun composant existant modifié.
- **Règle(s) métier existante(s) à ne pas casser** : aucune.
- **Test de non-régression** : `npm run dev` toujours fonctionnel.

## Cas limites

- `Bandeau` : `utilisateur.nom` absent → affiche l'email à la place
  (`utilisateur?.nom || utilisateur?.email`) ; un repère du programme
  absent (`maitreOuvrage`) → affiche "—", pas `undefined`.
- `ChoixProgramme` : formulaire de création **absent** pour le rôle
  `lecture` (contrôle déjà présent côté UI, en plus du blocage serveur) ;
  erreur de création → message affiché, la liste de programmes n'est pas
  perdue, pas de navigation déclenchée.

## Contraintes techniques

- Même outillage que les chantiers 6/9/10 (`jsdom`,
  `@testing-library/react`).
- `MemoryRouter` pour `Bandeau` (nécessaire pour `NavLink`).

## Points à trancher

- [ ] Aucun.

## Hors périmètre

- `Connexion.jsx`, `AlerteRetards.jsx` — gardés en réserve, chantier
  ultérieur si besoin.
- Les pages entières (`Lots.jsx`, `Tma.jsx`, `AppelsDeFonds.jsx`) — sujet
  distinct, à discuter séparément avec Nicolas (rattaché à la dette des
  "god components", point 236).

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 (01/09/2026) :** générée avec un vrai blocage d'infrastructure
  trouvé et corrigé (pas des bugs du code source). `Bandeau.test.jsx`
  (6 tests) et `ChoixProgramme.test.jsx` (6 tests) écrits, mais 7 tests
  ont d'abord échoué : `@testing-library/react` ne nettoie pas le DOM
  entre deux tests par défaut avec Vitest (contrairement à Jest) — chaque
  `render()` s'ajoutait au précédent, provoquant des "Found multiple
  elements" dès qu'un fichier avait plusieurs tests avec du contenu qui
  se recoupe (1ᵉʳ chantier de composants avec plusieurs tests par
  fichier sur la même page/le même composant). **Corrigé au niveau
  infrastructure** : nouveau `client/src/test-setup.js` (nettoyage du DOM
  + réinitialisation des mocks après chaque test), branché globalement
  via `client/vitest.config.js` (`test.setupFiles`) — s'applique à tous
  les fichiers de test du projet, présents et futurs, pas seulement
  celui-ci. Un 2ᵉ échec restant après ce premier correctif : un mock
  (`mockNavigate`) gardait l'historique d'appel d'un test précédent du
  même fichier — corrigé par la réinitialisation ajoutée au même
  `test-setup.js`. Un test Bandeau lui-même trop large corrigé
  (`getByText('—')` → `getAllByText('—')`, 3 repères vides
  simultanément dans le scénario, pas une erreur du composant). `npm
  test` confirmé réellement exécuté : 94/94 côté client (12 nouveaux +
  82 déjà là). Non-régression vérifiée : `npm run dev` toujours
  fonctionnel.
