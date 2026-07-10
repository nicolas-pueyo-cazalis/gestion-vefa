# Fiche de révision technique

Résumé court de chaque notion de code rencontrée sur le projet, dans l'ordre
où elle a été vue. À relire pour se rafraîchir la mémoire, ou pour préparer un
entretien. Le vocabulaire **métier** (VEFA, TMA...) est dans `glossaire.md` —
ici c'est uniquement du vocabulaire **technique**.

## JavaScript vanilla (étape 1)

- **`document.querySelector('#id')`** : récupère un élément HTML par son
  identifiant (ou tout sélecteur CSS). Base de toute manipulation du DOM.
- **`textContent` vs `innerHTML`** : `textContent` insère du texte brut, sans
  risque (utilisé pour des données de confiance comme les nôtres) ;
  `innerHTML` interprète le texte comme du HTML — pratique pour injecter des
  balises générées, mais dangereux avec du contenu venant d'un utilisateur
  (risque XSS), à réserver à nos propres données fictives pour l'instant.
- **Template literals** (`` `texte ${variable}` ``) : chaînes de caractères
  multi-lignes avec insertion de variables.
- **`Array.filter/map/reduce`** : `filter` garde certains éléments selon une
  condition, `map` transforme chaque élément, `reduce` accumule une valeur
  unique (somme, compteur...) à partir d'un tableau.
- **Délégation d'événements** : poser un seul `addEventListener` sur un
  conteneur parent plutôt qu'un par enfant, et retrouver l'élément cliqué avec
  `.closest(...)`. Plus économe que d'attacher un écouteur par bouton.
- **`Intl.NumberFormat`** : API native du navigateur pour formater des
  nombres/montants selon une locale (ex: `"fr-FR"` + `currency: "EUR"` →
  `"210 000,00 €"`). Attention : insère des espaces insécables, qui peuvent
  provoquer un débordement visuel si le conteneur est trop étroit.
- **Modules ES (`import`/`export`)** : chaque fichier a son propre espace de
  variables (contrairement aux `<script>` classiques qui partagent un espace
  global) ; on rend explicitement disponible ce qu'on `export`e, et on va le
  chercher avec `import` dans le fichier qui en a besoin.

## React (étape 2)

- **Composant** : une fonction JavaScript, avec un nom qui commence par une
  majuscule, qui retourne du JSX. C'est l'unité de base de React.
- **JSX** : syntaxe qui mélange HTML et JavaScript dans le code (`<p>Bonjour
  {prenom}</p>`). Ce n'est pas du HTML valide pour un navigateur — Vite le
  traduit en JavaScript classique avant exécution.
- **Props** : les "paramètres" qu'on passe à un composant
  (`<Salutation prenom="Nicolas" />`). Se déclarent en déstructurant l'objet
  reçu en paramètre de la fonction : `function Salutation({ prenom }) {...}`.
- **`useState`** : crée une donnée surveillée par React (`const [valeur,
  setValeur] = useState(valeurInitiale)`). Dès que `setValeur(...)` est
  appelé, React relance automatiquement le rendu du composant — on ne
  manipule plus jamais le DOM à la main comme en vanilla.
- **Rendu de listes avec `.map()`** : la même méthode `.map()` qu'en vanilla,
  mais qui retourne ici un tableau de JSX au lieu d'une chaîne de texte à
  injecter avec `innerHTML`.
- **`key`** : identifiant unique obligatoire sur chaque élément d'une liste
  générée par `.map()` (ex: `key={lot.reference}`). Permet à React de savoir
  quel élément a changé/été ajouté/supprimé, sans tout redessiner. Un
  avertissement dans la console signale un `key` manquant.
- **Fragment (`<>...</>`)** : balise "invisible" pour grouper plusieurs
  éléments sans ajouter de vrai `<div>` inutile — nécessaire car un composant
  ne peut retourner qu'un seul élément racine.
- **`export default`** : indique l'export "principal" d'un fichier,
  importable sans accolades (`import App from './App.jsx'`), contrairement à
  un export nommé (`export const PROGRAMME = ...` → `import { PROGRAMME }
  from ...`).
- **Composant contrôlé** : un composant qui ne possède pas sa propre donnée,
  mais la reçoit en prop (ex: `actif`) et délègue tout changement à son
  parent via une prop-fonction (ex: `onChange`). Le parent reste la seule
  "source de vérité". Utilisé pour `FiltreStatuts`.

## React Router (étape 2)

