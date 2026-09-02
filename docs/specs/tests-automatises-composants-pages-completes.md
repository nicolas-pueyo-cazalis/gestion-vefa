# Spec — Tests exhaustifs état/affichage/API des 3 pages "god components" — chantier 15+

**Projet :** Gestion VEFA · **Date :** 02/09/2026 · **Statut :** brouillon

## Objectif

Sécuriser le comportement actuel de `Lots.jsx`, `Tma.jsx` et
`AppelsDeFonds.jsx` (état, chargement API, actions, rendu conditionnel)
**avant** de les découper (point 236, dette des "god components"). Décidé
avec Nicolas : couverture complète de chaque chemin de code distinct, pas
seulement les points les plus risqués — préférence explicite pour la
sécurité plutôt que la rapidité, le temps n'étant pas la contrainte
principale ici.

Ce chantier ne modifie **aucun comportement** : uniquement des tests
ajoutés (comme les chantiers 1 à 14), zéro refactor. Le découpage
lui-même (point 236) ne démarre qu'une fois CE chantier terminé et vert.

## Comportement attendu (cas nominal)

Une page à la fois, jamais en parallèle (demande explicite de Nicolas :
"très doucement"). Ordre proposé : **`AppelsDeFonds.jsx` d'abord** (la
plus petite des 3, sert de pilote pour établir le motif de test), puis
`Tma.jsx`, puis `Lots.jsx` en dernier (déjà la mieux couverte des trois
côté fonctions pures — chantier 13, 25 tests).

Pour **chaque page**, couvrir chaque chemin de code distinct identifié
(sans combiner ces chemins entre eux — voir "Cas limites") :

1. **États de chargement** : rendu pendant `chargement === true`, rendu
   si `erreur` est renseignée (l'appel initial échoue).
2. **Rendu principal** : cartes de stats avec les bons chiffres, tableau
   avec les bonnes lignes, à partir de données mockées via `apiFetch`.
3. **Chaque filtre/recherche** : un test par filtre disponible sur la
   page (statut, phase, lot, recherche texte pour AppelsDeFonds — la
   logique de `correspondRecherche`/`texteRechercheXxx` elle-même est
   déjà testée ailleurs, ici on vérifie juste que le filtre appliqué à
   l'écran retire/garde les bonnes lignes).
4. **Chaque action d'écriture** (créer/modifier/supprimer/générer/
   attester...) : cas succès (`apiFetch` mocké en `ok: true`, vérifier le
   rechargement et la fermeture du panneau concerné) ET cas échec
   (`ok: false`, vérifier l'`alert()` et que le panneau reste ouvert).
5. **Chaque branche de rendu conditionnel** : panneaux qui s'ouvrent/se
   ferment (édition, barème, création, attestations en masse...),
   avertissements conditionnels (ex: "offre de prêt non reçue", "TMA
   obsolète").
6. **Fenêtre d'export** : pour chaque option d'export de la page,
   vérifier que le bon jeu de données est construit et transmis à
   `FenetreExport` (pas le rendu PDF/Excel lui-même, déjà testé
   séparément dans `utils/export.test.js`).

## Impact sur l'existant

- **Fichiers concernés** : nouveaux `AppelsDeFonds.render.test.jsx` (ou
  nom similaire, à distinguer du `.test.js` déjà existant sur les
  fonctions pures), puis équivalents pour `Tma.jsx`/`Lots.jsx`. Aucun
  fichier de code source modifié — uniquement des tests ajoutés.
- **Règle(s) métier existante(s) à ne pas casser** : aucune, chantier de
  tests pur.
- **Test de non-régression à prévoir** : suite complète du projet
  (client + serveur) verte après chaque page traitée, comme pour les
  chantiers précédents.

## Cas limites

- **Pas de combinatoire** : ne pas tester chaque action pour chaque
  filtre actif à la fois, ni chaque branche de rendu croisée avec chaque
  rôle utilisateur — un chemin de code = un test, pas le produit
  cartésien de tous les chemins entre eux (décidé avec Nicolas :
  couverture complète des chemins, pas de leurs combinaisons).
- Panneaux mutuellement exclusifs (ex: un seul panneau d'édition ouvert à
  la fois par ligne) : vérifier qu'ouvrir un second panneau ferme bien le
  premier, si c'est le comportement du code actuel (pas une nouvelle
  règle à inventer — juste caractériser l'existant).

## Contraintes techniques

- Vitest + jsdom + `@testing-library/react`, infrastructure déjà en
  place (`vitest.config.js`, `test-setup.js`).
- **Nouvelle dépendance à ajouter** : `@testing-library/user-event` (pas
  encore installée) — nécessaire pour simuler des interactions
  (clic, saisie, soumission de formulaire), contrairement aux tests de
  composants déjà faits (chantiers 9-12) qui ne vérifiaient que
  l'affichage, pas l'interaction.
- Mêmes mocks déjà utilisés : `apiFetch` (`vi.mock('../utils/api.js')`),
  `useProgramme`/`useAuth` si nécessaire.
- Les formulaires enfants (`FormulaireAppelDeFonds`, `FormulaireBaremeLot`,
  etc.) ne sont **pas** remplacés par des mocks — on les laisse réels,
  pour tester la vraie intégration page + formulaire (cohérent avec
  l'objectif de sécuriser le comportement réel avant refactor).

## Points à trancher

- [ ] Ordre des 3 pages confirmé : AppelsDeFonds.jsx → Tma.jsx →
      Lots.jsx — à valider avec Nicolas.
- [ ] Installation de `@testing-library/user-event` — à valider.
- [ ] Nom de convention pour ces nouveaux fichiers de test (éviter la
      confusion avec les `.test.js` déjà existants sur les fonctions
      pures des mêmes pages) — proposition : `NomPage.render.test.jsx`.

## Hors périmètre

- Le refactor/découpage lui-même (point 236) — démarre seulement après
  ce chantier, page par page, une fois chaque page sécurisée.
- Extraction des fonctions `donneesExportXxx()` en fonctions pures
  indépendantes — ferait partie du refactor futur, pas de ce chantier
  (elles sont testées ici via le rendu complet de la page, pas isolément).
- Tests HTTP sur de vraies routes Express (`supertest`) — toujours hors
  périmètre, décision déjà actée (point 281, C).

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
