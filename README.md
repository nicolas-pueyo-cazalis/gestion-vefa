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
- [`vanilla/`](vanilla/) — étape 1 : version HTML/CSS/JS sans framework
- [`références/`](références/) — fichiers Excel de référence (usage interne, non déployés)

## Avancement

Le projet avance par étapes (détail dans [`docs/decisions.md`](docs/decisions.md)) :

1. ✅ Version HTML/CSS/JS vanilla
2. ⬜ Migration vers React + Vite + React Router + Sass
3. ⬜ Back-end Express + MongoDB (API REST sécurisée, JWT)
4. ⬜ Logique métier avancée (calcul des appels de fonds, workflow TMA)
5. ⬜ Déploiement

## Stack technique

React + Vite + React Router + Sass (front) · Node.js + Express + MongoDB/Mongoose + JWT (back)
