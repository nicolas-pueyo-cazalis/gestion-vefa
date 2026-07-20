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

## Multi-programme (décision du 17/07/2026)

L'application gérait un seul `Programme` en dur (un `findOne()` sans
filtre). Besoin réel : un utilisateur (agence, gestionnaire) suit
plusieurs programmes immobiliers en parallèle, pas un seul.

**Décision :** passage à une vraie liste de programmes, avec un
"programme actif" mémorisé côté client (`ProgrammeContext`, même
principe que `AuthContext` : `localStorage` + revalidation serveur au
chargement) plutôt que dans l'URL — évite de préfixer toutes les routes
par un `:programmeId` et reste cohérent avec le fait qu'on change rarement
de programme en cours de session. Toutes les routes de liste du serveur
filtrent sur `?programme=<id>` passé en query string.

**Conséquence sur le modèle de données** : `Lot` a un champ `programme`
direct, mais `Tma`, `AppelDeFonds`, `TmaEntreprise`, `Acquereur` n'en ont
pas — ils appartiennent à un programme *indirectement*, via leur lot
(ou le lot de leur TMA). Plutôt que dupliquer un champ `programme` sur
chaque collection (risque d'incohérence si un lot change de programme,
même si ça n'arrive jamais en pratique), le filtrage se fait en
résolvant d'abord la liste des lots du programme
(`server/utils/programme.js`, `getIdsLotsDuProgramme`), réutilisée par
toutes les routes concernées.

`Entreprise` et `Utilisateur` restent des référentiels globaux, non
rattachés à un programme (une entreprise de travaux ou un utilisateur du
logiciel peut intervenir sur plusieurs programmes).

## Catalogue d'annexes et vente d'annexe seule (décision du 17/07/2026)

Les parkings/caves/celliers étaient stockés comme de simples tableaux de
numéros sur le lot (`Lot.parkings: [Number]`, etc.), sans prix ni
existence propre — juste une liste à cocher sans aucune donnée
métier derrière.

**Décision :** en faire une vraie collection (`Annexe`) avec son propre
prix, rattachée à un programme, éventuellement attribuée à un lot. Le
prix total TTC d'un lot devient une valeur **calculée**
(`prixLogementSeul` saisi + somme des annexes attribuées), pas une
valeur ressaisie à la main à chaque fois — évite les incohérences entre
le prix affiché et la somme réelle de ce qui est vendu.

**Vente d'une annexe seule** (sans logement associé — cas d'un lot déjà
Acté sur lequel on ne peut plus rien négocier, ou d'un acheteur externe) :
plutôt que construire un second cycle de vente en parallèle de celui des
lots (statuts, dates, appels de fonds...), la décision a été de
réutiliser tel quel le modèle `Lot` avec un indicateur
`estAnnexeSeule: true`. Un choix délibérément non-"pur" (un lot sans
logement n'est pas vraiment un lot au sens strict) mais qui évite de
dupliquer toute la machine à états déjà en place, au prix d'un filtre à
ajouter à quelques endroits (quota de logements du programme, liste des
lots dans Paramètres).

## Prix modifiable uniquement depuis la page Lots, avec motif obligatoire (décision du 17/07/2026)

Le prix d'un logement pouvait être modifié aussi bien depuis Paramètres
que depuis la page Lots, sans trace de qui a changé quoi ni pourquoi.
Nicolas a recadré le rôle de Paramètres : "sert vraiment à paramétrer le
projet au départ, c'est tout" — la page Lots est le seul endroit où un
prix vit et change au fil d'une vente réelle (négociation avant
signature, par exemple).

**Décision :** modification du prix retirée de Paramètres, centralisée
sur la page Lots avec un motif obligatoire à chaque changement, et
historisée (`HistoriqueModificationPrix`). Verrouillée dès que le lot
est Acté (plus de négociation possible après signature).
