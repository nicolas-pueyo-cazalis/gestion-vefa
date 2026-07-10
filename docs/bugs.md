# Bugs rencontrés — Gestion VEFA

Journal des bugs notables rencontrés pendant le développement : symptôme,
cause réelle, correction apportée, et ce qu'on en retient. Objectif :
pouvoir les raconter facilement (par exemple en entretien d'alternance,
question classique "parle-moi d'un bug que tu as résolu").

Le détail chronologique complet de chaque session reste dans `journal.md` ;
ce fichier n'en garde que les bugs, regroupés et reformulés pour être
relus rapidement.

---

## Vite/nodemon ne détectent pas les modifications de fichiers (WSL ↔ Windows)

**Symptôme** : les serveurs de dev (Vite côté front, nodemon côté back),
lancés dans WSL, ne redémarraient/rechargeaient pas quand un fichier était
modifié depuis VSCode côté Windows (le projet reste sur le disque Windows,
`/mnt/c/...`).

**Cause** : les notifications natives de modification de fichier du système
de fichiers Windows ne traversent pas la frontière WSL — l'OS Linux dans WSL
ne les reçoit jamais.

**Correction** : forcer les deux outils à vérifier les fichiers par
sondage (polling) plutôt que d'attendre une notification : `server.watch.usePolling: true`
dans `vite.config.js`, et flag `--legacy-watch` sur `nodemon`.

**Leçon** : un environnement de dev "à cheval" entre deux OS (ici Windows +
WSL) a ses propres pièges d'infrastructure, indépendants du code applicatif.

---

## `.populate('acquereur')` échoue : "Schema hasn't been registered for model Acquereur"

**Symptôme** : une route utilisant `.populate('acquereur', ...)` plantait
avec cette erreur, alors que le modèle `Acquereur.js` existait bel et bien.

**Cause** : Mongoose n'enregistre un modèle en mémoire que lorsque son
fichier est **importé** au moins une fois. Seul `seed.js` importait
`Acquereur.js` — mais `seed.js` ne tourne jamais en même temps que le
serveur Express, donc au moment de la requête, Mongoose ne connaissait pas
ce modèle.

