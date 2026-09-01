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

## Pas d'historique d'état à mémoriser pour "Terminé" (décision du 20/07/2026)

En retirant le statut "Travaux" (inutile, aucun bouton n'y menait), le
passage à "Terminé" est devenu une action manuelle depuis "Validé", avec
un bouton pour revenir en arrière en cas d'erreur — même besoin que
"Refuser"/"Annuler une TMA", qui eux mémorisent le statut quitté
(`statutAvantRefus`/`statutAvantAnnulation`) pour y revenir exactement,
car ces deux-là sont atteignables depuis plusieurs statuts différents.

**Décision :** pas de `statutAvantTermine` équivalent — "Terminé" n'est
atteignable que depuis "Validé" (une seule origine possible dans la
machine à états), donc rien à mémoriser : annuler la fin des travaux
repose simplement `statut = 'valide'`. Confirmé utile dès le premier
test : une première version avec un champ mémorisé a buté sur les TMA
déjà "Terminé" avant l'ajout de ce bouton (donc sans cette mémorisation),
qui ne pouvaient plus être annulées.

## Frais d'ouverture de dossier TMA appliqué systématiquement, avoir compris (décision du 20/07/2026)

Nouveau réglage par programme (point 184) : un montant fixe ajouté au
montant client de chaque TMA. Question posée à Nicolas : ce frais
s'applique-t-il aussi sur un "avoir" (montant entreprise négatif,
remboursement au client) ?

**Décision :** oui, systématiquement dès que la case "À appliquer" est
cochée — chaque TMA (avoir compris) a un dossier à ouvrir, donc le frais
administratif s'applique sans exception. Implémenté dans
`calculerMontantClient()` (server/models/Tma.js), ajouté après le calcul
de marge/avoir plutôt qu'à part.

## Barre de recherche : "tout ce qui s'affiche" doit être trouvable (décision du 20/07/2026)

Premier essai (point 187) : recherche limitée à quelques champs
"identifiants" par ligne (référence, nom du client, commentaire...).
Nicolas a explicitement recadré : n'importe quelle valeur visible dans le
tableau doit pouvoir être retrouvée par un mot-clé, y compris des valeurs
calculées/formatées comme "Prix TTC/m² SHAB" ou une surface.

**Décision :** le texte de recherche de chaque ligne est reconstruit à
partir des **mêmes fonctions d'affichage** que le rendu du tableau
(`formatMontant`, `formatDate`, `afficheSurface`...), pas des valeurs
brutes — pour que "ce qui se cherche" corresponde exactement à "ce qui se
lit à l'écran". Conséquence directe : la comparaison doit aussi neutraliser
les différences purement typographiques entre "ce qu'on tape" et "ce qui
s'affiche" (espace insécable des milliers, virgule décimale à la
française vs point tapé au clavier) — voir `utils/recherche.js`.

## PDF forcé sur une seule page : largeurs de colonnes calculées, pas devinées (décision du 21/07/2026)

Deux exports (récap détaillé par phase des appels de fonds, détail
entreprises des TMA) ont beaucoup de colonnes chiffrées/dates et devaient
tenir sur une seule page PDF, sans retour à la ligne — contrairement au
reste de l'appli, qui préfère répartir les colonnes en trop sur des pages
supplémentaires (`horizontalPageBreak`, ex: page Lots) plutôt que de les
compresser.