- **`<BrowserRouter>`** : active le système de routage pour toute
  l'application. Se place une seule fois, en haut (`main.jsx`).
- **`<Routes>` / `<Route>`** : la liste des correspondances "URL → composant à
  afficher". `<Route path="tma" element={<Tma />} />` affiche `Tma` sur
  `/tma`.
- **Route "index"** (`<Route index element={<Lots />} />`) : la route par
  défaut d'un parent, affichée quand l'URL correspond exactement au chemin du
  parent (ici `/`).
- **`<Outlet />`** : emplacement, dans un composant partagé (`Layout`), où
  React Router insère la page active — évite de dupliquer le bandeau dans
  chaque page.
- **`<NavLink>`** : comme un `<a>`, mais ajoute automatiquement une classe
  CSS `active` sur le lien correspondant à la page actuelle. La prop `end`
  évite qu'un lien vers `/` reste actif sur toutes les autres pages (qui
  commencent aussi par `/`).
- **SPA (Single Page Application)** : un seul vrai fichier HTML ; changer de
  "page" ne recharge pas le navigateur, seul le contenu concerné est
  redessiné par React.

## Sass (étape 2)

- **Variables (`$nom: valeur`)** : équivalent des `--nom` en CSS, mais
  remplacées directement par leur valeur au moment de la compilation (pas de
  variable qui persiste jusque dans le navigateur comme en CSS).
- **Partiel (`_variables.scss`)** : un fichier préfixé par `_`, fait pour être
  importé par un autre via `@use`, ne produit pas de CSS seul.
- **`@use 'fichier' as *;`** : importe un partiel ; `as *` évite d'avoir à
  préfixer chaque variable par un espace de noms.
- **Imbrication (nesting)** : écrire les styles d'un élément enfant à
  l'intérieur de la règle de son parent — la structure du CSS suit celle du
  HTML, plus lisible qu'en CSS classique.
- **`&`** : représente le sélecteur parent collé sans espace (`&.active` →
  `a.active`, pas `a .active`).
- **Map (`$couleurs-statut: (cle: valeur, ...)`)** : équivalent Sass d'un
  objet JS ; combinée à `@each`, permet de générer plusieurs règles CSS par
  une boucle plutôt qu'en les recopiant à la main.
- **Interpolation (`#{...}`)** : insère la valeur d'une variable dans le
  texte d'un sélecteur ou d'une propriété (ex: `.badge.#{$statut}`).

## Outillage

- **Vite** : outil qui (1) traduit JSX/modules ES en JS compréhensible par le
  navigateur, et (2) sert l'application en développement avec rechargement
  instantané (HMR) à la sauvegarde.
- **`server.watch.usePolling`** (`vite.config.js`) : nécessaire quand le
  projet est sur le disque Windows (`/mnt/c/...`) mais que le serveur tourne
  dans WSL — WSL ne reçoit pas toujours les notifications de modification de
  fichiers faites côté Windows, Vite doit donc vérifier les fichiers à
  intervalle régulier au lieu d'attendre d'être prévenu.

## Back-end : Node.js / Express (étape 3)

- **`"type": "module"`** (`package.json`) : autorise `import`/`export` dans
  le code Node (au lieu de l'ancienne syntaxe `require`/`module.exports`) —
  même syntaxe que côté React, un seul style à apprendre pour tout le projet.
- **Middleware** (`app.use(...)`) : une fonction qui s'exécute sur **chaque**
  requête entrante, avant qu'elle n'atteigne la route ciblée. `cors()`
  autorise les requêtes venant d'une autre origine (notre front React sur un
  autre port) ; `express.json()` permet de lire un corps de requête envoyé en
  JSON.
- **Route** (`app.get('/chemin', (req, res) => {...})`) : associe une URL +
  une méthode HTTP (GET, POST...) à une fonction. `req` = ce qu'envoie le
  client, `res` = ce qu'on renvoie (`res.json({...})`).
- **`nodemon`** : redémarre automatiquement le serveur Node à chaque
  modification de fichier — l'équivalent du HMR de Vite, côté serveur.
- **`dotenv`** (`import 'dotenv/config'`) : charge les variables du fichier
  `.env` dans `process.env`, pour ne jamais écrire de mot de passe/secret en
  dur dans le code.
- **`.env` vs `.env.example`** : `.env` contient les vraies valeurs (jamais
  commité, dans `.gitignore`) ; `.env.example` est un modèle sans secret,
  commité, qui montre quelles variables sont attendues.