**Correction** : centraliser l'import de **tous** les modèles dans
`server/index.js` (point d'entrée du serveur), pour garantir qu'ils sont
tous enregistrés dès le démarrage, indépendamment de qui les utilise
ensuite.

**Leçon** : en Mongoose, "le fichier existe" ≠ "le modèle est actif" — c'est
l'import qui déclenche l'enregistrement, un piège classique et récurrent dès
qu'on ajoute une nouvelle route avec `.populate(...)`.

---

## Champ requis Mongoose qui échoue malgré une valeur "remplie"

**Symptôme** : le script de seed échouait sur la validation `required: true`
d'un champ `prenom`, alors que le champ était bien présent dans les données.

**Cause** : la valeur fournie était une chaîne vide `''`. Pour Mongoose,
une chaîne vide n'est **pas** considérée comme "remplie" — contre-intuitif
si on pense `required` comme "le champ existe" plutôt que "le champ a un
contenu".

**Correction** : correction des données de seed pour fournir un vrai
prénom.

**Leçon** : toujours tester `required` avec une chaîne vide, pas seulement
avec un champ absent — les deux cas ne se comportent pas pareil dans
d'autres validateurs JS.

---

## Page blanche : import d'un fichier qui n'existe pas encore

**Symptôme** : toute l'application React affichait une page blanche, sans
message d'erreur visible côté utilisateur.

**Cause** : `App.jsx` importait `./pages/Parametres.jsx` (ajouté en
préparation d'une future page), mais le fichier n'avait pas encore été créé
— travail interrompu en cours de route par un changement de priorité.
Erreur de **build** Vite (résolution de module), pas une erreur
d'exécution : rien ne s'affiche du tout, contrairement à une erreur JS
classique qui laisse au moins le reste de la page intact.

**Correction** : créer immédiatement une version minimale du fichier
manquant, à compléter plus tard.

**Leçon** : un import cassé peut faire disparaître **toute** l'appli, pas
seulement la page concernée — vérifier la console du navigateur en premier
réflexe dès qu'une page est blanche.

---

## Statut TMA qui "recule" tout seul après ajout d'une entreprise

**Symptôme** : une TMA affichée avec le statut "Étude" repassait à "Demande"
dès qu'une ligne `TmaEntreprise` lui était ajoutée.

**Cause** : les données de seed fixaient un statut "en dur" (ex: `etude`)
sans les dates qui, normalement, justifient logiquement ce statut. Le
recalcul automatique du statut (`calculerStatutAutomatique`, basé
uniquement sur les dates réellement présentes) ne trouvait donc pas de quoi
justifier "Étude", et retombait à "Demande" — le seul statut cohérent avec
des dates vides.

**Correction** : données de seed revues pour que chaque TMA ait des dates
réalistes et cohérentes avec le statut qu'on veut lui donner.

**Leçon** : dès qu'un statut est **dérivé** d'autres champs plutôt que
stocké librement, les données de test doivent respecter la même cohérence
que produirait le calcul réel — sinon le bug n'apparaît que plus tard, au
premier recalcul.

---

## Espacement CSS sans effet (fusion des marges verticales)

**Symptôme** : ajouter `margin-top` sur `.filtres` pour créer de l'espace
avec le bloc au-dessus n'avait strictement aucun effet visible.

**Cause** : fusion des marges verticales ("margin collapsing"), un
comportement standard CSS : entre deux blocs empilés, seule la **plus
grande** des deux marges (celle du bas du premier, celle du haut du second)
s'applique — elles ne s'additionnent jamais.

**Correction** : remplacer `margin-top` par `padding-top`, qui ne fusionne
jamais avec les marges des éléments voisins.

**Leçon** : un piège CSS classique et invisible dans le code — la propriété
utilisée est correcte en apparence, mais le comportement du navigateur ne
fait pas ce qu'on attend naïvement.

---

## Numéro de téléphone incomplet silencieusement effacé à la soumission

**Symptôme** : un numéro de téléphone saisi partiellement (bordure rouge
visible) disparaissait sans message quand on cliquait sur "Ajouter" — le
formulaire entier se réinitialisait comme si tout s'était bien passé.

**Cause** : `TelephoneInput` ne remontait au composant parent qu'une chaîne
E.164 valide **ou** une chaîne vide (`''`) dans les deux cas "rien saisi" et
"saisie incomplète" — le parent ne pouvait donc pas distinguer les deux
situations et laissait passer la soumission.

**Correction** : signature de `onChange` étendue à deux arguments,
`onChange(valeur, estValide)`. Le parent (`SectionEntreprises`) bloque
maintenant explicitement la soumission si `estValide` est `false`.

**Leçon** : un callback qui ne renvoie qu'une seule valeur peut cacher une
ambiguïté (ici "vide" vs "invalide") — parfois il faut un second argument
dédié plutôt que de surcharger le sens d'une seule valeur de retour.

---

## Code postal : validation `pattern` HTML qui semblait ne jamais accepter la correction

**Symptôme** : une saisie invalide dans "Code postal" affichait bien le
message d'erreur natif du navigateur ; mais après correction (5 chiffres
valides), le même message continuait d'apparaître au nouvel essai.

**Investigation** : suspicion initiale d'un problème d'échappement du
regex dans l'attribut JSX `pattern="\\d{5}"` (piège classique : dans une
chaîne JS, `\d` sans doublement du backslash perd son backslash et devient
juste `d`). Un script de diagnostic Node, lisant directement le fichier
source et testant la regex réellement produite, a confirmé que
l'échappement était **correct** (`\d{5}` matchait bien `"64100"`) — ce
n'était donc pas la cause.

