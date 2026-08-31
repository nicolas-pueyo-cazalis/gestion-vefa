# Gestion VEFA

Logiciel de gestion administrative et technique des programmes immobiliers
neufs, regroupant deux outils métier :

- **Suivi VEFA** (Vente en l'État Futur d'Achèvement) : suivi de prêt,
  signature notaire, appels de fonds selon avancement des travaux.
- **Gestion des TMA** (Travaux Modificatifs Acquéreurs) : demandes de travaux
  modificatifs par acquéreur, avec workflow de validation.

Projet développé de zéro, en solo, dans le cadre d'une recherche
d'alternance développeur web — en remplacement d'outils Excel/VBA
existants, à partir de deux classeurs métier réels (suivi VEFA, suivi
TMA) fournis comme base de départ et améliorés plutôt que recopiés à
l'identique (règles métier corrigées, alertes de retard, historique,
authentification par rôle...).

> **Données fictives.** Toutes les données utilisées dans ce projet (noms de
> programmes, d'acquéreurs, montants...) sont fictives. Aucune donnée réelle
> de client ou de programme immobilier n'est utilisée.

## Fonctionnalités

Toute l'application est **multi-programme** : une page d'accueil
([`ChoixProgramme.jsx`](client/src/pages/ChoixProgramme.jsx)) fait choisir
ou créer un programme, mémorisé pour la session — chaque page filtre
ensuite ses données sur ce programme actif, avec un changement possible à
tout moment depuis le bandeau.

- **Lots** : tableau complet (caractéristiques, annexes, prix/m², statut,
  client, dates, commentaire) avec édition en ligne, création/liaison
  d'acquéreur à la volée, prix modifiable avec motif obligatoire et
  historique, vente d'annexe seule (parking/cave/cellier vendu à part,
  avec son propre cycle), totaux TTC/TVA/HT + prix moyen au m², et un
  historique des ventes annulées/modifications de prix consultable en bas
  de page.
- **Clients** : coordonnées complètes des acquéreurs actifs, triées par
  n° de logement, téléphone au format national (FR) ou international, code
  postal complété automatiquement depuis la commune saisie.