- **Promise / `.then()` / `.catch()`** : représente une valeur "pas encore
  prête" (ex: le résultat d'une connexion réseau à MongoDB). `.then(...)`
  s'exécute en cas de succès, `.catch(...)` en cas d'échec. `mongoose.connect(...)`
  en renvoie une.
- **MongoDB Atlas** : hébergement cloud gratuit de MongoDB — évite d'installer
  une base de données en local, et c'est la même solution prévue pour le
  déploiement final.

## Mongoose (étape 3)

- **Schema** : la définition des champs, types, valeurs par défaut et
  validations d'une collection. Un plan, pas encore utilisable pour
  interroger la base.
- **Model** (`mongoose.model('Programme', programmeSchema)`) : créé à partir
  d'un Schema, c'est l'objet réellement utilisé pour créer/lire/modifier des
  documents (`Programme.find()`, `Programme.create({...})`).
- **Référence (`{ type: mongoose.Schema.Types.ObjectId, ref: 'Lot' }`)** : un
  document stocke seulement l'identifiant (`_id`) d'un document d'une autre
  collection — pas ses données. Pour récupérer les vraies données liées, il
  faut explicitement `.populate('champ', 'champsVoulus')` (sinon on n'a que
  l'ID). Le second argument restreint quels champs du document lié sont
  rapatriés.
- **Piège `.populate()` + modèle jamais importé** : Mongoose doit avoir
  chargé (importé) le fichier du modèle référencé par `ref: '...'` au moins
  une fois pour pouvoir le résoudre, sinon erreur "Schema hasn't been
  registered for model X" — même si ce modèle n'est utilisé nulle part
  ailleurs dans les routes. Solution robuste : importer tous les modèles une
  fois au démarrage du serveur (`index.js`), plutôt que de compter sur le
  fait qu'un autre fichier de route l'importe par coïncidence.
- **Sous-document embarqué** (ex: `parametres` dans `Programme`, `banque`
  dans `Acquereur`) : à l'inverse d'une référence, la donnée est stockée
  directement à l'intérieur du document parent, pas dans une collection
  séparée — utilisé quand elle n'a pas de sens ou de cycle de vie hors de son
  parent.
- **`required: true`** : rend un champ obligatoire, Mongoose refuse
  l'enregistrement sans lui.
- **`default:`** : valeur utilisée si le champ n'est pas fourni. Une
  fonction (`default: () => (...)`) plutôt qu'une valeur fixe pour les
  tableaux/objets, afin que chaque document reçoive sa propre copie.
- **`enum: [...]`** : restreint un champ à une liste de valeurs autorisées.
  Ne vérifie **pas** l'ordre des transitions entre valeurs (ex: statut TMA)
  — cette règle doit être codée dans les routes, pas dans le schéma.
- **`match: regex`** : valide un champ texte contre une expression régulière
  (ex: format email).
- **`unique: true`** : crée une contrainte d'unicité en base (ex: deux
  utilisateurs ne peuvent pas avoir le même email).
- **`{ timestamps: true }`** : ajoute automatiquement `createdAt`/`updatedAt`
  à chaque document.
- **Piège `required` + chaîne vide** : pour un champ `String`, Mongoose
  considère `''` (chaîne vide) comme **non rempli** — `required: true`
  échoue, même si techniquement une valeur a été fournie.

## Async/await et scripts Node (étape 3)

- **`async`/`await`** : une autre façon d'écrire du code qui attend une
  Promise, qui se lit comme du code séquentiel classique plutôt que comme
  une chaîne de `.then()`. `await` "met en pause" la fonction jusqu'à ce que
  la Promise soit résolue, sans bloquer le reste du programme. Ne peut être
  utilisé qu'à l'intérieur d'une fonction déclarée `async`.
- **`Promise.all([...])`** : lance plusieurs opérations asynchrones **en
  parallèle** et attend qu'elles soient toutes terminées — plus rapide que
  plusieurs `await` à la suite quand l'ordre n'a pas d'importance.
- **`Object.fromEntries(tableau.map((x) => [cle, valeur]))`** : construit un
  objet "dictionnaire" à partir d'un tableau, pratique pour retrouver
  rapidement un élément par une clé (ex: un lot par sa référence) sans
  reparcourir tout le tableau à chaque fois.
- **`Model.insertMany([...])`** : insère plusieurs documents Mongoose en une
  fois, renvoie le tableau des documents créés (avec leur `_id` généré).

## Routes REST (étape 3)

- **`Router()`** (`import { Router } from 'express'`) : une "mini
  application" Express dédiée à un groupe de routes, dans son propre fichier
  — évite de tout écrire dans `index.js`.
