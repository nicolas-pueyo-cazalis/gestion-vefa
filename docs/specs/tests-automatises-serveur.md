# Spec — Premiers tests automatisés (serveur)

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Mettre en place une première suite de tests automatisés côté serveur, pour
sécuriser les fonctions de calcul métier les plus critiques (financier)
contre les régressions futures — le manque le plus lourd ressorti des deux
revues externes (points 271, 237 ; tracké au point 278 de `demandes.md`).

## Comportement attendu (cas nominal)

1. Vitest installé comme dépendance de développement dans `server/`,
   scripts `npm test` (exécution unique, utilisé en CI) et
   `npm run test:watch` (mode veille, pour écrire en local) disponibles.
2. Tests unitaires écrits pour les 3 fonctions de calcul pur déjà
   identifiées comme prioritaires : `calculerStatutAutomatique()` et
   `calculerMontantClient()` (`server/models/Tma.js`),
   `calculerEmissionAppel()` (`server/utils/appelsDeFonds.js`).
3. Chaque test vérifie un comportement réel déjà documenté
   (`docs/regles-metiers.md`) ou un bug historique déjà corrigé — pas des
   tests inventés au hasard sans lien avec une règle réelle.
4. `npm test` s'exécute sans connexion à une vraie base MongoDB (fonctions
   pures uniquement pour ce premier chantier).
5. `.github/workflows/ci.yml` exécute cette suite à chaque push/pull
   request sur `main`.

## Impact sur l'existant

- **Fichiers concernés** : `server/package.json` (nouvelle dépendance +
  scripts) ; nouveaux fichiers `server/models/Tma.test.js` et
  `server/utils/appelsDeFonds.test.js` ; `.github/workflows/ci.yml`
  (nouvelle étape).
- **Règle(s) métier existante(s) à ne pas casser** : aucune — ce chantier
  n'ajoute que des tests en lecture sur des fonctions déjà existantes,
  aucun fichier de logique métier n'est modifié.
- **Documents à mettre à jour une fois fait** (le statut "pas de tests" est
  actuellement affirmé comme une limite assumée à plusieurs endroits, ça
  deviendrait faux) : `CLAUDE.md` (section Stack), `README.md` (section
  Tests), `docs/demandes.md`/`docs/taches-a-traiter.md` (point 278).
- **Test de non-régression à prévoir** : vérifier que `npm run dev`
  (nodemon) démarre toujours normalement après l'ajout de la dépendance —
  l'ajout ne doit rien changer au comportement de l'application elle-même.

## Cas limites

- `calculerStatutAutomatique` : `montantEntreprises = 0` (valeur "falsy"
  mais valide) → ne doit **pas** être traité comme "pas encore chiffré",
  doit renvoyer `'chiffre'` (garde-fou direct contre le bug historique du
  point 142, où une comparaison naïve aurait raté ce cas).
- `calculerMontantClient` : montant négatif (avoir) avec la règle par
  défaut → `0€` + frais éventuels ; montant négatif avec la règle
  `avoir_sans_marge` → montant tel quel + frais ; `montantEntreprises`
  `null`/`undefined` avec frais d'ouverture activé → renvoie le frais seul,
  pas `null`.
- `calculerEmissionAppel` : date d'acte strictement égale à la date
  d'attestation (le jour même) → doit être considérée "déjà dû" (règle
  `>=`, pas `>` strict).

## Contraintes techniques

- Vitest uniquement (déjà choisi avec Nicolas), pas de base de données
  réelle ni de mock MongoDB pour ce premier chantier — uniquement des
  fonctions pures, sans effet de bord.
- Ce chantier ajoute des tests, il ne corrige pas de bug : si un test
  révèle un vrai écart de comportement, le signaler à Nicolas et le faire
  trancher séparément plutôt que de corriger silencieusement dans la
  foulée.

## Points à trancher

- [x] Tests colocalisés juste à côté du fichier source (ex: `Tma.test.js`
      à côté de `Tma.js`) — confirmé par Nicolas.
- [x] Périmètre strictement serveur pour ce premier chantier — confirmé.
      Client (`client/src/utils/statuts.js`) prévu comme chantier suivant,
      à enchaîner rapidement une fois celui-ci validé (même principe,
      fonctions tout aussi pures) — pas un "plus tard" indéfini.

## Hors périmètre (pour ce premier chantier)

- Tests d'intégration sur les routes Express (nécessiteraient une base de
  test) — chantier ultérieur, pas daté.
- Tests côté client (`client/src/utils/statuts.js`) — chantier 2, à
  enchaîner juste après celui-ci.
- Couverture de code (%) — pas un objectif chiffré pour ce premier
  chantier.

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 (01/09/2026) :** générée avec succès. `vitest` installé
  (`server/package.json`), `server/models/Tma.test.js` (16 tests) et
  `server/utils/appelsDeFonds.test.js` (4 tests) écrits, `npm test` (20/20
  verts) confirmé réellement exécuté, pas juste supposé. Écart trouvé en
  écrivant les tests : `calculerEmissionAppel()` renvoyait
  `regleAutomatiquement: null` (pas `false`) quand `lot.dateActe` est vide
  — corrigé dans `server/utils/appelsDeFonds.js` (`!!` ajouté), Nicolas a
  explicitement autorisé la correction plutôt que d'adapter le test au bug.
  CI (`.github/workflows/ci.yml`) complété avec un job `test-back`.
  `CLAUDE.md`/`README.md` mis à jour (le statut "pas de tests" était
  devenu faux). Non-régression vérifiée : le serveur (`npm run dev`)
  répond toujours normalement après l'ajout de la dépendance.
