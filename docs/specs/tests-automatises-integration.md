# Spec — Tests d'intégration (base de données) — chantier 5 (point C)

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Tester un vrai scénario métier de bout en bout contre une vraie base
MongoDB éphémère (`mongodb-memory-server`) — point C de l'inventaire
"tests au bout du bout" (`docs/demandes.md`, point 281). **Version allégée**
décidée avec Nicolas (01/09/2026) après remise en question de la
première approche : pas de tests HTTP sur les routes Express (aurait
demandé de scinder `server/index.js`, jugé trop invasif pour ce chantier)
— on appelle directement les fonctions métier déjà isolées, avec une
vraie base de données derrière, plutôt qu'un mock.

## Comportement attendu (cas nominal)

1. `mongodb-memory-server` installé comme dépendance de développement
   dans `server/`.
2. Un fichier utilitaire de test (`server/test-setup.js`) démarre une
   base en mémoire avant les tests et la ferme après — réutilisable pour
   de futurs tests d'intégration.
3. `genererAppelsDeFonds()` (`server/routes/lots.js`) exportée (même
   principe que les chantiers précédents — un seul mot-clé, rien d'autre
   changé).
4. Scénario testé avec de vrais documents Mongoose créés dans la base en
   mémoire (un vrai `Programme` avec un barème, un vrai `Lot`) :
   - Lot réservé (`seulementReservation: true`) → seule la 1ʳᵉ phase du
     barème est générée, réglée automatiquement à la date de réservation.
   - Lot Acté (appel sans l'option) → toutes les phases restantes sont
     générées, avec le bon montant chacune (`prixTTC × pourcentage`).
   - Rejouer la génération sur un lot qui a déjà ses appels (anti-doublon
     par phase) → aucune ligne dupliquée en base.

## Impact sur l'existant

- **Fichiers concernés** : `server/package.json` (nouvelle dépendance) ;
  `server/routes/lots.js` (ajout d'un seul `export`) ; nouveau
  `server/test-setup.js` ; nouveau
  `server/routes/lots.integration.test.js`.
- **`server/index.js` non touché** — c'est la différence principale avec
  la première version de cette spec.
- **Règle(s) métier existante(s) à ne pas casser** : aucune — lecture et
  vérification uniquement.
- **Test de non-régression à prévoir** : après l'ajout de la dépendance,
  vérifier que le serveur réel (`npm run dev`) démarre toujours et se
  connecte toujours à la vraie base Atlas (pas à la base en mémoire, qui
  n'existe que pendant les tests).

## Cas limites

- Base en mémoire vidée entre chaque test (`beforeEach`/`afterEach`) —
  un test ne doit jamais dépendre de données laissées par un autre.
- Génération sur un lot dont le programme n'a pas encore de barème
  configuré (cas peu probable en pratique, mais un vrai document
  `Programme` créé "à la main" dans un test pourrait l'oublier par
  erreur) — comportement actuel à documenter tel quel, pas à corriger
  dans ce chantier.

## Contraintes techniques

- `mongodb-memory-server` uniquement — pas de `supertest`, pas de
  refactor de `server/index.js` (hors périmètre de ce chantier).
- Un seul scénario métier ciblé (`genererAppelsDeFonds`) pour ce premier
  chantier d'intégration — pas toutes les fonctions liées à la base d'un
  coup.

## Points à trancher

- [x] Pas de tests HTTP via Express dans ce chantier — confirmé avec
      Nicolas, version allégée retenue.

## Hors périmètre (pour ce chantier)

- Tests HTTP sur les routes Express (`supertest`, split
  `app.js`/`index.js`) — reporté, à reprendre plus tard si le besoin de
  vraies routes testées se fait sentir.
- Autres fonctions dépendant de la base (`recalculerTma`,
  `synchroniserAnnexesEtPrix`...) — chantiers d'intégration ultérieurs.

## Historique des itérations

- **v1 :** version initiale (tests HTTP via Express + supertest),
  remise en question par Nicolas avant génération.
- **v2 (01/09/2026) :** version allégée retenue — tests directs sur la
  base de données, sans passer par Express/HTTP.
- **v3 (01/09/2026) :** générée avec succès. `mongodb-memory-server`
  installé (postinstall bloqué par la politique `allow-scripts` de npm,
  sans conséquence : le binaire MongoDB se télécharge tout seul au premier
  lancement des tests). `genererAppelsDeFonds()` exportée (un seul mot-clé,
  `server/index.js` non touché comme prévu). `server/test-setup.js` créé
  (réutilisable pour de futurs tests d'intégration). 3 tests dans
  `server/routes/lots.integration.test.js` avec de vrais documents
  Mongoose (Programme + Lot) : 1ʳᵉ phase seule à la réservation, phases
  restantes à l'Acté avec le bon montant chacune, anti-doublon vérifié en
  rejouant la génération. `npm test` confirmé réellement exécuté : 41/41
  côté serveur (3 nouveaux + 38 déjà là), ~1s pour les 3 tests
  d'intégration (base en mémoire réellement démarrée/arrêtée). Aucun écart
  de comportement trouvé. Non-régression vérifiée : le serveur réel se
  connecte toujours à Atlas et répond normalement. CI non modifiée : le
  job `test-back` existant lance déjà `npm test`, qui couvre maintenant
  aussi l'intégration.
