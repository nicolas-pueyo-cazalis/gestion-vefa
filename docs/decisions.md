# Décisions techniques — Gestion VEFA

Choix techniques du projet, avec leur justification. Utile pour se souvenir
"pourquoi on a fait ça" et pour les expliquer en entretien.

## Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Front-end | React + Vite | Imposé par la cohérence avec la formation OpenClassrooms Développeur Web ; Vite pour un démarrage rapide sans configuration lourde |
| Routing | React Router | Navigation multi-pages côté client (liste programmes → lots → fiche lot) |
| Styles | Sass | Variables et nesting pour organiser le CSS sur un projet à plusieurs pages |
| Appels API | Fetch ou Axios | Consommation de l'API REST du back-end |
| Back-end | Node.js + Express | Imposé par la formation ; écosystème JS unifié front/back |
| Base de données | MongoDB + Mongoose | Modèle de données flexible (Programme/Lot/Acquéreur/AppelDeFonds/TMA), Mongoose pour structurer et valider les schémas |
| Authentification | JWT | Rôles différenciés (admin/gestionnaire, potentiellement acquéreur) |

## Organisation du projet

- **Terminal : WSL (Ubuntu)**, pas PowerShell. Raison : environnement Linux
  utilisé en entreprise pour le développement Node/Mongo et le déploiement ;
  autant prendre l'habitude dès le début du projet.
- **Documentation continue** dans `docs/` (journal, glossaire, décisions) —
  projet utilisé comme support d'apprentissage, donc traçabilité nécessaire
  pour reprendre le fil et pour préparer les entretiens d'alternance.
- **Données 100% fictives** : aucune donnée réelle de client/programme
  immobilier réutilisée, à préciser dans le README.

## Approche par étapes

1. Version HTML/CSS/JS vanilla (affichage statique/dynamique basique)
2. Migration du front vers React + Vite + React Router + Sass
3. Back-end Express + MongoDB avec API REST sécurisée (JWT)
4. Logique métier avancée (calcul des appels de fonds, workflow de statuts TMA)
5. Déploiement (front sur Vercel/Netlify, back sur Railway/Render, DB sur
   MongoDB Atlas)

## Logique métier à ne pas simplifier en CRUD pur

- Calcul automatique du montant d'un appel de fonds selon le % d'avancement
  réglementaire des travaux.
- Un TMA ne peut pas être facturé s'il n'est pas préalablement validé (machine
  à états sur le statut).
- Permissions différenciées selon le rôle (admin/gestionnaire vs lecture
  simple).

## Paramétrage par programme (décision du 09/07/2026)

Après analyse des fichiers Excel de référence (voir `docs/analyse-excel.md`),
Nicolas a fait remarquer que plusieurs règles que j'avais identifiées comme
des constantes métier sont en réalité **spécifiques à chaque programme /
client** : le barème des phases d'appels de fonds, le délai d'obtention du
prêt, le délai de signature notaire, le délai de retour entreprise sur une
TMA, le taux de marge commerciale, et le comportement sur un montant de TMA
négatif.

**Décision :** ces valeurs ne seront pas codées en dur dans l'application —
elles seront stockées comme des **paramètres rattachés à chaque programme**,
avec les valeurs observées dans les fichiers Excel comme valeurs par défaut.
Ça a un impact direct sur le modèle de données (prévoir un modèle de
configuration par programme dès la conception du schéma) et sur la logique
métier (tous les calculs doivent lire ces paramètres au lieu d'utiliser des
valeurs fixes).

Détail complet des paramètres concernés : voir la section 4 de
`docs/analyse-excel.md`. Conception détaillée du schéma de données
(collections, champs, machine à états TMA) : voir `docs/schema-donnees.md`.

Nicolas a aussi validé le principe qu'une règle métier peut être révisée en
cours de développement si l'usage montre qu'elle ne convient pas — la
documentation continue sert justement à faciliter ce genre d'ajustement en
gardant la trace du "pourquoi" de chaque règle.

## Conventions de saisie et librairies de validation (décision du 09/07/2026)

Suite à la relecture du schéma de données par Nicolas :

- **Montants** : toujours stockés en `Number` pur (jamais le symbole "€" dans
  la donnée, pour ne pas casser les calculs/tris), affichés partout via une
  fonction utilitaire commune basée sur `Intl.NumberFormat('fr-FR', { style:
  'currency', currency: 'EUR' })`. Détail : `docs/schema-donnees.md`, section
  "Convention monétaire".
- **Étages d'un lot** : liste déroulante, mais **modifiable par programme**
  (un immeuble n'a pas le même nombre d'étages qu'un autre) → stockée comme
  donnée (`programme.parametres.listeEtages`), pas comme enum figé dans le
  code.
- **Orientation d'un lot** : liste fixe des 8 orientations (Nord, Nord-Est,
  Est...) → un vrai enum Mongoose, cette fois-ci (la liste ne dépend pas du
  programme).
- **Téléphone (acquéreur, banque, courtier)** : doit accepter les numéros
  étrangers, pas seulement français. Décision : normaliser et valider avec la
  librairie **`libphonenumber-js`** (format de stockage international E.164,
  ex: `+33612345678`) plutôt qu'un regex "fait maison", qui ne pourrait
  couvrir tous les formats de numéros dans le monde.
- **Email** : validation par regex standard, suffisant pour ce cas.
- **Banque / courtier** : ne sont plus de simples noms en texte libre, mais
  un sous-document `Contact` (nom, adresse, commune, code postal, téléphone,
  email), réutilisé à l'identique pour les deux.

Détail et exemples de code Mongoose : `docs/schema-donnees.md`.
