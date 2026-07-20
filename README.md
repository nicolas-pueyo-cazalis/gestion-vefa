# Gestion VEFA

Logiciel de gestion administrative et technique des programmes immobiliers
neufs, regroupant deux outils métier :

- **Suivi VEFA** (Vente en l'État Futur d'Achèvement) : suivi de prêt,
  signature notaire, appels de fonds selon avancement des travaux.
- **Gestion des TMA** (Travaux Modificatifs Acquéreurs) : demandes de travaux
  modificatifs par acquéreur, avec workflow de validation.

Projet développé de zéro dans le cadre d'une recherche d'alternance
développeur web, en remplacement d'outils Excel/VBA existants.

> **Données fictives.** Toutes les données utilisées dans ce projet (noms de
> programmes, d'acquéreurs, montants...) sont fictives. Aucune donnée réelle
> de client ou de programme immobilier n'est utilisée.

## Où trouver quoi

- [`docs/`](docs/) — documentation du projet, tenue à jour au fil de
  l'avancement :
  - [`journal.md`](docs/journal.md) — journal de bord, une entrée par étape
  - [`decisions.md`](docs/decisions.md) — choix techniques et leur justification
  - [`glossaire.md`](docs/glossaire.md) — vocabulaire métier (VEFA, TMA, appel de fonds...)
  - [`analyse-excel.md`](docs/analyse-excel.md) — analyse des fichiers Excel de référence
  - [`schema-donnees.md`](docs/schema-donnees.md) — conception du modèle de données
  - [`concepts-techniques.md`](docs/concepts-techniques.md) — fiche de révision des notions de code vues (vanilla, React...)
  - [`bugs.md`](docs/bugs.md) — bugs rencontrés (symptôme / cause / correction / leçon)
  - [`demandes.md`](docs/demandes.md) — liste chronologique de toutes les demandes de Nicolas
- [`vanilla/`](vanilla/) — étape 1 : version HTML/CSS/JS sans framework
- [`client/`](client/) — étape 2 : application React + Vite + React Router + Sass.
  Toute l'appli est **multi-programme** : une page d'accueil
  ([`ChoixProgramme.jsx`](client/src/pages/ChoixProgramme.jsx)) fait choisir
  ou créer un programme, mémorisé pour la session (`ProgrammeContext`) —
  chaque page filtre ses données sur ce programme actif.
  - Page **Lots** : tableau complet (caractéristiques, annexes, prix/m²,
    statut, client, dates, commentaire) avec édition en ligne,
    création/liaison d'acquéreur à la volée, prix modifiable avec motif
    obligatoire et historique, bouton "Vendre une annexe" (vente d'un
    parking/cave/cellier à part, avec son propre cycle de vente), et
    totaux TTC/TVA/HT + prix moyen au m². Historique des ventes annulées
    et des modifications de prix consultable en bas de page (repliable).
  - Page **Clients** : coordonnées complètes des acquéreurs "actifs"
    (ayant un lot dans le programme), triées par n° de logement,
    téléphone au format national (FR) ou international, code postal
    complété automatiquement depuis la commune.
  - Page **TMA** : création de demandes depuis l'interface, machine à
    états pilotée par les dates, détail multi-entreprises par TMA, alerte
    de retard entreprise, montant client modifiable manuellement.
  - Page **Appels de fonds** : générés automatiquement par phase (la
    "Réservation" dès que le lot est réservé, les suivantes à l'Acté),
    attestation MOE et règlement saisis à la main, émission et date
    limite calculées seules ; barème modifiable par logement.
  - Page **Paramètres** : infos programme, délais/taux, alertes,
    catalogue d'annexes numérotées et prixées, barème, étages, lots
    (caractéristiques techniques uniquement — le prix se modifie depuis
    la page Lots), entreprises, utilisateurs.
- [`server/`](server/) — étape 3 : API Express + MongoDB/Mongoose. Modèles
  des 12 collections (Programme, Lot, Annexe, Acquereur, AppelDeFonds, TMA,
  TmaEntreprise, Entreprise, Utilisateur, HistoriqueAnnulation,
  HistoriqueModificationPrix), script de seed (`npm run seed`), routes de
  lecture/écriture complètes — toutes filtrables par programme actif
  (`?programme=<id>`), authentification JWT sur toute l'API.
- [`références/`](références/) — fichiers Excel de référence (usage interne, non déployés)

## Avancement

Le projet avance par étapes (détail dans [`docs/decisions.md`](docs/decisions.md)) :

1. ✅ Version HTML/CSS/JS vanilla
2. ✅ Migration vers React + Vite + React Router + Sass
3. ✅ Back-end Express + MongoDB (API REST sécurisée, JWT)
4. ✅ Logique métier avancée (statuts automatiques, appels de fonds,
   alertes de retard, multi-programme, catalogue d'annexes)
5. ⬜ Déploiement

## Stack technique

React + Vite + React Router + Sass (front) · Node.js + Express + MongoDB/Mongoose + JWT (back)
