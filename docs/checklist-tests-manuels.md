# Checklist de tests manuels avant déploiement

Complète la suite de tests automatisés (voir `README.md`, section
Architecture, et `docs/specs/tests-automatises-*.md`) — celle-ci couvre les
fonctions de calcul pur, l'authentification, l'intégration base de données
et les composants React, mais pas les parcours de bout en bout via
l'interface ni les vraies routes HTTP (`supertest`, pas encore mis en
place). Cette checklist couvre donc les parcours critiques à rejouer à la
main avant chaque mise en production, pour limiter le risque de régression
silencieuse. À dérouler avec des données de démo (`npm run seed`), jamais
sur des données réelles.

**Légende** : ⚠️ = parcours qui a déjà causé un bug réel par le passé (voir
`docs/bugs.md`), à tester en priorité.

## Authentification et accès

- [ ] Connexion avec un compte valide de chaque rôle (admin, gestionnaire,
      lecture).
- [ ] Connexion refusée avec un mauvais mot de passe (même message
      générique que pour un email inconnu — ne doit rien révéler).
- [ ] ⚠️ Rôle "lecture" : toutes les actions d'écriture (créer/modifier/
      supprimer) sont bien bloquées, sur chaque page.
- [ ] Aucune page accessible sans être connecté (tester une URL directe,
      ex: `/lots`, sans jeton).
- [ ] Rechargement de page : session conservée sans redemander la connexion.
- [ ] Déconnexion : retour à l'écran de connexion, jeton effacé.

## Multi-programme

- [ ] Création d'un nouveau programme depuis l'écran d'accueil.
- [ ] Changement de programme actif depuis le bandeau : chaque page se
      recharge avec les données du bon programme, aucune donnée d'un autre
      programme ne doit apparaître.

## Lots

- [ ] Création d'un lot, vente à un acquéreur nouveau ou existant.
- [ ] ⚠️ Changement de statut via les dates (Option → Réservé → Acté) : le
      statut affiché correspond toujours à la dernière date renseignée.
- [ ] Modification du prix TTC avec motif obligatoire : apparaît dans
      l'historique.
- [ ] Annulation d'une vente : lot repasse "Libre", apparaît dans
      l'historique des annulations.
- [ ] Vente d'une annexe seule (parking/cave/cellier), puis rattachement à
      un lot.
- [ ] ⚠️ Suppression d'un lot référencé par une TMA ou un appel de fonds :
      doit être bloquée.
- [ ] Totaux TTC/TVA/HT et prix moyen au m² cohérents avec les lots filtrés
      à l'écran.
- [ ] Exports (tableau, statistiques, historique, annexes à la vente) en
      Excel et PDF.

## Appels de fonds

- [ ] Génération automatique de l'appel "Réservation" dès la réservation
      d'un lot.
- [ ] Attestation MOE saisie en masse par phase : tous les appels
      concernés se mettent à jour, la phase précédente doit être attestée
      avant.
- [ ] ⚠️ Attestation MOE seule n'émet PAS l'appel (statut "À émettre") —
      sauf si l'acte a été signé après/le jour même (émis + réglé
      automatiquement).
- [ ] "Générer un appel de fonds" (phase + logements cochés) : PDF
      téléchargé par logement, "Envoyé le" rempli automatiquement.
- [ ] ⚠️ Règlement manuel d'un appel, puis correction de la date d'acte du
      lot : le règlement automatique ne doit pas écraser une saisie
      manuelle.
- [ ] Barème modifié pour UN logement (négociation) : n'affecte pas les
      autres lots.
- [ ] ⚠️ Barème général (Paramètres) verrouillé dès qu'un appel est émis.
- [ ] "Solde restant dû" = Prix TTC − payé (pas Émis − payé) — carte de
      stat et récapitulatif par lot.
- [ ] Exports (statistiques, récapitulatif par lot, détail par phase) en
      Excel et PDF, ce dernier tient sur une page.

## TMA

- [ ] Création d'une demande sur un lot Option/Réservé/Acté.
- [ ] ⚠️ Statut recalculé automatiquement uniquement si TOUTES les
      entreprises concernées ont répondu (`nombreEntreprisesConcernees`).
- [ ] ⚠️ Correction de `nombreEntreprisesConcernees` après coup relance
      bien le calcul du montant/statut.
- [ ] Montant client : recalcul automatique (marge + frais d'ouverture de
      dossier), figé une fois modifié à la main ou une fois "Validé".
- [ ] Refus puis annulation du refus : retour exact au statut précédent.
- [ ] ⚠️ Vente annulée avec TMA en cours : TMA non supprimée, message
      "logement annulé", réattribution possible si revendu.
- [ ] Alerte "Retard entreprise" (statut Étude) et rouge dans le panneau
      "Entreprises concernées".
- [ ] "Générer devis client" (logement puis demandes cochées) : numéro de
      devis different à chaque génération, jamais réutilisé.
- [ ] Exports (statistiques, demandes clients avec totaux, détail
      entreprises) en Excel et PDF.

## Suivi de prêt / Signature acte

- [ ] Bouton "Sans prêt" : vide les infos banque/courtier, fusionne
      l'affichage.
- [ ] Dates limites (prêt, acte) calculées depuis la réservation, alerte
      de retard si dépassées.
- [ ] Exports (tableau, statistiques) en Excel et PDF.

## Paramètres

- [ ] Modification du barème, des délais, des taux : bien répercutée sur
      les pages concernées.
- [ ] Ajout/suppression d'un lot, d'une entreprise, d'une annexe.
- [ ] Création d'un utilisateur (admin uniquement), avec chaque rôle.

## Alertes de retard

- [ ] Fenêtre d'alertes au démarrage : couvre prêt, notaire, appels de
      fonds, entreprises TMA, factures TMA.
- [ ] Chaque alerte désactivable individuellement depuis Paramètres.

## Transversal

- [ ] Barre de recherche sur chaque page : retrouve bien tout ce qui est
      affiché dans le tableau (y compris montants/dates formatés).
- [ ] Chaque export respecte les filtres/la recherche actifs à l'écran.
- [ ] ⚠️ Panne serveur simulée (backend arrêté) : un message d'erreur
      s'affiche au lieu d'un échec silencieux (créer/modifier une donnée).
