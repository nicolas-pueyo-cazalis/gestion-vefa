# Spec — Tests d'intégration (suite) — chantier 8

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Étendre les tests d'intégration base de données (chantier 5/point C déjà
fait, `docs/specs/tests-automatises-integration.md`) à trois autres
fonctions dépendant de la base, sur des règles métier importantes non
encore couvertes : recalcul TMA, synchronisation prix/annexes d'un lot,
génération d'appels de fonds pour une vente d'annexe seule.

## Comportement attendu (cas nominal)

1. `synchroniserAnnexesEtPrix()` et `genererAppelsAnnexeSeule()`
   (`server/routes/lots.js`) exportées (un seul mot-clé chacune, même
   principe que les chantiers précédents). `recalculerTma()`
   (`server/routes/tmaEntreprises.js`) déjà exportée, rien à changer.
2. Tests avec de vrais documents Mongoose dans la base en mémoire
   (réutilise `server/test-setup.js` déjà créé au chantier 5) :
   - **`synchroniserAnnexesEtPrix`** : attribution/retrait d'annexes,
     recalcul de `prixTTC`, et le cas où `prixLogementSeul` n'est pas
     renseigné (ne doit pas écraser un `prixTTC` existant).
   - **`genererAppelsAnnexeSeule`** : barème 5%/95%, anti-doublon,
     réglé automatiquement aux dates de réservation/acte.
   - **`recalculerTma`** : recalcul complet (statut + montants) quand
     toutes les entreprises ont répondu, ET le cas où il en manque
     encore une (doit rester à "étude", pas basculer à "chiffré") — cas
     déjà couvert unitairement pour `calculerStatutAutomatique` seule,
     ici vérifié de bout en bout avec de vraies lignes `TmaEntreprise` en
     base.

## Impact sur l'existant

- **Fichiers concernés** : `server/routes/lots.js` (2 exports ajoutés) ;
  nouveaux fichiers `server/routes/lots.integration.test.js` (étendu) et
  `server/routes/tmaEntreprises.integration.test.js`.
- **Règle(s) métier existante(s) à ne pas casser** : aucune — lecture et
  vérification uniquement, aucune fonction modifiée.
- **Test de non-régression** : après les exports, vérifier que le serveur
  réel (`npm run dev`) démarre toujours normalement.

## Cas limites

- `synchroniserAnnexesEtPrix` : `annexeIds` non fourni (`undefined`) → ne
  touche à aucune attribution d'annexe, recalcule quand même `prixTTC` si
  `prixLogementSeul` est renseigné.
- `genererAppelsAnnexeSeule` : rejouer la génération sur un lot qui a déjà
  ses 2 phases → aucun doublon.
- `recalculerTma` : une seule entreprise sur deux a répondu (montant de
  devis renseigné) → `montantEntreprises` reste `null`, statut reste
  "étude", pas de bascule prématurée à "chiffré".
- `recalculerTma` : `montantClientManuel` à `true` sur la TMA → le
  montant client ne doit **pas** être recalculé même après un appel à
  `recalculerTma`, quel que soit le montant entreprises.

## Contraintes techniques

- Même outillage que le chantier 5 (`mongodb-memory-server`,
  `server/test-setup.js` réutilisé tel quel).
- Aucun nouveau concept d'infrastructure — pure extension du principe
  déjà validé.

## Points à trancher

- [ ] Aucun — même principe déjà validé au chantier 5, pas de nouvelle
      décision d'architecture.

## Hors périmètre

- `resynchroniserMontantReservation()` (`lots.js`) — une 4ᵉ fonction
  candidate repérée en relisant le fichier, mise de côté pour garder ce
  chantier ciblé sur les 3 fonctions déjà annoncées à Nicolas.

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 (01/09/2026) :** générée avec succès. `synchroniserAnnexesEtPrix()`
  et `genererAppelsAnnexeSeule()` exportées (`server/routes/lots.js`).
  7 tests ajoutés à `lots.integration.test.js`, 4 nouveaux tests dans
  `server/routes/tmaEntreprises.integration.test.js`. Un test initial
  ajusté avant exécution (pas après échec) : l'hypothèse "le statut d'une
  TMA 'validée' ne bouge jamais" était imprécise — en réalité,
  `recalculerTma()` re-dérive toujours le statut depuis les dates
  (`calculerStatutAutomatique`), y compris pour une TMA validée ; seul le
  **montant client** est réellement figé une fois "Validé". Corrigé avec
  un scénario réaliste (dates de facture ET de retour client renseignées
  ensemble, comme dans la vraie vie) plutôt qu'un statut forcé sans les
  dates correspondantes. `npm test` confirmé réellement exécuté : 52/52
  côté serveur (11 nouveaux + 41 déjà là). Non-régression vérifiée : le
  serveur réel répond toujours normalement.