**Correction retenue** : plutôt que de continuer à chercher la cause exacte
côté navigateur (cache, HMR Vite...), la validation `pattern` HTML a été
remplacée par une validation en JavaScript pur dans la fonction de
soumission (regex classiques `/^\d{5}$/`, testées avec `.test(...)`), avec
affichage d'un message d'erreur inline sous le champ concerné (au lieu d'un
`alert()` intrusif, remplacé ensuite par un style cohérent avec le champ
téléphone).

**Leçon** : un attribut `pattern` HTML est difficile à déboguer (pas
d'accès facile à la regex réellement appliquée par le navigateur, messages
d'erreur non personnalisables finement). Valider en JavaScript, dans le
gestionnaire de soumission, donne un contrôle total et un débogage
beaucoup plus direct — préférable dès que la validation doit être plus que
triviale.

---

## Popup `alert()` pour signaler une erreur de formulaire : mauvaise UX

**Symptôme** (retour utilisateur, pas un bug technique) : les messages
d'erreur de validation (téléphone, commune, code postal, email) via
`alert()` fonctionnaient mais étaient perçus comme intrusifs — popup
bloquante du navigateur, différente du reste de l'interface.

**Correction** : remplacement par un état React `erreurs` (objet, une clé
par champ), affiché comme un petit texte rouge sous le champ concerné, avec
la même classe `.invalide` (bordure rouge) déjà utilisée pour le téléphone
— cohérence visuelle entre tous les champs du formulaire.

**Leçon** : `alert()` est pratique pour un test rapide pendant le
développement, mais rarement acceptable dans une vraie interface — préférer
un affichage inline dès que le formulaire a une identité visuelle propre.

---

## Champ téléphone toujours affiché en rouge, même vide

**Symptôme** : dans le formulaire d'ajout d'une entreprise, le champ
téléphone (`TelephoneInput`) s'affichait avec sa bordure rouge "invalide"
dès l'ouverture du formulaire, avant même toute saisie.

**Cause** : l'état initial `complet` était calculé avec
`Boolean(numeroExistant?.isValid())`. Pour un champ neuf sans valeur,
`numeroExistant` vaut `undefined`, donc l'expression retombe à
`Boolean(undefined)` = `false` — traitant "vide" comme "invalide", alors
que le téléphone est un champ optionnel (un champ vide doit être valide).

**Correction** : initialisation changée en
`numeroExistant ? numeroExistant.isValid() : true` — un champ sans valeur
existante démarre à "valide" (pas de bordure rouge), cohérent avec la
logique déjà utilisée ailleurs dans le composant (`estValide = valide ||
formate === ''`).

**Leçon** : sur un champ optionnel, bien distinguer "état initial vide"
(valide) de "en cours de correction, incomplet" (invalide) — un
`Boolean(x?.method())` sur une valeur `undefined` retombe silencieusement
sur `false`, un piège facile à manquer en relisant le code vite.

---

## Page TMA en page blanche : référence `lot` cassée après suppression d'un lot

**Symptôme** : la page TMA (et par ricochet toute l'application, React
démonte tout l'arbre en cas d'erreur non rattrapée) s'affichait
totalement blanche. Console navigateur : `Uncaught TypeError: Cannot read
properties of null (reading 'reference') at Tma.jsx:168`.

**Cause** : le lot "D01" avait été supprimé via le nouveau bouton
"Retirer" de Paramètres > Lots, alors qu'une TMA le référençait encore.
`DELETE /api/lots/:id` ne vérifiait aucune dépendance avant de supprimer
— une fois le lot supprimé, `.populate('lot')` renvoyait `null` pour la
TMA concernée, et `tma.lot.reference` plantait sans garde-fou (`?.`).

**Correction** : deux niveaux.
1. **Prévention** : `DELETE /api/lots/:id` vérifie désormais qu'aucune
   `TMA` ni `AppelDeFonds` ne référence le lot avant de le supprimer,
   sinon renvoie une erreur 400 explicite (nombre de TMA/appels
   concernés). `SectionLots.jsx` affiche ce message au lieu de l'ignorer.
2. **Résilience** : `tma.lot?.reference ?? '—'` dans `Tma.jsx`, en filet
   de sécurité même si la prévention ci-dessus devrait suffire.
3. **Réparation des données** : la TMA déjà orpheline au moment du bug a
   été corrigée par un reseed complet (confirmé par Nicolas).

**Leçon** : dès qu'une suppression peut casser une référence ailleurs
dans la base (relation `ObjectId` sans cascade), il faut soit
**empêcher** la suppression si des dépendances existent, soit la
**cascader** explicitement — jamais la laisser silencieuse. Et côté
React, `donnee.relation.champ` sans `?.` sur une donnée peuplée
(`.populate()`) qui *peut* légitimement être `null` (référence supprimée,
jamais liée...) est un risque de faire planter toute la page, pas
seulement la ligne concernée.

---

## Un lot "Réservé" pouvait avoir une date de signature d'acte

**Symptôme** : rien n'empêchait de renseigner `dateActe` sur un lot dont
le statut était `reserve` (ou `option`, ou `libre`) — repéré par Nicolas
sur un lot réel déjà en base (B01 : statut "Réservé" mais une `dateActe`
affichée), résidu d'un test antérieur.

**Cause** : les trois dates du cycle de vente (`dateOption`,
`dateReservation`, `dateActe`) et le `statut` étaient deux informations
indépendantes dans le formulaire d'édition — rien ne les reliait, on
pouvait cocher n'importe quel statut et remplir n'importe quelle date
sans rapport logique entre les deux.

**Correction** : une règle d'ordre (`libre < option < reserve < acte`)
appliquée à deux endroits — `FormulaireEditionLot.jsx` désactive et vide
automatiquement les dates d'étapes non atteintes dès qu'on change le
statut, et `PATCH /api/lots/:id` (`validerDatesCoherentesAvecStatut`)
refuse toute combinaison incohérente côté serveur, seule source de vérité
réelle. La donnée déjà incohérente en base (B01) a été corrigée
manuellement une fois la règle en place.

**Leçon** : deux champs qui représentent la même réalité métier sous deux
formes différentes (ici : "où en est la vente" via `statut`, et "quand"
via les dates) doivent être **validés ensemble**, pas indépendamment —
sinon rien n'empêche des combinaisons absurdes de coexister silencieusement
en base jusqu'à ce que quelqu'un les remarque par hasard.

---

## "NaN €" affiché sur les montants d'une TMA fraîchement créée

**Symptôme** : une TMA créée depuis le nouveau formulaire affichait
"NaN €" dans les colonnes "Montant entreprises" et "Montant client",
plutôt qu'un simple tiret comme pour les autres TMA sans montant connu.

**Cause** : la route `POST /api/tma` ne renseignait pas
`montantEntreprises`/`montantClient` à la création — ces champs
n'ayant pas de valeur par défaut dans le schéma, ils valaient `undefined`
(absents du document), pas `null`. Le tableau React ne testait que
`tma.montantEntreprises === null` pour afficher un tiret ; `undefined` ne
correspondant pas à `null` à l'identique (`===`), le code tombait dans la
branche `formatMontant(undefined)`, qui produit "NaN €".

**Correction** : le serveur initialise désormais explicitement ces deux
champs à `null` à la création. Et par robustesse, le test d'affichage
est passé de `=== null` à `== null` (égalité "faible", qui traite `null`
et `undefined` comme équivalents) — ça a aussi corrigé instantanément les
TMA de test déjà en base, sans avoir besoin de les recréer ni de
retoucher la donnée.

**Leçon** : `null` et `undefined` sont différents pour `===` mais pas
pour `==` — un champ "pas encore renseigné" peut être l'un ou l'autre
selon qu'il a été explicitement mis à `null` quelque part ou simplement
jamais touché. Tester avec `== null` (au lieu de `=== null` ou
`=== undefined`) est un moyen simple de couvrir les deux cas à la fois,
plutôt que de devoir se souvenir laquelle des deux valeurs s'applique
précisément à tel champ.
