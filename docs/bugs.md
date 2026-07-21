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

---

## Des lots "Acté" n'avaient aucun appel de fonds généré

**Symptôme** : deux lots (A01, C01) affichaient bien le statut "Acté" mais
n'apparaissaient jamais dans la page "Appels de fonds", alors qu'un
troisième lot passé "Acté" pendant les tests fonctionnait correctement.

**Cause** : la génération automatique des appels de fonds
(`genererAppelsDeFonds()`, `server/routes/lots.js`) ne se déclenchait que
sur une **transition** de statut détectée dans `PATCH /api/lots/:id`
(`ancienStatut !== 'acte' && lot.statut === 'acte'`). Or A01 et C01
étaient "Acté" **dès les données de seed** (`LOTS_DATA` dans `seed.js`) —
créés directement à ce statut via `Lot.insertMany()`, sans jamais passer
par une transition PATCH. La condition ne s'est donc jamais déclenchée
pour eux.

**Correction** : la condition ne compare plus l'ancien statut — elle
vérifie simplement `lot.statut === 'acte'` à chaque `PATCH`, quelle que
soit la raison de la modification (même un simple changement de
commentaire sur un lot déjà Acté). `genererAppelsDeFonds()` a déjà sa
propre sécurité anti-doublon (ne fait rien si des appels existent déjà
pour ce lot), donc appeler la fonction "à chaque fois qu'un lot est Acté"
plutôt que "seulement à la transition" est à la fois plus simple et plus
robuste — ça couvre aussi bien la transition normale que le rattrapage
d'un lot déjà Acté par un autre moyen (seed, script, futur import...).
Les deux lots concernés ont été rattrapés manuellement (un `PATCH` forcé
sur leur statut actuel, qui a déclenché la génération).

**Leçon** : une règle "à l'arrivée dans un état" est plus fiable quand
elle est écrite comme "si l'état final est X, assure-toi que Y existe"
(idempotent, se corrige tout seul) plutôt que "si on vient de *passer* à
X" (dépend de l'historique, et suppose à tort que le document a toujours
transité par le code qui gère cette transition — faux dès qu'une donnée
peut arriver dans cet état autrement, ex: un seed, un script, une
migration).

---

## "Modifier" sur un appel de fonds effaçait silencieusement son émission

**Symptôme** : ouvrir "Modifier" sur la ligne "Réservation" d'un lot (pour
saisir uniquement une date de règlement) faisait disparaître sa
`dateEmission`/`dateLimiteReglement` déjà calculées — repéré indirectement
via une remarque de Nicolas sur des totaux de cartes de stats qui ne
correspondaient pas à son décompte manuel (3 logements, 2 phases émises
chacun → 6 attendu, moins affiché).

**Cause** : `FormulaireAppelDeFonds.jsx` soumettait systématiquement un
champ `dateAttestationMOE` (à `null` quand vide) en plus de
`dateReglement` — hérité d'une version antérieure du formulaire, avant que
l'attestation MOE ne passe en saisie groupée par phase
(`FormulaireAttestationMasse.jsx`). Pour la phase "Réservation", qui n'a
jamais de vraie attestation à afficher (elle s'auto-émet depuis
`lot.dateReservation`), ce champ était **toujours** vide. Côté serveur,
`emettreAttestation()` traitait `dateAttestationMOE` vide comme "on
retire l'attestation" et effaçait `dateEmission`/`dateLimiteReglement` en
conséquence — exécuté à chaque fois qu'on ouvrait "Modifier" sur cette
ligne juste pour saisir un règlement, sans rapport avec l'intention réelle
de l'utilisateur.