**Décision :** plutôt que de deviner une largeur de colonne ou de réduire
la police au hasard jusqu'à ce que ça rentre, `calculerLargeursColonnesFigees()`
(client/src/utils/export.js) mesure la largeur RÉELLE du texte le plus
long de chaque colonne avec la police de jsPDF (`doc.getTextWidth()`), puis
redistribue l'espace restant de la page à toutes les colonnes au prorata de
leur largeur — pour qu'aucune colonne ne revienne à la ligne inutilement,
et que le tableau occupe quand même toute la largeur imprimable. Un plafond
optionnel par colonne (`largeursMax`) permet de laisser certaines colonnes
(texte libre : Client, Description, Commentaire) revenir à la ligne plutôt
que de s'étirer sans limite. Découvert au passage : l'espace insécable des
montants formatés (`Intl.NumberFormat('fr-FR')`) n'existe pas dans la
police "helvetica" intégrée à jsPDF et s'affichait comme un "/" —
remplacé par un espace normal avant tout envoi à jsPDF (`nettoyerPourPdf`),
un bug qui touchait potentiellement tous les exports PDF de l'appli, pas
seulement ceux-ci.

## Numérotation des devis TMA : une suite par programme (décision du 21/07/2026)

Le numéro de devis (ex: "TMA-2026-005") doit changer à chaque génération,
même en régénérant le même devis après correction — jamais réutilisé.
Question posée à Nicolas : une seule suite pour toute l'application, ou une
suite séparée par programme ?

**Décision :** séparée par programme (chaque programme repart à 001) —
chaque programme peut avoir son propre maître d'ouvrage/sa propre
comptabilité de devis. Implémenté via un compteur générique (`Compteur`,
voir `schema-donnees.md`), clé `devis-tma-<idProgramme>-<année>`,
incrémenté de façon atomique côté serveur (`POST /api/tma/:id/devis-numero`)
— jamais calculé côté client, pour éviter deux générations concurrentes qui
récupéreraient le même numéro.

## Vulnérabilité `uuid` (via `exceljs`) laissée en l'état (décision du 21/07/2026)

`npm audit` (client) signale une vulnérabilité modérée sur `uuid`, une
dépendance transitive d'`exceljs`. Le correctif automatique proposé
(`npm audit fix --force`) downgrade `exceljs` en version 3, un changement
que npm signale lui-même comme cassant.

