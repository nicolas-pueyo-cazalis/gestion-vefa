('# Demandes de Nicolas — Gestion VEFA

Liste chronologique de toutes les demandes, remarques et décisions
exprimées par Nicolas depuis le début du projet — hors détails
d'implémentation (voir `journal.md` pour le "comment", `bugs.md` pour les
bugs rencontrés). Objectif : garder une trace fidèle et complète de ce qui
a été demandé, pour pouvoir la reparcourir ou la raconter (ex: entretien
d'alternance).

---

## Méthode de travail (préférences durables)

- Toujours répondre en français.
- Nicolas débute en développement web : expliquer chaque nouvelle notion de
  code en détail, avant/pendant l'écriture, pas seulement après.
- Terminal de référence : WSL (Ubuntu), pas PowerShell.
- Documenter chaque étape en continu (`journal.md`, `decisions.md`,
  `glossaire.md`, `concepts-techniques.md`, `schema-donnees.md`), sans
  attendre qu'on le demande. `README.md` seulement aux grandes étapes.
- Nicolas fait ses propres commits via VSCode — ne jamais lancer `git add`/
  `git commit` à sa place, seulement signaler les bons moments.
- Prévoir de petits exercices de code (pas des quiz) pour pratiquer les
  nouvelles notions, faits par Nicolas puis relus ensemble.
- La logique métier doit se déduire automatiquement des données (dates)
  chaque fois que possible, comme dans les formules Excel d'origine — les
  boutons manuels réservés à ce qui ne peut vraiment pas se déduire.

---

## Phase de cadrage (09/07/2026)

1. Fournir les deux fichiers Excel métier (suivi VEFA, suivi TMA) comme
   base de compréhension, à améliorer plutôt qu'à copier à l'identique.
2. Sur l'analyse Excel : les constantes repérées dans les formules
   (barème des phases, délais prêt/notaire/retour entreprise, taux de
   marge TMA, règle sur montant TMA négatif) doivent devenir des
   **paramètres modifiables par programme**, pas des constantes figées.
3. Nouvelle règle (absente d'Excel) : une alerte sur les appels de fonds
   émis mais non réglés à temps, avec une fenêtre listant tous les
   retards à l'ouverture de l'application.
4. Règle sur montant TMA négatif changée par rapport à Excel : montant
   facturé au client = 0€ si le montant entreprise est négatif (au lieu
   de "avoir sans marge").
5. Sur le schéma de données : étages en liste déroulante modifiable par
   programme (pas un enum figé) ; orientation en liste fixe (8 valeurs) ;
   montants toujours stockés en `Number` pur, jamais avec le symbole "€" ;
   téléphone au format international (`libphonenumber-js`) car les
   clients peuvent être étrangers ; email validé par regex ; banque et
   courtier doivent être des coordonnées complètes, pas juste un nom.

---

## Étape 1 — Version vanilla (09/07/2026)

6. Corrections visuelles mineures faites par Nicolas lui-même sur
   `style.css` (taille de police des cartes de stats).
7. Cartes de stats TMA : "Validées" doit regrouper `valide` + `travaux` +
   `termine` (sans `facture`) ; ordre des boutons de filtre ajusté
   (Validé/Refusé après Facturé).
8. Bandeau : afficher nom (gras) + adresse du programme sur les deux
   pages, uniformisé.

---

## Étape 2 — Migration React (10/07/2026)

9. Demande explicite d'explications systématiques et détaillées à chaque
   nouveau fichier/concept, sans enchaîner plusieurs fichiers sans pause.
10. Demande de petits exercices de code pour pratiquer, plutôt que des
    quiz.
11. Rappel : signaler les points de commit et mettre à jour la doc sans
    qu'il ait à le redemander.

---

## Étape 3 — Back-end Express/MongoDB (10/07/2026)

12. Choix hébergement : MongoDB Atlas (cloud) plutôt qu'une base locale,
    cohérent avec le déploiement final prévu.
13. Refus d'un correctif "on repart toujours à Demande" en cas de refus
    TMA par erreur : *"il se peut que l'on clique sur refusé par
    erreur... s'il refuse au montant de la facture... il faudrait revenir
    à l'étape qui a précédé le refus"* → exige une restauration exacte de
    l'état précédent (`statutAvantRefus`).
14. Rejet de la colonne "Actions" avec un bouton par transition de statut
    TMA : *"ça m'embête... crée une colonne juste pour ça, ça fait
    trop"* → le statut doit se déduire automatiquement des dates saisies
    (comme Excel), un seul bouton manuel ("Refuser") pour ce qui ne peut
    pas se déduire.
15. Correction de la machine à états TMA : "facturé" doit être classé
    dans "En cours" (pas "Validées") car le client n'a pas encore validé ;
    puis correction de l'ordre lui-même : "facturé" doit précéder
    "validé" (la facture part avant le retour signé du client).
16. Confirmation de la nécessité de gérer plusieurs entreprises pour une
    même TMA (pas juste une seule ligne entreprise/devis).
17. Nouvelle règle : le statut ne passe à "Chiffré" que si **toutes** les
    entreprises sollicitées ont répondu — une seule en attente doit
    garder la TMA à "Étude".
18. Trois points d'amélioration actés en fin de journée :
    - Référentiel `Entreprise` séparé (nom, corps de travaux, coordonnées),
      pour remplacer la saisie libre par une liste déroulante — objectif
      cité : futur export des TMA envoyé aux entreprises.
    - Nouvelle page "Paramètres" pour éditer `programme.parametres` sans
      passer par la base directement.
    - Deux nouvelles alertes à prévoir (entreprise n'ayant pas chiffré à
      temps, client n'ayant pas répondu à une facture TMA).
19. Pause sur `TmaEntreprise` : ajouter une date de retour entreprise
    (*"pour le suivi c'est bien, si un jour il y a besoin de l'info"*),
    remplie **à la main**, pas déduite automatiquement (contrairement à
    d'autres dates de l'appli) — précisé explicitement.
20. Signalement d'une page blanche (bug, voir `bugs.md`).
21. Réglages visuels du bandeau : lien "Paramètres" poussé à droite,
    effet de survol sur la nav, espacement entre cartes de stats et
    filtres.

---

## Remarques PDF #1 — "Remarques sur le paramétrage des programmes et interfaces" (10/07/2026)

Document détaillé couvrant plusieurs interfaces, remplacé ensuite par une
version étendue (voir section suivante) — les points ci-dessous sont ceux
qui ont persisté dans la version finale.

## Remarques PDF #2 — version étendue, avec `Synthese programme.pdf` en référence (10/07/2026)

22. **Informations du programme** : ajouter le champ "Date de livraison".
23. **Délais et taux** : retirer la mention "(ancien comportement Excel)"
    du libellé de l'option `avoir_sans_marge`.
24. **Barème des phases** : pouvoir réordonner les phases (pas seulement
    ajouter/retirer).
25. **Téléphone** : composant réutilisable avec préfixe pays et
    validation du nombre de chiffres attendu — précisé ensuite dans une
    remarque séparée : *"pouvoir choisir le préfixe en fonction du pays,
    et ensuite que nous soyons obligés de remplir le nombre de numéro qui
    correspond"*.
26. **Entreprises** (Paramètres) : ajouter adresse, commune, code postal,
    téléphone (international), email — référentiel complet, pas juste
    nom + corps de travaux.
27. **Lots (interface, remarque détaillée en 8 points)** : entre autres,
    la colonne "Nom client" en texte libre doit être remplacée par un
    petit champ civilité + nom qui **crée ou lie un vrai `Acquereur`**
    plutôt que de rester du texte déconnecté des données (point validé
    explicitement : *"Point 7 : je suis d'accord"*).
28. **Page Lots** : restructurer les colonnes façon "Synthèse programme"
    (retirer l'ID client, unités affichées à côté des valeurs plutôt que
    dans les en-têtes, Prix/m² calculé automatiquement, totaux TTC/TVA
    (20%)/HT en bas de tableau, statut/client/dates éditables en ligne).
29. **Interface TMA** : bouton "Ajouter une TMA" avec formulaire de
    création (jusqu'ici les TMA n'étaient que lues, jamais créées depuis
    l'interface).
30. **Nouvelle page "Clients"** : coordonnées complètes des acquéreurs
    (prénom, adresse, commune, code postal, téléphone, email), en vue
    d'un futur export/listing.

---

## Bug "Code postal" et corrections associées (10/07/2026)

31. Signalement du bug de validation du code postal (voir `bugs.md` pour
    le détail investigation/cause/correction).
32. Après une première tentative de correctif infructueuse : *"non j'ai
    toujours le même problème"* → a mené au remplacement de la validation
    `pattern` HTML par une validation JavaScript explicite.
33. Remarque UX : les popups `alert()` de validation sont perçues comme
    intrusives → remplacées par des messages d'erreur affichés sous
    chaque champ concerné.
34. Signalement (clarifié comme fausse alerte, pas un bug de l'appli) :
    des entreprises supprimées semblaient "revenir" après navigation —
    causé par une réexécution de `node seed.js` en parallèle d'un test
    manuel, pas un défaut du code.
35. Sur l'interface TMA > Entreprises : la date de réception du devis
    devait être saisissable dès l'ajout d'une entreprise, pas seulement
    en modifiant une ligne déjà créée. Remarque associée : le menu
    déroulant "Entreprise" paraissait plus petit que le champ "Montant
    devis" (bug de style, `<select>` non stylé).

---

## Paramètres > Lots (10/07/2026)

36. Demande explicite : pouvoir supprimer un lot depuis la page
    Paramètres (pas seulement créer/modifier).

### Remarques PDF — "Remarques sur le paramétrage des lots" (10/07/2026, 1ʳᵉ version)

37. Renommer "Référence" en "N° du logement".
38. Empêcher de créer plus de logements que le nombre annoncé pour le
    programme (ex: 8 logements max si `nombreLogements` = 8).
39. Renommer "Caves" en "Caves / Celliers".
40. Corriger le récapitulatif des lots : les champs remplis (terrasse,
    jardin, etc.) doivent apparaître dans la liste au-dessus du
    formulaire, pas seulement dans le formulaire lui-même.

### Remarques PDF — version complétée (10/07/2026, 2ᵉ version, "Nouvelles remarques")

41. Remplacer "Parkings" par "N° de parking", et de même pour les
    caves/celliers — ce ne sont pas des compteurs mais des **numéros
    identifiants** (une place de parking précise), un lot pouvant en
    avoir plusieurs.
42. Dans le récapitulatif, afficher "n° de parking : 10" plutôt que
    "10 parking" — même principe pour caves/celliers.
43. Interdiction d'avoir deux fois le même numéro de parking ou de
    cave/cellier — comprise et implémentée comme une règle **globale sur
    tout le programme** (deux lots ne peuvent pas revendiquer le même
    numéro), pas seulement une vérification locale au lot.
44. Le message "nombre maximum de logements atteint" doit disparaître
    dès qu'on repasse sous la limite (ex: en augmentant le nombre de
    logements prévus), pas rester affiché indéfiniment.
45. Ajouter un message d'avertissement quand moins de logements ont été
    créés que le nombre annoncé pour le programme.
46. **Doc à créer** : la liste de toutes les modifications demandées
    depuis le début du projet → ce document.

---

## Derniers ajustements avant pause (10/07/2026)

47. Demande explicite : pouvoir supprimer un lot (formulée en cours de
    travail, avant même le PDF des "nouvelles remarques").
48. Le message "il manque X logement(s)..." doit être affiché en rouge,
    comme le message de plafond atteint.
49. Les champs "N° de parking"/"N° de cave/cellier" doivent être alignés
    avec les autres champs du formulaire, avec le bouton "Ajouter" en
    dessous de l'input (pas à côté).
50. Le message d'erreur en cas de doublon de numéro de parking/cave doit
    être un petit message ciblé sur le champ concerné, pas un gros
    message d'erreur en haut de page.
51. Signalement (3ᵉ occurrence) : les entreprises initialement saisies
    étaient de nouveau revenues aux données fictives d'origine — même
    cause qu'avant (reseed pendant un test manuel en parallèle). A mené à
    une règle explicite : toujours demander confirmation et **attendre la
    réponse** avant de relancer `node seed.js`, pas seulement l'annoncer.
52. Après plusieurs itérations sur l'alignement des champs (2 essais
    infructueux avant la bonne correction) : "à la suite de Jardin, tout
    doit être à la suite comme la première ligne" — a mené à la vraie
    cause (le formulaire alignait les champs par le bas, `align-items:
    end`, ce qui ne fonctionne pas quand un champ est plus haut que ses
    voisins) plutôt qu'à un correctif localisé.

---

## Reprise (10/07/2026, plus tard)

53. **Entreprises** : ajouter un "n° de lot" (ex: 01, 02...) par
    entreprise, saisi à la main — numérotation des lots de travaux du
    marché, distincte des `Lot` (logements) déjà existants dans l'appli.
54. Signalement : le champ "n° de téléphone" restait encadré en rouge en
    permanence (bug, voir `bugs.md`).
55. Après la restructuration de la page Lots : "ce n'est pas présenté
    convenable, et les dates n'apparaissent pas dans les lignes" — les
    dates étaient éditables mais jamais affichées dans le tableau, et
    l'espacement client/bouton + les totaux étaient mal mis en forme.
56. Signalement : page blanche générale — remonté jusqu'à un lot supprimé
    (D01) alors qu'une TMA le référençait encore (bug, voir `bugs.md`).
    A mené à une règle de robustesse : un lot référencé par une TMA/un
    appel de fonds ne doit plus pouvoir être supprimé.

---

## Remarques PDF — "Nouvelles remarques sur les interfaces" (10/07/2026)

57. **Interface Lots** : colonnes manquantes dans les lignes — Terrasses,
    Jardins, Parkings, Caves/Celliers (existaient dans Paramètres > Lots
    mais jamais affichées dans le tableau principal).
58. **Bug dates/statut** : *"si un logement est réservé, je peux quand
    même mettre une date de signature d'acte. Il faut que la date
    affichée corresponde au statut du lot"* (bug, voir `bugs.md`).
59. Colonne "Client" trop de retours à la ligne — impossibilité
    d'agrandir la largeur des lignes évoquée comme piste.
60. Colonne "Commentaire" manquante.
61. Boutons "Modifier" des lots libres non alignés avec les autres
    boutons "Modifier".
62. Présentation des totaux à revoir : Total TTC, TVA, Total HT les uns
    en dessous des autres plutôt que côte à côte.
63. **Interface Paramètres** : *"il faut que les entreprises qui sont
    écrites disparaissent définitivement, je veux repartir de 0... cela
    fait plusieurs fois qu'on en discute et elles réapparaissent de temps
    en temps"* — a mené à retirer complètement les entreprises fictives
    du script de seed (cause racine du problème récurrent), plutôt qu'à
    un simple nettoyage ponctuel de plus.

---

## Remarques PDF — "Remarques sur les interfaces - bis" + capture d'écran (10/07/2026)

64. *"Je n'aime pas le fait que tout ne soit pas visible au premier coup
    d'œil... réduire les marges sur le côté (uniquement pour les lignes
    de lots)"*.
65. *"Les € des totaux alignés avec les € des prix TTC des logements...
    décaler les textes Prix TTC/TVA/Prix HT vers la gauche, alignés par
    la gauche, quitte à créer un espace entre les textes et les
    montants"*.
66. *"Colonne Clients trop grande, j'accepte 1 seul retour à la ligne"*.
67. *"Les boutons Modifier sont en fait à la suite du nom, il faudrait
    créer une colonne Action, comme pour les TMA... et mettre cette
    colonne en dernier"*.
68. *"J'aimerais aussi que dans les totaux, il y ait un prix moyen au m²
    total, c'est-à-dire la moyenne de tous les prix moyen/m²"* — précisé
    comme une moyenne des prix/m² de chaque lot, pas le total divisé par
    la surface totale.

## Retours successifs sur l'alignement (10/07/2026, mêmes échanges)

69. *"Pour les cartes je garderais les marges que l'on avait
    initialement, élargi à partir des lots"* — a fait revenir sur le
    premier essai (`main` élargi entièrement), remplacé par une
    technique n'élargissant que le tableau.
70. *"Prix TTC, TVA, etc. décale encore vers la droite, mets les entre
    parking et cave à peu près"*.
71. *"Rapproche 'Prix TTC, TVA, prix HT' des montants totaux, ils sont
    trop loin"* / *"l'affichage est un peu trop zoomé... agrandir la
    colonne Client, tu es repassé 4-5 fois à la ligne, une fois à la
    ligne maximum"* / *"chaque info dans les colonnes soit centrée et
    non alignée à gauche"*.
72. *"Décale entre Prix TTC etc., aligne sous la colonne Cave"* /
    *"réduis un peu la colonne client... pour agrandir un peu la colonne
    Commentaire, qui me paraît trop peu large"*.

---

## Création de TMA depuis l'interface (10/07/2026)

73. Demande de base (déjà listée au point 29) : bouton "Ajouter une TMA"
    avec formulaire de création — réalisé (route `POST /api/tma`,
    composant `FormulaireCreationTma.jsx`).
74. *"Rajoute dans le cadre de création d'une TMA, la date de la
    demande"* — a révélé que `TMA.dateDemande` existait dans le schéma
    depuis le début du projet sans jamais avoir été branché nulle part.
75. *"Agrandis la case description, il y a de la place sur la droite"* /
    *"aligne les boutons Créer et Annuler avec la case, pas le titre de
    la case, et décale-les un peu vers la droite"*.
76. Signalement : "NaN €" affiché sur les montants d'une TMA fraîchement
    créée (bug, voir `bugs.md`).

---

## Remarques PDF — "Remarque sur interface Clients" (11/07/2026)

77. Mettre "Clients" après "Lots", avant "TMA" dans le menu.
78. Agrandir les lignes en réduisant les marges, même principe qu'ailleurs
    (1 retour à la ligne maximum).
79. Mettre le n° du logement en premier (colonne).
80. Téléphone français affiché en "06 XX XX XX XX" (pas "+33..."), format
    international conservé pour l'étranger.
81. Agrandir les colonnes Nom client, Adresse, et un peu Email.
82. **Bug** : modifier un nom de client dans l'interface Lots créait une
    nouvelle ligne dans Clients au lieu de corriger l'existante, laissant
    une fiche fantôme (voir `bugs.md`).
83. Signalement complémentaire : après une modification, la liste
    déroulante des clients existants ne se rafraîchissait pas (bug, voir
    `bugs.md`).
84. *"Il faut quand même rapprocher... marges trop réduites, il faut un
    entre-deux"* — ajustement de la largeur après le premier essai.
85. *"Profites-en pour supprimer les noms qui étaient marqués en dur à
    l'origine, je vais en noter des nouveaux"* — remise à zéro complète de
    Clients et TMA (TMA supprimées car `acquereur` y est obligatoire).

---

## Remarques PDF — "Remarques sur interface Appels de fonds" (11/07/2026)

86. Filtre par phase à cases à cocher (plusieurs phases sélectionnables,
    ou aucune = toutes), pensé pour rester lisible avec beaucoup de lots.
87. Un champ en haut de page pour saisir une seule attestation MOE et
    l'appliquer à tous les lots d'une même phase en une fois, plutôt
    qu'un par un.
88. Règle métier : un lot Acté a nécessairement une date de réservation
    déjà connue — la phase "Réservation" du barème doit donc être générée
    automatiquement, sans attestation MOE (la seule phase dans ce cas).
89. L'ordre d'affichage des appels de fonds doit suivre celui défini dans
    Paramètres > Barème.
90. **Reporté** ("on verra plus tard") : export PDF par lot, détail par
    phase avec solde en fonction de ce qui est payé — à construire quand
    Nicolas le redemandera explicitement.

---

## Remarques PDF — "Nouvelles remarques" sur Appels de fonds (11/07/2026)

91. Pouvoir filtrer aussi par lot (en plus de la phase), avec une option
    pour tous les sélectionner.
92. Aligner le bouton "Appliquer à tous les lots de cette phase" avec le
    champ "Date attestation MOE".
93. Dans "Modifier", retirer le champ "Attestation MOE" puisque sa saisie
    se fait désormais en haut de page (en masse) — a révélé un bug de
    fond (voir `bugs.md`, "Modifier effaçait silencieusement
    l'émission").
94. Retirer "Réservation" de la liste déroulante des phases attestables en
    masse, puisque cette phase s'émet automatiquement depuis la date de
    réservation du lot.
95. Règle métier : si un client signe l'acte au moment où une phase a déjà
    été attestée pour d'autres lots du même programme (ex: fondations
    achevées), cette phase doit être considérée comme déjà réglée jusqu'à
    cette date pour lui aussi — implémentée comme une auto-émission en
    cascade (même date d'attestation) dès la génération des appels du
    nouveau lot Acté.
96. **Question ouverte, non résolue** : cas d'un client négociant un autre
    système de règlement (ex: tout payé à l'acte) — pas de piste actée,
    voir `docs/schema-donnees.md` ("Plan de règlement négocié").
97. Incompréhension des totaux des cartes de stats (ex: 3 logements × 2
    phases émises chacun devrait afficher "6") — a mené à distinguer
    explicitement "émis au total" (cumulatif, quel que soit le sous-statut
    ensuite) du sous-statut "Émis" strict (ni en retard, ni réglé) ; carte
    "Émis (au total)" ajoutée. A aussi révélé le bug du point 93 (données
    corrompues expliquant en partie l'écart constaté).

---

## Suivi de prêt et Signature acte (13/07/2026)

98. Demande explicite : construire les deux dernières interfaces
    identifiées dans le cadrage initial (règle métier n°4 de
    `analyse-excel.md`) — suivi de l'obtention du prêt bancaire, et suivi
    de la signature de l'acte notarié. Nécessaire selon Nicolas pour
    pouvoir ensuite tester correctement les alertes de retard (prévues
    depuis le tout début, mais impossibles à tester sans données de
    prêt/notaire réelles à afficher).
99. Choix d'organisation : **deux pages séparées** ("Suivi de prêt" et
    "Signature acte"), plutôt qu'une seule page combinée comme dans le
    fichier Excel d'origine.

---

## Remarques PDF — "Remarques sur interfaces Suivi de prêt et acte" (13/07/2026)

100. **Suivi de prêt** : banque et courtier doivent avoir des coordonnées
     complètes (pas juste un nom), consultables dans une fenêtre qui
     s'ouvre au clic depuis le tableau, et disponibles pour un futur
     export PDF.
101. **Suivi de prêt** : bouton "Sans prêt" qui vide toutes les infos à
     partir de la colonne "Banque" et fusionne la ligne avec la mention
     "Acquisition avec fonds personnels".
102. **Signature acte** : ajouter une colonne "Notaire", avec le même
     traitement que banque/courtier (coordonnées complètes, fenêtre au
     clic, disponible à l'export PDF).
103. Signalement : un mauvais numéro de téléphone (banque/courtier/
     notaire) ne s'enregistrait pas sans message d'erreur — demande de
     reprendre le même principe de sécurisation que le formulaire
     Entreprises (téléphone, commune, code postal), sans nouveau bug
     (bug de régression, voir `docs/bugs.md`).

---

## Alertes de retard (13/07/2026)

104. Demande de passer aux alertes de retard (point 3 du cadrage initial
     du 09/07/2026, et décisions du 10/07/2026 pour les deux alertes
     TMA) — devenu testable maintenant que Suivi de prêt et Signature
     acte existent.
105. Rappel explicite en cours de construction : *"alerte également pour
     TMA n'oublies pas"* — les deux alertes TMA (entreprise n'ayant pas
     chiffré à temps, client n'ayant pas répondu à une facture) actées le
     10/07/2026 mais jamais construites depuis, à inclure dans la même
     fenêtre que prêt/notaire/appels de fonds.

---

## Authentification JWT (13/07/2026)

106. Demande de passer à l'authentification JWT, prévue depuis le
     cadrage initial (09/07/2026) — dernier grand chantier restant une
     fois le cadrage entièrement couvert.
107. Choix (question posée) : pas d'auto-inscription publique — les
     comptes (3 rôles : admin/gestionnaire/lecture) sont créés par un
     admin depuis Paramètres, pas par n'importe qui.
108. Choix (question posée) : toute l'application derrière la connexion,
     y compris la simple lecture — pas de consultation possible sans
     être connecté.

---

## Remarques PDF — "Nouvelles demandes générales" (13/07/2026)

Longue liste transmise d'un coup, à traiter **point par point avec
validation de Nicolas à chaque étape** (pas de traitement en bloc). Liste
complète consignée ici pour ne rien perdre ; l'état d'avancement réel de
chaque point est suivi en conversation, pas dans ce document.

**Connexion**
109. Œil cliquable à côté du mot de passe pour pouvoir le relire.

**Entête**
110. Ordre des onglets : Lots, Clients, Prêt, Acte, Appels de fonds, TMA.
111. Réfléchir à une présentation plus soignée du bandeau (propositions à
     faire), en y ajoutant maître d'ouvrage, nombre de logements et date
     de livraison.

**Interface Lots**
112. Plusieurs terrasses possibles : colonne supplémentaire créée
     seulement si besoin (une seule colonne par défaut), jusqu'à 3-4 —
     à prévoir à la fois dans Paramètres et dans Lots.
113. En cas de colonnes supplémentaires, adapter la taille des lignes/
     écritures pour que tout reste visible sur un écran plein, sans
     barre de défilement horizontale.
114. Message de rappel si un logement passe "Acté" sans date de
     réception d'offre de prêt renseignée (sauf si "sans prêt").
115. Rendre la présentation des totaux plus esthétique (propositions à
     faire).
116. Statut par défaut "libre" pour tous les logements au démarrage d'un
     projet.
117. Bouton "Annuler" qui réinitialise toutes les informations saisies
     pour un logement.
118. Nouveau filtre "Annulé" (lots annulés avec leurs informations
     toujours visibles).
119. Statut "travaux" : moment de déclenchement pas encore clair pour
     Nicolas lui-même — à revoir plus tard, aucune action pour l'instant.

**Interface Appels de fonds**
120. Nouvelle colonne "Envoyé le" ; la date limite de règlement doit se
     recalculer à partir de cette date + le délai défini dans
     Paramètres.
121. Cas des attestations MOE émises avant la signature de l'acte
     (plusieurs appels considérés comme envoyés et réglés le jour de
     l'acte) : la date "Envoyé le" doit alors correspondre à la date de
     signature de l'acte.
122. Note pour plus tard (exports) : générer les appels de fonds par
     logement pour envoi direct au client (avec le déjà-réglé et le
     nouvel appel généré) — à rediscuter le moment venu.
123. Message d'erreur bloquant si le barème (phase/pourcentage) est
     modifié dans Paramètres alors que des appels de fonds ont déjà été
     émis — risque de fausser des montants déjà émis, explicitement
     signalé comme important.
124. Bouton ouvrant une fenêtre récapitulative des attestations MOE avec
     leurs dates.
125. **Bug** : corriger une date de signature d'acte (ou un statut passé
     à tort à "Acté") doit remettre "non réglé" un appel de fonds qui
     avait été marqué payé automatiquement à cause de cette date/statut
     — sauf si un vrai règlement manuel avait été saisi entre-temps.
126. Une attestation MOE ne peut être remplie que si celle de la phase
     précédente l'est déjà (la phase "Réservation" n'entre pas dans ce
     cadre, elle ne prend jamais d'attestation).

**Interface TMA**
127. Création d'une TMA possible même si le lot est "Option" ou
     "Réservé" (pas seulement "Acté"), avec un message d'avertissement
     rouge sous la TMA ("ce logement n'est pas encore acté").
128. Bouton "Supprimer" une TMA.
129. Nouveau filtre "Annulé" (TMA annulées, infos toujours visibles).
130. Nouveau filtre en liste déroulante regroupant les statuts : "En
     cours" (demande/étude/chiffré/facturé), "Validé" (validé/travaux/
     terminé), "Refusé", "Annulé".
131. Note pour plus tard (exports) : bouton de génération d'un devis à
     envoyer au client.
132. Note pour plus tard (exports) : génération d'un envoi de demandes
     de TMA aux entreprises.
133. Si un client annule sa réservation/option/acte, la TMA associée ne
     doit pas s'effacer automatiquement — un message doit indiquer que
     ce client n'est plus le client actuel (cas d'un promoteur qui
     proposerait la même TMA au client suivant).
134. **Bug signalé** : l'alerte de retard entreprise TMA ne se déclenche
     pas (testé avec un envoi entreprise daté de mars). Demande
     complémentaire : message rouge sous le statut "étude" affichant
     "retard entreprise" quand c'est le cas, pour que ce soit visible
     sans attendre la fenêtre d'alertes.
135. Empêcher de renseigner une entreprise tant que la date d'envoi
     n'est pas complétée (avec message explicite).
136. Nouveau champ "Nombre d'entreprises concernées" à remplir avant
     d'ajouter les entreprises, pour déterminer objectivement le moment
     où toutes ont répondu (passage à "chiffré").

**Alerte**
137. Pouvoir désactiver la fenêtre d'alertes depuis Paramètres — soit
     toutes les alertes, soit une par une (prêt, appels de fonds, etc.).

**Généralité**
138. Nouvelle page d'accueil de sélection de programme (choisir un
     programme existant ou en créer un nouveau en le nommant), avec
     aussi la possibilité de changer de programme depuis les interfaces
     (ex: dans l'entête).
139. Repenser l'esthétique générale de l'application (le thème sombre
     actuel plaît, mais des améliorations sont possibles — propositions
     à faire).
140. Remplissage automatique du code postal à partir de la commune
     saisie (souhaité, pas obligatoire).
141. Export Excel (en plus du PDF), à rediscuter au moment des exports.
142. Vérifier qu'il ne reste plus aucune donnée codée en dur (résidus
     des tout premiers tests), à l'exception de ce que Nicolas a
     lui-même saisi depuis.
143. Repasser en revue l'ensemble du projet à la recherche de bugs pas
     encore identifiés.
144. Rendre l'application responsive (toutes tailles d'écran).
145. Rédiger un topo complet sur ce qu'impliquerait la vente de l'appli
     (création d'entreprise, faisabilité sans diplôme, assurances,
     aspects techniques...) avec une estimation des coûts.
146. Donner une estimation de prix de vente (mise en service +
     éventuelles mises à jour mensuelles/annuelles).
147. Étudier la possibilité d'un usage mobile de l'application, et la
     mettre en place si c'est possible.
148. Récapitulatif simple de toutes les technologies utilisées, pour que
     Nicolas puisse se l'approprier et l'expliquer en entretien.
149. Document récapitulatif de tout ce qui a été fait sur le projet,
     pour le présenter en entretien.
150. **Question** : une fois le projet visible sur GitHub pour des
     recruteurs, comment s'assurer qu'il n'y a pas de risque de vol
     d'informations ?

---

## Remarques verbales sur l'interface Lots (13/07/2026, en marge du point 115)

Transmises d'un coup pendant les allers-retours sur l'esthétique des
totaux (point 115) — traitées une par une comme le reste.

151. Cartes de stats trop uniformes, pas assez de hiérarchie visuelle
     (elles attirent presque autant l'œil que le tableau) — demande
     explicite de propositions (ombre légère, chiffre plus gros, libellé
     plus discret).
152. Retirer les décimales partout où il y en a, sauf sur les totaux
     TTC/TVA/HT du pied de tableau (précision nécessaire pour la TVA/HT).
153. Sortir "Prix moyen au m²" du pied de tableau, l'isoler ailleurs
     (proposition à faire, ex: en haut de page) ; décaler Total TTC/TVA/
     Total HT vers la gauche, Total TTC à peu près sous la colonne
     "Prix TTC".
154. Filtres de statut transformés en vrais boutons colorés, la couleur
     du statut sélectionné bien marquée (Tous=noir, Libre=gris,
     Réservé=orange, Acté=vert, Option=bleu).
155. Remplacer le bouton texte "Modifier" (répété sur chaque ligne) par
     une icône, pour gagner en largeur.
156. Nouvelle colonne "Annexes" regroupant Terrasse/Balcon/Loggia/Jardin/
     Parking/Cave/Cellier empilés verticalement dans une seule cellule.
     Séparer Terrasse et Balcon (et ajouter Loggia) comme catégories
     distinctes dans Paramètres, chacune pouvant avoir plusieurs valeurs
     (comme les terrasses aujourd'hui) ; séparer aussi Cave et Cellier
     (aujourd'hui fusionnés "Caves/Celliers").
157. Renommer la colonne "Prix/m²" en "Prix TTC/m² SHAB".
158. **Idée à creuser plus tard** (suite au point 151, cartes de stats
     validées) : ajouter une carte "Taux de commercialisation" = (nombre
     de logements Actés + Réservés) / total, en % — pas encore de
     décision sur l'emplacement ni le calcul exact des arrondis.

## Remarques verbales sur l'interface Appels de fonds (13/07/2026, en marge du point 123)

159. Pouvoir modifier le barème d'UN logement en particulier, à la main,
     même après que des appels de fonds y aient déjà été émis (cas d'une
     négociation directe avec le client, différente du barème général du
     programme) — contrairement au barème général, verrouillé par le point
     123 dès qu'un appel est émis. Formulaire dédié par logement (toutes
     les phases ensemble, contrôle "total = 100%"), pas une édition ligne
     par ligne.

## Remarques verbales sur l'interface TMA (13/07/2026, en marge du point 128)

160. Colonne "Action" retravaillée comme sur la page Lots : un seul bouton
     crayon, qui déplie en dessous de la ligne "Modifier les dates",
     "Entreprises", et les boutons "Refuser la TMA"/"Supprimer la TMA" —
     plus les boutons épars directement sur la ligne.
161. Pouvoir aussi modifier localisation/description/montant client depuis
     ce même panneau — le montant client est normalement recalculé
     automatiquement à partir des devis entreprises, mais une négociation
     directe avec le client peut aboutir à un montant différent ; le
     modifier à la main doit afficher un avertissement, et fige ce montant
     (plus jamais recalculé automatiquement ensuite).
162. **Revient sur le point 128** : le bouton "Supprimer la TMA" est
     retiré (route serveur incluse) — il faut toujours garder une trace,
     "Annuler la TMA" (point 129) suffit pour ce besoin. "Annuler la TMA"
     passe en rouge (bouton-danger) pour bien marquer que c'est une action
     à ne pas prendre à la légère, même si elle reste réversible.
163. Nouvelle colonne "Commentaire" (texte libre) sur le tableau des TMA,
     modifiable depuis le même panneau (crayon) que localisation/
     description/montant client — positionnée après la colonne "Statut".
     Tableau élargi (largeur "moyenne", comme la page Clients) pour
     accueillir cette colonne supplémentaire sans être trop compressé.

## Remarques générales du 17/07/2026 (PDF)

**Lots**
164. Rajouter une colonne "Surface < 1,80m²", qui ne s'affiche que si le
     cas se présente.
165. Pouvoir compléter dans Paramètres, au démarrage d'un programme, la
     liste de toutes les annexes numérotées (parkings, caves, celliers) —
     le client choisirait alors les annexes parmi une liste déroulante à
     chaque fois (une liste par type : parking, cave, cellier). Pour créer
     le prix d'un logement, il y a le prix du logement lui-même + le prix
     des annexes (ex: logement à 100 000 € + parking à 15 000 € + cave à
     5 000 €) — pouvoir monter le prix ainsi, pour éviter que le client
     fasse ce calcul sur Excel avant de recopier le prix final à la main.
     Permet aussi, une fois tous les logements complétés avec leurs
     annexes attribuées, d'avoir un état des annexes non vendues
     rattachées à aucun lot, et de pouvoir les rajouter à un lot (donc les
     vendre avec) — cas d'une négociation où l'acheteur veut un parking en
     plus de ce qui était prévu à la base.
166. À réfléchir plus tard : carte "Taux de commercialisation", basée sur
     le nombre de lots vendus sur le nombre de lots au total.
167. Nommer la première ligne de cartes "Commercialisation", la deuxième
     "Chiffre d'affaires".
168. Mettre les taux en % sous les nombres ou montants de chaque carte.
169. Pouvoir modifier le prix TTC du logement à la main depuis cette page
     (négociation avec le client, ou réévaluation du prix) — la raison
     devra être notée en dessous. Garder aussi un historique des
     modifications de prix quelque part. Idée : intégrer la page
     "Annulés" directement dans la page Lots ; cette page contiendrait
     alors un historique des annulations de ventes, mais aussi un
     historique des modifications de prix.
170. Réflexion en cours : plutôt que de garder la liste déroulante pour le
     choix du statut, ne serait-il pas préférable que le statut se mette à
     jour automatiquement en fonction des dates remplies (ex: remplir la
     date d'option fait passer le statut à "Option", ainsi de suite) ?

**Appels de fonds**
171. Lors du travail sur les exports : pouvoir générer un envoi d'appels
     de fonds collectifs (une fois actés et qu'une attestation MOE est
     émise) — cette génération remplirait automatiquement la case
     "Envoyé le", tout en laissant la possibilité de la remplir à la
     main. Une fenêtre doit s'ouvrir à la génération, listant les appels
     de fonds qui vont être générés avec les logements correspondants,
     avec la possibilité de décocher certains logements.

**TMA**
172. Retirer le statut "Travaux" (ne sert à rien). Pour le statut
     "Terminé", ajouter un bouton permettant d'y passer à la main
     (lorsque le client va sur chantier pointer que les travaux ont bien
     été réalisés par les entreprises). ✅ fait le 20/07/2026 (avec un
     bouton "Annuler la fin des travaux" pour revenir en arrière en cas
     de clic par erreur, ajouté à la demande de Nicolas le jour même).

**Paramètres**
173. Pour "Délais et taux" : bien séparer les paramètres correspondants
     par page. Rajouter sous la case "Taux de marge TMA" une case à
     cocher "Montant devis client saisi manuellement". ✅ fait le
     20/07/2026 (regroupement par page : Lots/Suivi de prêt/Signature
     acte/Appels de fonds/TMA ; la case désactive le pré-remplissage
     automatique du montant client par le taux de marge pour tout le
     programme).

**Généralité**
174. Pour les colonnes "Action" de chaque page : mettre un crayon à la
     place des boutons (même principe que TMA ou Lots), partout. ✅ fait
     le 20/07/2026 (Clients, Appels de fonds, Signature acte, Suivi de
     prêt — Lots et TMA l'avaient déjà ; les actions secondaires propres
     à une ligne, ex: "Barème du lot", "Sans prêt", restent des boutons
     texte à côté du crayon, pas remplacées).
175. Sans rien toucher à ce qui est déjà en place, enlever partout où
     elle existe la règle "on ne peut revenir le texte qu'une seule fois
     à la ligne" — présente au moins sur Lots de mémoire, peut-être
     ailleurs aussi, à vérifier. ✅ fait le 20/07/2026, corrigé le même
     jour (largeurs de colonnes d'origine conservées comme demandé ;
     la vraie cause était l'absence de "overflow-wrap: break-word" —
     un texte sans espace, ex: un mot très long, ne revenait jamais à
     la ligne et débordait tel quel au lieu de se couper).
176. Mettre une colonne Commentaire dans chaque tableau de chaque page.
177. Se renseigner pour voir s'il y a des choses à rajouter dans "Suivi
     de prêt" et "Signature acte".
178. À la fin : analyser l'ensemble de l'application et faire un point
     sur ce qui peut être amélioré.
179. À réfléchir à la fin : faudra-t-il créer une version démo ?

---

## Notes

Cette liste sera tenue à jour à chaque nouvelle demande, dans le même
esprit que `journal.md` et `bugs.md`.
x