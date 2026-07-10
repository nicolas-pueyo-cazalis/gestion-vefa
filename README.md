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
  Pages Lots, TMA et **Paramètres** (infos programme, délais/taux, barème,
  étages, lots, entreprises — édition complète de `programme.parametres`
  et du référentiel des lots/entreprises)
- [`server/`](server/) — étape 3 : API Express + MongoDB/Mongoose. Modèles
  des 8 collections (Programme, Lot, Acquereur, AppelDeFonds, TMA,
  TmaEntreprise, Entreprise, Utilisateur), script de seed (`npm run seed`),
  routes de lecture/écriture complètes sur programme/lots/acquereurs/tma/
  tma-entreprises/entreprises (changement de statut TMA avec machine à
  états, calcul automatique du statut depuis les dates, liaison
  lot ↔ acquéreur, unicité des numéros de parking/cave sur un programme)
- [`références/`](références/) — fichiers Excel de référence (usage interne, non déployés)

## Avancement

Le projet avance par étapes (détail dans [`docs/decisions.md`](docs/decisions.md)) :

1. ✅ Version HTML/CSS/JS vanilla
2. ✅ Migration vers React + Vite + React Router + Sass
3. 🔶 Back-end Express + MongoDB (API REST sécurisée, JWT) (en cours — auth JWT restante)
4. 🔶 Logique métier avancée (statut TMA automatique fait, appels de fonds restants)
5. ⬜ Déploiement

## Stack technique

React + Vite + React Router + Sass (front) · Node.js + Express + MongoDB/Mongoose + JWT (back)
