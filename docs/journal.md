# Journal de bord — Gestion VEFA

Ce journal retrace chaque étape du projet : ce qui a été fait, pourquoi, et les
commandes clés utilisées. Objectif : pouvoir reprendre le fil à tout moment, et
pouvoir réexpliquer le projet (par exemple en entretien d'alternance).

---

## 2026-07-09 — Lancement du projet

**Contexte**

Le repo contenait déjà un commit initial (README.md minimal, .gitattributes,
.git). Objectif du projet : recréer en application web deux outils métier
immobilier (suivi VEFA et gestion des TMA) actuellement gérés sous Excel/VBA,
dans le cadre d'une recherche d'alternance développeur web.

**Décisions prises aujourd'hui**

- Documentation continue du projet dans `docs/` (ce journal, un glossaire métier,
  un fichier de décisions techniques). Voir `decisions.md`.
- Terminal de référence pour ce projet : **WSL (Ubuntu)**, plutôt que PowerShell,
  pour prendre dès maintenant les habitudes d'un environnement de développement
  professionnel Node/Mongo.
- Les commandes du projet seront exécutées directement (par l'assistant), avec
  une explication systématique de ce qui est fait et pourquoi, tracée dans ce
  journal.
- Deux fichiers Excel métier existants (suivi VEFA, suivi TMA) vont servir de
  base de compréhension du métier, sans être reproduits à l'identique — objectif
  d'amélioration, pas de copie.

**Prochaine étape**

Récupération et analyse des deux fichiers Excel pour en extraire la logique
métier réelle (calcul des appels de fonds, statuts des TMA...) avant de
commencer le développement (étape 1 : version HTML/CSS/JS vanilla).

---

## 2026-07-09 — Analyse des fichiers Excel de référence

**Ce qui a été fait**

Les deux fichiers (`VEFA complété 4.xlsm`, `Tableau de suivi TMA - Complété
1.xlsm`) ont été déposés dans `références/`. Analyse programmatique de leur
contenu (feuilles, colonnes, et surtout les formules) via un script Node
utilisant la librairie `xlsx` (SheetJS), exécuté dans WSL. Les fichiers
`.xlsm` binaires ne peuvent pas être lus comme du texte brut — d'où le passage
par un script dédié plutôt qu'une lecture directe.

**Résultat**

Analyse complète consignée dans `docs/analyse-excel.md` : structure des deux
fichiers, modèle de données observé, et surtout les **règles métier réelles**
qui étaient cachées dans les formules Excel, notamment :
- le barème des phases de travaux et la condition de déclenchement d'un appel
  de fonds (attestation MOE + statut "Acté") ;
- le workflow réel des statuts de TMA (plus fin que prévu : Demande → Étude →
  Chiffré → Validé/Refusé, avec des étapes d'exécution Travaux/Terminé
  entrevues mais non formalisées) ;
- la règle de marge commerciale de 30% sur les TMA (sauf avoirs négatifs).

Une première liste de pistes d'amélioration (par rapport au fonctionnement
Excel) a été identifiée — voir la fin de `docs/analyse-excel.md`.

**Prochaine étape**

Conception du schéma de données définitif (collections MongoDB : Programme,
Lot, Acquereur, AppelDeFonds, TMA...) à partir de cette analyse.

---

## 2026-07-09 — Retours de Nicolas sur l'analyse Excel

**Ce qui a été fait**

Nicolas a relu `docs/analyse-excel.md` et transmis des remarques (PDF). Elles
ont été intégrées directement dans le document sous forme de blocs
"Décision (09/07/2026)", plus une synthèse en fin de fichier (section 4).

**Décision structurante**

Ce qui semblait être des constantes métier dans les fichiers Excel (barème
des phases de travaux, délai prêt +45j, délai notaire +3 mois, délai retour
entreprise TMA +15j, taux de marge TMA 30%, comportement sur montant TMA
négatif) doit en réalité être **paramétrable par programme/client**. Décision
tracée dans `docs/decisions.md` ("Paramétrage par programme"). Nouvelle
règle ajoutée (absente d'Excel) : alerte sur les appels de fonds émis mais
non réglés à temps, avec une fenêtre de notification à l'ouverture de
l'application listant tous les retards (prêt, notaire, appels de fonds).

Correction métier : la règle Excel sur les montants de TMA négatifs ("pas de
marge, le client récupère l'avoir") est remplacée par une règle différente
demandée par Nicolas : montant facturé au client = 0€ si le montant
entreprise est négatif.

**Prochaine étape**

Conception du schéma de données définitif (collections MongoDB), en intégrant
dès le départ ces paramètres configurables par programme.

---

## 2026-07-09 — Conception du schéma de données + retours de Nicolas

**Ce qui a été fait**

Conception complète du modèle de données dans `docs/schema-donnees.md` :
7 collections (`Programme`, `Lot`, `Acquereur`, `AppelDeFonds`, `TMA`,
`TmaEntreprise`, `Utilisateur`), avec pour chacune la justification par
rapport à l'analyse Excel et aux décisions de paramétrage. Délai par défaut
de règlement d'un appel de fonds tranché à **30 jours**.

Nicolas a relu ce premier jet et transmis de nouvelles remarques (PDF),
intégrées directement dans le document :

- **Étages** : liste déroulante mais modifiable par programme → nouveau
  paramètre `programme.parametres.listeEtages` (au lieu d'un enum figé).
- **Orientation** : liste fixe des 8 orientations → vrai enum Mongoose.
- **Prix/montants** : toujours affichés avec "€", mais stockés en `Number`
  pur pour ne pas casser les calculs — formatage centralisé côté front.
  Discussion pédagogique sur pourquoi on ne stocke jamais le symbole
  monétaire dans la donnée elle-même.
- **Téléphone** : Nicolas a signalé que les clients peuvent avoir un numéro
  étranger → abandon d'un regex "numéro français" au profit de la librairie
  `libphonenumber-js` et d'un stockage normalisé au format international
  E.164.
- **Email** : validation par regex.
- **Banque / courtier** : passent de simples noms texte à un sous-document
  `Contact` complet (coordonnées).

Ces décisions sont tracées dans `docs/decisions.md` ("Conventions de saisie
et librairies de validation").

**Décisions de conception notables (validées, hors retours ci-dessus)**

- Les paramètres métier sont un **sous-document embarqué** dans `Programme`,
  pas une collection séparée.
- Le pourcentage d'une phase et le montant TMA client sont **figés
  ("snapshottés")** au moment de l'émission/validation, pour ne pas changer
  rétroactivement si les paramètres du programme sont corrigés après coup.
- Les échéances calculées (dates limites, statut "en retard") ne sont
  **jamais stockées**, seulement calculées à la volée.
- Statuts codés sans accent dans les enums (valeurs techniques), l'accent
  restant réservé à l'affichage front.
- Machine à états `TMA.statut` définitive : `demande → etude → chiffre →
  valide → facture → travaux → termine`, avec `refuse` possible uniquement
  avant `valide`.

**Points laissés ouverts** (non bloquants, listés en fin de
`schema-donnees.md`) : moment de génération des `AppelDeFonds`, référentiel
`Entreprise` séparé ou non, rôle "acquéreur" en lecture seule.

**Prochaine étape**

Démarrage du développement effectif, étape 1 de la feuille de route : version
HTML/CSS/JS vanilla pour afficher des données avant de passer à React.

---

## 2026-07-09 — Étape 1 : première page HTML/CSS/JS vanilla

**Ce qui a été fait**

Création du dossier `vanilla/` (isolé du futur code React, pour ne rien avoir
à nettoyer à l'étape 2) avec une première page fonctionnelle :

- `data.js` : données fictives d'un programme (« Résidence Les Tilleuls ») et
  de 8 lots, codées en dur (pas encore de backend).
- `index.html` : structure de la page (en-tête, statistiques, filtres,
  tableau des lots).
- `style.css` : mise en forme, avec des couleurs de badge par statut.
- `script.js` : affichage dynamique — calcul des statistiques (répartition
  par statut, CA acté), rendu du tableau, filtrage par statut via délégation
  d'événements.

Notions pratiquées (expliquées en détail dans le chat au moment de l'écriture) :
`document.querySelector`, `textContent` vs `innerHTML`, template literals,
`Array.filter/map/reduce`, délégation d'événements, `Intl.NumberFormat` pour
formater les montants en euros (première application concrète de la
convention monétaire définie dans `schema-donnees.md`).

Choix délibéré de ne pas utiliser `import`/`export` (modules ES) à ce stade,
pour rester simple et éviter les soucis liés au chargement de fichiers en
local — ce sera introduit proprement avec Vite à l'étape 2.

**Test et ajustement**

Page testée via un serveur local (`python3 -m http.server`, lancé dans WSL) —
tous les fichiers se chargent correctement. Nicolas a ensuite modifié
`style.css` lui-même : le montant "CA acté" débordait de sa carte à cause
d'une espace insécable introduite par `Intl.NumberFormat('fr-FR', ...)`
entre les milliers (`530␣000,00␣€`), qui empêche tout retour à la ligne à cet
endroit. Solution retenue (plutôt qu'un retour à la ligne) : réduire
`.stats .carte .valeur` de `1.75rem` à `1.30rem` — une seule règle CSS
s'appliquant à toutes les cartes, donc la taille reste homogène partout sans
dupliquer de code.

**Prochaine étape**

Continuer la version vanilla (ex: page TMA) ou passer à la migration React —
à décider avec Nicolas.

---

## 2026-07-09 — Étape 1 (suite) : page TMA, cartes, et bandeau commun

**Ce qui a été fait**

- Ajout de `tma.html` / `data-tma.js` / `script-tma.js` : même exercice que la
  page des lots, appliqué aux TMA (8 demandes fictives couvrant les 8 statuts
  de la machine à états). `formatMontant` extrait dans `utils.js` pour être
  partagé entre les deux pages plutôt que dupliqué.
- Cartes de stats TMA ajustées sur demande de Nicolas : carte **"Validées"**
  (regroupe `valide` + `travaux` + `termine`, volontairement sans `facture`),
  **"En cours"** (`demande`/`etude`/`chiffre`), **"Refusées"** (`refuse`), et
  **"Montant validé"** recalculé sur le même regroupement que "Validées".
  Ordre des boutons de filtre ajusté (Validé/Refusé après Facturé).
- Nicolas a lui-même réordonné les cartes dans le HTML généré (Total avant
  Validées) — ajustement mineur, gardé tel quel.
- Uniformisation du bandeau sur les deux pages : nom du programme (gras) +
  adresse, désormais remplis dynamiquement via une fonction partagée
  `afficherEntete()` (déplacée dans `utils.js`), avec les données du
  programme extraites dans `data-programme.js` (évite la duplication entre
  `data.js` et `data-tma.js`). Correction au passage : la page TMA affichait
  par erreur le nom du programme à la place de l'adresse.
- Ajout d'un vrai titre de page centré par page (balise `<h1>` sémantique,
  distinct du bandeau qui n'est plus un `<h1>`) : "Tableau de bord des lots"
  et "Travaux Modificatifs Acquéreurs". Discussion sur le vocabulaire
  (bandeau/masthead vs titre de page) et sur la bonne pratique HTML d'un seul
  vrai `<h1>` par page.
- Nicolas gère ses propres commits via VSCode au fur et à mesure (voir
  mémoire `feedback-git-workflow`) — je me contente de signaler les bons
  points de commit sans exécuter Git moi-même.

**Étape 2 amorcée puis mise en pause**

Le lancement de `npm create vite@latest client` (démarrage de la migration
React) a été annoncé mais interrompu par Nicolas pour d'abord corriger
l'affichage du bandeau/titre ci-dessus. **La migration React n'a donc pas
encore démarré** — c'est le point de reprise pour la prochaine session.

**Remarque en attente**

Nicolas a signalé que le bandeau devra accueillir des informations
supplémentaires plus tard (nature non précisée) — à clarifier avec lui avant
de le retravailler.

**Prochaine étape (session suivante)**

Démarrer réellement l'étape 2 : `npm create vite@latest client -- --template
react` dans le dossier du projet (via WSL), puis mise en place de React
Router et Sass, et portage des deux pages vanilla en composants React.

---

## 2026-07-10 — Étape 2 : démarrage de la migration React

**Ce qui a été fait**

- Scaffold du projet React avec Vite dans `client/` (`npm create vite@latest
  client -- --template react`), installation de `react-router-dom` et `sass`.
- Correctif d'environnement : le serveur de dev Vite (lancé dans WSL) ne
  détectait pas les modifications de fichiers faites côté Windows (`/mnt/c/...`).
  Ajout de `server.watch.usePolling: true` dans `vite.config.js` — nécessaire
  tant que le projet reste sur le disque Windows et le serveur dans WSL.
- **Apprentissage progressif de React**, avec un fichier de démo temporaire
  dans `App.jsx` (composant, JSX, props, `useState`, listes avec `.map()` +
  `key`), avant de toucher au vrai code du projet. Un exercice pratique
  (composant `ListeCouleurs` réutilisable via une prop) et un petit quiz de
  révision ont été faits en cours de route.
- Nouvelle fiche de révision technique créée : `docs/concepts-techniques.md`
  (résumés courts de chaque notion de code vue, vanilla + React), tenue à jour
  au fil des sessions — pendant du glossaire métier mais pour le code.
- **Mise en place de Sass** : `client/src/styles/_variables.scss` (variables
  de couleur + une map `$couleurs-statut`) et `main.scss` (reprise du CSS de
  `vanilla/style.css`, avec imbrication des règles et une boucle `@each` pour
  générer les classes `.badge.xxx` au lieu de les écrire à la main).
- **Mise en place de React Router** : `BrowserRouter` dans `main.jsx`, routes
  définies dans `App.jsx` (`/` → page Lots, `/tma` → page TMA), composant
  partagé `Layout.jsx` (bandeau + `<Outlet />`), `Bandeau.jsx` avec des
  `NavLink` (classe `active` automatique, remplace la gestion manuelle de la
  classe `actif` en JS qu'on avait en vanilla). Testé et fonctionnel : la
  navigation entre les deux pages ne recharge plus la page.
- Composants réutilisables créés : `Badge.jsx`, `StatCard.jsx`,
  `FiltreStatuts.jsx` (ce dernier introduit le principe de **composant
  contrôlé** : il ne possède pas la donnée `actif`, il la reçoit en prop et
  délègue les changements à son parent via `onChange`).

**Décision de méthode de travail**

Nicolas a demandé à être guidé avec des explications systématiques et
détaillées à chaque fichier/concept nouveau (pas d'enchaînement de plusieurs
fichiers sans pause), et des exercices pratiques à certains points d'étape.
Il a aussi rappelé que les points de commit Git et les mises à jour de
documentation doivent être signalés/faits **sans qu'il ait à le demander** —
voir mémoire `feedback-git-workflow` et `feedback-documentation-pedagogique`.

**Prochaine étape**

Finaliser `pages/Lots.jsx` (assemblage des composants + données + filtre),
puis faire de même pour `pages/Tma.jsx`.

---

## 2026-07-10 — Étape 2 : pages Lots et TMA finalisées (parité avec vanilla)

**Ce qui a été fait**

- `pages/Lots.jsx` assemblé et testé : cartes de stats, filtre par statut
  (composant contrôlé), tableau des lots — réutilise `StatCard`, `Badge`,
  `FiltreStatuts`. Construction de la liste des boutons de filtre à partir de
  `STATUTS_LOT` via `Object.entries(...).map(...)` + spread (`...`), plutôt
  que recopiée à la main.
- `pages/Tma.jsx` assemblé sur le même principe (réutilisation directe des
  mêmes composants — bénéfice concret de les avoir extraits). Point notable :
  la `key` des lignes ne peut pas être `tma.lot` seul (plusieurs TMA peuvent
  partager le même lot) → combinaison `` `${tma.lot}-${index}` `` en
  attendant un vrai identifiant unique (`_id` Mongo) à l'étape 3.
- Les deux pages testées dans le navigateur : affichage, filtres, et
  navigation Lots ↔ TMA sans rechargement, conformes à la version vanilla.
- Nettoyage des fichiers de démo Vite non utilisés (`assets/react.svg`,
  `vite.svg`, `hero.png`, `public/icons.svg`), et correction du titre d'onglet
  ("client" → "Gestion VEFA") et de la langue HTML (`en` → `fr`), restés au
  défaut du template Vite.

**Résultat**

L'étape 2 atteint la parité fonctionnelle avec la version vanilla de l'étape
1 (mêmes deux pages, mêmes données fictives, même logique d'affichage), cette
fois avec une vraie architecture en composants réutilisables et un routage
sans rechargement de page.

**Prochaine étape**

À discuter avec Nicolas : poursuivre/enrichir la version React (ex: pages
supplémentaires, animations, etc.) ou enchaîner sur l'étape 3 (back-end
Express + MongoDB).

---

## 2026-07-10 — Étape 3 : démarrage du back-end (Express + MongoDB Atlas)

**Ce qui a été fait**

- Choix d'hébergement MongoDB tranché avec Nicolas : **MongoDB Atlas**
  (cloud, offre gratuite M0) plutôt qu'une installation locale dans WSL —
  cohérent avec la solution déjà prévue pour le déploiement final
  (`decisions.md`), pas de migration à refaire plus tard.
- Création pas à pas du compte Atlas, du cluster gratuit ("Nico"), de
  l'utilisateur de base de données, et récupération de la chaîne de
  connexion — guidé étape par étape dans le chat (Nicolas découvrait
  l'interface Atlas).
- `.gitignore` créé à la racine du projet (n'existait pas encore), avec
  règle `.env` en tout premier — **avant** même la création du fichier
  `server/.env` contenant le mot de passe, pour ne jamais risquer de le
  commiter par erreur. Vérifié explicitement avec `git add --dry-run` :
  `server/.env` apparaît bien dans les fichiers ignorés.
- `server/.env.example` (modèle sans secret, commité) + `server/.env` (réel,
  jamais commité) créés avec `MONGODB_URI` et `PORT=4000`. Une erreur de
  copier-coller a été corrigée en cours de route (chevrons `< >` gardés
  autour du mot de passe par erreur).
- Scaffold du serveur : `npm init`, dépendances `express`, `mongoose`,
  `dotenv`, `cors`, `nodemon` (dev). `"type": "module"` ajouté au
  `package.json` pour utiliser `import`/`export`, comme côté React — pas
  besoin d'apprendre la syntaxe CommonJS (`require`) en plus.
- `server/index.js` : connexion Mongoose à Atlas, middlewares `cors()` et
  `express.json()`, une route de test (`GET /`). Serveur démarré uniquement
  une fois la connexion à la base confirmée (pas avant). Testé avec succès :
  connexion à MongoDB confirmée en console, route de test répond bien dans le
  navigateur (`http://localhost:4000/`).

**Prochaine étape**

Implémenter les schémas Mongoose définitifs (`docs/schema-donnees.md` :
Programme, Lot, Acquereur, AppelDeFonds, TMA, TmaEntreprise, Utilisateur),
puis les premières routes REST pour que le front React puisse remplacer ses
données fictives codées en dur par de vraies données servies par l'API.

---

## 2026-07-10 — Étape 3 (suite) : les 7 modèles Mongoose

**Ce qui a été fait**

Implémentation dans `server/models/` des 7 collections définies dans
`docs/schema-donnees.md` : `Programme.js` (reprise quasi telle quelle de
l'exemple déjà écrit dans la doc, avec les paramètres embarqués et leurs
valeurs par défaut), `Lot.js` (première vraie **référence** `ObjectId` +
`ref`), `Acquereur.js` (sous-schéma `Contact` réutilisé pour `banque` et
`courtier`, validation email par regex), `AppelDeFonds.js`, `Tma.js`
(machine à états en `enum`), `TmaEntreprise.js`, `Utilisateur.js`
(`unique: true` sur l'email).

**Point de vigilance noté** : un `enum` Mongoose empêche seulement une valeur
hors-liste, il ne garantit pas l'ordre des transitions (ex: rien n'empêche au
niveau du schéma de passer de `demande` à `facture` directement). Cette
règle métier devra être vérifiée dans le code des routes, pas dans le
schéma — prévu pour l'étape 4.

**Prochaine étape**

Écrire un script de "seed" (remplissage initial de la base avec les données
fictives, à la place de celles codées en dur dans `client/src/data/`), puis
les premières routes REST (`GET /api/lots`, `GET /api/tma`...).

---

## 2026-07-10 — Étape 3 (suite) : script de seed, base peuplée

**Ce qui a été fait**

- `server/seed.js` : connecte à MongoDB, vide les collections existantes,
  puis recrée un programme, ses 8 lots, 5 acquéreurs et 8 TMA à partir des
  mêmes données fictives que la version React (`client/src/data/`).
  Introduction de `async`/`await` (équivalent de `.then()/.catch()`, mais
  s'écrit comme du code séquentiel classique), `Promise.all(...)` (plusieurs
  opérations en parallèle), `Object.fromEntries(...)` pour construire un
  dictionnaire de correspondance référence → document après insertion, et
  `Model.insertMany(...)`.
- **Bug corrigé en cours de route** : `prenom: ''` (chaîne vide) échouait la
  validation `required: true` de Mongoose — une chaîne vide n'est **pas**
  considérée comme "remplie" pour un champ `String`, contrairement à
  l'intuition.
- **Correction de modélisation demandée par Nicolas** : "M. et Mme Duprat"
  n'est pas un prénom, c'est une civilité + un nom. Ajout d'un champ
  `civilite` (enum `M.`/`Mme`/`M. et Mme`) sur `Acquereur`, distinct de
  `prenom`/`nom`, avec des données fictives d'acquéreurs réalistes (prénom
  et nom séparés proprement). Schéma mis à jour dans `server/models/Acquereur.js`
  et dans `docs/schema-donnees.md` (les deux gardés synchronisés).
- Script testé avec succès : `node seed.js` (ou `npm run seed`) recrée la
  base à chaque exécution (8 lots, 5 acquéreurs, 8 TMA).

**Prochaine étape**

Écrire les premières routes REST (`GET /api/lots`, `GET /api/tma`...) pour
que le front React puisse remplacer ses données fictives codées en dur par
de vraies données servies par l'API.

---

## 2026-07-10 — Étape 3 (suite) : premières routes REST

**Ce qui a été fait**

- `server/routes/` créé, avec un `Router` Express par thème :
  `programme.js` (`GET /api/programme`), `lots.js` (`GET /api/lots`),
  `tma.js` (`GET /api/tma`, avec `.populate('lot', ...)` et
  `.populate('acquereur', ...)` pour renvoyer les vraies données liées plutôt
  que de simples identifiants). Branchés sur `index.js` via `app.use('/api/...', routeur)`.
  Chaque route protégée par un `try/catch` (une erreur pendant un `await` ne
  doit jamais laisser une requête sans réponse).
- **Bug corrigé, même famille que le souci Vite/nodemon de tout à l'heure
  mais différent** : `.populate('acquereur', ...)` échouait
  ("Schema hasn't been registered for model Acquereur") car aucun fichier
  du chemin de démarrage du serveur n'importait jamais `models/Acquereur.js`
  (seul `seed.js`, qui ne tourne pas en même temps que le serveur, l'utilisait).
  Corrigé en important **tous** les modèles une seule fois au démarrage de
  `index.js`, plutôt que de dépendre de quel fichier de route importe quel
  modèle — évite que le bug ne revienne à chaque nouvelle route utilisant
  `.populate(...)`.
- **Autre bug d'environnement corrigé** : `nodemon` ne redémarrait pas non
  plus à la modification des fichiers (même cause que Vite : WSL ne reçoit
  pas les notifications de modification faites côté Windows). Corrigé avec
  le flag `--legacy-watch` dans le script `dev` de `package.json`.
- Les trois routes testées avec succès dans le navigateur : `/api/lots`
  (8 lots), `/api/tma` (8 TMA avec lot et acquéreur détaillés).

**Prochaine étape**

Brancher le front React sur cette API (remplacer les imports de
`client/src/data/*.js` par des appels `fetch` dans les pages `Lots`/`Tma`),
puis supprimer les données codées en dur une fois la bascule confirmée.

---

## 2026-07-10 — Étape 3 (suite) : React branché sur l'API

**Ce qui a été fait**

- Introduction de `useEffect` (exécuter du code à l'apparition d'un
  composant, avec le tableau de dépendances `[]` pour ne le faire qu'une
  fois) combiné à `fetch` pour aller chercher les données côté serveur.
- `client/.env` (`VITE_API_URL`) + `src/config.js` : adresse de l'API
  centralisée, pas codée en dur dans chaque fichier. Rappel de la règle Vite
  : seules les variables préfixées `VITE_` sont exposées au code du
  navigateur.
- `pages/Lots.jsx` et `pages/Tma.jsx` branchés sur `/api/lots` et `/api/tma`
  (états `chargement`/`erreur` gérés, retours anticipés pendant le
  chargement). `Bandeau.jsx` branché sur `/api/programme`.
- Simplification permise par l'API : `montantClient` est déjà calculé côté
  serveur (plus besoin de `calculerMontantClient` côté front), et chaque
  document a un vrai `_id` MongoDB (le compromis de `key` combinant
  `lot`+`index` en TMA n'est plus nécessaire). `client/src/data/lots.js` et
  `tma.js` ne gardent plus que les constantes d'affichage (libellés,
  regroupements de statuts) ; `data/programme.js` n'est plus utilisé
  (à supprimer une fois totalement confirmé).
- **Décision métier révisée** : le statut `facture` est reclassé dans "En
  cours" (pas "Validées") — le client n'a pas encore donné son accord final
  au moment de la facturation. Ça a révélé une incohérence dans la machine à
  états documentée (`valide` était placé avant `facture`, ce qui n'avait pas
  de sens : la facture/devis est envoyée **avant** le retour signé du
  client). Ordre corrigé partout : `chiffre → facture → valide → travaux`
  (`docs/schema-donnees.md`, `server/models/Tma.js`).

**Prochaine étape**

Supprimer les données codées en dur devenues inutiles dans
`client/src/data/` (`LOTS`, `PROGRAMME`), une fois la bascule sur l'API
définitivement confirmée dans le navigateur.

**Confirmé et nettoyé** : les trois pages (bandeau, Lots, TMA) testées avec
succès sur les vraies données de l'API. `client/src/data/programme.js`
supprimé (plus aucune référence). `lots.js`/`tma.js` ne gardent que les
constantes d'affichage.

**Prochaine étape**

Étape 4 (logique métier avancée) ou routes d'écriture (POST/PUT) pour
pouvoir créer/modifier des lots et TMA depuis l'interface plutôt que
seulement les lire — à discuter avec Nicolas.

---

## 2026-07-10 — Étape 3 (suite) : TVA/HT, et refonte des cartes de stats

**Ce qui a été fait**

- **TTC/HT clarifié** (jusqu'ici jamais tranché) : tous les montants stockés
  restent en TTC (référence unique), un nouveau paramètre
  `programme.parametres.tauxTva` (défaut 20%, modifiable) permettra de
  calculer le HT à la volée plus tard (exports, saisie de devis entreprises)
  — jamais stocké, même principe que les échéances. Documenté dans
  `docs/schema-donnees.md` ("TTC / HT et TVA").
- **Page TMA** : la carte "Montant validé" unique était trompeuse (mélangeait
  le coût entreprises et le prix client, deux montants différents) → séparée
  en "Montant validé (entreprises)" / "Montant validé (clients)", plus une
  nouvelle carte "Marge" (= client − entreprises). Cartes réorganisées en
  deux lignes distinctes (comptages / montants), via deux sections `.stats`
  plutôt qu'une seule grille à retour à la ligne automatique — plus robuste
  quelle que soit la largeur d'écran.
- **Page Lots** : bug repéré par Nicolas — la carte "Options" manquait
  (total 8 mais seulement 6 en additionnant Actés+Réservés+Libres). Ajoutée,
  et la même réorganisation en deux lignes appliquée : comptages (Total,
  Actés, Réservés, Options, Libres) puis CA par statut (Acté, Réservé,
  Options, Libre) — plus seulement "CA acté" isolé.

**Prochaine étape**

Étape 4 (logique métier avancée) ou routes d'écriture (POST/PUT) — à
discuter avec Nicolas.

---

## 2026-07-10 — Étape 3 (suite) : première route d'écriture, changement de statut TMA

**Ce qui a été fait**

- Introduction de `PATCH` (modifier partiellement une ressource), avec une
  machine à états codée en dur côté serveur (`TRANSITIONS_AUTORISEES` dans
  `models/Tma.js`) — un `enum` seul ne suffit pas à empêcher de sauter une
  étape. Route `PATCH /api/tma/:id/statut` testée avec succès en ligne de
  commande (transition autorisée acceptée, transition invalide rejetée avec
  message clair) avant de toucher à l'interface.
- **Pivot important suite à une remarque de Nicolas** : une première version
  affichait un bouton par transition possible (toute la mécanique de
  progression du statut cliquable à la main). Nicolas a fait remarquer que
  c'est contraire à la logique du fichier Excel d'origine, où le statut se
  déduisait **automatiquement des dates saisies**, jamais cliqué à la main —
  risque d'oubli si un client "doit penser à cliquer". Décision : la colonne
  "Actions" ne garde qu'un bouton **"Refuser"** (la seule chose qui ne peut
  pas se déduire d'une date, puisque c'est une décision). Le calcul
  automatique du statut à partir des dates (comme Excel) est repoussé à
  l'étape 4, quand les vrais formulaires de saisie de dates existeront.
- **Bug visuel corrigé** : `display: flex` sur la cellule `.actions`
  perturbait l'alignement des bordures du tableau (lignes décalées) —
  retiré, plus nécessaire avec un seul bouton par ligne.
- **Cas limite identifié par Nicolas** : un refus par erreur ne doit pas
  forcer à reprendre tout le processus depuis "demande" (perte du travail de
  chiffrage déjà fait si le refus intervient au stade "facture"). Ajout du
  champ `statutAvantRefus` (mémorisé au moment du refus) et d'une route
  dédiée `PATCH /api/tma/:id/annuler-refus` qui restaure exactement l'étape
  quittée — testé en ligne de commande (refus depuis "chiffre" → annulation
  → retour précis à "chiffre", pas "demande").
- Le tout branché et testé côté React (`changerStatut`, `annulerRefus`,
  boutons conditionnels selon le statut courant).

**Prochaine étape**

Étape 4 (calcul automatique du statut TMA à partir des dates, à la manière
d'Excel) ou logique des appels de fonds — à discuter avec Nicolas.

---

## 2026-07-10 — Étape 4 : calcul automatique du statut TMA depuis les dates

**Ce qui a été fait**

- `calculerStatutAutomatique()` (`server/models/Tma.js`) : reproduit la
  logique de la formule Excel d'origine (`docs/analyse-excel.md`), adaptée
  au nouvel ordre `chiffre → facture → valide`. Ne couvre que la portion
  "pilotée par les dates" du cycle (`demande` à `valide`) — `travaux`/`termine`
  restent manuels (pas de date correspondante dans le modèle actuel),
  `refuse` aussi (décision, pas fait constaté).
- Nouvelle route `PATCH /api/tma/:id/dates` : met à jour
  `dateEnvoiEntreprises`/`montantEntreprises`/`dateEnvoiFactureClient`/`dateRetourClient`,
  recalcule automatiquement le statut (sauf si déjà `travaux`/`termine`/`refuse`,
  pour ne pas faire "reculer" une TMA déjà avancée manuellement). Testée en
  ligne de commande, progression complète vérifiée :
  demande → étude → chiffré → facturé → validé, une étape à la fois.
- **Factorisation** : `calculerMontantClient()` déplacée de `seed.js` vers
  `models/Tma.js` (exportée), réutilisée aussi dans la nouvelle route — évite
  la duplication, et corrige un oubli (`montantClient` n'était pas recalculé
  quand `montantEntreprises` changeait via la nouvelle route).
- **Formulaire React** : nouveau composant `FormulaireDatesTma.jsx` — un
  formulaire "différé" (les champs se remplissent localement, un seul envoi
  au clic sur "Enregistrer", contrairement aux boutons de filtre qui
  envoient immédiatement). Affiché comme une ligne de tableau supplémentaire
  (`<td colSpan={8}>`) sous la ligne concernée, via un bouton "Modifier les
  dates" — cache automatiquement quand le statut n'est plus "recalculable"
  (`travaux`/`termine`/`refuse`).
- Testé avec succès dans le navigateur : remplir "Date envoi entreprises"
  fait passer une TMA de "Demande" à "Étude" sans bouton de statut dédié.

**Prochaine étape**

Logique des appels de fonds (barème, déclenchement sur attestation MOE +
statut Acté), ou création de nouvelles TMA/lots depuis l'interface — à
discuter avec Nicolas.

---

## 2026-07-10 — Étape 4 (suite) : détail par entreprise pour une TMA

**Ce qui a été fait**

- Nouvelle route `server/routes/tmaEntreprises.js` (`GET
  /api/tma-entreprises?tma=<id>`, `POST`, `DELETE /:id`) : gère les lignes
  `TmaEntreprise` (corps de métier + entreprise + devis), déjà modélisées
  mais jamais branchées jusqu'ici (répond au manque identifié par Nicolas :
  "il reste à intégrer la notion de plusieurs entreprises pour une même
  TMA").
- **Règle métier ajoutée par Nicolas en cours de route** : le passage au
  statut "Chiffré" (et le remplissage de `montantEntreprises`) n'a lieu que
  si **toutes** les entreprises sollicitées ont répondu — une seule encore
  en attente doit garder la TMA à "Étude", même si les autres ont déjà
  répondu. Testé en ligne de commande : 2 réponses sur 3 → reste "Étude" et
  montant à `null` ; la 3ᵉ réponse arrivée → passage à "Chiffré" avec la
  somme complète.
- **Bug latent découvert et corrigé** : les données de seed fixaient un
  statut "en dur" (ex: `etude`) sans les dates qui auraient dû
  logiquement l'accompagner. Dès qu'un recalcul automatique intervenait
  (ex: ajout d'une ligne entreprise), la TMA "reculait" vers `demande`
  faute de dates cohérentes. Corrigé en ajoutant des dates réalistes à
  chaque TMA du seed, cohérentes avec le statut visé.
- Composant React `DetailEntreprisesTma.jsx` : liste des lignes d'une TMA
  (avec bouton "Retirer" par ligne) + petit formulaire d'ajout, sur le même
  principe de ligne de tableau dépliable que `FormulaireDatesTma.jsx`.
  Notifie le parent (`onChangement`) pour rafraîchir toute la liste après
  chaque ajout/suppression, puisque le montant/statut de la TMA parente
  change côté serveur.
- Testé avec succès dans le navigateur : ajout de plusieurs entreprises,
  recalcul automatique du montant total et du statut visibles en direct.

**Prochaine étape**

Logique des appels de fonds (barème, déclenchement sur attestation MOE +
statut Acté), ou création de nouvelles TMA/lots depuis l'interface — à
discuter avec Nicolas.

---

## 2026-07-10 — Point d'arrêt de session

Nicolas a demandé une pause pour lister des points à clarifier/améliorer sur
ce qui a été fait aujourd'hui (étapes 3 et 4 : back-end Express/MongoDB
complet côté lecture, machine à états TMA, calcul automatique du statut,
détail multi-entreprises). Rien d'identifié dans ce message précis — la
liste sera donnée à la reprise. Pas de nouvelle étape commencée entre-temps.

**Prochaine étape**

Reprendre avec les points de clarification/amélioration de Nicolas, avant de
continuer vers les appels de fonds ou de nouvelles routes d'écriture.

---

## 2026-07-10 — Trois points d'amélioration actés (non codés)

Nicolas a listé trois besoins, consignés en détail dans
`docs/schema-donnees.md` ("Décisions du 10/07/2026") pour ne pas les
oublier, mais **pas encore implémentés** :

1. **Référentiel `Entreprise`** : nouvelle collection (nom, corps de
   travaux, coordonnées via le sous-document `Contact` déjà existant) —
   remplace le texte libre actuel sur `TmaEntreprise.entreprise` par une
   liste déroulante. Objectif cité : notamment un futur export des TMA
   envoyé directement aux entreprises.
2. **Page "Paramètres"** : nouvelle route React `/parametres`, pour éditer
   tout ce qui est aujourd'hui dans `programme.parametres` sans interface
   (barème, délais, marge, étages, entreprises...). Nécessite une route
   `PATCH /api/programme` (actuellement lecture seule). À réserver aux
   rôles admin/gestionnaire une fois l'authentification JWT posée.
3. **Deux nouvelles alertes** : entreprise n'ayant pas chiffré à temps
   (nécessite d'ajouter `TmaEntreprise.dateEnvoi`), et client n'ayant pas
   répondu à une facture TMA (nécessite un nouveau paramètre
   `delaiReponseFactureTmaJours`, absent pour l'instant).

**Prochaine étape**

À la reprise : choisir par quel point commencer (référentiel Entreprise,
page Paramètres, ou les alertes), avec Nicolas.

---

## 2026-07-10 — Point 1 réalisé : référentiel `Entreprise`

**Ce qui a été fait**

- Sous-schéma `Contact` extrait dans `server/models/contactSchema.js`
  (n'existait qu'à l'intérieur de `Acquereur.js`), réutilisé pour le nouveau
  modèle `Entreprise` (`nom`, `corpsDeTravaux`, `contact`).
- `TmaEntreprise.entreprise` passe d'un `String` libre à une référence
  `ObjectId → Entreprise`. `corpsDeTravaux` reste sur `TmaEntreprise` mais
  devient une **copie figée** (récupérée automatiquement depuis
  l'entreprise choisie au moment de la création, pas resaisie à la main) —
  même principe que `AppelDeFonds.phase`.
- Ajout au passage de `TmaEntreprise.dateEnvoi` (nécessaire pour l'alerte
  "entreprise n'a pas répondu à temps" du point 3, pas encore construite
  mais le terrain est prêt).
- Nouvelles routes `GET`/`POST /api/entreprises`. Testées en ligne de
  commande : création d'une ligne `TmaEntreprise` par référence, vérifié
  que `corpsDeTravaux` est bien recopié automatiquement et que
  `.populate('entreprise')` renvoie le détail complet.
- `seed.js` enrichi avec 6 entreprises fictives, reprenant les corps de
  métier repérés dans le fichier Excel de référence analysé en tout début
  de projet (LAPIX/GROS OEUVRE, ITOIZ/CHARPENTE, etc. — clin d'œil à
  l'analyse du 09/07).
- Formulaire React (`DetailEntreprisesTma.jsx`) mis à jour : liste
  déroulante des entreprises (au lieu de deux champs texte libres),
  chargée en parallèle des lignes déjà existantes via `Promise.all`.
  Testé avec succès dans le navigateur.

**Prochaine étape**

Page "Paramètres" (point 2) ou les deux nouvelles alertes (point 3) — à
discuter avec Nicolas. Le terrain du point 3 (côté entreprise) est déjà
posé avec `TmaEntreprise.dateEnvoi`.

---

## 2026-07-10 — Pause sur `TmaEntreprise` : `dateRetour` + édition de ligne

**Ce qui a été fait**

Nicolas a demandé une pause sur "Paramètres" pour ajouter un champ de suivi
sur `TmaEntreprise` :

- `dateRetour` ajoutée au modèle — **saisie manuelle**, pas déduite
  automatiquement (contrairement à d'autres dates de l'appli) : décision
  explicite de Nicolas.
- Ça a révélé un manque : aucune route ne permettait de **modifier** une
  ligne `TmaEntreprise` existante (seulement créer/supprimer) — impossible
  de renseigner le devis d'une entreprise en attente sans supprimer/recréer
  la ligne. Ajout de `PATCH /api/tma-entreprises/:id`, qui passe aussi le
  statut de la ligne à `recu` dès qu'un montant est renseigné.
- Nouveau composant React `LigneEntreprise.jsx` : bascule entre affichage et
  mode édition selon son propre `state` (`enEdition`), permet de saisir
  montant + date de retour a posteriori sur une ligne déjà créée.
- **Bug rencontré et corrigé** : `App.jsx` importait déjà `./pages/Parametres.jsx`
  (ajouté juste avant la pause) mais le fichier n'avait jamais été créé —
  page blanche sur toute l'application (erreur de build Vite, pas un bug
  d'exécution). Corrigé avec une version minimale du fichier en attendant de
  vraiment construire cette page.
- **Nettoyage demandé par Nicolas** : le champ "Montant entreprises" dans
  "Modifier les dates" n'avait plus lieu d'être, devenu redondant/conflictuel
  avec le calcul automatique via les lignes `TmaEntreprise`. Retiré du
  formulaire ET de la route `PATCH /api/tma/:id/dates` (qui ne touche plus du
  tout à `montantEntreprises`/`montantClient`, entièrement pilotés par
  `routes/tmaEntreprises.js` désormais).

**Prochaine étape**

Reprendre la page "Paramètres" (point 2), interrompue par cette pause.

---

## 2026-07-10 — Petits réglages visuels du bandeau

- Lien "Paramètres" poussé à droite du bandeau (`margin-left: auto` sur un
  conteneur flex), séparé de "Lots"/"TMA".
- Effet de survol ajouté sur les liens de navigation (transition douce de
  couleur/bordure).
- Espacement augmenté entre les cartes de stats et les filtres sur les pages
  Lots/TMA — **piège rencontré** : un premier essai avec `margin-top` sur
  `.filtres` n'a eu aucun effet visible à cause de la fusion des marges
  verticales (CSS ne garde que la plus grande des deux marges voisines,
  ne les additionne pas). Corrigé en utilisant `padding-top` à la place, qui
  ne fusionne jamais avec les marges des éléments voisins.

**Prochaine étape**

Reprendre la construction des sections de la page "Paramètres".

---

## 2026-07-10 — Retours PDF, bug code postal, et relation Lot ↔ Acquereur

**Ce qui a été fait**

- Deux documents PDF de remarques ("Remarques sur le paramétrage des
  programmes et interfaces", version étendue avec `Synthese programme.pdf`
  en référence visuelle) transmis par Nicolas, couvrant Paramètres, Lots,
  TMA et une nouvelle interface Clients. Liste consignée en tâches, à
  traiter point par point.
- **Décision actée** : la colonne "Nom client" (texte libre) de la future
  page Lots devient un petit champ civilité + nom, qui crée ou lie un vrai
  `Acquereur` plutôt que de rester du texte libre déconnecté des données.
- **Bug "Code postal" résolu** : un attribut `pattern` HTML
  (`pattern="\\d{5}"`) semblait ne jamais accepter une saisie corrigée. Un
  script de diagnostic (lecture directe du fichier + test de la regex
  réellement produite) a confirmé que l'échappement était correct — la
  cause exacte côté navigateur n'a pas été identifiée, mais plutôt que
  continuer à la chercher, la validation `pattern` HTML a été remplacée par
  une validation JavaScript explicite (regex + `alert()`, puis affinée en
  message inline sous le champ, voir plus bas). Bug et raisonnement
  consignés dans le nouveau fichier `docs/bugs.md`.
- **Nouveau fichier `docs/bugs.md`** créé : journal dédié aux bugs
  rencontrés (symptôme / cause / correction / leçon), distinct du journal
  chronologique — pensé pour être relu facilement en entretien.
- **UX formulaire Entreprises** : les `alert()` de validation (téléphone,
  commune, code postal, email) remplacés par des messages d'erreur inline
  sous chaque champ (état React `erreurs`), avec la même classe `.invalide`
  (bordure rouge) que le champ téléphone — cohérence visuelle.
- **Modèle `Lot`** : ajout de `acquereur` (ObjectId → `Acquereur`, relation
  inverse de `Acquereur.lots`) et `commentaire` (String libre). Le cas rare
  d'indivision (plusieurs acquéreurs pour un lot) reste couvert par
  `Acquereur.lots` mais n'aura pas d'interface dédiée pour l'instant.
  `seed.js` mis à jour pour renseigner cette relation inverse sur les
  données fictives existantes.
- **Modèle `Acquereur`** : `prenom` n'est plus `required` — la création
  rapide d'un acquéreur depuis la page Lots (civilité + nom seulement) ne
  fournit pas de prénom, complété plus tard depuis la page Clients.
- **Nouvelles routes `server/routes/acquereurs.js`** : `GET /api/acquereurs`
  (liste triée), `POST` (création), `PATCH /:id` (modification partielle).
- **Routes `lots.js` complétées** : `POST /api/lots` (création technique
  d'un lot, toujours "libre" et sans acquéreur au départ — servira à la
  future section Paramètres > Lots) et `PATCH /api/lots/:id` (modification
  partielle : caractéristiques techniques, statut, dates, commentaire, et
  liaison acquéreur via `acquereur` (ID existant) ou `acquereurNouveau`
  (`{civilite, nom}`, création à la volée) — les deux mettent à jour
  `Acquereur.lots` en retour pour garder la relation cohérente dans les
  deux sens). `GET /api/lots` peuple désormais `acquereur`. Toutes les
  routes testées en ligne de commande (liaison, création à la volée,
  déliaison, synchronisation vérifiée dans les deux sens).
- **Petites corrections TMA > Entreprises** (remontées par Nicolas en cours
  de route) : le champ "Date de réception" du devis n'était disponible
  qu'en modifiant une ligne déjà créée, jamais dès l'ajout — ajouté au
  formulaire d'ajout (front + route `POST /api/tma-entreprises`). Le
  `<select>` "Entreprise" n'était pas stylé du tout (contrairement aux
  `input`), ce qui le faisait paraître plus petit que "Montant devis" —
  corrigé (style commun + largeur minimale).
- **Fausse alerte clarifiée** : Nicolas a signalé des entreprises supprimées
  qui "revenaient" après navigation — cause identifiée : deux exécutions de
  `node seed.js` faites en parallèle pour tester `Lot.acquereur`, qui
  réinitialisent toute la base pendant que Nicolas testait manuellement en
  parallèle. Pas un bug de l'application ; retenu comme point de vigilance
  (ne plus relancer `seed.js` sans prévenir pendant une session de test).

**Prochaine étape**

Section Paramètres > Lots (création/édition des caractéristiques
techniques d'un lot), puis restructuration de la page Lots elle-même.

---

## 2026-07-10 — Section Paramètres > Lots, et affinage suite à deux PDF

**Ce qui a été fait**

- Nouvelle section **Paramètres > Lots** (`SectionLots.jsx`/`LigneLot.jsx`,
  sur le même principe édition-en-ligne que `SectionEntreprises.jsx`) :
  création et modification des caractéristiques techniques d'un lot
  (étage, type, orientation, surfaces, prix). Nouvelles routes
  `POST`/`PATCH /api/lots/:id`.
- **Décision de modélisation notable** : la colonne "Nom client" (texte
  libre) devient un petit champ civilité + nom qui crée ou lie un vrai
  `Acquereur`. Ajout de `Lot.acquereur` (référence directe, relation
  inverse de `Acquereur.lots`) et `Lot.commentaire`. `Acquereur.prenom`
  n'est plus `required` (la création rapide ne fournit que civilité +
  nom). Nouvelles routes `server/routes/acquereurs.js`
  (`GET`/`POST`/`PATCH`). La route `PATCH /api/lots/:id` gère la liaison
  (`acquereur` existant ou `acquereurNouveau: {civilite, nom}`) et
  synchronise `Acquereur.lots` dans les deux sens. Toutes les routes
  testées en ligne de commande (liaison, création à la volée, déliaison).
- Premier PDF de remarques sur les lots (4 points) puis un second complété
  (5 points de plus) :
  - "Référence" → "N° du logement", "Caves" → "Caves / Celliers".
  - Plafond : impossible de créer plus de logements que
    `programme.nombreLogements`, vérifié côté serveur (pas seulement dans
    le formulaire).
  - Récapitulatif des lots corrigé pour afficher tous les champs remplis
    (terrasse, jardin, parkings, caves), pas seulement une partie.
  - Suppression d'un lot ajoutée (`DELETE /api/lots/:id`), avec nettoyage
    de la relation inverse `Acquereur.lots` si un acquéreur était lié.
  - **Changement de modélisation** : `parkings`/`caves` ne sont plus un
    compte (`Number`) mais des **numéros identifiants** (`[Number]`) —
    une place de parking précise, pas juste "combien". Nouveau composant
    réutilisable `ListeNumeros.jsx` (saisie en tags, même principe que la
    liste des étages). Règle métier ajoutée : un numéro de parking ou de
    cave/cellier ne peut jamais être utilisé par deux lots du même
    programme — validation côté serveur (`validerNumerosUniques`),
    testée en ligne de commande (doublon local rejeté, doublon avec un
    autre lot rejeté, numéro libre accepté).
  - Le message "nombre maximum de logements atteint" (`erreur` React) ne
    s'effaçait pas après coup quand on relevait `nombreLogements` — corrigé
    avec un `useEffect` qui vide l'erreur dès que la condition n'est plus
    vraie.
  - Nouveau message d'avertissement si moins de logements créés que le
    nombre annoncé pour le programme.
- **Nouveau fichier `docs/demandes.md`** : liste chronologique de toutes
  les demandes de Nicolas depuis le début du projet (hors détails
  d'implémentation), demandée explicitement pour garder une trace
  complète et pouvoir la reparcourir.
- Point de vigilance confirmé une seconde fois : ne pas relancer
  `node seed.js` pendant que Nicolas teste manuellement dans le
  navigateur (un lot de test "A03" créé par Nicolas a été repéré avant
  d'être nettoyé par un reseed annoncé).

**Prochaine étape**

Restructuration de la page Lots elle-même (colonnes façon "Synthèse
programme", édition en ligne du statut/client/dates), puis création de
TMA depuis l'interface et nouvelle page Clients.

---

## 2026-07-10 — Dernières remarques sur Paramètres > Lots avant pause

**Ce qui a été fait**

- Message "il manque X logement(s)..." mis en rouge (`.total-erreur`),
  pour la même cohérence visuelle que le message de plafond atteint.
- **Erreurs de doublon parking/cave affinées** : au lieu d'un message
  générique en haut de page (ou d'un `alert()` en édition), le backend
  renvoie désormais `{ champ: 'parkings' | 'caves', message }` plutôt
  qu'un message unique — ça permet au front d'afficher l'erreur en petit,
  directement sous le champ concerné (même style `.erreur-champ` que les
  autres validations inline), sans bloquer toute la page. `LigneLot.jsx`
  (mode édition) reçoit désormais le résultat de `onEnregistrer` en retour
  (au lieu d'un `alert()` déclenché par le parent) pour afficher l'erreur
  au bon endroit sans quitter le mode édition.
- **Alignement des champs "N° de parking"/"N° de cave/cellier" corrigé
  après plusieurs essais** — le vrai problème : ces champs sont plus hauts
  que les champs simples (tags + bouton en plus), et le formulaire
  utilisait `align-items: end` (aligner tous les champs par le bas). Un
  champ plus haut que ses voisins de ligne les forçait donc à descendre
  pour caler leur bas sur le sien, créant un désalignement visible
  (labels décalés, `Prix TTC` qui semblait flotter). Corrigé à la racine
  en passant `.section-parametres form` (et `.ligne-lot-edition`) en
  `align-items: start` : tous les champs démarrent désormais à la même
  hauteur (labels alignés), et seul le contenu en plus (bouton, tags,
  message d'erreur) s'étend vers le bas sans perturber les champs
  voisins — un bénéfice qui profite aussi aux messages d'erreur inline
  ailleurs dans Paramètres (ils ne décalent plus les champs voisins).
  Deux essais intermédiaires (`align-self: flex-start` seul, puis
  `flex-basis: 100%` forçant une ligne dédiée mais gaspillant l'espace)
  n'ont pas suffi avant d'identifier la bonne cause.
- **Incident "entreprises revenues" (3ᵉ occurrence)** : même cause que la
  fois précédente (`node seed.js` relancé pendant que Nicolas testait en
  parallèle), cette fois malgré une annonce préalable — l'annonce et
  l'exécution s'étant enchaînées sans laisser de fenêtre pour réagir.
  **Nouvelle règle retenue** : désormais, toujours **demander confirmation
  et attendre la réponse** avant de relancer `node seed.js`, plutôt que
  d'annoncer puis d'exécuter dans la foulée. Confirmé explicitement par
  Nicolas via un choix ("Relancer le seed maintenant"), puis base
  réinitialisée proprement.
- `README.md` mis à jour (8 collections, routes complètes, page
  Paramètres, `docs/bugs.md` et `docs/demandes.md` référencés).

**Prochaine étape**

Restructuration de la page Lots elle-même (colonnes façon "Synthèse
programme", édition en ligne du statut/client/dates), puis création de
TMA depuis l'interface et nouvelle page Clients.

---

## 2026-07-10 (suite) — Reprise : n° de lot Entreprises, bug téléphone

**Ce qui a été fait**

- **Modèle `Entreprise`** : ajout de `numeroLot` (String, saisi à la main,
  ex: "01", "02") — numérotation des lots de travaux du marché, à ne pas
  confondre avec les `Lot` (logements) du programme. Champ ajouté au
  formulaire d'ajout de `SectionEntreprises.jsx` et à l'affichage de la
  liste (`Lot 01 — GROS OEUVRE — Lapix`). Route `POST /api/entreprises`
  mise à jour pour l'accepter.
- **Bug corrigé** : le champ téléphone (`TelephoneInput.jsx`) s'affichait
  systématiquement avec sa bordure rouge "invalide", même sur un
  formulaire vide n'ayant reçu aucune saisie. Cause : l'état initial
  `complet` valait `Boolean(numeroExistant?.isValid())`, qui retombe à
  `false` quand `numeroExistant` est `undefined` (champ neuf) — traitant
  à tort "vide" comme "invalide". Corrigé en initialisant `complet` à
  `true` quand il n'y a pas de valeur existante. Détail dans `docs/bugs.md`.
- Serveur backend non démarré au moment de la reprise (arrêté depuis la
  pause précédente) — changements non re-testés en ligne de commande
  cette fois, à valider par Nicolas une fois les serveurs relancés.
- Serveurs (front + back) relancés en arrière-plan à la demande de
  Nicolas ("comment je fais pour accéder au serveur ?").

**Prochaine étape**

Restructuration de la page Lots elle-même (colonnes façon "Synthèse
programme", édition en ligne du statut/client/dates), puis création de
TMA depuis l'interface et nouvelle page Clients.

---

## 2026-07-10 (suite) — Restructuration de la page Lots

**Ce qui a été fait**

- **Page `Lots.jsx` restructurée** : nouvelle colonne **Prix/m²** (calculé
  à la volée, `prixTTC / surfaceHabitable`, jamais stocké — même principe
  que les autres valeurs dérivées de l'appli), nouvelle colonne **Date**
  (affiche la date la plus avancée déjà atteinte : acte > réservation >
  option), colonne **Client** avec bouton "Modifier" ouvrant une ligne
  d'édition dépliable (même pattern que les TMA) pour changer le statut,
  lier un acquéreur existant **ou en créer un à la volée** (civilité +
  nom, décision du point 7 des remarques), saisir les trois dates et un
  commentaire. Nouveau composant `FormulaireEditionLot.jsx`. Ligne de
  **totaux TTC/TVA/HT** en pied de tableau, recalculée selon le filtre de
  statut actif et le taux de TVA du programme.
- **Ajustements visuels** après premier retour de Nicolas ("ce n'est pas
  présenté convenable, dates n'apparaissent pas") : la colonne Date
  manquait entièrement (dates seulement éditables, jamais affichées) —
  ajoutée. Le nom du client et le bouton "Modifier" étaient collés sans
  espace (`.cellule-client` en flex avec `gap` pour corriger). La ligne
  de totaux débordait sur deux lignes (texte combiné trop long dans une
  cellule à `colSpan`) — répartie en une valeur par colonne (TTC sous
  "Prix TTC", TVA sous "Statut", HT sous "Client") pour ne plus forcer de
  retour à la ligne.
- **Bug sérieux découvert et corrigé** : page TMA totalement blanche
  (`tma.lot.reference` sur un `lot` devenu `null`). Cause : le lot "D01"
  avait été supprimé via le nouveau bouton "Retirer" de Paramètres > Lots
  alors qu'une TMA le référençait encore — `DELETE /api/lots/:id` ne
  vérifiait aucune dépendance. Corrigé à deux niveaux : la suppression
  d'un lot est désormais refusée s'il reste référencé par une TMA ou un
  appel de fonds (message explicite), et `Tma.jsx` protégé par un `?.`
  en filet de sécurité. Détail complet dans `docs/bugs.md`. Donnée
  orpheline réparée par un reseed, **confirmé par Nicolas au préalable**
  (choix explicite parmi trois options de réparation proposées).

**Prochaine étape**

Nicolas fait une pause et va transmettre une nouvelle liste de remarques.
Après ça : création de TMA depuis l'interface (bouton "Ajouter une TMA")
et nouvelle page Clients.

---

## 2026-07-10 (suite) — "Nouvelles remarques sur les interfaces" : colonnes manquantes, cohérence dates/statut, reset définitif des entreprises

**Ce qui a été fait**

- **Colonnes manquantes ajoutées** à la page Lots : Terrasse, Jardin,
  Parkings, Caves/Celliers (existaient dans le modèle et dans Paramètres >
  Lots, mais jamais affichées dans le tableau principal), et Commentaire.
- **Bug de cohérence dates/statut corrigé** — signalé par Nicolas : *"si
  un logement est réservé, je peux quand même mettre une date de
  signature d'acte"*. Ajout d'une règle (`ORDRE_STATUTS` : libre < option
  < reserve < acte) empêchant qu'une date d'étape non atteinte soit
  renseignée (ex: pas de `dateActe` si `statut` n'est pas `acte`) — côté
  serveur (`validerDatesCoherentesAvecStatut` dans `routes/lots.js`, seule
  source de vérité) **et** côté formulaire (`FormulaireEditionLot.jsx` :
  champs des étapes non atteintes désactivés, vidés automatiquement si on
  repasse à un statut antérieur). En testant, la validation a détecté une
  vraie incohérence déjà présente en base (le lot B01 avait une
  `dateActe` alors que son statut était `reserve`, résidu d'un test
  antérieur) — corrigée manuellement. Bug détaillé dans `docs/bugs.md`.
- **Colonne Client illisible** ("les textes sont trop à la ligne") :
  premier correctif — tableau en largeur libre avec défilement horizontal
  (`.tableau-scroll`) plutôt que de forcer le texte à la ligne pour tenir
  dans la largeur de l'écran (affiné ensuite, voir plus bas).
- **Paramètres > Entreprises, reset définitif** : Nicolas a signalé (déjà
  évoqué plusieurs fois) que les entreprises supprimées manuellement
  réapparaissaient de temps en temps. Cause racine identifiée cette fois :
  `seed.js` recréait systématiquement les 6 entreprises fictives à chaque
  exécution, y compris pour des reseeds motivés par d'autres collections
  (lots, TMA...) — sans lien avec un vrai bug de concurrence. Corrigé à la
  racine : `seed.js` ne touche plus du tout à la collection `Entreprise`
  (aucune dépendance trouvée : les `TmaEntreprise` du seed n'existent pas,
  seules les TMA "brutes" avec un `montantEntreprises` numérique direct
  sont seedées). Les 6 entreprises fictives existantes ont été supprimées
  une bonne fois via l'API, confirmé par Nicolas.

**Prochaine étape**

Nouveau PDF de remarques ("bis") sur l'alignement et la présentation de la
page Lots — à traiter avant de reprendre le fil (création de TMA, page
Clients).

---

## 2026-07-10 (suite) — Remarques "bis" : alignement et présentation de la page Lots

**Ce qui a été fait** (plusieurs allers-retours avec Nicolas, capture
d'écran à l'appui à chaque étape)

- **Largeur de la page Lots** : élargie *uniquement* pour le tableau, pas
  pour le reste de la page (cartes de stats, filtres) — Nicolas a
  explicitement demandé de garder les marges d'origine pour les cartes.
  Premier essai avec `main:has(.page-large)` (élargit tout `<main>`)
  abandonné car il élargissait aussi les cartes ; remplacé par la
  technique CSS dite de "pleine largeur" (`.tableau-scroll` sort du
  conteneur centré via `left: 50%` + `transform: translateX(-50%)`),
  appliquée seulement au tableau.
- **Totaux repensés en 3 lignes séparées** (Prix TTC / TVA / Prix HT) au
  lieu d'une cellule combinée, avec la valeur de chacune exactement dans
  la colonne "Prix TTC" — pour qu'elle s'aligne visuellement avec les prix
  de chaque lot au-dessus, demande explicite de Nicolas ("les € des
  totaux alignés avec les € des prix TTC"). Position du libellé ("Prix
  TTC", "TVA (20%)"...) affinée en plusieurs passes suite aux retours
  successifs : d'abord étalé sur toute la largeur (trop loin des
  montants), puis resserré entre les colonnes Parkings et Caves, puis
  finalement positionné exactement dans la colonne "Caves/Celliers" (une
  seule cellule, pas de `colSpan`), avec centrage par défaut.
- **Prix moyen au m²** ajouté aux totaux, dans la colonne "Prix/m²" —
  moyenne des prix/m² de chaque lot (pas le total TTC divisé par la
  surface totale, précision explicite de Nicolas).
- **Colonne "Action" créée** (comme sur la page TMA), en dernière
  position : le bouton "Modifier" était auparavant collé au nom du client
  dans la même cellule, jamais bien aligné d'une ligne à l'autre. Extraire
  le bouton dans sa propre colonne règle le problème définitivement.
- **Réglages de densité** : police et padding du tableau réduits (moins
  "zoomé"), cellules centrées plutôt qu'alignées à gauche (sauf ajustement
  ponctuel du libellé des totaux, voir plus haut). Colonne Client limitée
  en largeur (un seul retour à la ligne accepté, pas plus) ; largeur
  affinée à plusieurs reprises (11rem → 18rem → 13rem) au fil des retours
  sur le rendu réel. Colonne Commentaire élargie en retour (14rem minimum)
  car elle paraissait trop étroite une fois le reste resserré.

**Prochaine étape**

Reprendre la feuille de route : création de TMA depuis l'interface, puis
nouvelle page Clients.

---

## 2026-07-10 (suite) — Création de TMA depuis l'interface

**Ce qui a été fait**

- **Nouvelle route `POST /api/tma`** : crée une TMA à partir d'un lot
  sélectionné. L'acquéreur n'est pas choisi séparément — déduit du lot
  (`lot.acquereur`) et snapshotté sur la TMA à la création, même principe
  que les autres références figées du projet. Un lot sans acquéreur ne
  peut pas recevoir de TMA (rejeté avec un message clair : personne pour
  la demander). Statut de départ "demande" (valeur par défaut du schéma),
  sans dates.
- **Nouveau composant `FormulaireCreationTma.jsx`** : liste déroulante
  limitée aux lots ayant déjà un acquéreur, champs Localisation et
  Description. Bouton "Ajouter une TMA" au-dessus du tableau, sur le même
  principe toggle qu'ailleurs dans l'appli.
- **Champ "Date de la demande" ajouté** à la demande de Nicolas —
  `TMA.dateDemande` existait déjà dans le schéma depuis le tout début du
  projet mais n'avait jamais été branché nulle part (relevé comme "champ
  mort" en cours de route). Ajouté au formulaire de création et à la
  route `POST /api/tma`.
- **Mise en forme du formulaire** : champ Description élargi (`flex: 2`,
  de la place disponible inutilisée signalée par Nicolas), boutons
  "Créer"/"Annuler" sortis dans leur propre conteneur avec `align-self:
  end` (pour s'aligner sur la ligne des champs, pas sur celle des
  libellés au-dessus — piège déjà rencontré et documenté pour
  `ListeNumeros`) et `margin-left: auto` (poussés à droite).
- **Bug corrigé** : les nouvelles TMA affichaient "NaN €" dans les
  colonnes de montants. Cause : `montantEntreprises`/`montantClient`
  n'étaient pas renseignés à la création (`undefined`, pas `null`), et
  l'affichage ne testait que `=== null`. Corrigé des deux côtés : le
  serveur les initialise explicitement à `null`, et l'affichage teste
  `== null` (capture aussi `undefined`) — corrige au passage les deux TMA
  de test déjà en base sans avoir à les recréer. Détail dans `docs/bugs.md`.

**Prochaine étape**

Nouvelle page "Clients" (coordonnées complètes des acquéreurs).
