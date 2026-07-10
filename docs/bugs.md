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
