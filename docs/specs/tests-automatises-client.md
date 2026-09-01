# Spec — Tests automatisés (client) — chantier 2

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Étendre côté client le principe déjà validé côté serveur (voir
`docs/specs/tests-automatises-serveur.md`, point 278) : sécuriser les
fonctions de calcul de statut/retard les plus critiques contre les
régressions futures, sur `client/src/utils/statuts.js`.

## Comportement attendu (cas nominal)

1. Vitest installé comme dépendance de développement dans `client/`
   (même outil que côté serveur, s'intègre nativement avec Vite déjà
   présent), script `npm test` (exécution unique, utilisé en CI) et
   `npm run test:watch`.
2. Tests unitaires écrits pour les 8 fonctions exportées de
   `client/src/utils/statuts.js` : `formatDate`,
   `calculerDateLimiteJours`, `calculerDateLimiteMois`, `statutAppel`,
   `statutPret`, `statutSignature`, `estEntrepriseEnRetard`,
   `estFactureTmaEnRetard`.
3. Chaque test vérifie un comportement réel déjà documenté
   (`docs/regles-metiers.md` § 4/5/6/9) — mêmes exigences que le chantier 1
   (pas de test inventé sans lien avec une règle réelle).
4. `npm test` ne dépend d'aucun environnement DOM/navigateur (fonctions
   pures, pas de composant React ici) — environnement Vitest par défaut
   (`node`), pas besoin de `jsdom`.
5. `.github/workflows/ci.yml` exécute cette suite à chaque push/pull
   request sur `main`, job séparé du serveur (`test-front`).

## Impact sur l'existant

- **Fichiers concernés** : `client/package.json` (nouvelle dépendance +
  scripts) ; nouveau fichier `client/src/utils/statuts.test.js` ;
  `.github/workflows/ci.yml` (nouvelle étape).
- **Règle(s) métier existante(s) à ne pas casser** : aucune — ajout de
  tests en lecture seule, aucune fonction de `statuts.js` n'est modifiée
  (sauf découverte d'un écart réel, même règle que le chantier 1 : signaler
  à Nicolas plutôt que corriger silencieusement).
- **Documents à mettre à jour une fois fait** : `CLAUDE.md` (section
  Stack, actuellement "côté serveur uniquement pour l'instant"),
  `README.md` (section Tests), `docs/demandes.md`/`docs/taches-a-traiter.md`
  (point 278).
- **Test de non-régression à prévoir** : vérifier que `npm run dev`
  (Vite) démarre toujours normalement après l'ajout de la dépendance.

## Cas limites

- `statutAppel` : `dateReglement` renseignée prioritaire sur tout le
  reste (même si `dateEmission` est aussi vide, cas normalement impossible
  en pratique mais la fonction doit rester cohérente) → `'regle'`.
- `statutPret` : `Acquereur.sansPret` prioritaire sur `dateOffrePretRecue`
  même si les deux sont renseignés en même temps → `'sans_pret'`.
- `statutPret`/`statutSignature` : lot sans `dateReservation` → `null`
  (pas de point de départ pour l'échéance), quel que soit le reste.
- `estEntrepriseEnRetard` : `montantDevis` à `0` (falsy mais valide, devis
  reçu) → pas en retard (même piège que `calculerStatutAutomatique` déjà
  couvert au chantier 1 avec `montantEntreprises`).
- `calculerDateLimiteMois` : passage d'année (ex: réservation en novembre
  + 3 mois → février de l'année suivante) — `setMonth()` gère seul le
  débordement, à vérifier explicitement par un test.

## Contraintes techniques

- Vitest, même outil que le chantier 1, pas de nouvelle dépendance à
  discuter.
- Fonctions dépendant de `new Date()` (comparaison à "maintenant") :
  utiliser `vi.useFakeTimers()`/`vi.setSystemTime()` pour des tests
  déterministes, même pattern que `appelsDeFonds.test.js` côté serveur.
- Ce chantier ajoute des tests, il ne corrige pas de bug : écart trouvé →
  signalé à Nicolas, pas corrigé dans la foulée sans son accord (même
  règle que le chantier 1, où l'accord a été donné au cas par cas).

## Points à trancher

- [x] Tests colocalisés à côté du fichier source
      (`client/src/utils/statuts.test.js`) — même convention que le
      chantier 1, pas besoin de redemander.
- [x] Périmètre : les 8 fonctions de `statuts.js` uniquement — pas de
      test de composant React dans ce chantier (ce serait un 3ᵉ chantier
      distinct, plus lourd — React Testing Library, rendu DOM).

## Hors périmètre (pour ce chantier)

- Tests de composants React (nécessiteraient `jsdom` + React Testing
  Library) — chantier ultérieur, pas daté.
- Tests d'intégration sur les routes API — toujours hors périmètre,
  chantier suivant après le client (voir chantier 1).

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 (01/09/2026) :** générée avec succès. `vitest` installé
  (`client/package.json`), `client/src/utils/statuts.test.js` écrit (25
  tests, les 8 fonctions), `npm test` confirmé réellement exécuté (20/20
  puis 24/25 après un premier essai, 25/25 après correction). Écart
  trouvé : un test (`calculerDateLimiteMois`) comparait une date
  construite depuis une chaîne ISO (parsée en UTC) à un résultat de
  `setMonth()` (heure locale) — décalage d'une heure au passage du
  changement d'heure d'été entre les deux dates testées. **Pas un bug du
  code source** (vérifié), une erreur de construction de dates dans le
  test lui-même — corrigé en utilisant des dates construites en heure
  locale (`new Date(année, mois, jour)`) plutôt que des chaînes ISO.
  CI (`.github/workflows/ci.yml`) complété avec un job `test-front`.
  `CLAUDE.md`/`README.md` mis à jour. Non-régression vérifiée : le
  serveur de dev (`npm run dev`, Vite) répond toujours normalement après
  l'ajout de la dépendance.