**Correction** : `dateAttestationMOE` retiré du formulaire individuel et
de la route `PATCH /api/appels-de-fonds/:id`, qui n'accepte plus que
`dateReglement` — l'attestation MOE ne se saisit désormais **que** via la
saisie groupée par phase, cohérent avec la remarque de Nicolas
(*"dans Modifier, on peut enlever attestation MOE puisque cela se fait en
haut maintenant"*). Données déjà corrompues (A01, A02, C01) réparées via
un script ponctuel comparant `dateEmission` manquante malgré
`dateReglement` déjà présent.

**Leçon** : quand un champ change de mode de saisie (ici : passage
d'individuel à groupé), il faut vérifier que **tous** les formulaires qui
soumettaient encore ce champ ont bien été mis à jour — un champ orphelin
soumis "par habitude" avec une valeur vide peut déclencher une branche de
nettoyage/reset qui n'a plus lieu d'être, et le symptôme (des totaux qui
ne collent pas) peut apparaître loin de la vraie cause (un formulaire de
règlement qui efface une émission).

---

## Règle "réglé à l'acte" appliquée à un seul des deux points d'émission

**Symptôme** : après avoir ajouté la règle "un appel déjà attesté ailleurs
au moment de l'acte est réglé d'office" (remarque du 13/07/2026), Nicolas a
constaté que ça ne marchait toujours pas : la phase "Réservation" restait
à "Émis" au lieu de "Réglé" pour un lot Acté (B02), et la phase
"Achèvement des fondations" de trois lots déjà Actés avant même la
remarque (A01, A02, C01) restait aussi à "Émis" malgré une date d'acte
postérieure à l'attestation.

**Cause** : la règle n'avait été codée qu'à **un seul** des deux endroits
où un appel de fonds peut être émis :
1. `genererAppelsDeFonds()` (`server/routes/lots.js`), pour un **nouveau**
   lot qui devient Acté après qu'une phase a déjà été attestée pour
   d'autres lots — corrigé, mais oubliait aussi de traiter la 1ʳᵉ phase du
   barème ("Réservation"), qui ne passe jamais par cette branche
   d'attestation (elle s'auto-émet séparément depuis
   `lot.dateReservation`, sans jamais poser `dateReglement`).
2. `emettreAttestation()` (`server/routes/appelsDeFonds.js`), utilisée par
   la route d'attestation **en masse** — pour des lots **déjà** Actés au
   moment où une phase est attestée après coup (le cas exact de A01/A02/
   C01, Actés avant que "Achèvement des fondations" ne soit constaté pour
   le programme). Cette fonction posait `dateEmission` = maintenant sans
   jamais comparer à `lot.dateActe`, donc sans jamais poser `dateReglement`.

**Correction** : logique extraite dans une fonction partagée
`calculerEmissionAppel()` (`server/utils/appelsDeFonds.js`), appelée par
les deux points d'entrée, qui compare systématiquement `lot.dateActe` à la
date d'attestation pour décider si l'appel est déjà réglé. La 1ʳᵉ phase du
barème pose maintenant aussi `dateReglement = lot.dateReservation`
directement (paiement factuel à la réservation, jamais différé). Données
déjà en base réparées par script ponctuel (A01/A02/C01/B02 pour
"Achèvement des fondations", B02 pour "Réservation"), et les dates de
règlement de "Réservation" saisies manuellement pendant les tests
(différentes de la vraie date de réservation) réalignées après
confirmation de Nicolas.

**Leçon** : quand une règle métier doit s'appliquer "à chaque fois qu'un
appel est émis", il faut recenser **tous** les endroits du code où une
émission peut avoir lieu avant de considérer la règle terminée — ici il y
en avait discrètement trois (génération d'un nouveau lot Acté, attestation
en masse d'une phase déjà existante, auto-émission de la 1ʳᵉ phase), et la
correction précédente n'en avait couvert qu'un seul. Extraire la règle
dans une fonction partagée, appelée par tous les points d'entrée, évite
que ce genre d'oubli se reproduise à la prochaine évolution de la règle.

---

## `$unset` silencieusement ignoré sur un champ retiré du schéma Mongoose

**Symptôme** : après avoir renommé `Acquereur.offrePretRecue` (booléen) en
`dateOffrePretRecue` (Date), un script ponctuel
(`Acquereur.updateMany({}, { $unset: { offrePretRecue: '' } })`) censé
nettoyer l'ancien champ sur les documents existants a annoncé "5
acquéreurs" mis à jour — mais une vérification ultérieure a montré que le
champ obsolète `offrePretRecue: false` était toujours présent en base sur
ces mêmes documents.

**Cause** : en mode strict Mongoose (activé par défaut), toute opération
de mise à jour passant par un **modèle** (`Model.updateMany`,
`findByIdAndUpdate`...) est filtrée pour ne garder que les chemins
réellement déclarés dans le schéma — y compris pour `$unset`. Comme
`offrePretRecue` avait déjà été retiré du schéma Mongoose *avant*
l'exécution du script de nettoyage, l'opération `$unset` sur ce champ a
été silencieusement supprimée de la requête envoyée à MongoDB (mode
strict = protection contre les fautes de frappe sur les noms de champs,
mais qui empêche aussi de nettoyer un champ qu'on vient de retirer du
schéma). Le compteur "5 acquéreurs" affiché venait du nombre de documents
**correspondant** au filtre (`{}`), pas du nombre réellement modifié.

**Correction** : contourner le modèle et passer par la **collection MongoDB
native** (`mongoose.connection.collection('acquereurs').updateMany(...)`),
qui n'applique aucun filtrage de schéma.

**Leçon** : le mode strict de Mongoose, précieux pour éviter les fautes de
frappe au quotidien, devient un piège dès qu'on veut nettoyer un champ
qu'on a déjà retiré du schéma — dans ce cas précis, il faut soit nettoyer
**avant** de modifier le schéma, soit passer par la collection native
comme ici. Un `modifiedCount` élevé sur une opération `$unset` ne prouve
pas que quelque chose a réellement changé : il faut revérifier l'état des
documents après coup, pas seulement lire le résumé renvoyé par la requête.

---

## Régression : téléphone invalide silencieusement effacé, sans message (banque/courtier/notaire)

**Symptôme** (signalé par Nicolas) : dans les formulaires "Suivi de prêt"
et "Signature acte", saisir un numéro de téléphone invalide (ex: 8
chiffres) pour la banque/le courtier/le notaire ne l'enregistrait pas,
sans aucun message d'erreur.

**Cause** : c'est très exactement le bug déjà rencontré et corrigé sur le
formulaire Entreprises (voir plus haut, "Numéro de téléphone incomplet
silencieusement effacé à la soumission") — mais réintroduit ici. Le
nouveau composant `ChampsContact.jsx` (13/07/2026, remarque sur banque/
courtier/notaire) utilisait `TelephoneInput` en n'écoutant que le premier
argument de son `onChange(valeur, estValide)`, sans jamais vérifier
`estValide` ni valider commune/code postal/email — la même classe de bug
que celle déjà documentée, réapparue parce que le nouveau composant n'avait
pas repris la correction déjà connue.

**Correction** : `ChampsContact` valide maintenant commune/code postal/
email par regex (mêmes règles que le formulaire Client/Entreprises) et
suit `estValide` du téléphone, avec un message d'erreur inline sous
chaque champ concerné. Sa validité globale remonte au formulaire parent
via une prop `onValiditeChange`, que `FormulaireSuiviPret.jsx` et
`FormulaireSignatureActe.jsx` utilisent pour bloquer la soumission tant
qu'une erreur est affichée (au lieu d'enregistrer silencieusement une
version tronquée de la saisie).

**Leçon** : une correction déjà documentée dans `docs/bugs.md` doit être
vérifiée activement à chaque fois qu'un nouveau composant réutilise le
même sous-composant (ici `TelephoneInput`) — la doc existante ne protège
pas automatiquement le nouveau code, elle doit être relue/appliquée à la
main à chaque nouvel usage.

---

## Page blanche pour un rôle "lecture" qui tente de modifier Paramètres

**Symptôme** (signalé par Nicolas, testé avec un compte "lecture" tout
juste créé) : dans Paramètres, dès qu'on modifie un champ et clique sur
"Enregistrer", la page devient entièrement blanche, sans le message
d'erreur habituel des autres interfaces.

**Cause** : troisième occurrence de la même famille de bug déjà
documentée deux fois plus haut ("Page blanche : import d'un fichier qui
n'existe pas encore", "Page TMA en page blanche : référence lot cassée").
`Parametres.jsx` (fonction `enregistrer()`) ne vérifiait jamais
`reponse.ok` avant de traiter le corps de la réponse comme le programme à
jour : `setProgramme(await reponse.json())`. Avec l'authentification JWT
(13/07/2026), un compte "lecture" reçoit désormais un vrai 403 sur toute
écriture — mais son corps (`{ message: "Action réservée à un rôle
supérieur" }`) était pris pour le nouveau `programme`. Au rendu suivant,
`SectionDelaisEtTaux.jsx` (et les autres sections) font `const p =
programme.parametres` puis `p.delaiObtentionPretJours` : `parametres`
n'existe pas sur `{ message: "..." }`, `TypeError` non rattrapée → React
démonte tout l'arbre.

**Correction** : `if (!reponse.ok) { alert(message); return }` ajouté
avant d'utiliser la réponse, comme partout ailleurs dans l'appli. En
auditant systématiquement tous les appels d'écriture du front (grep
`method: 'POST'/'PATCH'/'DELETE'` vs présence d'un test `.ok`), le même
défaut a été trouvé sur 5 autres actions qui ne plantaient pas mais
échouaient silencieusement (`SectionEntreprises.jsx` : ajout/suppression
d'entreprise ; `DetailEntreprisesTma.jsx` : ajout/modification/suppression
d'une ligne entreprise) — corrigées de la même façon.

**Leçon** : l'authentification JWT a introduit un **nouveau code
d'erreur (403)** sur des actions qui ne pouvaient auparavant échouer que
par une erreur de validation (400) déjà gérée — tout endroit qui
supposait "une réponse à une écriture est forcément un succès" est
devenu un point de rupture potentiel. Une évolution transversale comme
l'authentification doit être suivie d'un audit de **tous** les appels
d'écriture existants, pas seulement des nouveaux — le même réflexe que
pour `seed.js` juste au-dessus (une règle qui change quelque part doit
faire relire tous les endroits qui en dépendaient implicitement).

---

## `seed.js` ne vidait pas `TmaEntreprise`/`AppelDeFonds` : 18 lignes orphelines accumulées

**Symptôme** : découvert en construisant la fenêtre d'alertes de retard
(13/07/2026), qui a besoin de lister **toutes** les lignes `TmaEntreprise`
(pas une TMA à la fois comme jusqu'ici) — 18 lignes existaient en base,
mais **aucune** ne pointait vers une TMA réellement existante
(`tma: null` une fois peuplé), rendant le champ `entreprise` illisible et
la fenêtre potentiellement fausse.

**Cause** : `seed.js` vide `Programme`, `Lot`, `Acquereur` et `Tma` à
chaque exécution (`deleteMany`), en recréant des documents avec de
**nouveaux** `_id` — mais ne vidait ni `TmaEntreprise`, ni `AppelDeFonds`,
deux collections qui référencent `Tma`/`Lot` par ObjectId. Les lignes déjà
créées lors d'un test antérieur (10/07/2026, tout premier test du détail
entreprises d'une TMA) se sont retrouvées orphelines dès le reseed
suivant : leur `tma` pointait vers un `_id` qui n'existe plus. Comme
aucune route ne permettait jusqu'ici de lister les `TmaEntreprise` sans
préciser une TMA (`GET /api/tma-entreprises?tma=<id>` uniquement), ces
orphelines restaient invisibles — ni affichées (aucune TMA ne les
réclamait), ni gênantes, jusqu'à ce qu'une nouvelle fonctionnalité
interroge "tout" d'un coup.

**Correction** : `TmaEntreprise.deleteMany({})` et
`AppelDeFonds.deleteMany({})` ajoutés à la liste des collections vidées
par `seed.js` (`Entreprise` reste volontairement exclue, décision du
10/07/2026). Les 18 lignes déjà orphelines supprimées par un script
ponctuel (comparaison avec la liste des `Tma` existants, plutôt qu'un
simple `tma: null` — le champ était en réalité absent du document, pas
`null`, un reliquat d'anciens documents créés avant que le champ ne soit
obligatoire).

**Leçon** : dès qu'une collection référence une autre par `ObjectId`,
**toute** collection qui la vide (ici `seed.js`) doit aussi vider ses
dépendants — sinon des orphelines s'accumulent silencieusement,
invisibles tant qu'aucune route ne les interroge sans filtre. Une
relation "presque jamais interrogée dans son ensemble" (ici : toutes les
`TmaEntreprise` du programme, tous suivis confondus) est justement le
genre d'angle mort qu'une nouvelle fonctionnalité transversale (une
alerte, un export...) finit tôt ou tard par révéler.

---

## Serveur relancé avec `node index.js` : les modifications de code deviennent invisibles

**Symptôme** (13/07/2026) : après plusieurs modifications côté serveur
pour corriger un bug (montant client TMA), le comportement observé dans
l'app ne changeait jamais, comme si aucune des corrections n'avait le
moindre effet — au point de douter du diagnostic lui-même.

**Cause** : le serveur avait été redémarré à un moment avec
`node index.js` directement (au lieu de `npm run dev`, qui lance
`nodemon`) — un process Node "figé" sur le code tel qu'il était au
moment du lancement, qui ne recharge jamais tout seul. Chaque edit
suivant était donc bien enregistré sur le disque, mais totalement
ignoré par le process qui répondait réellement aux requêtes.

**Correction** : tuer le process et relancer avec `npm run dev`.
Diagnostiqué en écrivant un script ponctuel interrogeant directement
Mongo pour comparer l'état réel en base à ce que le code sensé
s'exécuter aurait dû produire.

**Leçon** : toujours redémarrer le back-end avec `npm run dev`, jamais
`node index.js` en direct — la différence est invisible sur le moment
(le serveur démarre bien, répond bien) et ne se révèle que beaucoup
plus tard, sous la forme trompeuse d'un bug qui "résiste" à toutes les
corrections.

---

## `montantClientManuel` figé à `true` dès qu'un champ TMA sans rapport était modifié

**Symptôme** (13/07/2026) : après avoir juste changé le nombre
d'entreprises concernées sur une TMA (sans toucher au montant client),
le montant client cessait de se recalculer automatiquement à chaque
nouvelle réponse d'entreprise, comme s'il avait été saisi à la main.

**Cause** : le formulaire d'infos TMA renvoyait systématiquement
`montantClient` dans son corps de requête PATCH, même quand seul un
autre champ avait changé (c'est la valeur affichée à l'écran, calculée
ou non). Côté serveur, la route figeait
`montantClientManuel = true` dès que la clé `montantClient` était
**présente** dans la requête, sans vérifier si sa valeur différait
réellement de celle déjà enregistrée.

**Correction** : ne figer `montantClientManuel` que si la valeur reçue
diffère de la valeur actuelle en base
(`if (montantClient !== (tma.montantClient ?? null))`).

**Leçon** : un formulaire qui renvoie l'intégralité de son state à
chaque sauvegarde (plus simple à écrire) peut déclencher des effets de
bord côté serveur sur des champs que l'utilisateur n'a pourtant pas
touchés — une route qui distingue "présence d'un champ" de "changement
réel de valeur" est plus sûre dès qu'un champ pilote un comportement
(ici, geler un recalcul automatique).

---

## `ProgrammeContext` renvoyait un utilisateur connecté vers le choix de programme à chaque rechargement

**Symptôme** (17/07/2026) : un utilisateur déjà connecté, ayant déjà
choisi un programme lors d'une session précédente, se retrouvait
systématiquement renvoyé vers la page "Choisir un programme" à chaque
rechargement de page (F5) — alors que tout aurait dû rester sur la même
page.

**Cause** : `ProgrammeContext` et `AuthContext` revalident chacun leur
état auprès du serveur au chargement, en parallèle. L'effet de
`ProgrammeContext` se déclenchait une première fois avant que
`AuthContext` ait fini sa propre vérification, avec `utilisateur`
encore à `null` (valeur initiale, pas encore résolue) — il concluait
alors à tort "pas d'utilisateur connecté", posait
`programmeActif = null` et `chargement = false` définitivement, avant
même qu'`AuthContext` ait eu le temps de confirmer que l'utilisateur
était bien connecté. `RouteProgramme` redirigeait alors vers
`/programmes` sur la base de ce faux `null`.

**Correction** : `ProgrammeContext` lit maintenant aussi
`chargement` (renommé `chargementAuth`) depuis `useAuth()`, et son
effet retourne immédiatement tant que cette valeur est `true`, avant
de décider quoi que ce soit.

**Leçon** : deux `Context` qui dépendent l'un de l'autre (ici,
"programme actif" n'a de sens que si "utilisateur connu") doivent
explicitement attendre la résolution de l'un avant que l'autre ne
prenne une décision définitive — sinon le state initial "pas encore
chargé" (`null`) est silencieusement traité comme un vrai résultat
("pas connecté"). Trouvé via une revue de code à plusieurs agents en
parallèle, pas par un signalement utilisateur — ce genre de bug ne se
voit qu'au rechargement, facile à ne jamais remarquer soi-même en dev
avec le rechargement à chaud (HMR) qui ne repart jamais de zéro.

---

## Annuler une vente d'annexe seule ne libérait pas l'annexe

**Symptôme** (17/07/2026) : après avoir annulé la vente d'un parking
vendu à part, celui-ci n'apparaissait plus comme disponible dans
"Vendre une annexe", et le lot "fantôme" associé restait visible dans
le tableau des lots avec un statut "Libre" incohérent (un lot
`estAnnexeSeule` n'a pas vocation à exister en dehors d'une vente en
cours).

**Cause** : la route d'annulation de vente avait été écrite pour le cas
général (remettre un lot classique à "Libre"), sans branche spécifique
pour `estAnnexeSeule` — elle ne remettait donc jamais
`Annexe.lot` à `null`, et laissait le `Lot` lui-même en base au lieu de
le supprimer.

**Correction** : branche dédiée dans la route d'annulation pour les
lots `estAnnexeSeule` : libère l'annexe
(`Annexe.updateMany({ lot: lot._id }, { lot: null })`) puis supprime le
`Lot` entièrement, au lieu de le remettre à "Libre" — cohérent avec le
fait qu'une vente d'annexe annulée se revend uniquement via "Vendre une
annexe", jamais en éditant un lot existant. Le lot de test déjà cassé
par le bug a été nettoyé par un script ponctuel.

**Leçon** : une fonctionnalité qui réutilise un cycle existant
(`estAnnexeSeule` réutilise le cycle de vente des lots classiques) doit
être revue explicitement à **chaque** endroit qui suppose "il s'agit
d'un vrai logement" — l'annulation, écrite avant l'introduction
d'`estAnnexeSeule`, est un point de rupture facile à manquer tant que
personne ne teste spécifiquement ce cas.

---

## Bouton noir invisible au repos, coloré seulement au survol

**Symptôme** (20/07/2026) : les boutons "Marquer les travaux comme
terminés"/"Annuler la fin des travaux" (page TMA), passés en fond
noir/texte blanc à la demande de Nicolas, restaient blancs au repos —
le noir n'apparaissait qu'au survol de la souris.

**Cause** : le même piège de spécificité CSS déjà rencontré sur
`.bouton-danger` (voir plus haut) — la règle `.boutons-panneau-tma
button` (imbriquée dans `table { ... }`, donc compilée en `table
.boutons-panneau-tma button`, spécificité (0,1,2)) l'emportait sur la
nouvelle règle `button.bouton-fonce` (spécificité (0,1,1)) à l'état de
repos. Au survol, `button.bouton-fonce:hover` gagnait un point de
spécificité supplémentaire et l'emportait enfin, donnant l'illusion
trompeuse que "ça marche, juste au survol".

**Correction** : classe doublée, `button.bouton-fonce.bouton-fonce`
(spécificité (0,2,1)), pour dépasser sans ambiguïté la règle imbriquée
dans `table { ... }`, quel que soit l'endroit où le bouton est utilisé.

**Leçon** : sur ce projet, toute nouvelle classe de bouton **colorée**
(fond ou texte) appliquée à l'intérieur d'un tableau doit être vérifiée
à l'état de repos, pas seulement au survol — le tableau porte déjà des
règles génériques (`button { background: ... }`) suffisamment
spécifiques pour piéger une classe simple à chaque fois.

---

## "Annuler la fin des travaux" impossible sur les TMA déjà Terminées avant le correctif

**Symptôme** (20/07/2026) : le nouveau bouton "Annuler la fin des
travaux" (point 172) refusait l'action sur une TMA déjà au statut
"Terminé" ("Cette TMA n'est pas terminée, rien à annuler"), alors
qu'elle l'était visiblement.

**Cause** : premier essai calqué sur `statutAvantRefus`/
`statutAvantAnnulation` — un champ `statutAvantTermine`, rempli au
moment du passage à "Terminé". Mais cette TMA précise avait été mise à
ce statut *avant* l'ajout du bouton (donc jamais passée par le code qui
remplit ce nouveau champ) : `statutAvantTermine` restait vide, et le
garde-fou (`if (tma.statut !== 'termine' || !tma.statutAvantTermine)`)
refusait l'annulation faute de cette trace.

**Correction** : suppression pure et simple de `statutAvantTermine` —
inutile ici, puisque "Terminé" n'est atteignable que depuis "Validé"
(une seule origine possible dans la machine à états, contrairement à
"Refusé"/"Annulé"). "Annuler la fin des travaux" repose simplement
`statut = 'valide'`, sans avoir besoin de savoir d'où on venait.

**Leçon** : copier un motif existant (ici `statutAvantX`) sans vérifier
s'il est réellement nécessaire dans le nouveau cas peut introduire un
bug qui ne se voit qu'sur des données déjà en base avant le correctif —
un test "à blanc" (créer puis terminer une TMA fraîche) ne l'aurait pas
révélé, seul un test sur une donnée existante l'a fait apparaître.

---

## Frais d'ouverture de dossier TMA jamais appliqué à la création

**Symptôme** (20/07/2026) : après avoir activé "Frais d'ouverture de
dossier" (200 €) dans Paramètres, une TMA fraîchement créée affichait
un montant TTC client à 0 €, pas 200 €.

**Cause** : `calculerMontantClient(montantEntreprises, parametres)`
renvoyait `null` dès que `montantEntreprises` n'était pas encore connu
(cas normal d'une TMA fraîche, avant toute réponse d'entreprise) — sans
même regarder si un frais fixe devait s'appliquer. De plus,
`POST /api/tma` ne l'appelait pas du tout : `montantClient` était
toujours forcé à `null` "en dur" à la création.

**Correction** : `calculerMontantClient()` renvoie désormais le montant
du frais (au lieu de `null`) quand `montantEntreprises` est encore
inconnu ; `POST /api/tma` appelle cette fonction à la création au lieu
de forcer `null`. Les TMA créées avant ce correctif ne sont pas
rattrapées rétroactivement (décision explicite de Nicolas).

**Leçon** : un nouveau réglage qui "s'ajoute" à un calcul existant doit
être vérifié à **chaque** point d'entrée qui produit ce calcul, pas
seulement celui déjà testé habituellement (ici, le recalcul après
réponse des entreprises fonctionnait ; la création, elle, court-circuitait
complètement le calcul).

---

## Barre de recherche : plusieurs corrections successives après les premiers tests

**Symptôme** (20/07/2026, point 187) : après la mise en place d'une
barre de recherche sur les 6 pages principales, Nicolas a signalé
plusieurs cas où elle ne retrouvait pas des lignes pourtant visiblement
correspondantes.

**Corrections, dans l'ordre des signalements** :
1. **Champs manquants** : la recherche ne portait au départ que sur
   quelques champs jugés "identifiants" (référence, nom, commentaire) —
   Nicolas a précisé que **tout** ce qui s'affiche dans le tableau doit
   être trouvable, y compris des valeurs calculées comme "Prix TTC/m²
   SHAB" ou une surface. Chaque page construit désormais son texte de
   recherche avec les mêmes fonctions d'affichage que le tableau
   (`formatMontant`, `formatDate`, `afficheSurface`...).
2. **Séparateur de milliers** : chercher "5444" ne retrouvait pas
   "5 444,00 €" — l'espace dans un montant formaté est un espace
   insécable (séparateur de milliers), qu'un clavier ne tape jamais.
   Corrigé en retirant tous les espaces des deux côtés de la comparaison
   (texte affiché ET requête tapée).
3. **Séparateur décimal** : chercher "5.00m²" ne retrouvait pas
   "5,00 m²" — les nombres s'affichent à la française (virgule), un
   clavier tape plus naturellement un point. Corrigé en remplaçant aussi
   les points par des virgules des deux côtés.
4. **Composant jamais affiché** (étourderie) : sur la page Appels de
   fonds, `BarreRecherche` avait été importée et branchée dans la
   logique de filtrage, mais l'élément `<BarreRecherche />` n'avait
   jamais été ajouté au JSX rendu — la barre n'apparaissait tout
   simplement pas à l'écran. Repéré par Nicolas ("je ne vois pas la
   barre de recherche"), pas par une relecture du code.

**Leçon** : "brancher la logique" (import, état, filtre) et "afficher le
composant" sont deux étapes distinctes qui peuvent chacune être oubliées
indépendamment — copier un motif déjà posé sur 5 pages sur une 6ᵉ page
reste un copier-coller manuel, avec le même risque d'oubli qu'une
implémentation de zéro.