- **`app.use('/api/lots', lotsRouter)`** : "branche" un routeur à un préfixe
  d'URL. Une route `router.get('/')` dans `lots.js` devient concrètement
  `GET /api/lots`.
- **`try/catch` dans une route `async`** : indispensable — si une erreur
  survient pendant un `await` (ex: base injoignable) sans être attrapée, la
  requête du client reste bloquée sans jamais recevoir de réponse.
- **`res.status(500).json({...})`** : envoie un code d'erreur HTTP (500 =
  erreur serveur) avec un message JSON, plutôt qu'une réponse "normale".
- **`--legacy-watch`** (`nodemon --legacy-watch index.js`) : même souci que
  `server.watch.usePolling` côté Vite — nécessaire pour que `nodemon`
  détecte les modifications de fichiers faites côté Windows depuis WSL.
- **`PATCH`** : méthode HTTP pour modifier **partiellement** une ressource
  existante (ex: juste le `statut` d'une TMA) — différente de `GET` (lire),
  `POST` (créer) ou `PUT` (remplacer tout le document).
- **`req.params.id`** vs **`req.body`** : `req.params` lit les valeurs dans
  l'URL elle-même (`:id` dans `/api/tma/:id/statut`), `req.body` lit le
  contenu JSON envoyé par le client (nécessite `express.json()`).
- **`?? []`** (nullish coalescing) : comme `||`, mais ne se déclenche que si
  la valeur est `null`/`undefined` — pas pour les autres "fausses" valeurs
  JS (`0`, `''`...), qui restent alors inchangées.
- **Machine à états côté serveur** : un objet `{ statutActuel: [statutsAutorisés] }`
  vérifié explicitement dans la route, en plus de l'`enum` Mongoose (qui ne
  vérifie que "la valeur existe dans la liste", pas "la transition est
  légale depuis l'état actuel").
- **Route dédiée plutôt que transition générique, quand la cible dépend
  d'une donnée** : "annuler un refus" ne va pas vers un statut fixe (ça
  dépend de `statutAvantRefus`, propre à chaque document) — plutôt que de
  complexifier la route générique `PATCH /:id/statut`, une route séparée
  `PATCH /:id/annuler-refus` reste plus simple à lire et à faire évoluer.

## React : nouveaux motifs (étape 3)

- **`{condition && <Composant />}`** : affichage conditionnel en JSX. Si
  `condition` est fausse, JS s'arrête (`false && ...` vaut `false`) et React
  n'affiche rien pour une valeur `false`. Si vraie, le JSX s'affiche.
- **Mise à jour partielle du state après un appel réseau** : après un
  `PATCH`, ne remplacer dans le state que les champs réellement modifiés
  (`{ ...tma, statut: nouveauStatut }`) plutôt que tout l'objet renvoyé par
  le serveur — surtout si la réponse n'est pas `.populate()`e comme les
  données déjà affichées, sous peine d'écraser des données affichées
  (`lot.reference`, `acquereur.nom`...) par de simples identifiants.
- **Piège `display: flex` sur une cellule de tableau (`<td>`)** : peut
  perturber l'alignement des bordures entre lignes d'un `<table>` — à
  réserver aux cas où plusieurs éléments doivent vraiment être mis en ligne
  dans la cellule ; pour un seul élément (ou zéro), garder l'affichage par
  défaut de la cellule.

## React : formulaires et listes de composants (étape 4)

- **`<Fragment key={...}>` vs `<>...</>`** : la version courte `<>` (Fragment
  implicite) n'accepte pas de prop `key`. Dès qu'un `.map()` doit retourner
  **plusieurs** éléments par itération (ex: une ligne de tableau + une ligne
  de formulaire conditionnelle), il faut la forme longue `<Fragment
  key={...}>...</Fragment>` (import `{ Fragment }` depuis `'react'`).
- **Formulaire "différé"** : chaque champ garde sa valeur dans un `useState`
  local, rien n'est envoyé tant que l'utilisateur n'a pas soumis — à
  l'opposé d'un composant comme `FiltreStatuts` qui envoie un changement
  immédiatement à chaque clic. Le bon choix dépend du nombre de champs à
  saisir d'un coup.
- **`evenement.preventDefault()`** sur la soumission d'un `<form>` : sans
  ça, le navigateur recharge la page entière (comportement HTML par défaut)
  au lieu de laisser le JavaScript gérer l'envoi via `fetch`.