- **TMA** : création de demandes depuis l'interface, machine à états
  pilotée par les dates (comme les formules Excel d'origine), détail
  multi-entreprises par TMA (avec description et n° de lot de travaux
  propres à chaque entreprise), n° de demande par logement, alerte de
  retard entreprise, montant client calculé automatiquement (taux de
  marge + frais d'ouverture de dossier paramétrables) ou modifiable
  manuellement, verrouillé une fois validé, génération d'un devis client
  PDF (numéro réservé côté serveur, jamais réutilisé) regroupant une ou
  plusieurs demandes d'un même logement.
- **Appels de fonds** : générés automatiquement par phase (la
  "Réservation" dès que le lot est réservé, les suivantes à l'Acté),
  attestation MOE saisie en masse par phase, règlement et date
  d'émission calculés seuls, barème modifiable par logement en cas de
  négociation, génération collective des appels par phase (courrier PDF
  par logement + date d'émission renseignée automatiquement).
- **Suivi de prêt** / **Signature acte** : deux pages dédiées avec
  coordonnées complètes (banque, courtier, notaire), dates limites
  calculées depuis la réservation, gestion des acquisitions sans prêt.
- **Paramètres** : infos programme, délais/taux (regroupés par page
  concernée), alertes désactivables, catalogue d'annexes numérotées et
  prixées, barème des phases, étages, lots (caractéristiques techniques),
  entreprises, utilisateurs (3 rôles : admin/gestionnaire/lecture).
- **Transversal** : authentification JWT sur toute l'application (aucune
  page accessible sans être connecté), barre de recherche multi-mots-clés
  sur chaque page principale, fenêtre d'alertes de retard au démarrage
  (prêt, notaire, appels de fonds, entreprises TMA, factures TMA), export
  Excel/PDF sur chaque page (tableaux avec totaux, statistiques, documents
  générés — courrier d'appel de fonds, devis TMA), entièrement côté
  navigateur (aucune donnée renvoyée au serveur pour un export).

## Où trouver quoi

- [`docs/`](docs/) — documentation du projet, tenue à jour au fil de
  l'avancement (voir section suivante).
- [`vanilla/`](vanilla/) — étape 1 : version HTML/CSS/JS sans framework.
- [`client/`](client/) — étape 2 : application React + Vite + React Router
  + Sass. Une page/un composant par fonctionnalité, contextes React pour
  l'authentification (`AuthContext`) et le programme actif
  (`ProgrammeContext`).
- [`server/`](server/) — étape 3 : API Express + MongoDB/Mongoose. Modèles
  des 13 collections (Programme, Lot, Annexe, Acquereur, AppelDeFonds,
  TMA, TmaEntreprise, Entreprise, Utilisateur, HistoriqueAnnulation,
  HistoriqueModificationPrix, Compteur), script de seed (`npm run seed`),
  routes de lecture/écriture complètes — toutes filtrables par programme
  actif (`?programme=<id>`), authentification JWT sur toute l'API.
- [`références/`](références/) — fichiers Excel de référence (usage
  interne, non déployés).

## Architecture

- **Communication front/back** : le client React consomme l'API Express
  en REST (JSON), via un unique wrapper `apiFetch()`
  ([`client/src/utils/api.js`](client/src/utils/api.js)) qui ajoute
  automatiquement le jeton JWT et redirige vers `/connexion` en cas de
  401. L'URL de l'API est configurée par la variable d'environnement
  `VITE_API_URL` côté client.
- **Authentification** : connexion par email/mot de passe
  (`POST /api/auth/connexion`), mot de passe haché avec `bcrypt`, jeton
  JWT (durée 7 jours) contenant uniquement `{ id, role }`. Le middleware
  `verifierToken` protège **toute** l'API (`/api/*`, sauf `/api/auth`) —
  aucune donnée, même en lecture, n'est accessible sans être connecté.
  Trois rôles (`admin`, `gestionnaire`, `lecture`) : le middleware
  `autoriserRoles(...)` bloque les écritures (`POST`/`PATCH`/`DELETE`)
  pour le rôle `lecture`, qui peut tout consulter mais rien modifier. Pas
  d'auto-inscription : les comptes se créent depuis Paramètres, par un
  admin déjà connecté.
- **Multi-programme** : une agence peut suivre plusieurs programmes
  immobiliers en parallèle. Le programme actif est mémorisé côté client
  (`ProgrammeContext`, `localStorage` + revalidation serveur au
  chargement, même principe que l'authentification) et transmis en
  paramètre de requête (`?programme=<id>`) à chaque route de liste. Côté
  serveur, seul `Lot` porte un champ `programme` direct — les autres
  collections (TMA, AppelDeFonds, Acquereur...) le déduisent via leurs
  lots, à travers un utilitaire partagé
  ([`server/utils/programme.js`](server/utils/programme.js)) plutôt que
  de dupliquer cette résolution dans chaque route.
- **Modèle de données** : conception détaillée, avec le raisonnement
  métier derrière chaque champ, dans
  [`docs/schema-donnees.md`](docs/schema-donnees.md).
- **Tests** : pas de suite de tests automatisés à ce stade — chaque
  fonctionnalité a été validée manuellement au fil du développement
  (scénarios réels rejoués à la main), avec les bugs rencontrés et leur
  correction tracés dans [`docs/bugs.md`](docs/bugs.md), et une
  [checklist de tests manuels pré-déploiement](docs/checklist-tests-manuels.md).
  C'est une limite connue du projet, pas un point laissé dans le flou.
- **Intégration continue** : [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
  lance le lint front et une vérification de syntaxe du back à chaque push/
  pull request sur `main`.
- **Performance/logging** : index MongoDB sur les champs de jointure les
  plus filtrés (voir [`docs/decisions.md`](docs/decisions.md)), requêtes
  HTTP journalisées (`morgan`), erreurs serveur toujours logguées côté
  serveur (`console.error`) et renvoyées au client seulement hors
  production.

## Installation locale

Prérequis : Node.js, un cluster MongoDB Atlas (ou une base MongoDB
locale).

```bash
# Back-end
cd server
npm install
cp .env.example .env   # renseigner MONGODB_URI et JWT_SECRET
npm run seed            # données de démonstration (fictives)
npm run dev              # démarre l'API sur http://localhost:4000

# Front-end (dans un second terminal)
cd client
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm run dev              # démarre l'appli sur http://localhost:5173
```

## Documentation

Le dossier [`docs/`](docs/) sert à la fois de mémoire de travail et de
support d'entretien — la trace de chaque décision, bug et demande depuis
le premier jour du projet :

- [`CLAUDE.md`](CLAUDE.md) — fiche de reprise rapide (stack, règles métiers, décisions, pièges, points sensibles), à la racine du projet, chargée automatiquement par Claude Code
- [`template-spec.md`](docs/template-spec.md) — modèle à copier pour rédiger une spec avant toute nouvelle fonctionnalité (workflow spec-first, Jour 7 du programme)
- [`protocole-ia-vefa.md`](docs/protocole-ia-vefa.md) — protocole de travail quotidien avec Claude sur ce projet précis (à jour en permanence, distinct du programme de formation général)
- [`journal.md`](docs/journal.md) — journal de bord, une entrée par étape
- [`decisions.md`](docs/decisions.md) — choix techniques et leur justification
- [`glossaire.md`](docs/glossaire.md) — vocabulaire métier (VEFA, TMA, appel de fonds...)
- [`analyse-excel.md`](docs/analyse-excel.md) — analyse des fichiers Excel de référence
- [`schema-donnees.md`](docs/schema-donnees.md) — conception du modèle de données
- [`concepts-techniques.md`](docs/concepts-techniques.md) — fiche de révision des notions de code vues (vanilla, React, Mongoose...)
- [`bugs.md`](docs/bugs.md) — bugs rencontrés (symptôme / cause / correction / leçon)
- [`demandes.md`](docs/demandes.md) — liste chronologique complète des demandes, cochées au fur et à mesure
- [`checklist-tests-manuels.md`](docs/checklist-tests-manuels.md) — parcours critiques à revérifier avant chaque déploiement

## Avancement

Le projet avance par étapes (détail dans [`docs/decisions.md`](docs/decisions.md)) :

1. ✅ Version HTML/CSS/JS vanilla
2. ✅ Migration vers React + Vite + React Router + Sass
3. ✅ Back-end Express + MongoDB (API REST sécurisée, JWT)
4. ✅ Logique métier avancée (statuts automatiques, appels de fonds,
   alertes de retard, multi-programme, catalogue d'annexes, recherche)
5. ⬜ Déploiement

## Stack technique

| Couche | Technologies |
|---|---|
| Front-end | React 19, Vite, React Router, Sass |
| Back-end | Node.js, Express 5, MongoDB / Mongoose |
| Authentification | JWT, bcrypt |
| Exports | exceljs, jsPDF / jspdf-autotable |
| Logging | morgan |
| Hébergement base de données | MongoDB Atlas |
| CI | GitHub Actions |