**Décision :** ne PAS appliquer ce downgrade automatiquement. `exceljs`
est au cœur de tous les exports Excel de l'appli (5 pages), tout juste
terminés et testés ce mois-ci — un downgrade risquerait de casser des
fonctionnalités qui marchent, pour corriger une vulnérabilité modérée (pas
critique) dans une dépendance transitive, pas le code de l'appli
lui-même. À rediscuter avec Nicolas plus tard (upgrade contrôlé
d'`exceljs` vers une version majeure plus récente qui ne dépend plus
d'`uuid` vulnérable, avec retest complet des exports), pas dans l'urgence.

## Migration de `docs/contexte-projet.md` vers `CLAUDE.md` (décision du 31/08/2026)

Nicolas a fourni un vrai "Protocole IA — Projet VEFA (déjà avancé)"
(`docs/protocole-ia-vefa.md`), qui recommandait de migrer le fichier de
contexte vers un vrai `CLAUDE.md` à la racine du projet : Claude Code le
charge automatiquement en début de session, sans que Nicolas ait besoin de
le coller manuellement à chaque fois (contrairement à
`docs/contexte-projet.md`, jusque-là recollé à la main).

**Décision :** `CLAUDE.md` créé à la racine, gardé en synthèse courte (les
points les plus critiques seulement, pas une réécriture des fichiers de
`docs/`) ; `docs/contexte-projet.md` devient un simple stub de
redirection, gardé pour que les liens déjà en place dans les autres
fichiers continuent de fonctionner, mais plus jamais modifié directement.
Nouveaux documents de référence créés dans le même mouvement :
`docs/regles-metiers.md` (référence exhaustive et canonique des règles
métier, pour ne plus les disperser entre `journal.md`/`decisions.md`/le
code), `docs/a-prendre-en-compte.md` (réflexes permanents pour l'IA),
`docs/taches-a-traiter.md` (vue consolidée de tout ce qui reste ouvert,
par thème plutôt que par ordre chronologique).

## Tests d'intégration serveur sans passer par de vraies routes HTTP (décision du 01/09/2026)

Le plan initial pour tester "en conditions réelles" les routes API
critiques (génération des appels de fonds, recalcul TMA) prévoyait de
scinder `server/index.js` en `app.js`/`index.js` pour pouvoir utiliser
`supertest` sur de vraies requêtes HTTP. Nicolas a remis cette approche en
question avant de s'y engager ("on est sûr que c'est la meilleure
stratégie ?").

**Décision :** version allégée — `mongodb-memory-server` (une vraie base
MongoDB éphémère, en mémoire) mais appel direct aux fonctions exportées
des routes (ex : `genererAppelsDeFonds()`) avec de vrais documents
Mongoose, **sans** passer par Express/HTTP. Suffisant pour vérifier la
logique métier contre une vraie base plutôt que des mocks, pour un coût
d'infrastructure bien moindre que le split `app.js`/`index.js`. Ce split
et `supertest` restent une option pour plus tard, si le besoin de tester
de vraies routes HTTP (codes de statut, en-têtes, middleware) se fait
vraiment sentir — pas un chantier obligatoire décidé d'avance.

## Extraire les fonctions pures plutôt que refactorer, pour tester les "god components" (décision du 01/09/2026)

Trois pages (`Lots.jsx`, `Tma.jsx`, `AppelsDeFonds.jsx`, 600 à 900 lignes
chacune) n'avaient aucun test, et sont par ailleurs déjà trackées comme
dette technique à découper en sous-composants (point 236). Deux approches
possibles pour les tester : découper d'abord les composants puis tester
les morceaux, ou tester ce qui est déjà isolable sans y toucher.

**Décision :** extraire (au sens propre : ajouter le mot-clé `export`, ne
rien déplacer) les fonctions déjà pures — sans JSX ni hooks — présentes en
dehors du corps du composant, et les tester isolément dans un fichier
`.test.js` dédié à chaque page. Le refactor/découpage complet des god
components reste un sujet séparé, plus lourd et plus risqué, pas résolu
par ce chantier. Bénéfice collatéral confirmé à l'usage : cette approche a
aussi permis de régler pour de bon la duplication de `nomAcquereur()` dans
les 3 pages (extraite dans `client/src/utils/acquereur.js`) et a fait
apparaître un vrai bug de grammaire française (`pluraliser()`, accord
d'un libellé à plusieurs mots) jamais repéré manuellement jusque-là.

## Exécution strictement séquentielle des commandes WSL/npm (décision du 01/09/2026)

Deux `npm install` lancés en parallèle dans WSL (pendant la mise en place
de la couverture de code) ont bloqué la VM WSL entière (11 processus `wsl`
accumulés, compteur mémoire `vmmemWSL` corrompu), résolu par
`wsl --shutdown` (accord explicite de Nicolas) puis réinstallation en
séquentiel.

**Décision :** toute commande WSL impliquant `npm` (install, test, dev)
s'exécute désormais strictement l'une après l'autre, jamais en parallèle,
même quand deux tâches semblent indépendantes l'une de l'autre — le coût
d'un blocage de VM dépasse largement le gain de temps d'une parallélisation.

## Dépôt GitHub privé, sans protection de branche pour l'instant (décision du 01/09/2026)

Premier dépôt GitHub créé et poussé (`nicolas-pueyo-cazalis/gestion-vefa`,
privé) — le CI a tourné pour la première fois en conditions réelles.
Ni les "Rulesets" (nouvelle interface GitHub) ni les "Branch protection
rules" (interface classique) ne s'appliquent sur un dépôt **privé** avec
un compte gratuit (message GitHub explicite : nécessite un compte
Team/Enterprise). Deux options : passer le dépôt en public (protection
gratuite et sans limite), ou rester privé sans cette protection.

**Décision :** Nicolas choisit de rester privé pour l'instant, sans
protection de branche active — décision explicite, pas un oubli, à
reconsidérer s'il change d'avis sur la visibilité du dépôt (utile pour
des recruteurs, mais expose le code publiquement).