- **`<td colSpan={n}>`** : fusionne une cellule sur `n` colonnes — utile pour
  insérer un contenu (formulaire, message) qui doit occuper toute la largeur
  d'un tableau sans respecter sa grille de colonnes habituelle.
- **Ajouter/retirer un élément du `state`** : ajouter →
  `setListe((liste) => [...liste, nouvelElement])` (éclate l'ancienne liste,
  ajoute à la suite) ; retirer →
  `setListe((liste) => liste.filter((x) => x._id !== id))` (garde tout sauf
  celui visé). Alternative à remplacer tout le state par une nouvelle
  requête réseau, plus rapide à l'affichage.
- **Extraire une fonction de chargement hors du `useEffect`** : pour pouvoir
  la rappeler ailleurs (ex: après qu'un composant enfant ait modifié des
  données liées), déclarer la fonction `async` dans le corps du composant et
  l'appeler à la fois dans `useEffect(() => { fonction() }, [])` et depuis un
  gestionnaire d'événement/callback.

## Règles métier avec agrégation (étape 4)

- **`tableau.every(condition)`** : renvoie `true` seulement si **tous** les
  éléments respectent la condition (contraste avec `.some()`, qui suffit
  qu'un seul la respecte). Utilisé pour "toutes les entreprises ont-elles
  répondu ?" avant d'autoriser un calcul agrégé.
- **Ne finaliser un calcul agrégé (somme, statut) que si les données sont
  complètes** : mieux vaut laisser un champ à `null` ("pas encore prêt") que
  d'afficher un total partiel qui pourrait être pris pour un chiffre
  définitif.

## Référentiels et listes déroulantes (étape 4)

- **`<select>` / `<option>`** : contrôlé exactement comme un `<input>`
  (`value` + `onChange` sur le `<select>`), `required` bloque la
  soumission si rien n'est choisi — validation native du navigateur,
  gratuite.
- **Reconstituer un objet détaillé après un `POST`** : quand la réponse du
  serveur ne contient que l'`_id` d'une référence (pas de `.populate()` sur
  une création), et qu'on a déjà la liste complète chargée par ailleurs
  (ex: toutes les entreprises), on peut retrouver le détail localement
  (`.find(...)`) plutôt que de refaire une requête réseau juste pour
  l'affichage immédiat.
- **Extraire un sous-schéma Mongoose partagé** (`contactSchema.js`) :
  export par défaut du schéma lui-même (pas d'un modèle), importé dans
  plusieurs fichiers de modèles — évite de dupliquer une définition
  identique (ici entre `Acquereur.banque`/`courtier` et `Entreprise.contact`).
- **Composant "affichage ou édition" selon son propre `state`** : un booléen
  local (`enEdition`) détermine si le composant retourne une simple ligne
  d'info avec des boutons, ou un petit formulaire — permet une édition "en
  ligne" sans changer de page ni de composant parent.
- **Erreur d'import "Failed to resolve" = page blanche totale** : si un
  fichier importé n'existe pas (ex: une route ajoutée dans `App.jsx` avant
  d'avoir créé la page correspondante), Vite ne peut compiler aucun module
  qui en dépend — toute l'application reste blanche, pas seulement la
  fonctionnalité concernée. Toujours vérifier les logs du serveur de dev en
  cas d'écran blanc inattendu.

## Petits réglages CSS (étape 4)

- **`margin-left: auto` dans un conteneur flex** : pousse l'élément (et tout
  ce qui suit) vers la droite, en absorbant tout l'espace disponible à sa
  gauche — astuce classique pour séparer un élément du reste d'une barre de
  navigation sans dupliquer la structure en deux groupes.
- **`NavLink` avec un `className` texte simple** : React Router ajoute quand
  même automatiquement `active`/`pending` à la suite de la classe fournie
  (uniquement si `className` n'est pas une fonction) — on peut donc combiner
  une classe personnalisée (ex: pour le positionnement) et le style actif
  automatique sans rien perdre.
- **Piège : fusion des marges verticales ("margin collapsing")** : entre
  deux éléments de bloc voisins, `margin-bottom` du premier et `margin-top`
  du second ne s'additionnent pas — CSS garde seulement la plus grande des
  deux. Un `margin-top` ajouté sur le second peut donc n'avoir **aucun
  effet visible** si le `margin-bottom` du premier est déjà supérieur.
  Solutions : soit augmenter la marge qui compte réellement, soit utiliser
  `padding` à la place (qui ne fusionne jamais avec les marges voisines).
