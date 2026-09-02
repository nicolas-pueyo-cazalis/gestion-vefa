# Demandes de Nicolas — Gestion VEFA

Liste chronologique de toutes les demandes, remarques et décisions
exprimées par Nicolas depuis le début du projet — hors détails
d'implémentation (voir `journal.md` pour le "comment", `bugs.md` pour les
bugs rencontrés). Objectif : garder une trace fidèle et complète de ce qui
a été demandé, pour pouvoir la reparcourir ou la raconter (ex: entretien
d'alternance).

**Légende** : ✅ fait — ⏳ reporté / en attente — ❓ question sans suite
donnée pour l'instant — ❌ annulé, ne sera pas fait.

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

1. ✅ Fournir les deux fichiers Excel métier (suivi VEFA, suivi TMA) comme
   base de compréhension, à améliorer plutôt qu'à copier à l'identique.
2. ✅ Sur l'analyse Excel : les constantes repérées dans les formules
   (barème des phases, délais prêt/notaire/retour entreprise, taux de
   marge TMA, règle sur montant TMA négatif) doivent devenir des
   **paramètres modifiables par programme**, pas des constantes figées.
3. ✅ Nouvelle règle (absente d'Excel) : une alerte sur les appels de fonds
   émis mais non réglés à temps, avec une fenêtre listant tous les
   retards à l'ouverture de l'application.
4. ✅ Règle sur montant TMA négatif changée par rapport à Excel : montant
   facturé au client = 0€ si le montant entreprise est négatif (au lieu
   de "avoir sans marge").
5. ✅ Sur le schéma de données : étages en liste déroulante modifiable par
   programme (pas un enum figé) ; orientation en liste fixe (8 valeurs) ;
   montants toujours stockés en `Number` pur, jamais avec le symbole "€" ;
   téléphone au format international (`libphonenumber-js`) car les
   clients peuvent être étrangers ; email validé par regex ; banque et
   courtier doivent être des coordonnées complètes, pas juste un nom.

---

## Étape 1 — Version vanilla (09/07/2026)

6. ✅ Corrections visuelles mineures faites par Nicolas lui-même sur
   `style.css` (taille de police des cartes de stats).
7. ✅ Cartes de stats TMA : "Validées" doit regrouper `valide` + `travaux` +
   `termine` (sans `facture`) ; ordre des boutons de filtre ajusté
   (Validé/Refusé après Facturé). *(le statut "travaux" a depuis été
   retiré, voir point 172)*
8. ✅ Bandeau : afficher nom (gras) + adresse du programme sur les deux
   pages, uniformisé.

---

## Étape 2 — Migration React (10/07/2026)

9. ✅ Demande explicite d'explications systématiques et détaillées à chaque
   nouveau fichier/concept, sans enchaîner plusieurs fichiers sans pause.
10. ✅ Demande de petits exercices de code pour pratiquer, plutôt que des
    quiz.
11. ✅ Rappel : signaler les points de commit et mettre à jour la doc sans
    qu'il ait à le redemander.

---

## Étape 3 — Back-end Express/MongoDB (10/07/2026)

12. ✅ Choix hébergement : MongoDB Atlas (cloud) plutôt qu'une base locale,
    cohérent avec le déploiement final prévu.
13. ✅ Refus d'un correctif "on repart toujours à Demande" en cas de refus
    TMA par erreur : *"il se peut que l'on clique sur refusé par
    erreur... s'il refuse au montant de la facture... il faudrait revenir
    à l'étape qui a précédé le refus"* → exige une restauration exacte de
    l'état précédent (`statutAvantRefus`).
14. ✅ Rejet de la colonne "Actions" avec un bouton par transition de statut
    TMA : *"ça m'embête... crée une colonne juste pour ça, ça fait
    trop"* → le statut doit se déduire automatiquement des dates saisies
    (comme Excel), un seul bouton manuel ("Refuser") pour ce qui ne peut
    pas se déduire.
15. ✅ Correction de la machine à états TMA : "facturé" doit être classé
    dans "En cours" (pas "Validées") car le client n'a pas encore validé ;
    puis correction de l'ordre lui-même : "facturé" doit précéder
    "validé" (la facture part avant le retour signé du client).
16. ✅ Confirmation de la nécessité de gérer plusieurs entreprises pour une
    même TMA (pas juste une seule ligne entreprise/devis).
17. ✅ Nouvelle règle : le statut ne passe à "Chiffré" que si **toutes** les
    entreprises sollicitées ont répondu — une seule en attente doit
    garder la TMA à "Étude".
18. ✅ Trois points d'amélioration actés en fin de journée :
    - Référentiel `Entreprise` séparé (nom, corps de travaux, coordonnées),
      pour remplacer la saisie libre par une liste déroulante — objectif
      cité : futur export des TMA envoyé aux entreprises.
    - Nouvelle page "Paramètres" pour éditer `programme.parametres` sans
      passer par la base directement.
    - Deux nouvelles alertes à prévoir (entreprise n'ayant pas chiffré à
      temps, client n'ayant pas répondu à une facture TMA).
19. ✅ Pause sur `TmaEntreprise` : ajouter une date de retour entreprise
    (*"pour le suivi c'est bien, si un jour il y a besoin de l'info"*),
    remplie **à la main**, pas déduite automatiquement (contrairement à
    d'autres dates de l'appli) — précisé explicitement.
20. ✅ Signalement d'une page blanche (bug, voir `bugs.md`).
21. ✅ Réglages visuels du bandeau : lien "Paramètres" poussé à droite,
    effet de survol sur la nav, espacement entre cartes de stats et
    filtres.

---

## Remarques PDF #1 — "Remarques sur le paramétrage des programmes et interfaces" (10/07/2026)

Document détaillé couvrant plusieurs interfaces, remplacé ensuite par une
version étendue (voir section suivante) — les points ci-dessous sont ceux
qui ont persisté dans la version finale.

## Remarques PDF #2 — version étendue, avec `Synthese programme.pdf` en référence (10/07/2026)

22. ✅ **Informations du programme** : ajouter le champ "Date de livraison".
23. ✅ **Délais et taux** : retirer la mention "(ancien comportement Excel)"
    du libellé de l'option `avoir_sans_marge`.
24. ✅ **Barème des phases** : pouvoir réordonner les phases (pas seulement
    ajouter/retirer).
25. ✅ **Téléphone** : composant réutilisable avec préfixe pays et
    validation du nombre de chiffres attendu — précisé ensuite dans une
    remarque séparée : *"pouvoir choisir le préfixe en fonction du pays,
    et ensuite que nous soyons obligés de remplir le nombre de numéro qui
    correspond"*.
26. ✅ **Entreprises** (Paramètres) : ajouter adresse, commune, code postal,
    téléphone (international), email — référentiel complet, pas juste
    nom + corps de travaux.
27. ✅ **Lots (interface, remarque détaillée en 8 points)** : entre autres,
    la colonne "Nom client" en texte libre doit être remplacée par un
    petit champ civilité + nom qui **crée ou lie un vrai `Acquereur`**
    plutôt que de rester du texte déconnecté des données (point validé
    explicitement : *"Point 7 : je suis d'accord"*).
28. ✅ **Page Lots** : restructurer les colonnes façon "Synthèse programme"
    (retirer l'ID client, unités affichées à côté des valeurs plutôt que
    dans les en-têtes, Prix/m² calculé automatiquement, totaux TTC/TVA
    (20%)/HT en bas de tableau, statut/client/dates éditables en ligne).
29. ✅ **Interface TMA** : bouton "Ajouter une TMA" avec formulaire de
    création (jusqu'ici les TMA n'étaient que lues, jamais créées depuis
    l'interface).
30. ✅ **Nouvelle page "Clients"** : coordonnées complètes des acquéreurs
    (prénom, adresse, commune, code postal, téléphone, email), en vue
    d'un futur export/listing.

---

## Bug "Code postal" et corrections associées (10/07/2026)

31. ✅ Signalement du bug de validation du code postal (voir `bugs.md` pour
    le détail investigation/cause/correction).
32. ✅ Après une première tentative de correctif infructueuse : *"non j'ai
    toujours le même problème"* → a mené au remplacement de la validation
    `pattern` HTML par une validation JavaScript explicite.
33. ✅ Remarque UX : les popups `alert()` de validation sont perçues comme
    intrusives → remplacées par des messages d'erreur affichés sous
    chaque champ concerné.
34. ✅ Signalement (clarifié comme fausse alerte, pas un bug de l'appli) :
    des entreprises supprimées semblaient "revenir" après navigation —
    causé par une réexécution de `node seed.js` en parallèle d'un test
    manuel, pas un défaut du code.
35. ✅ Sur l'interface TMA > Entreprises : la date de réception du devis
    devait être saisissable dès l'ajout d'une entreprise, pas seulement
    en modifiant une ligne déjà créée. Remarque associée : le menu
    déroulant "Entreprise" paraissait plus petit que le champ "Montant
    devis" (bug de style, `<select>` non stylé).

---

## Paramètres > Lots (10/07/2026)

36. ✅ Demande explicite : pouvoir supprimer un lot depuis la page
    Paramètres (pas seulement créer/modifier).

### Remarques PDF — "Remarques sur le paramétrage des lots" (10/07/2026, 1ʳᵉ version)

37. ✅ Renommer "Référence" en "N° du logement".
38. ✅ Empêcher de créer plus de logements que le nombre annoncé pour le
    programme (ex: 8 logements max si `nombreLogements` = 8).
39. ✅ Renommer "Caves" en "Caves / Celliers".
40. ✅ Corriger le récapitulatif des lots : les champs remplis (terrasse,
    jardin, etc.) doivent apparaître dans la liste au-dessus du
    formulaire, pas seulement dans le formulaire lui-même.

### Remarques PDF — version complétée (10/07/2026, 2ᵉ version, "Nouvelles remarques")

41. ✅ Remplacer "Parkings" par "N° de parking", et de même pour les
    caves/celliers — ce ne sont pas des compteurs mais des **numéros
    identifiants** (une place de parking précise), un lot pouvant en
    avoir plusieurs. *(devenu le catalogue `Annexe`, voir point 165)*
42. ✅ Dans le récapitulatif, afficher "n° de parking : 10" plutôt que
    "10 parking" — même principe pour caves/celliers.
43. ✅ Interdiction d'avoir deux fois le même numéro de parking ou de
    cave/cellier — comprise et implémentée comme une règle **globale sur
    tout le programme** (deux lots ne peuvent pas revendiquer le même
    numéro), pas seulement une vérification locale au lot.
44. ✅ Le message "nombre maximum de logements atteint" doit disparaître
    dès qu'on repasse sous la limite (ex: en augmentant le nombre de
    logements prévus), pas rester affiché indéfiniment.
45. ✅ Ajouter un message d'avertissement quand moins de logements ont été
    créés que le nombre annoncé pour le programme.
46. ✅ **Doc à créer** : la liste de toutes les modifications demandées
    depuis le début du projet → ce document.

---

## Derniers ajustements avant pause (10/07/2026)

47. ✅ Demande explicite : pouvoir supprimer un lot (formulée en cours de
    travail, avant même le PDF des "nouvelles remarques").
48. ✅ Le message "il manque X logement(s)..." doit être affiché en rouge,
    comme le message de plafond atteint.
49. ✅ Les champs "N° de parking"/"N° de cave/cellier" doivent être alignés
    avec les autres champs du formulaire, avec le bouton "Ajouter" en
    dessous de l'input (pas à côté).
50. ✅ Le message d'erreur en cas de doublon de numéro de parking/cave doit
    être un petit message ciblé sur le champ concerné, pas un gros
    message d'erreur en haut de page.
51. ✅ Signalement (3ᵉ occurrence) : les entreprises initialement saisies
    étaient de nouveau revenues aux données fictives d'origine — même
    cause qu'avant (reseed pendant un test manuel en parallèle). A mené à
    une règle explicite : toujours demander confirmation et **attendre la
    réponse** avant de relancer `node seed.js`, pas seulement l'annoncer.
52. ✅ Après plusieurs itérations sur l'alignement des champs (2 essais
    infructueux avant la bonne correction) : "à la suite de Jardin, tout
    doit être à la suite comme la première ligne" — a mené à la vraie
    cause (le formulaire alignait les champs par le bas, `align-items:
    end`, ce qui ne fonctionne pas quand un champ est plus haut que ses
    voisins) plutôt qu'à un correctif localisé.

---

## Reprise (10/07/2026, plus tard)

53. ✅ **Entreprises** : ajouter un "n° de lot" (ex: 01, 02...) par
    entreprise, saisi à la main — numérotation des lots de travaux du
    marché, distincte des `Lot` (logements) déjà existants dans l'appli.
54. ✅ Signalement : le champ "n° de téléphone" restait encadré en rouge en
    permanence (bug, voir `bugs.md`).
55. ✅ Après la restructuration de la page Lots : "ce n'est pas présenté
    convenable, et les dates n'apparaissent pas dans les lignes" — les
    dates étaient éditables mais jamais affichées dans le tableau, et
    l'espacement client/bouton + les totaux étaient mal mis en forme.
56. ✅ Signalement : page blanche générale — remonté jusqu'à un lot supprimé
    (D01) alors qu'une TMA le référençait encore (bug, voir `bugs.md`).
    A mené à une règle de robustesse : un lot référencé par une TMA/un
    appel de fonds ne doit plus pouvoir être supprimé.

---

## Remarques PDF — "Nouvelles remarques sur les interfaces" (10/07/2026)

57. ✅ **Interface Lots** : colonnes manquantes dans les lignes — Terrasses,
    Jardins, Parkings, Caves/Celliers (existaient dans Paramètres > Lots
    mais jamais affichées dans le tableau principal).
58. ✅ **Bug dates/statut** : *"si un logement est réservé, je peux quand
    même mettre une date de signature d'acte. Il faut que la date
    affichée corresponde au statut du lot"* (bug, voir `bugs.md`).
59. ✅ Colonne "Client" trop de retours à la ligne — impossibilité
    d'agrandir la largeur des lignes évoquée comme piste.
60. ✅ Colonne "Commentaire" manquante.
61. ✅ Boutons "Modifier" des lots libres non alignés avec les autres
    boutons "Modifier".
62. ✅ Présentation des totaux à revoir : Total TTC, TVA, Total HT les uns
    en dessous des autres plutôt que côte à côte.
63. ✅ **Interface Paramètres** : *"il faut que les entreprises qui sont
    écrites disparaissent définitivement, je veux repartir de 0... cela
    fait plusieurs fois qu'on en discute et elles réapparaissent de temps
    en temps"* — a mené à retirer complètement les entreprises fictives
    du script de seed (cause racine du problème récurrent), plutôt qu'à
    un simple nettoyage ponctuel de plus.

---

## Remarques PDF — "Remarques sur les interfaces - bis" + capture d'écran (10/07/2026)

64. ✅ *"Je n'aime pas le fait que tout ne soit pas visible au premier coup
    d'œil... réduire les marges sur le côté (uniquement pour les lignes
    de lots)"*.
65. ✅ *"Les € des totaux alignés avec les € des prix TTC des logements...
    décaler les textes Prix TTC/TVA/Prix HT vers la gauche, alignés par
    la gauche, quitte à créer un espace entre les textes et les
    montants"*.
66. ✅ *"Colonne Clients trop grande, j'accepte 1 seul retour à la ligne"*.
    *(règle assouplie depuis, voir point 175)*
67. ✅ *"Les boutons Modifier sont en fait à la suite du nom, il faudrait
    créer une colonne Action, comme pour les TMA... et mettre cette
    colonne en dernier"*.
68. ✅ *"J'aimerais aussi que dans les totaux, il y ait un prix moyen au m²
    total, c'est-à-dire la moyenne de tous les prix moyen/m²"* — précisé
    comme une moyenne des prix/m² de chaque lot, pas le total divisé par
    la surface totale.

## Retours successifs sur l'alignement (10/07/2026, mêmes échanges)

69. ✅ *"Pour les cartes je garderais les marges que l'on avait
    initialement, élargi à partir des lots"* — a fait revenir sur le
    premier essai (`main` élargi entièrement), remplacé par une
    technique n'élargissant que le tableau.
70. ✅ *"Prix TTC, TVA, etc. décale encore vers la droite, mets les entre
    parking et cave à peu près"*.
71. ✅ *"Rapproche 'Prix TTC, TVA, prix HT' des montants totaux, ils sont
    trop loin"* / *"l'affichage est un peu trop zoomé... agrandir la
    colonne Client, tu es repassé 4-5 fois à la ligne, une fois à la
    ligne maximum"* / *"chaque info dans les colonnes soit centrée et
    non alignée à gauche"*. *(règle du 1 seul retour à la ligne assouplie
    depuis, voir point 175)*
72. ✅ *"Décale entre Prix TTC etc., aligne sous la colonne Cave"* /
    *"réduis un peu la colonne client... pour agrandir un peu la colonne
    Commentaire, qui me paraît trop peu large"*.

---

## Création de TMA depuis l'interface (10/07/2026)

73. ✅ Demande de base (déjà listée au point 29) : bouton "Ajouter une TMA"
    avec formulaire de création — réalisé (route `POST /api/tma`,
    composant `FormulaireCreationTma.jsx`).
74. ✅ *"Rajoute dans le cadre de création d'une TMA, la date de la
    demande"* — a révélé que `TMA.dateDemande` existait dans le schéma
    depuis le début du projet sans jamais avoir été branché nulle part.
75. ✅ *"Agrandis la case description, il y a de la place sur la droite"* /
    *"aligne les boutons Créer et Annuler avec la case, pas le titre de
    la case, et décale-les un peu vers la droite"*.
76. ✅ Signalement : "NaN €" affiché sur les montants d'une TMA fraîchement
    créée (bug, voir `bugs.md`).

---

## Remarques PDF — "Remarque sur interface Clients" (11/07/2026)

77. ✅ Mettre "Clients" après "Lots", avant "TMA" dans le menu.
78. ✅ Agrandir les lignes en réduisant les marges, même principe qu'ailleurs
    (1 retour à la ligne maximum). *(règle assouplie depuis, voir point 175)*
79. ✅ Mettre le n° du logement en premier (colonne).
80. ✅ Téléphone français affiché en "06 XX XX XX XX" (pas "+33..."), format
    international conservé pour l'étranger.
81. ✅ Agrandir les colonnes Nom client, Adresse, et un peu Email.
82. ✅ **Bug** : modifier un nom de client dans l'interface Lots créait une
    nouvelle ligne dans Clients au lieu de corriger l'existante, laissant
    une fiche fantôme (voir `bugs.md`).
83. ✅ Signalement complémentaire : après une modification, la liste
    déroulante des clients existants ne se rafraîchissait pas (bug, voir
    `bugs.md`).
84. ✅ *"Il faut quand même rapprocher... marges trop réduites, il faut un
    entre-deux"* — ajustement de la largeur après le premier essai.
85. ✅ *"Profites-en pour supprimer les noms qui étaient marqués en dur à
    l'origine, je vais en noter des nouveaux"* — remise à zéro complète de
    Clients et TMA (TMA supprimées car `acquereur` y est obligatoire).

---

## Remarques PDF — "Remarques sur interface Appels de fonds" (11/07/2026)

86. ✅ Filtre par phase à cases à cocher (plusieurs phases sélectionnables,
    ou aucune = toutes), pensé pour rester lisible avec beaucoup de lots.
87. ✅ Un champ en haut de page pour saisir une seule attestation MOE et
    l'appliquer à tous les lots d'une même phase en une fois, plutôt
    qu'un par un.
88. ✅ Règle métier : un lot Acté a nécessairement une date de réservation
    déjà connue — la phase "Réservation" du barème doit donc être générée
    automatiquement, sans attestation MOE (la seule phase dans ce cas).
89. ✅ L'ordre d'affichage des appels de fonds doit suivre celui défini dans
    Paramètres > Barème.
90. ✅ **Reporté** ("on verra plus tard") : export PDF par lot, détail par
    phase avec solde en fonction de ce qui est payé — à construire quand
    Nicolas le redemandera explicitement. ✅ fait, voir le récapitulatif
    détaillé par phase (points 200-201) — coché le 31/08/2026, trouvé
    périmé lors d'une relecture de cette liste.

---

## Remarques PDF — "Nouvelles remarques" sur Appels de fonds (11/07/2026)

91. ✅ Pouvoir filtrer aussi par lot (en plus de la phase), avec une option
    pour tous les sélectionner.
92. ✅ Aligner le bouton "Appliquer à tous les lots de cette phase" avec le
    champ "Date attestation MOE".
93. ✅ Dans "Modifier", retirer le champ "Attestation MOE" puisque sa saisie
    se fait désormais en haut de page (en masse) — a révélé un bug de
    fond (voir `bugs.md`, "Modifier effaçait silencieusement
    l'émission").
94. ✅ Retirer "Réservation" de la liste déroulante des phases attestables en
    masse, puisque cette phase s'émet automatiquement depuis la date de
    réservation du lot.
95. ✅ Règle métier : si un client signe l'acte au moment où une phase a déjà
    été attestée pour d'autres lots du même programme (ex: fondations
    achevées), cette phase doit être considérée comme déjà réglée jusqu'à
    cette date pour lui aussi — implémentée comme une auto-émission en
    cascade (même date d'attestation) dès la génération des appels du
    nouveau lot Acté.
96. ⏳ **Question ouverte, non résolue** : cas d'un client négociant un autre
    système de règlement (ex: tout payé à l'acte) — pas de piste actée,
    voir `docs/schema-donnees.md` ("Plan de règlement négocié") et
    `docs/regles-metiers.md` § 11. Même point que 241 ci-dessous (doublon
    créé par erreur le 31/08/2026, fusionné ici).
97. ✅ Incompréhension des totaux des cartes de stats (ex: 3 logements × 2
    phases émises chacun devrait afficher "6") — a mené à distinguer
    explicitement "émis au total" (cumulatif, quel que soit le sous-statut
    ensuite) du sous-statut "Émis" strict (ni en retard, ni réglé) ; carte
    "Émis (au total)" ajoutée. A aussi révélé le bug du point 93 (données
    corrompues expliquant en partie l'écart constaté).

---

## Suivi de prêt et Signature acte (13/07/2026)

98. ✅ Demande explicite : construire les deux dernières interfaces
    identifiées dans le cadrage initial (règle métier n°4 de
    `analyse-excel.md`) — suivi de l'obtention du prêt bancaire, et suivi
    de la signature de l'acte notarié. Nécessaire selon Nicolas pour
    pouvoir ensuite tester correctement les alertes de retard (prévues
    depuis le tout début, mais impossibles à tester sans données de
    prêt/notaire réelles à afficher).
99. ✅ Choix d'organisation : **deux pages séparées** ("Suivi de prêt" et
    "Signature acte"), plutôt qu'une seule page combinée comme dans le
    fichier Excel d'origine.

---

## Remarques PDF — "Remarques sur interfaces Suivi de prêt et acte" (13/07/2026)

100. ✅ **Suivi de prêt** : banque et courtier doivent avoir des coordonnées
     complètes (pas juste un nom), consultables dans une fenêtre qui
     s'ouvre au clic depuis le tableau, et disponibles pour un futur
     export PDF.
101. ✅ **Suivi de prêt** : bouton "Sans prêt" qui vide toutes les infos à
     partir de la colonne "Banque" et fusionne la ligne avec la mention
     "Acquisition avec fonds personnels".
102. ✅ **Signature acte** : ajouter une colonne "Notaire", avec le même
     traitement que banque/courtier (coordonnées complètes, fenêtre au
     clic, disponible à l'export PDF).
103. ✅ Signalement : un mauvais numéro de téléphone (banque/courtier/
     notaire) ne s'enregistrait pas sans message d'erreur — demande de
     reprendre le même principe de sécurisation que le formulaire
     Entreprises (téléphone, commune, code postal), sans nouveau bug
     (bug de régression, voir `docs/bugs.md`).

---

## Alertes de retard (13/07/2026)

104. ✅ Demande de passer aux alertes de retard (point 3 du cadrage initial
     du 09/07/2026, et décisions du 10/07/2026 pour les deux alertes
     TMA) — devenu testable maintenant que Suivi de prêt et Signature
     acte existent.
105. ✅ Rappel explicite en cours de construction : *"alerte également pour
     TMA n'oublies pas"* — les deux alertes TMA (entreprise n'ayant pas
     chiffré à temps, client n'ayant pas répondu à une facture) actées le
     10/07/2026 mais jamais construites depuis, à inclure dans la même
     fenêtre que prêt/notaire/appels de fonds.

---

## Authentification JWT (13/07/2026)

106. ✅ Demande de passer à l'authentification JWT, prévue depuis le
     cadrage initial (09/07/2026) — dernier grand chantier restant une
     fois le cadrage entièrement couvert.
107. ✅ Choix (question posée) : pas d'auto-inscription publique — les
     comptes (3 rôles : admin/gestionnaire/lecture) sont créés par un
     admin depuis Paramètres, pas par n'importe qui.
108. ✅ Choix (question posée) : toute l'application derrière la connexion,
     y compris la simple lecture — pas de consultation possible sans
     être connecté.

---

## Remarques PDF — "Nouvelles demandes générales" (13/07/2026)

Longue liste transmise d'un coup, à traiter **point par point avec
validation de Nicolas à chaque étape** (pas de traitement en bloc). Liste
complète consignée ici pour ne rien perdre ; l'état d'avancement réel de
chaque point est suivi en conversation, pas dans ce document.

**Connexion**
109. ✅ Œil cliquable à côté du mot de passe pour pouvoir le relire.

**Entête**
110. ✅ Ordre des onglets : Lots, Clients, Prêt, Acte, Appels de fonds, TMA.
111. ✅ Réfléchir à une présentation plus soignée du bandeau (propositions à
     faire), en y ajoutant maître d'ouvrage, nombre de logements et date
     de livraison.

**Interface Lots**
112. ✅ Plusieurs terrasses possibles : colonne supplémentaire créée
     seulement si besoin (une seule colonne par défaut), jusqu'à 3-4 —
     à prévoir à la fois dans Paramètres et dans Lots.
     **Devenu obsolète le 13/07/2026 (point 156)** : ce mécanisme de
     colonnes dynamiques par type a été remplacé par une seule colonne
     "Annexes" qui empile toutes les catégories ligne par ligne — trouvé
     et corrigé le 31/08/2026 lors d'une relecture avec Nicolas.
113. ✅ En cas de colonnes supplémentaires, adapter la taille des lignes/
     écritures pour que tout reste visible sur un écran plein, sans
     barre de défilement horizontale.
     **Devenu sans objet en même temps que le point 112 ci-dessus**
     (colonnes dynamiques remplacées par la colonne "Annexes" unique).
114. ✅ Message de rappel si un logement passe "Acté" sans date de
     réception d'offre de prêt renseignée (sauf si "sans prêt").
115. ✅ Rendre la présentation des totaux plus esthétique (propositions à
     faire).
116. ✅ Statut par défaut "libre" pour tous les logements au démarrage d'un
     projet.
117. ✅ Bouton "Annuler" qui réinitialise toutes les informations saisies
     pour un logement.
118. ✅ Nouveau filtre "Annulé" (lots annulés avec leurs informations
     toujours visibles). *(devenu la section "Voir l'historique" fusionnée
     dans la page Lots, voir point 169)*
119. ✅ Statut "travaux" : moment de déclenchement pas encore clair pour
     Nicolas lui-même — à revoir plus tard, aucune action pour l'instant.
     *(tranché depuis : statut "travaux" retiré, voir point 172)*

**Interface Appels de fonds**
120. ✅ Nouvelle colonne "Envoyé le" ; la date limite de règlement doit se
     recalculer à partir de cette date + le délai défini dans
     Paramètres.
121. ✅ Cas des attestations MOE émises avant la signature de l'acte
     (plusieurs appels considérés comme envoyés et réglés le jour de
     l'acte) : la date "Envoyé le" doit alors correspondre à la date de
     signature de l'acte.
122. ✅ Note pour plus tard (exports) : générer les appels de fonds par
     logement pour envoi direct au client (avec le déjà-réglé et le
     nouvel appel généré) — à rediscuter le moment venu. ✅ fait, voir
     "Générer un appel de fonds" (point 202) — coché le 31/08/2026, trouvé
     périmé lors d'une relecture de cette liste.
123. ✅ Message d'erreur bloquant si le barème (phase/pourcentage) est
     modifié dans Paramètres alors que des appels de fonds ont déjà été
     émis — risque de fausser des montants déjà émis, explicitement
     signalé comme important.
124. ✅ Bouton ouvrant une fenêtre récapitulative des attestations MOE avec
     leurs dates.
125. ✅ **Bug** : corriger une date de signature d'acte (ou un statut passé
     à tort à "Acté") doit remettre "non réglé" un appel de fonds qui
     avait été marqué payé automatiquement à cause de cette date/statut
     — sauf si un vrai règlement manuel avait été saisi entre-temps.
126. ✅ Une attestation MOE ne peut être remplie que si celle de la phase
     précédente l'est déjà (la phase "Réservation" n'entre pas dans ce
     cadre, elle ne prend jamais d'attestation).

**Interface TMA**
127. ✅ Création d'une TMA possible même si le lot est "Option" ou
     "Réservé" (pas seulement "Acté"), avec un message d'avertissement
     rouge sous la TMA ("ce logement n'est pas encore acté").
128. ✅ Bouton "Supprimer" une TMA. *(retiré depuis, voir point 162 —
     "Annuler la TMA" suffit pour garder une trace)*
129. ✅ Nouveau filtre "Annulé" (TMA annulées, infos toujours visibles).
130. ✅ Nouveau filtre en liste déroulante regroupant les statuts : "En
     cours" (demande/étude/chiffré/facturé), "Validé" (validé/travaux/
     terminé), "Refusé", "Annulé".
131. ✅ Note pour plus tard (exports) : bouton de génération d'un devis à
     envoyer au client. ✅ fait, voir "Générer devis client" (point 209) —
     coché le 31/08/2026, trouvé périmé lors d'une relecture de cette liste.
132. ⏳ Note pour plus tard (exports) : génération d'un envoi de demandes
     de TMA aux entreprises.
133. ✅ Si un client annule sa réservation/option/acte, la TMA associée ne
     doit pas s'effacer automatiquement — un message doit indiquer que
     ce client n'est plus le client actuel (cas d'un promoteur qui
     proposerait la même TMA au client suivant).
134. ✅ **Bug signalé** : l'alerte de retard entreprise TMA ne se déclenche
     pas (testé avec un envoi entreprise daté de mars). Demande
     complémentaire : message rouge sous le statut "étude" affichant
     "retard entreprise" quand c'est le cas, pour que ce soit visible
     sans attendre la fenêtre d'alertes.
135. ✅ Empêcher de renseigner une entreprise tant que la date d'envoi
     n'est pas complétée (avec message explicite).
136. ✅ Nouveau champ "Nombre d'entreprises concernées" à remplir avant
     d'ajouter les entreprises, pour déterminer objectivement le moment
     où toutes ont répondu (passage à "chiffré").

**Alerte**
137. ✅ Pouvoir désactiver la fenêtre d'alertes depuis Paramètres — soit
     toutes les alertes, soit une par une (prêt, appels de fonds, etc.).

**Généralité**
138. ✅ Nouvelle page d'accueil de sélection de programme (choisir un
     programme existant ou en créer un nouveau en le nommant), avec
     aussi la possibilité de changer de programme depuis les interfaces
     (ex: dans l'entête).
139. ⏳ Repenser l'esthétique générale de l'application (le thème sombre
     actuel plaît, mais des améliorations sont possibles — propositions
     à faire).
140. ✅ Remplissage automatique du code postal à partir de la commune
     saisie (souhaité, pas obligatoire).
141. ✅ Export Excel (en plus du PDF), à rediscuter au moment des exports.
     ✅ fait — choix acté au point 191, Excel et PDF partout dans le
     chantier des exports — coché le 31/08/2026, trouvé périmé lors d'une
     relecture de cette liste.
142. ✅ Vérifier qu'il ne reste plus aucune donnée codée en dur (résidus
     des tout premiers tests), à l'exception de ce que Nicolas a
     lui-même saisi depuis.
143. ✅ Repasser en revue l'ensemble du projet à la recherche de bugs pas
     encore identifiés.
144. ⏳ Rendre l'application responsive (toutes tailles d'écran).
145. ⏳ Rédiger un topo complet sur ce qu'impliquerait la vente de l'appli
     (création d'entreprise, faisabilité sans diplôme, assurances,
     aspects techniques...) avec une estimation des coûts.
146. ⏳ Donner une estimation de prix de vente (mise en service +
     éventuelles mises à jour mensuelles/annuelles).
147. ⏳ Étudier la possibilité d'un usage mobile de l'application, et la
     mettre en place si c'est possible.
148. ⏳ Récapitulatif simple de toutes les technologies utilisées, pour que
     Nicolas puisse se l'approprier et l'expliquer en entretien.
149. ⏳ Document récapitulatif de tout ce qui a été fait sur le projet,
     pour le présenter en entretien.
150. ❓ **Question** : une fois le projet visible sur GitHub pour des
     recruteurs, comment s'assurer qu'il n'y a pas de risque de vol
     d'informations ?

---

## Remarques verbales sur l'interface Lots (13/07/2026, en marge du point 115)

Transmises d'un coup pendant les allers-retours sur l'esthétique des
totaux (point 115) — traitées une par une comme le reste.

151. ✅ Cartes de stats trop uniformes, pas assez de hiérarchie visuelle
     (elles attirent presque autant l'œil que le tableau) — demande
     explicite de propositions (ombre légère, chiffre plus gros, libellé
     plus discret).
152. ✅ Retirer les décimales partout où il y en a, sauf sur les totaux
     TTC/TVA/HT du pied de tableau (précision nécessaire pour la TVA/HT).
153. ✅ Sortir "Prix moyen au m²" du pied de tableau, l'isoler ailleurs
     (proposition à faire, ex: en haut de page) ; décaler Total TTC/TVA/
     Total HT vers la gauche, Total TTC à peu près sous la colonne
     "Prix TTC".
154. ✅ Filtres de statut transformés en vrais boutons colorés, la couleur
     du statut sélectionné bien marquée (Tous=noir, Libre=gris,
     Réservé=orange, Acté=vert, Option=bleu).
155. ✅ Remplacer le bouton texte "Modifier" (répété sur chaque ligne) par
     une icône, pour gagner en largeur.
156. ✅ Nouvelle colonne "Annexes" regroupant Terrasse/Balcon/Loggia/Jardin/
     Parking/Cave/Cellier empilés verticalement dans une seule cellule.
     Séparer Terrasse et Balcon (et ajouter Loggia) comme catégories
     distinctes dans Paramètres, chacune pouvant avoir plusieurs valeurs
     (comme les terrasses aujourd'hui) ; séparer aussi Cave et Cellier
     (aujourd'hui fusionnés "Caves/Celliers").
157. ✅ Renommer la colonne "Prix/m²" en "Prix TTC/m² SHAB".
158. ⏳ **Idée à creuser plus tard** (suite au point 151, cartes de stats
     validées) : ajouter une carte "Taux de commercialisation" = (nombre
     de logements Actés + Réservés) / total, en % — pas encore de
     décision sur l'emplacement ni le calcul exact des arrondis. *(même
     idée reprise au point 166)*

## Remarques verbales sur l'interface Appels de fonds (13/07/2026, en marge du point 123)

159. ✅ Pouvoir modifier le barème d'UN logement en particulier, à la main,
     même après que des appels de fonds y aient déjà été émis (cas d'une
     négociation directe avec le client, différente du barème général du
     programme) — contrairement au barème général, verrouillé par le point
     123 dès qu'un appel est émis. Formulaire dédié par logement (toutes
     les phases ensemble, contrôle "total = 100%"), pas une édition ligne
     par ligne.

## Remarques verbales sur l'interface TMA (13/07/2026, en marge du point 128)

160. ✅ Colonne "Action" retravaillée comme sur la page Lots : un seul bouton
     crayon, qui déplie en dessous de la ligne "Modifier les dates",
     "Entreprises", et les boutons "Refuser la TMA"/"Supprimer la TMA" —
     plus les boutons épars directement sur la ligne.
161. ✅ Pouvoir aussi modifier localisation/description/montant client depuis
     ce même panneau — le montant client est normalement recalculé
     automatiquement à partir des devis entreprises, mais une négociation
     directe avec le client peut aboutir à un montant différent ; le
     modifier à la main doit afficher un avertissement, et fige ce montant
     (plus jamais recalculé automatiquement ensuite).
162. ✅ **Revient sur le point 128** : le bouton "Supprimer la TMA" est
     retiré (route serveur incluse) — il faut toujours garder une trace,
     "Annuler la TMA" (point 129) suffit pour ce besoin. "Annuler la TMA"
     passe en rouge (bouton-danger) pour bien marquer que c'est une action
     à ne pas prendre à la légère, même si elle reste réversible.
163. ✅ Nouvelle colonne "Commentaire" (texte libre) sur le tableau des TMA,
     modifiable depuis le même panneau (crayon) que localisation/
     description/montant client — positionnée après la colonne "Statut".
     Tableau élargi (largeur "moyenne", comme la page Clients) pour
     accueillir cette colonne supplémentaire sans être trop compressé.

## Remarques générales du 17/07/2026 (PDF)

**Lots**
164. ✅ Rajouter une colonne "Surface < 1,80m²", qui ne s'affiche que si le
     cas se présente.
165. ✅ Pouvoir compléter dans Paramètres, au démarrage d'un programme, la
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
166. ⏳ À réfléchir plus tard : carte "Taux de commercialisation", basée sur
     le nombre de lots vendus sur le nombre de lots au total.
167. ✅ Nommer la première ligne de cartes "Commercialisation", la deuxième
     "Chiffre d'affaires".
168. ✅ Mettre les taux en % sous les nombres ou montants de chaque carte.
169. ✅ Pouvoir modifier le prix TTC du logement à la main depuis cette page
     (négociation avec le client, ou réévaluation du prix) — la raison
     devra être notée en dessous. Garder aussi un historique des
     modifications de prix quelque part. Idée : intégrer la page
     "Annulés" directement dans la page Lots ; cette page contiendrait
     alors un historique des annulations de ventes, mais aussi un
     historique des modifications de prix.
170. ✅ Réflexion en cours : plutôt que de garder la liste déroulante pour le
     choix du statut, ne serait-il pas préférable que le statut se mette à
     jour automatiquement en fonction des dates remplies (ex: remplir la
     date d'option fait passer le statut à "Option", ainsi de suite) ?
     ✅ adopté — c'est la règle en place depuis longtemps pour Lot/TMA/
     appels de fonds (voir `docs/contexte-projet.md`, "Décisions déjà
     prises") — coché le 31/08/2026, trouvé périmé lors d'une relecture de
     cette liste.

**Appels de fonds**
171. ✅ Lors du travail sur les exports : pouvoir générer un envoi d'appels
     de fonds collectifs (une fois actés et qu'une attestation MOE est
     émise) — cette génération remplirait automatiquement la case
     "Envoyé le", tout en laissant la possibilité de la remplir à la
     main. Une fenêtre doit s'ouvrir à la génération, listant les appels
     de fonds qui vont être générés avec les logements correspondants,
     avec la possibilité de décocher certains logements. ✅ fait, voir
     "Générer un appel de fonds" (point 202) — coché le 31/08/2026.

**TMA**
172. ✅ Retirer le statut "Travaux" (ne sert à rien). Pour le statut
     "Terminé", ajouter un bouton permettant d'y passer à la main
     (lorsque le client va sur chantier pointer que les travaux ont bien
     été réalisés par les entreprises). ✅ fait le 20/07/2026 (avec un
     bouton "Annuler la fin des travaux" pour revenir en arrière en cas
     de clic par erreur, ajouté à la demande de Nicolas le jour même).

**Paramètres**
173. ✅ Pour "Délais et taux" : bien séparer les paramètres correspondants
     par page. Rajouter sous la case "Taux de marge TMA" une case à
     cocher "Montant devis client saisi manuellement". ✅ fait le
     20/07/2026 (regroupement par page : Lots/Suivi de prêt/Signature
     acte/Appels de fonds/TMA ; la case désactive le pré-remplissage
     automatique du montant client par le taux de marge pour tout le
     programme).

**Généralité**
174. ✅ Pour les colonnes "Action" de chaque page : mettre un crayon à la
     place des boutons (même principe que TMA ou Lots), partout. ✅ fait
     le 20/07/2026 (Clients, Appels de fonds, Signature acte, Suivi de
     prêt — Lots et TMA l'avaient déjà ; les actions secondaires propres
     à une ligne, ex: "Barème du lot", "Sans prêt", restent des boutons
     texte à côté du crayon, pas remplacées).
175. ✅ Sans rien toucher à ce qui est déjà en place, enlever partout où
     elle existe la règle "on ne peut revenir le texte qu'une seule fois
     à la ligne" — présente au moins sur Lots de mémoire, peut-être
     ailleurs aussi, à vérifier. ✅ fait le 20/07/2026, corrigé le même
     jour (largeurs de colonnes d'origine conservées comme demandé ;
     la vraie cause était l'absence de "overflow-wrap: break-word" —
     un texte sans espace, ex: un mot très long, ne revenait jamais à
     la ligne et débordait tel quel au lieu de se couper).
176. ✅ Mettre une colonne Commentaire dans chaque tableau de chaque page.
     ✅ fait le 20/07/2026 — nouveau champ `commentaire` sur Acquereur
     (Clients) et sur AppelDeFonds (un commentaire par échéance) ;
     Suivi de prêt et Signature acte affichent/modifient le
     commentaire du LOT (même champ que la page Lots). Sur Signature
     acte, la date de signature n'est plus obligatoire pour pouvoir
     juste modifier le commentaire sans forcer un passage à "Acté".
177. ⏳ Se renseigner pour voir s'il y a des choses à rajouter dans "Suivi
     de prêt" et "Signature acte".
178. ⏳ À la fin : analyser l'ensemble de l'application et faire un point
     sur ce qui peut être amélioré. **Maintenu non résolu explicitement
     par Nicolas le 31/08/2026** — malgré tous les audits déjà menés
     (points 211-239), le projet n'est pas encore fini (pas déployé), donc
     ce point de clôture reste ouvert tant que ce n'est pas vraiment "la
     fin".
179. ⏳ À réfléchir à la fin : faudra-t-il créer une version démo ?

## Remarques générales du 20/07/2026 (PDF)

**Lots**
180. ✅ Pour les taux notés sur les cartes mettre les textes : XX %
     « du programme » pour les lots et XX % « du CA total ». ✅ fait
     (`libellePourcentage="du programme"`/`"du CA total"`, `Lots.jsx`) —
     coché le 31/08/2026, trouvé fait mais jamais coché lors d'une
     relecture de cette liste.
181. ⏳ Améliorer "voir l'historique…" — déjà le bouton en lui-même, et
     ensuite les titres une fois que l'on a cliqué, ce n'est pas du tout
     esthétique. Historique bien fusionné dans la page Lots depuis le
     17/07/2026, mais le volet "esthétique" précis de cette demande n'a
     pas pu être confirmé avec certitude lors de la relecture du
     31/08/2026 — laissé ⏳ par prudence plutôt que coché à tort.

**TMA**
182. ✅ Lorsqu'une TMA est validée, il doit être impossible de modifier le
     montant TTC client. ✅ fait (`montantClient` figé une fois "Validé",
     voir `docs/regles-metiers.md` § 8) — coché le 31/08/2026, trouvé fait
     mais jamais coché lors d'une relecture de cette liste.
183. ✅ Mettre des titres dans les sous-parties du crayon : "Modifier les
     dates" et "Entreprises concernées". ✅ fait
     (`titre-sous-partie-crayon`, `FormulaireDatesTma.jsx`/
     `DetailEntreprisesTma.jsx`) — coché le 31/08/2026, trouvé fait mais
     jamais coché lors d'une relecture de cette liste.
184. ✅ Rajouter dans paramètres une case "Frais d'ouverture de dossier",
     qui sera automatiquement répercutée dans le montant total TTC
     client (en plus des coûts des modifications en elles-mêmes). On
     peut mettre une case à cocher en dessous "À appliquer". Comme ça
     si ce n'est pas le cas, cette règle n'a pas lieu d'être. ✅ fait le
     20/07/2026 — bug corrigé le jour même : le montant client restait
     `null` tant qu'aucune entreprise n'avait répondu, le frais
     n'apparaissait donc pas dès la création de la TMA comme attendu ;
     il est maintenant appliqué dès la création (les TMA créées avant
     cette règle ne sont pas rattrapées rétroactivement).

**Paramètres**
185. ✅ À la fin des lots (sous la phrase en rouge "nombre maximum…"),
     bien distinguer les cases d'ajout d'un logement (par un trait sous
     la phrase, et un titre "Ajouter un lot"), car lorsque je modifie
     un lot plus haut, j'ai 2 fois toutes les cases qui s'affichent et
     c'est perturbant. ✅ fait (titre "Ajouter un lot", `SectionLots.jsx`)
     — coché le 31/08/2026, trouvé fait mais jamais coché lors d'une
     relecture de cette liste.

**Généralité**
186. ⏳ À voir à la fin (après les exports), mais il faudra pouvoir
     importer des documents (plans des logements, contrats de
     réservations, etc., offre de prêt reçue, acte signé, devis
     entreprises, etc.) — on verra ça ensuite mais ça sera un gros
     travail à faire.
187. Sur chaque page, rajouter une barre de recherche où l'on pourra
     retrouver ce que l'on cherche via un ou des mots-clés (précisé par
     Nicolas : plusieurs mots possibles, pas seulement un ou deux). ✅
     fait le 20/07/2026 sur Lots, Clients, TMA, Appels de fonds, Suivi
     de prêt, Signature acte (`BarreRecherche.jsx` + `utils/recherche.js`,
     réutilisés) — combinée aux filtres de statut déjà en place. Corrigé
     le jour même : la recherche doit retrouver TOUT ce qui est affiché
     dans le tableau (pas juste les champs texte identifiants) ; un
     montant formaté ("5 444,00 €") contient un espace insécable que le
     clavier ne tape pas, la recherche ignore donc maintenant tous les
     espaces (texte tapé ET texte affiché) pour comparer.
(il188. ✅ Dans les docs : demandes, cocher ce qui a été fait, comme par
     exemple 172, 173… ✅ fait le 20/07/2026 (rattrapage rétroactif sur
     l'ensemble des points 1 à 179, tenu à jour au fil de l'eau ensuite).

## Chantier des exports (démarré le 20/07/2026)

Gros chantier, traité page par page en commençant par Lots. Récapitulatif
des remarques déjà faites sur les exports avant ce chantier : voir #18,
#30, #90, #100, #102, #122, #131, #132, #141.

189. ✅ Chaque export mis en place doit pouvoir être réalisé aussi bien en
     Excel qu'en PDF.
190. ✅ La colonne "Action" (boutons/crayon de modification) ne doit
     jamais apparaître dans un export, quel que soit le format.
191. ✅ On commence par la page Lots. Génération choisie : côté navigateur
     (pas côté serveur — réutilise directement les données déjà filtrées
     à l'écran, sans dépendance lourde à installer sur le serveur, voir
     `docs/decisions.md`). Librairie Excel `xlsx` remplacée par
     `exceljs` le jour même (mise en forme réellement écrite : gras,
     couleurs, largeurs de colonnes, lignes figées — `xlsx` en version
     gratuite ne sait quasiment pas écrire de style). PDF via `jspdf` +
     `jspdf-autotable`. Ergonomie revue en cours de route : un seul
     bouton "Exporter" par page (pas un bouton par format à chaque
     section) ouvre une fenêtre listant les exports possibles, puis le
     format (Excel/PDF) — voir `FenetreExport.jsx`.

**Lots — 4 exports distincts prévus**
192. ✅ Le tableau récapitulatif des lots, avec l'ensemble des
     informations qui y sont inscrites (respecte les filtres actifs à
     l'écran — statut, recherche —, totaux TTC/TVA/HT + prix moyen au m²
     en bas, sans la colonne Action). Remarques de Nicolas à venir,
     donnera son retour groupé à la fin du chantier des exports.
193. ✅ Les cartes de statistiques (Commercialisation, Chiffre
     d'affaires), réunies en tableau à deux colonnes (indicateur/valeur).
194. ✅ L'historique (ventes annulées + modifications de prix), réunis
     dans un même fichier à deux sections.
195. ✅ Le récapitulatif des annexes à la vente (parkings/caves/celliers
     pas encore attribués à un lot), avec total.

**Appels de fonds**
196. ✅ À retravailler quand on abordera les exports de cette page : on ne
     voit à aucun moment le reste à payer par logement, ni le total de
     ce qui a déjà été réglé. Nouveau tableau "Récapitulatif par lot"
     (Lot / Prix TTC / Total émis / Total payé / Reste à payer),
     indépendant des filtres du tableau détaillé (comme les cartes de
     stats existantes), ajouté au-dessus du tableau détaillé par phase.

**Clients**
197. ✅ Un seul export : le tableau des clients (respecte la recherche
     active). Un export "Statistiques (cartes)" avait été ajouté par
     défaut (même principe que Lots) mais retiré aussitôt : pas de raison
     d'être sur cette page.

**Suivi de prêt**
198. ✅ Deux exports, statistiques comprises cette fois (contrairement à
     Clients) : tableau du suivi de prêt (respecte statut + recherche,
     ligne "sans prêt" reproduite comme à l'écran) et cartes de
     statistiques (Dossiers concernés, En attente, En retard, Offres
     reçues, Sans prêt). Corrigé le jour même : la barre filtre/
     recherche/export restait calée sur la largeur de `<main>` (960px)
     pendant que le tableau juste en dessous s'étend à 1250px
     (`.tableau-scroll--marge`) — "Exporter" tombait donc avant le vrai
     bord droit du tableau. Nouvelle classe `.barre-actions--marge`
     (même sortie de `<main>` que le tableau) pour aligner les deux.

**Signature acte**
199. ✅ Mêmes deux exports que Suivi de prêt (tableau + cartes de
     statistiques), avec `.barre-actions--marge` dès le départ.

**Appels de fonds (suite du point 196)**
200. ✅ Retours sur le premier essai du "Récapitulatif par lot" : masqué
     par défaut (affiché via un bouton sur la ligne de la barre de
     recherche, pas en permanence) ; colonne "Avancement cumulé %"
     replacée AVANT "Avancement %" ; tableau détaillé élargi sur toute la
     largeur de l'écran (comme Lots), au lieu de rester aligné sur le
     reste de la page ; espace ajouté entre le récapitulatif par lot et
     le tableau détaillé.
201. ✅ Courrier d'appel de fonds à envoyer au client (modèle fourni par
     Nicolas) : un document par appel précis (un lot + une phase). PDF
     uniquement (exception au principe "Excel + PDF partout", une lettre
     n'a pas d'équivalent tableur utile). Nouveaux champs IBAN/BIC sur le
     programme (Paramètres > Informations du programme), affichés sur le
     courrier ; "Référence virement" laissée vide (pas de champ prévu
     pour l'instant).
202. ✅ Revu le jour même — rejoint le point 171 (envoi collectif) plutôt
     que de rester un export "un par un" : renommé "Générer un appel de
     fonds", choix en deux temps dans la fenêtre d'export — d'abord la
     PHASE (Réservation exclue, comme l'attestation en masse), puis les
     LOGEMENTS concernés à cocher/décocher (seuls ceux avec attestation
     MOE faite et pas encore émis sont proposés). "Générer" télécharge un
     PDF par logement coché ET remplit automatiquement "Envoyé le" sur
     chaque appel correspondant (modifiable à la main ensuite), comme
     demandé au point 171. `FenetreExport.jsx` généralisée pour porter ce
     genre d'action personnalisée (`type: 'generation'`), en plus des
     exports "classiques" en tableau.
203. ✅ Bug signalé aussitôt : poser une attestation MOE marquait encore
     automatiquement l'appel "Émis" — contradictoire avec "Générer un
     appel de fonds" (point 171/202). Corrigé (`emettreAttestation()`,
     server/routes/appelsDeFonds.js) : l'attestation MOE seule n'émet
     plus l'appel. Exception conservée à la demande explicite de
     Nicolas : si l'acte du lot a été signé après (ou le jour même) que
     la phase ait été attestée, l'appel est toujours considéré
     automatiquement émis ET réglé à la date de l'acte (le notaire
     encaisse déjà les sommes dues à la signature) — même règle que
     pour un nouveau lot Acté qui rattrape une phase déjà attestée par
     un autre lot (server/routes/lots.js).
204. ✅ Nouveau statut "À émettre" (précision le jour même du point 203) :
     *"En attente, quand pas d'attestation MOE, À émettre quand
     attestation MOE mais AF non généré, Émis quand AF généré, en retard
     quand date limite de règlement dépassée, Réglé quand AF réglé (sans
     oublier la règle de la signature de l'acte)"* — sert de repère
     visuel sur ce qui reste à générer via "Générer un appel de fonds".
     Ajouté dans `statutAppel()` (client/src/utils/statuts.js), carte de
     stat dédiée sur la page, et couleur orange (#ea580c) dans la palette
     de badges (`$couleurs-statut`, client/src/styles/_variables.scss).

**TMA**
205. ✅ Bug signalé : corriger `nombreEntreprisesConcernees` après avoir déjà
     saisi tous les devis entreprises (ex: 3 au lieu de 2) ne redéclenchait
     jamais le calcul du montant entreprises/statut. Corrigé
     (`PATCH /api/tma/:id/infos`, server/routes/tma.js) : ce recalcul
     (`recalculerTma`, exporté depuis routes/tmaEntreprises.js) se déclenche
     maintenant aussi quand ce nombre change réellement.
206. ✅ Nouveau champ "Description" par entreprise sollicitée (`TmaEntreprise.
     description`) — ce qui est demandé à CETTE entreprise précisément,
     distinct de la description globale de la TMA. Affiché aussi dans le
     panneau "Entreprises concernées" avec le n° de lot de travaux
     (`Entreprise.numeroLot`, existant depuis le point 53, jamais affiché
     jusqu'ici). Séparateur + titre "Ajouter une entreprise" ajoutés avant
     le formulaire d'ajout (même principe que "Ajouter un lot").
207. ✅ 3 exports TMA : "Statistiques (cartes)", "Demandes clients" (tableau
     affiché à l'écran + 3 lignes de total TTC/TVA/HT, ajoutées aussi à
     l'écran) et "Détail entreprises" (ligne "demande" en gras, une ligne de
     titres en italique puis une ligne de valeurs par entreprise sollicitée,
     réutilisant les colonnes du tableau plutôt que d'en ajouter). "En
     retard" (entreprise n'ayant pas répondu à temps) s'affiche en rouge à
     la fois dans cet export et dans le panneau "Entreprises concernées" (à
     la place de "reçu le ...").
208. ✅ Nouvelle colonne "N° demande" à côté de "Lot" (tableau à l'écran et
     exports "Demandes clients"/"Détail entreprises") : rang chronologique
     de la demande parmi celles du même logement (ex: 2ᵉ demande TMA du lot
     A01 = "2"), jamais stocké, déduit de `dateDemande`. Tableau TMA classé
     par référence de lot (puis n° de demande) plutôt que par ordre d'ajout.
209. ✅ Export "Générer devis client" (modèle PDF fourni) : choix en deux
     temps dans la fenêtre d'export (même mécanique que "Générer un appel
     de fonds") — le LOGEMENT, puis les DEMANDES de ce logement à cocher
     (un même devis peut regrouper plusieurs demandes). Numéro de devis
     (ex: "TMA-2026-005") réservé côté serveur à CHAQUE génération, jamais
     réutilisé — nouveau compteur atomique par programme et par année
     (`Compteur`, server/models/Compteur.js, POST /api/tma/:id/devis-numero).
210. ⏳ **Reporté** : le champ "Adresse" du maître d'ouvrage reste vide sur
     le devis (pas de donnée correspondante en base) — à rajouter dans
     Paramètres > Informations du programme, puis à répercuter aussi sur le
     courrier d'appel de fonds (point 201), qui a le même trou.

---

## Audit qualité/sécurité en vue des entretiens (21/07/2026)

Nicolas a transmis une liste de 18 axes d'audit possibles (vérification
fonctionnelle, sécurité, qualité de code, gestion d'erreurs, performance,
architecture, tests, secrets, RGPD, dépendances, documentation, déploiement,
logging, accessibilité, versioning, sauvegarde, cohérence API, CI/CD), avec
sa propre priorisation : **haute** (secrets/.env, RGPD, README, git) traitée
en premier, **moyenne** (cohérence API, gestion d'erreurs, tests) ensuite,
**basse** (CI/CD, monitoring, backup, accessibilité, perf à grande échelle)
assumée comme limite de projet solo pour l'instant.

211. ✅ **Secrets/.env** : audit — rien à corriger. `.env` jamais commité
     (vérifié sur tout l'historique git), `.gitignore` correct,
     `.env.example` bien templaté, aucun secret en dur trouvé dans le code.
212. ✅ **RGPD** : audit — pas de coordonnées bancaires ni de situation
     fiscale d'acheteur stockées (précision par rapport à la description
     de Nicolas : `Acquereur.banque/courtier/notaire` ne sont que des
     coordonnées de contact d'organismes, pas un RIB client ; le seul
     IBAN de l'appli est celui du promoteur). Mots de passe bcrypt, jamais
     en clair. Bug corrigé : `erreur.message` brut renvoyé au client sur
     toute erreur 500, y compris en production — nouveau helper
     `repondreErreurServeur()` (server/utils/erreurs.js), utilisé dans
     les 12 fichiers de routes (46 occurrences) : détail loggué
     `console.error` côté serveur toujours, renvoyé au client seulement
     hors production.
213. ✅ **README** : audit — jugé déjà solide (installation claire,
     architecture expliquée, absence de tests assumée explicitement plutôt
     que cachée). Complété avec les exports (chantier de la semaine) et le
     nombre de collections (13, ajout de `Compteur`).
214. ✅ **Git** : audit — jugé déjà propre (44 commits descriptifs, aucun
     "wip"/"fix" isolé, `node_modules`/`.env`/`dist` jamais trackés). Rien
     à corriger.
215. ✅ **Cohérence API** : audit — statuts HTTP cohérents partout (400/401/
     403/404/201/204/500), 401 (non connecté) bien distingué de 403 (mauvais
     rôle), chaque route d'écriture protégée par `autoriserRoles(...)` (ou
     `router.use(...)` pour `/api/utilisateurs`, réservée aux admins) —
     aucune faille d'autorisation trouvée. Un point relevé mais **laissé
     tel quel** (pas de vraie gêne, renommer casserait des URLs déjà
     utilisées partout côté client) : `/api/programme` et `/api/tma` sont
     au singulier alors que le reste de l'API est au pluriel
     (`/api/lots`, `/api/entreprises`...).
216. ✅ **Gestion d'erreurs** : audit + 2 bugs corrigés (voir `bugs.md`) —
     une panne serveur totale (backend arrêté, coupure réseau) échouait en
     silence sur la quasi-totalité des actions de l'appli (créer/modifier/
     supprimer), sans le moindre message ; et un échec de connexion
     MongoDB au démarrage laissait le process Node "vivant" sans jamais
     écouter sur le port, invisible pour un gestionnaire de process.
217. ✅ **Tests** : nouvelle checklist de tests manuels pré-déploiement
     (`docs/checklist-tests-manuels.md`), couvrant les parcours critiques
     de chaque page, avec les cas déjà responsables d'un bug réel
     signalés (⚠️).

**Priorité basse — "on continue" (21/07/2026, suite)**

218. ✅ **Accessibilité** : `BarreRecherche` sans nom accessible (placeholder
     seul, jamais fiable pour un lecteur d'écran) — `aria-label` ajouté.
     Contraste insuffisant (~3:1, sous le seuil WCAG AA de 4.5:1) sur les
     libellés/pourcentages des cartes de stats (`#8896a3`) — remplacé par
     `#52606d` (~6.5:1), déjà utilisé partout ailleurs comme texte
     secondaire. Les 4 fenêtres modales de l'appli n'avaient ni rôle
     accessible ni fermeture au clavier — `role="dialog"`/`aria-modal` +
     nouveau hook `useFermerAvecEchap` (fermeture à la touche Échap).
219. ✅ **Performance** : aucun index MongoDB sur les champs de jointure les
     plus filtrés (`Lot.programme`, interrogé par `getIdsLotsDuProgramme`
     à quasiment chaque requête multi-programme) — invisible avec le volume
     actuel, deviendrait un vrai ralentissement à plus grande échelle
     (500 programmes). Ajout de `index: true` sur `Lot.programme`,
     `AppelDeFonds.lot`, `Tma.lot`, `TmaEntreprise.tma`,
     `HistoriqueAnnulation.programme`, `HistoriqueModificationPrix.programme`.
     Côté React : pas de risque identifié — chaque page ne charge jamais
     que le programme actif (jamais les 500 à la fois), la taille réelle à
     afficher reste celle d'UN programme (quelques centaines de lignes au
     pire), largement dans les capacités de React sans virtualisation.
220. ✅ **Logging/monitoring** : aucune requête HTTP journalisée jusqu'ici.
     Ajout de `morgan('dev')` (une ligne par requête : méthode, URL, code,
     temps de réponse) — minimal mais suffisant pour un projet solo, pas un
     vrai système de logs structurés/centralisés.
221. ✅ **Dépendances** : `npm audit` — 1 vulnérabilité haute côté serveur
     (transitive), corrigée sans rien casser (`npm audit fix`). Côté
     client : 8 vulnérabilités (3 modérées, 5 hautes), 6 corrigées sans
     rien casser ; les 2 restantes (`uuid`, via `exceljs`) nécessiteraient
     de downgrader `exceljs` en version 3 (changement cassant signalé par
     npm lui-même) — **laissé en l'état volontairement**, à rediscuter
     avec Nicolas plutôt que de risquer de casser les exports Excel tout
     juste terminés.
222. ✅ **CI/CD** : aucune automatisation avant ce point (tout dépendait de
     la vigilance manuelle). Nouveau `.github/workflows/ci.yml` : lint
     front (`oxlint`, déjà 0 erreur) + vérification de syntaxe de chaque
     fichier back (`node --check`, pas de lint serveur configuré) à chaque
     push/pull request sur `main`. Pas d'étape "test" : aucune suite
     automatisée à ce stade, une étape qui échouerait à coup sûr n'aurait
     aucun intérêt.
223. ⏳ **Sauvegarde/récupération** : pas de correctif de code — question
     d'infrastructure. Le tier gratuit MongoDB Atlas (M0) n'inclut pas de
     sauvegarde continue automatique (contrairement aux tiers payants
     M10+) ; à vérifier sur le tableau de bord Atlas de Nicolas. Recommandé
     en attendant : un export périodique (`mongodump`, manuel ou en tâche
     planifiée) vers un stockage externe — pas mis en place, décision
     d'infrastructure à prendre par Nicolas, pas un correctif de code.

### Décisions en attente (Nicolas) — issues de cet audit

Pas de code bloqué dessus, mais à trancher à un moment donné :

224. ❓ **Sauvegarde MongoDB** : vérifier le tier Atlas actuel (M0 gratuit =
     pas de sauvegarde continue), puis choisir entre (a) mettre en place un
     `mongodump` périodique vers un stockage externe soi-même, ou (b)
     upgrader vers un tier payant (M10+) avec sauvegarde continue incluse.
     Voir point 223.
225. ❓ **Mise à jour d'`exceljs`** : la dernière vulnérabilité npm restante
     côté client (`uuid`, modérée) ne se corrige qu'en changeant de version
     majeure d'`exceljs`. À faire quand Nicolas est prêt à retester tous
     les exports Excel de l'appli derrière (5 pages) — pas urgent (sévérité
     modérée, dépendance transitive, pas le code de l'appli). Voir points
     221 et `decisions.md`.
226. ❓ **Nommage `/api/programme` et `/api/tma`** (singulier, alors que le
     reste de l'API est au pluriel — `/api/lots`, `/api/entreprises`...) :
     laissé tel quel pour l'instant (renommer casserait toutes les URLs
     déjà utilisées côté client, pour un gain purement cosmétique). À
     confirmer si Nicolas veut que ce soit corrigé avant de montrer le
     projet en entretien, ou si c'est un détail assumable tel quel. Voir
     point 215.

---

## Audit infrastructure (21/07/2026)

Nicolas ne connaît pas le sujet ("je n'y connais rien") — demande d'un
état des lieux pédagogique : ce qui est prêt, ce qui manque, points positifs
et négatifs, avant de déployer l'appli quelque part (aujourd'hui tout tourne
en local, README point 5 "⬜ Déploiement").

227. ✅ **État des lieux** : rien n'est déployé nulle part — back (Express),
     front (React/Vite) et personne d'autre que Nicolas n'y accède. Seule
     la base de données est déjà "dans le cloud" (MongoDB Atlas).
     - **Points positifs** : base de données déjà hébergée ; front et back
       déjà découplés en deux applications communiquant via une adresse
       configurable (`VITE_API_URL`) — architecture prête pour l'hébergement
       séparé le plus simple/gratuit ; secrets déjà proprement gérés par
       variables d'environnement (rien à changer dans le code) ; route de
       "santé" déjà présente (`GET /`) ; `npm run build` (front) testé et
       fonctionnel, `npm start` (back) déjà prêt ; CI (GitHub Actions) déjà
       en place, bonne base pour un déploiement automatique plus tard.
     - **Points négatifs** : aucune configuration d'hébergement (normal,
       jamais déployé) ; CORS grand ouvert (`cors()` sans réglage) — sans
       danger en local, à restreindre une fois en ligne ; version de Node
       non figée (`engines` absent des `package.json`) ; paquet JS du front
       assez lourd au 1ᵉʳ chargement (~540 Ko compressés, jsPDF/exceljs
       chargés même sans utiliser les exports) — optimisable plus tard (pas
       urgent) ; pas de nom de domaine/HTTPS (mais géré automatiquement par
       les hébergeurs recommandés, rien à faire à la main).
228. ✅ **2 corrections de préparation** faites dans la foulée (sans attendre
     le déploiement, sans rien casser) :
     - `"engines": { "node": ">=20" }` ajouté aux deux `package.json`.
     - CORS rendu configurable : nouvelle variable d'environnement
       optionnelle `CORS_ORIGIN` (server/.env.example) — vide par défaut
       (comportement actuel conservé, nécessaire en local), à remplir avec
       l'adresse du front une fois déployé.
229. ❓ **Plan de déploiement proposé**, en attente de la décision de
     Nicolas sur quand s'y mettre : back (Express) sur **Render** (compte
     gratuit, déploiement automatique à chaque `git push`, variables
     d'environnement à recopier depuis `.env` — seul défaut du tier
     gratuit : le serveur s'endort après inactivité, réveil en quelques
     secondes) ; front (React) sur **Vercel** ou **Netlify** (gratuit,
     détecte Vite automatiquement, HTTPS + nom de domaine offerts) ; base
     de données déjà prête (juste autoriser Render à s'y connecter, un
     réglage dans Atlas).

---

## Audit "fidélité code/doc" — TMA (21/07/2026)

Nicolas a demandé le même principe que l'audit qualité (comparer ce que dit
le code à ce que disent nos fichiers de contexte) appliqué à d'autres
fonctions du projet. A révélé un vrai écart de comportement sur les dates
TMA (`PATCH /api/tma/:id/dates`), pas juste une doc mal rédigée.

230. ✅ **Bug corrigé — on pouvait sauter l'étape "Facturé"** : rien
     n'empêchait de renseigner "Date de retour client" sans avoir rempli
     "Date d'envoi facture" avant, ce qui faisait passer la TMA
     directement à "Validé" en sautant "Facturé". La règle "on ne peut pas
     sauter une étape" n'était en réalité vérifiée que sur
     `PATCH /api/tma/:id/statut` (les boutons), pas sur ce formulaire de
     dates. Corrigé : la route renvoie maintenant une erreur claire dans
     ce cas.
231. ✅ **Bug corrigé, mais règle mise en pause** — le panneau "Modifier les
     dates" restait modifiable même une fois la TMA "Validé" ; effacer
     "Date de retour client" après coup faisait redescendre le statut vers
     "Facturé", à l'encontre de "pas de retour en arrière une fois
     validé". Corrigé (verrouillage complet du panneau une fois "Validé",
     même principe que le montant client déjà verrouillé — point 182).
     **Nicolas veut y réfléchir avant de confirmer qu'on garde cette
     règle** — le code reste tel quel pour l'instant (verrouillé), mais ne
     pas considérer ce point comme définitivement tranché tant qu'il n'a
     pas donné suite.
232. ⏳ **Étendu à TOUTES les fonctions du projet, pas juste aux autres
     pages** (précision de Nicolas) : passer en revue, une par une, chaque
     fonction du code (pas seulement Lots/Clients/Suivi de prêt/Signature
     acte/Paramètres restants — TMA et Appels de fonds eux-mêmes ne sont
     pas forcément épuisés non plus). Pour chacune : Claude explique ce
     qu'elle fait à partir du CODE réel (pas des commentaires ni de la
     doc), puis compare à ce que disent `docs/schema-donnees.md` et les
     autres fichiers de contexte — objectif : retrouver d'éventuels autres
     écarts du même genre que ceux déjà trouvés (règle "après/avant"
     inversée dans des commentaires, garde-fou manquant sur les dates
     TMA). Gros chantier, à dérouler par lots de quelques fonctions à la
     fois (comme les 3 déjà faites), pas en une seule fois.
233. ⏳ **Tableau de suivi de l'audit sécurité** (note pour plus tard,
     demandée par Nicolas) : consolider tous les points d'audit
     sécurité/RGPD/qualité éparpillés dans cette liste (211-232 et ceux à
     venir) en un vrai tableau de suivi — probablement un nouveau fichier
     dédié (`docs/audit-securite.md`), avec au minimum : le point trouvé,
     sa sévérité, son statut (corrigé / en attente / décision à prendre),
     et la date. Pas encore fait, juste noté. **Redemandé par Nicolas le
     01/09/2026** ("liste des audits à réaliser et réalisés") — même
     besoin que le point 238, à fusionner en un seul document le moment
     venu (liste à jour des audits menés entre-temps : 237, 271, 276, 285).
234. ✅ **`docs/programme-formation-ia.md` créé** : copie intégrale du
     programme personnel de Nicolas (16 jours, 20 août → 14 sept. 2026),
     jusque-là seulement dans son dossier Téléchargements. Explique le
     "pourquoi" de plusieurs demandes de cette session (l'exercice
     "fidélité code/doc" = Jour 1 exercice 3, `git diff` = Jour 6, les
     sous-agents = Leçon F, l'audit sécurité 3 points = Jour 2).
     **Fichier supprimé volontairement par Nicolas peu après** (confirmé
     explicitement) — n'existe plus dans le dépôt. Note "à réalimenter au
     fil de l'eau" devenue sans objet. Corrigé le 31/08/2026, trouvé
     périmé lors d'une relecture de cette liste.
235. ✅ **Relire et reprendre `docs/contexte-projet.md`** : fait le
     31/08/2026 — "Règles métiers non négociables" remplacé par un renvoi
     vers le nouveau `docs/regles-metiers.md` (point 240), le reste
     resserré. Le fichier est passé d'environ 180 lignes à une version
     nettement plus courte ; pas tout à fait la demi-page stricte suggérée
     par le programme (retiré du dépôt depuis, voir point 234), mais un
     resserrement réel et assumé, avec le détail renvoyé vers les fichiers
     dédiés plutôt que dupliqué.
236. ⏳ **3 code smells trouvés (Jour 10, audit sans correction) — à traiter
     plus tard**, pas de correction faite pour l'instant :
     - `nomAcquereur()` dupliquée à l'identique dans 3 pages (Lots.jsx,
       Tma.jsx, AppelsDeFonds.jsx) — à extraire dans un utilitaire partagé.
     - `versDateInput()` dupliquée à l'identique dans **8 composants**
       (DetailEntreprisesTma, FormulaireAppelDeFonds, FormulaireDatesTma,
       FormulaireEditionLot, FormulaireSignatureActe, FormulaireSuiviPret,
       LigneEntreprise, SectionInfosProgramme) — le smell le plus net des
       trois, à extraire en priorité.
     - "God components" : `Tma.jsx` (777 lignes, 21 fonctions internes),
       `Lots.jsx` (895 lignes, 13 fonctions), `AppelsDeFonds.jsx` (641
       lignes, 10 fonctions) — trop de responsabilités par fichier, à
       découper (pas encore décidé comment).
237. ✅ **Check-up "développeur confirmé"** — fait le 01/09/2026, en miroir
     du point 271 (revue "professionnel de l'immobilier"). Claude dans la
     peau d'un développeur senior auditant le dépôt, sur la grille de
     questions ci-dessus. Vérifications faites dans le code réel avant
     d'écrire (pas de supposition) : recherche de `TODO`/`FIXME`/`HACK`
     sur tout le projet, présence d'une librairie de validation dans
     `package.json`, mécanisme du `Compteur` (`findOneAndUpdate`+`$inc`),
     recherche de rate-limiting sur la connexion, lecture de
     `server/middleware/auth.js` en entier.

     **Points forts** :
     - Erreurs serveur centralisées et disciplinées
       (`repondreErreurServeur()`, 46 points d'appel dans 12 fichiers,
       jamais de détail brut renvoyé au client en production).
     - RBAC réellement côté serveur (`autoriserRoles`), pas seulement
       caché côté UI ; `verifierToken` propre (401 non connecté / 403
       mauvais rôle bien distingués, jeton ne contient que `{id, role}`).
     - `Compteur` correctement atomique (`findOneAndUpdate`+`$inc`), évite
       le piège classique lire-puis-écrire sur une numérotation partagée.
     - Logique financière partagée plutôt que dupliquée
       (`calculerEmissionAppel()` réutilisée par 2 routes) — exactement
       l'endroit où la duplication est la plus dangereuse.
     - Pattern de "snapshot" (donnée figée vs donnée vivante) appliqué
       avec discernement à plusieurs endroits (phase figée à la
       génération, `corpsDeTravaux` figé, historiques en copies).
     - Traçabilité du "pourquoi" exceptionnelle (commentaires datés,
       renvoyés à un point `demandes.md`) ; **zéro** `TODO`/`FIXME`/`HACK`
       dans tout le projet (vérifié) — les points ouverts vivent dans la
       doc, pas en commentaire oublié.
     - CI minimale mais honnête (lint + syntaxe), sans prétendre avoir des
       tests qu'il n'y a pas.

     **Points faibles** :
     - **Zéro test automatisé** — le point le plus lourd d'un point de vue
       ingénierie sur du code qui calcule des pourcentages encadrés par la
       loi et de vrais montants.
     - **Aucune couche de validation explicite aux frontières des
       routes** — vérifié : pas de Joi/Zod/express-validator dans
       `package.json`, seulement 2 vérifications manuelles de type
       (`typeof`/`isNaN`) sur tout `server/routes/`. Repose presque
       entièrement sur les contraintes de schéma Mongoose.
     - **Aucun rate-limiting sur `POST /api/auth/connexion`** — bcrypt
       bien utilisé, mais rien ne freine les tentatives répétées.
     - Dette déjà trackée (point 236) mais réelle : 3 "god components",
       `nomAcquereur()`/`versDateInput()` dupliquées.
     - `Object.assign(lot, champs)` (lots.js, PATCH) : champs du corps de
       requête posés assez directement sur le document Mongoose — pas de
       liste blanche explicite de ce qu'une route/un rôle a le droit de
       modifier. Pas une faille confirmée, un point à surveiller si le
       projet grandit.

     **Dette technique et risques (concurrence, cas limites)** :
     - Concurrence non gérée : pas de verrouillage optimiste, deux
       utilisateurs qui modifient la même fiche en même temps se
       l'écrasent silencieusement (dernier "Enregistrer" gagne, sans
       avertissement) — invisible avec un seul testeur, réel dès 2
       utilisateurs simultanés.
     - Cas limites pas systématiquement vérifiés (tableau vide, montant à
       0, donnée créée avant l'ajout d'un champ récent) — non vérifié,
       pas confirmé cassé.

     **Note : 66/100** — logique métier et traçabilité au-dessus de la
     moyenne (80+ à elles seules), mais rigueur défensive classique
     (tests, validation, rate-limiting, concurrence) pas encore acquise.

     **Avis général** : code écrit par quelqu'un qui comprend le métier en
     profondeur et documente ses décisions avec une rigueur rare sur un
     projet solo — la traçabilité est le point le plus fort. Ce qui manque
     n'est pas de la compréhension supplémentaire, c'est le réflexe
     d'ingénierie défensive qui s'acquiert avec l'exposition à des
     incidents réels — profil attendu d'un développeur en formation, pas
     un jugement négatif.

     **Ce qui manque avant une vraie mise en production** : suite de
     tests (au moins sur les calculs financiers et les routes critiques),
     validation explicite des entrées (Zod/Joi), rate-limiting sur la
     connexion, réflexion sur la concurrence (verrouillage optimiste ou
     avertissement "modifié entre-temps"), réduire la dette des god
     components avant qu'elle ne coûte plus cher à traiter.

237bis. ⏳ **3 trouvailles concrètes du check-up "développeur confirmé"**
     (point 237), jamais trackées jusqu'ici, distinctes du point 236 :
     - Aucun rate-limiting sur `POST /api/auth/connexion`.
     - Aucune couche de validation explicite des entrées à la frontière
       des routes (pas de Joi/Zod/express-validator).
     - Concurrence non gérée : pas de verrouillage optimiste sur les
       documents modifiables par plusieurs utilisateurs.
238. ⏳ **Liste récapitulative de tout ce qui a été réalisé côté "check up"**
     — pas encore faite, demandée par Nicolas pour plus tard. Plus large
     que le point 233 (tableau de suivi de l'audit **sécurité** seul) :
     couvrir ici l'ensemble des audits menés cette session (secrets, RGPD,
     gestion d'erreurs, cohérence API, performance, accessibilité,
     logging, dépendances, CI/CD, fidélité code/doc, code smells) — quoi a
     été trouvé, corrigé, laissé en l'état par choix, ou reporté. À
     rapprocher du point 233 le moment venu (probablement le même document
     `docs/audit-securite.md`, ou un nom plus large type
     `docs/audit-checkup.md` vu que ça dépasse la seule sécurité).
     **Redemandé par Nicolas le 01/09/2026** ("liste des audits à
     réaliser et réalisés") — à compléter avec les audits menés
     depuis : check-up "développeur confirmé" (237, note 66/100), revue
     "professionnel de l'immobilier" (271, note 62/100), revue visuelle
     du code React (276), check-up de présentation/qualité d'écriture du
     code (285, pas encore fait).
239. ✅ **`docs/protocole-ia-vefa.md` créé** : copie du "Protocole IA —
     Projet VEFA (déjà avancé)" fourni par Nicolas — protocole de travail
     quotidien (distinct du programme de formation général), à prendre en
     compte en permanence à partir de maintenant. Référencé en haut de
     `docs/contexte-projet.md` et sauvegardé en mémoire persistante
     (`feedback_protocole_ia_vefa.md`) pour s'appliquer même hors
     rechargement du fichier.

     **Points à réaliser identifiés dans ce protocole, pas encore faits** :
     - ✅ Ajouter une section "Impact sur l'existant" à
       `docs/template-spec.md` (le template actuel, générique "Jour 7",
       ne l'a pas — le protocole VEFA l'exige pour toute nouvelle
       fonctionnalité touchant l'existant). ✅ fait le 31/08/2026, en
       préalable à la session du jour (protocole Étape 1) — inclut au
       passage le réflexe "test de non-régression" dans la même section.
     - ⏳ Envisager de transformer l'audit sécurité 3 points (logs, secrets,
       exposition) en Skill Claude réutilisable, comme suggéré
       explicitement par le protocole (renvoie à la Leçon D du programme).
     - ⏳ Programmer un audit de dette technique **périodique**, ciblé sur
       les parties **les plus anciennes** du projet (pas juste ce qu'on
       vient de toucher) — à distinguer du point 237 (check-up général) et
       du point 236 (3 smells déjà trouvés, mais sur du code récent).
     - ⏳ Ajouter un réflexe "test de non-régression sur une fonctionnalité
       proche déjà existante" pour toute nouvelle fonctionnalité touchant
       l'existant — à intégrer p. ex. dans `docs/checklist-tests-manuels.md`.
     - ⏳ Refaire périodiquement le test de fidélité code/doc (fait une
       fois le 21/07 sur 3+3 fonctions TMA) — pas une action ponctuelle,
       un contrôle récurrent pour détecter une dérive documentaire
       progressive.
     - Rejoint aussi le point 235 (déjà noté) : `contexte-projet.md` à
       raccourcir à une demi-page, explicitement redemandé par ce
       protocole (Étape 0).

240. ✅ **Nouveaux documents de référence créés** (31/08/2026), suite à la
     relecture du point 235 : `docs/regles-metiers.md` (référence
     exhaustive et canonique de toutes les règles métier, classées par
     domaine — compilée à partir d'une relecture complète de
     `analyse-excel.md`, `schema-donnees.md`, `decisions.md`,
     `checklist-tests-manuels.md`, `journal.md`, `bugs.md`, `demandes.md`,
     puis vérifiée contre le code réel) ; `docs/regles-a-confirmer-client.md`
     (règles tranchées provisoirement par Nicolas, jamais confirmées par un
     vrai client — 1ʳᵉ entrée : barème fixe 5%/95% d'une vente d'annexe
     seule) ; `docs/a-prendre-en-compte.md` (réflexes à garder à l'esprit en
     permanence, à compléter par Nicolas au fil des sessions).
     `docs/contexte-projet.md` : la section "Règles métiers non
     négociables" pointe désormais vers `regles-metiers.md` au lieu de
     dupliquer son contenu ; `docs/analyse-excel.md` marqué explicitement
     obsolète (bandeau en tête, gardé pour l'historique uniquement).
241. **Doublon du point 96** (même question, découverte séparément le
     31/08/2026 en relisant `docs/schema-donnees.md`) — fusionné dans 96,
     rien à traiter ici en plus.
242. ⏳ **Point resté ouvert (rôles)** : rôle "acquéreur" en lecture seule sur
     ses propres données, évoqué en cadrage initial (09/07/2026), jamais
     modélisé. Repéré dans `docs/schema-donnees.md` mais jamais tracké ici
     jusqu'au 31/08/2026 ; maintenant aussi listé dans
     `docs/regles-metiers.md` § 11.
243. ⏳ **Boutons d'action pas encore masqués/désactivés pour le rôle
     "lecture"** — le blocage est déjà effectif et suffisant côté serveur
     (`autoriserRoles`), mais l'UI ne l'empêche pas visuellement (un clic
     sur "Modifier"/"Supprimer" avec ce rôle échoue seulement après coup,
     via l'erreur serveur). Amélioration UX à faire si ce rôle est
     réellement utilisé en pratique. Repéré dans `docs/schema-donnees.md`
     mais jamais tracké ici jusqu'au 31/08/2026 ; maintenant aussi listé
     dans `docs/regles-metiers.md` § 11.
244. ✅ **`docs/taches-a-traiter.md` créé** (31/08/2026) : liste consolidée
     de toutes les tâches encore ⏳/❓ du projet, regroupée par thème
     (suivi qualité, UX, règles métier, sécurité/infra, valorisation),
     compilée à partir d'une relecture complète de cette liste. Réflexe de
     mise à jour automatique ajouté dans `docs/a-prendre-en-compte.md`
     (point 2) : toute tâche qui passe ⏳ y est ajoutée immédiatement, sans
     attendre qu'on le redemande.
     En relisant cette liste pour la compiler, plusieurs points trouvés
     faits mais jamais cochés ont été corrigés au passage : 180, 182, 183,
     185 (✅), 234 (fichier supprimé entre-temps, note devenue sans objet),
     235 (fait aujourd'hui même). Doublon 96/241 fusionné.
245. ⏳ **Réaliser le document `CLAUDE.md`** (demande directe de Nicolas,
     31/08/2026) — fichier créé le même jour (point 251, migration brute de
     `docs/contexte-projet.md`), mais **reste ⏳** : Nicolas veut qu'on
     retravaille vraiment son contenu, la simple migration ne suffit pas
     (fusionné avec l'ancien point 249, voir `docs/taches-a-traiter.md`).
246. ⏳ **Test : sujet à approfondir** (demande directe de Nicolas,
     31/08/2026, formulée telle quelle) — à préciser avec lui avant de
     s'y mettre.
247. ⏳ **Compléter le document `docs/regles-a-confirmer-client.md`**
     (demande directe de Nicolas, 31/08/2026) — créé le même jour avec une
     seule entrée (barème annexe seule), à alimenter au fil de l'eau.
248. ⏳ **Compléter le document `docs/a-prendre-en-compte.md`** (demande
     directe de Nicolas, 31/08/2026) — créé le même jour avec 2 entrées.
     Complété une 1ʳᵉ fois le jour même (6 nouvelles entrées, 3 à 8) suite
     à la question de Nicolas sur la prise en compte permanente de
     `docs/protocole-ia-vefa.md` : extraction des déclencheurs concrets du
     protocole (début de session, nouvelle fonctionnalité sur l'existant,
     bug signalé, code smell repéré, fichier touchant des données
     d'acquéreur, checklist des pièges) — le protocole lui-même reste la
     référence détaillée, ce document ne garde que les réflexes courts et
     actionnables. **Reste ⏳ en continu** (précision de Nicolas,
     31/08/2026) : ce n'est pas une tâche ponctuelle qui se clôture, c'est
     un document évolutif — Nicolas indiquera lui-même quand il a quelque
     chose de nouveau à y ajouter, jamais coché ✅ pour ce motif.
249. ⏳ **Retravailler le fichier `docs/contexte-projet.md`** (demande
     directe de Nicolas, 31/08/2026) — déjà resserré une première fois le
     jour même (point 235), Nicolas souhaite qu'on y retravaille encore.
     **`docs/contexte-projet.md` devenu une simple redirection depuis
     l'Étape 0 du protocole (point 251)** : la cible réelle de ce point est
     désormais `CLAUDE.md`, à la racine du projet — fusionné avec le point
     245 (même besoin), voir `docs/taches-a-traiter.md`.
250. ✅ **`docs/protocole-ia-vefa.md` mis à jour** (31/08/2026) à partir de
     `protocole-vefa-avance.md` (nouveau document fourni par Nicolas,
     dossier Téléchargements) — changement principal : migration prévue de
     `docs/contexte-projet.md` vers un vrai `CLAUDE.md` à la racine du
     projet (chargé automatiquement par Claude Code, Étape 0), qui donne
     enfin des étapes concrètes au point 245. Autres ajouts : réflexe
     "demander à Claude de sauvegarder une règle en mémoire" si corrigé
     plusieurs fois sur le même point en session (Étape 1, fait le lien
     avec le système de mémoire persistante déjà utilisé) ; distinction
     Skill (procédure à la demande) vs `CLAUDE.md` (contexte permanent
     automatique) précisée (Étape 4) ; avertissement sur une très longue
     session qui peut faire sortir `CLAUDE.md` de la fenêtre de contexte
     malgré le chargement automatique (checklist des pièges).
251. ✅ **Étape 0 du protocole réalisée** (31/08/2026) : `CLAUDE.md` créé à
     la racine du projet (migration du contenu de
     `docs/contexte-projet.md`, chemins adaptés + un renvoi ajouté vers
     `docs/taches-a-traiter.md`) — chargé automatiquement par Claude Code
     en début de session. Point 245 : fichier créé mais **laissé ⏳**, un vrai
     retravail du contenu reste attendu (voir point 245). `docs/contexte-projet.md`
     transformé en simple redirection vers `CLAUDE.md` (contenu non
     dupliqué, pour éviter toute dérive entre les deux). `README.md` mis à
     jour pour pointer vers `CLAUDE.md`. `git status`/`git log` vérifiés :
     rien de bloquant, historique propre. **Pas commité** — comme toujours,
     Nicolas commite lui-même.
     **Test de fidélité fait dans la foulée** (3 fonctions, jamais testées
     avant, extension du point 232) : `recalculerTma()`
     (`server/routes/tmaEntreprises.js`), `validerDatesCoherentesAvecStatut()`
     (`server/routes/lots.js`), `statutPret()`/`statutSignature()`
     (`client/src/utils/statuts.js`). 2 écarts réels trouvés et corrigés
     dans `docs/regles-metiers.md` : (1) le statut TMA `annule` (bouton
     "Annuler la TMA") était sous-documenté — c'est une vraie transition de
     la machine à états, symétrique de `refuse` (mémorise
     `statutAvantAnnulation`, route de restauration dédiée), pas juste une
     "trace" comme écrit initialement ; (2) `statutPret()` peut aussi
     retourner `sans_pret`, valeur absente de la liste des statuts dérivés.
     `validerDatesCoherentesAvecStatut()` : aucun écart, doc confirmée
     exacte.
     ⏳ **Reste ouvert** : décision de Nicolas sur l'option
     `~/.claude/CLAUDE.md` (préférences personnelles tous projets, pas
     propre à VEFA) — pas tranchée, pas une décision à prendre à sa place.
252. ⏳ **`~/.claude/CLAUDE.md` (niveau utilisateur, tous projets)** —
     Nicolas a explicitement dit de laisser ça de côté pour l'instant
     (31/08/2026), mais de le noter pour plus tard.

## Liste de tâches à réaliser (PDF, 01/09/2026)

Liste transmise d'un coup par Nicolas, prise en compte et éclatée en
points individuels comme le reste de ce document — aucun n'est encore
réalisé, juste tracké ici et dans `docs/taches-a-traiter.md`.

253. ⏳ **Documentation** : faire un point sur l'ensemble des docs, les liens
     qu'il pourrait y avoir entre eux, et s'assurer qu'une mise à jour de
     chacun se fasse automatiquement (sauf indication précise contraire de
     Nicolas) — rejoint le réflexe déjà en place (`docs/a-prendre-en-compte.md`
     point 2), mais Nicolas demande une vraie passe de revue, pas juste le
     réflexe au fil de l'eau.
254. ⏳ **Appels de fonds — numéro d'appel** : créer un numéro d'appel de
     fonds suivant la phase (ex: "Appel de fonds n°1 : Réservation",
     "Appel de fonds n°3 : Mise hors d'eau"), affiché dans le tableau
     (après la colonne "Lot") et répercuté dans tous les exports concernés
     — généralité de la page Appels de fonds, pas un export isolé.
255. ⏳ **Idée à cadrer** : étudier la faisabilité d'un agent IA jouant le
     rôle d'un client professionnel de la promotion immobilière, maîtrisant
     l'ensemble des données manipulées par l'application — à cadrer avant
     toute implémentation (spec + coût réel, voir `docs/protocole-ia-vefa.md`
     Étape 6).
256. ⏳ **Nouvelle page "TS" (Travaux Supplémentaires)** — clarifié par
     Nicolas (01/09/2026) : travaux demandés en cours de chantier, **hors
     marchés déjà signés** (donc distinct de la TMA, qui couvre les
     modificatifs acquéreur avant/pendant la vente). **À traiter avec le
     même principe que la page TMA** — même logique de workflow/machine à
     états, mêmes types d'écrans, à adapter au cas TS plutôt qu'à
     recopier. Nécessitera une vraie spec avant implémentation (Étape 2 du
     protocole, section "Impact sur l'existant" — bien distinguer TS de
     TMA partout, ne pas les confondre dans le code ni la doc).
257. ✅ **TMA, export "Devis client" fait (01/09/2026)** — les 4 montants du
     PDF (`exporterDevisTma()`, `client/src/utils/export.js`) passaient
     explicitement `decimales: 0` ; repassés à la valeur par défaut de
     `formatMontant()` (2 décimales) : le montant TTC de chaque demande
     ET les 3 totaux HT/TVA/TTC en pied de devis. Vérification de
     cohérence faite (pas de suppression générale) : les autres exports
     gardent leurs décimales là où le point 152 les avait explicitement
     retirées (cartes de stats, colonnes non-totaux) — seul ce devis
     précis avait perdu les siennes par erreur.
258. ⏳ **Mettre à jour `docs/concepts-techniques.md`.**
259. ✅ **Page Lots — alignement visuel fait (01/09/2026), étendu à toute
     l'application** — Nicolas a signalé le même défaut ailleurs pendant
     le traitement. Cause : les tableaux de l'appli centrent toutes leurs
     cellules (`table.tableau-lots th, td { text-align: center }`), donc
     le signe "€" (à la fin du texte) se décale horizontalement d'une
     ligne à l'autre selon le nombre de chiffres du montant. Nouvelle
     classe `.colonne-montant` (`text-align: right` +
     `font-variant-numeric: tabular-nums`, dans `main.scss`), appliquée à
     **toutes** les colonnes de montant identifiées dans l'appli (en-tête,
     corps, pied de tableau) : Lots (Prix TTC, Prix TTC/m² SHAB,
     historique des modifications de prix) ; TMA (Montant TTC entreprises,
     Montant TTC client, y compris la ligne de totaux) ; Appels de fonds
     (Montant TTC du tableau principal, et les 4 colonnes montant du
     récapitulatif par lot, y compris ses totaux). Les montants affichés
     hors tableau (cartes de stats, listes déroulantes, libellés en ligne
     dans les panneaux d'édition) ne sont pas concernés — pas de colonne à
     largeur fixe, donc pas le même défaut. Suite verte (130/130), lint
     propre, recompilation Vite vérifiée.
260. ✅ **Retirer du dossier les fichiers Word/PDF de remarques fait
     (01/09/2026)** — les 4 fichiers ignorés par Git (`.gitignore`, commit
     `2ce5f08` : "Remarques sur rapport des règles métier"
     `.docx`/`.pdf`, "Listes des taches à réaliser 010926" `.docx`/`.pdf`)
     supprimés physiquement du dossier. **Découverte en marge, traitée le
     jour même après confirmation de Nicolas** : 24 autres fichiers
     Word/PDF de remarques similaires ("Remarques sur schéma données",
     "Nouvelles demandes générales", etc.), plus les 14 fichiers du
     dossier `Exports/` (PDF/Excel générés par l'appli en test manuel),
     étaient en réalité **déjà versionnés dans Git** (jamais ajoutés au
     `.gitignore`) — contrairement à l'intention affichée du commentaire
     du `.gitignore` ("pas des livrables du projet"). Nicolas a confirmé
     qu'ils ne contiennent rien de sensible et a demandé leur suppression.
     **38 fichiers retirés du suivi Git et du disque** (`git rm`), motif
     générique ajouté au `.gitignore` (`/*.docx`, `/*.pdf` à la racine,
     `/Exports/`) plutôt que fichier par fichier — couvre aussi les futurs
     fichiers du même genre. **Note** : ce nettoyage retire ces fichiers du
     suivi à partir de maintenant, mais ils restent visibles dans les
     anciens commits de l'historique Git tant qu'aucune réécriture
     d'historique n'est faite (non demandée, jugée disproportionnée —
     contenu confirmé non sensible).
261. ⏳ **Export "Tableau de suivi de prêt"** : ajouter les colonnes
     coordonnées (adresse, commune, code postal, téléphone, email) de la
     banque et/ou du courtier.
262. ⏳ **Export Signature acte (équivalent)** : ajouter les coordonnées du
     notaire.
263. ⏳ **Export "Statistiques" (Suivi de prêt)** : ajouter une colonne "%"
     — le pourcentage de chaque étape par rapport au nombre total de
     dossiers concernés.
264. ⏳ **Export "Statistiques" (Signature acte)** : même demande que le
     point 263.
265. ⏳ **Retravailler l'ensemble des exports de statistiques**, toutes
     pages confondues.
266. ⏳ **Appels de fonds, export "Récapitulatif détaillé par phase"** :
     afficher "En retard" en rouge dans la case de la date de règlement
     quand le délai est dépassé sans règlement effectué.
267. ⏳ **Réfléchir à l'intégration d'un logo client** dans l'entête des
     exports (entête à retravailler par la même occasion) et dans le
     bandeau d'entête de l'application.
268. ⏳ **Appels de fonds : revoir les cartes de statistiques** de la page.
269. ⏳ **Grosse amélioration de tous les exports, sans exception** — au-delà
     des points ponctuels déjà listés ci-dessus (261-266).
270. ⏳ **Règle métier — Appels de fonds** : s'assurer que le dernier appel
     de fonds d'un lot soit exactement égal au solde restant dû, pour
     éviter tout écart d'arrondi cumulé sur les phases précédentes — à
     ajouter dans `docs/regles-metiers.md` une fois implémenté.
271. ✅ **Exercice de revue externe** : fait le 01/09/2026 — Claude dans la
     peau d'un professionnel de l'immobilier neuf regardant l'application.
     Avis basé sur la doc/les règles métier (`regles-metiers.md`,
     `README.md`, `taches-a-traiter.md`), **pas** sur une navigation
     visuelle réelle dans l'appli — complété ensuite par le point 276.

     **Points forts** :
     - Le cœur métier est vraiment compris, pas juste "codé" : la cascade
       "réglé à l'acte", le barème figé à la génération et verrouillé dès
       le premier appel émis, le dépôt de réservation réglé automatiquement
       dès la réservation — des subtilités qu'un développeur n'ayant
       jamais suivi un dossier VEFA n'aurait pas anticipées.
     - Statuts déduits des dates, jamais cliqués à la main — élimine une
       classe entière d'erreurs humaines (le piège classique d'un suivi
       Excel).
     - Historique et traçabilité pris au sérieux : annulations et
       modifications de prix conservées avec motif, jamais un simple
       écrasement silencieux.
     - Multi-programme et 3 rôles avec un vrai rôle lecture seule —
       correspond à une vraie organisation, pas à un outil pensé pour un
       utilisateur unique.
     - Alertes de retard proactives (prêt, notaire, appels de fonds, TMA).

     **Points faibles** :
     - Aucun test automatisé, alors que l'outil calcule des pourcentages
       d'appels de fonds encadrés par la loi — pas de garantie de
       non-régression sur ces calculs précis pour un usage avec de
       l'argent réel.
     - Toujours en local, jamais déployé — un back-office de promotion,
       c'est plusieurs personnes qui doivent y accéder en même temps.
     - Pas de stratégie de sauvegarde tranchée (tier MongoDB gratuit, pas
       de sauvegarde continue) — vrai point de vigilance pour des données
       contractuelles et financières.
     - Aucune pièce jointe possible (actes, attestations MOE, devis
       entreprises signés) — seules les dates existent, pas les documents
       eux-mêmes ; l'outil reste un tableau de bord, pas un dossier
       complet.
     - Dette de code réelle (composants trop volumineux, fonctions
       dupliquées) — invisible pour l'utilisateur, mais pèse sur la
       capacité à faire évoluer l'outil vite si un jour il faut le
       maintenir à plusieurs.

     **Fonctionnalités non réalisées / manquantes** : import/gestion
     documentaire (pièces jointes) ; portail acquéreur en lecture seule ;
     page "Travaux Supplémentaires" (TS) ; envoi de demandes de devis TMA
     aux entreprises ; personnalisation visuelle (logo du client) ;
     version mobile/responsive.

     **À améliorer** : les exports (chantier à reprendre en profondeur,
     souvent ce qui part directement chez le notaire/la banque/la
     direction) ; numérotation lisible des appels de fonds ; alignement
     visuel des montants et boutons.

     **Note : 62/100** — pas une note de produit fini, une note d'un socle
     métier très solide (le cœur vaudrait 80+ tout seul) qui n'est pas
     encore un produit utilisable en conditions réelles (fiabilité, accès
     multi-utilisateur, documents, sauvegarde).

     **Avis général** : rare de voir un projet de formation avec une
     aussi bonne compréhension du métier plutôt qu'un CRUD générique
     repeint aux couleurs de l'immobilier. Ce qui manque n'est pas de la
     compréhension métier supplémentaire, c'est tout ce qui rend un outil
     interne réellement adoptable par une équipe : fiabilité prouvée,
     accessibilité à plusieurs, gestion documentaire.

     **Ce qui manque pour le vendre** : un vrai hébergement pérenne ; une
     garantie de fiabilité (tests automatisés au moins sur les calculs
     financiers) ; une politique de sauvegarde/reprise assumée et
     documentée ; la gestion documentaire (pièces jointes) ; un cadre
     juridique minimal (CGU, politique de confidentialité) dès lors que
     des données d'acquéreurs tiers y transitent ; une identité
     personnalisable (logo, image).
272. ⏳ **Point sur l'infrastructure** : où en est-on, avec explications
     pédagogiques — rejoint les points 223-229 déjà ouverts (sauvegarde
     MongoDB, plan de déploiement).
273. ⏳ **TMA : améliorer visuellement le bouton de réattribution des TMA.**
274. ⏳ **Généralité : aligner les boutons "Exporter"** avec le reste des
     boutons de chaque page.
275. ❌ **Demande annulée par Nicolas avant traitement.** Contenu original
     non conservé : la demande a été annulée pendant la rédaction de ce
     point (traitement de la liste de 23 tâches du 01/09/2026), avant
     d'être committée où que ce soit — vérifié via `git log --all -p`,
     aucune trace dans l'historique. Numéro laissé vacant plutôt que
     renuméroté, pour ne pas décaler les points suivants déjà référencés
     ailleurs dans la documentation.
276. ✅ **Complément à la revue externe (point 271)** : fait le 01/09/2026.
     Nicolas a demandé une vraie navigation visuelle dans l'appli
     (captures d'écran, interaction réelle) — impossible dans cet
     environnement (aucun outil navigateur/capture d'écran disponible,
     seul `WebFetch` existe et ne gère ni le login JWT ni l'interaction
     avec une page). Solution de repli validée par Nicolas : 3 sous-agents
     ont lu intégralement les 9 pages React (JSX + composants importés +
     SCSS) et produit un inventaire strictement factuel (sans jugement)
     de ce qui s'affiche réellement à l'écran, page par page — palette de
     couleurs de statut, structure de chaque écran, colonnes de tableau,
     éléments interactifs, composants transverses réutilisés. Synthèse
     professionnelle faite ensuite par Claude à partir de cet inventaire :

     **Confirmé par la lecture du code, invisible depuis la doc seule** :
     une vraie cohérence visuelle (même palette de statuts, même
     composant de badge, même bouton crayon qui déplie une ligne d'édition
     en place plutôt qu'une modale, même style de fenêtre d'export sur
     toutes les pages) — se ressent comme un seul produit, pas cinq
     écrans assemblés au fil de l'eau. Des détails qui montrent un vrai
     souci de l'utilisateur final : fusion de cellules quand un dossier
     est "sans prêt" (pas de tirets répétés sur 5 colonnes vides) ; pied
     de tableau qui recalcule toujours sur ce qui est filtré à l'écran,
     jamais sur l'intégralité des données invisibles ; recherche qui
     retrouve "5 444" en tapant dans un montant affiché "5 444 €" ;
     aperçu de montant recalculé en direct sur le barème d'un lot, avec
     un total qui vire au rouge tant que ça ne fait pas 100%.

     **Points d'inquiétude supplémentaires, vus seulement en lisant le
     code réel** :
     - La page Paramètres est un mur : 9 sections empilées sur un seul
       long scroll (infos programme, délais/taux, alertes, barème,
       étages, annexes, lots, entreprises, utilisateurs), sans onglets.
     - Des `window.confirm()`/`alert()` natifs du navigateur pour des
       actions importantes (annuler une vente, barème qui ne fait pas
       100%) — popups non stylées qui détonent dans une interface par
       ailleurs soignée.
     - Aucune page d'accueil/tableau de bord transversal : après le choix
       du programme, atterrissage direct sur le tableau des lots, pas de
       vue "ce qui demande attention aujourd'hui" au-delà de la fenêtre
       d'alertes au lancement.
     - Écrans de connexion et de choix de programme très nus (aucun logo,
       carte blanche centrée sur fond neutre) — rien à voir avec l'image
       d'un outil qui porterait la marque d'un client.

     **Impact sur la note** : n'a pas fait bouger la note de 62/100 (point
     271) — nuance l'avis plutôt qu'il ne le change : très abouti sur les
     écrans cœur de métier (Lots, TMA, Appels de fonds), nettement plus
     brut sur les écrans périphériques (connexion, paramètres,
     confirmations).
277. ⏳ **4 points UX découverts lors de la revue visuelle (point 276)**,
     jamais trackés jusqu'ici :
     - Page Paramètres : 9 sections empilées sans onglets, un seul long
       scroll — pénible pour y retourner régulièrement.
     - Confirmations natives du navigateur (`window.confirm()`/`alert()`)
       sur des actions importantes (annuler une vente, barème ≠ 100%) — à
       remplacer par une vraie modale stylée, cohérente avec le reste.
     - Aucune page d'accueil/tableau de bord transversal après le choix du
       programme (on atterrit direct sur Lots) — pas de vue "ce qui
       demande attention aujourd'hui" au-delà de la fenêtre d'alertes.
     - Écrans de connexion et de choix de programme très nus (aucun logo,
       carte blanche isolée) — rejoint le point 267 (logo client).
278. ⏳🔶 **Tests automatisés — chantiers 1 et 2 faits (01/09/2026),
     serveur ET client** :
     - **Chantier 1 (serveur)** : `docs/specs/tests-automatises-serveur.md`.
       Vitest installé (`server/package.json`), `Tma.test.js` (16 tests)
       et `appelsDeFonds.test.js` (4 tests), `npm test` 20/20 verts. Écart
       trouvé et corrigé avec l'accord explicite de Nicolas :
       `calculerEmissionAppel()` renvoyait `regleAutomatiquement: null`
       (pas `false`) avec un lot sans acte — `!!` ajouté dans
       `server/utils/appelsDeFonds.js`.
     - **Chantier 2 (client)** : `docs/specs/tests-automatises-client.md`.
       Vitest installé (`client/package.json`),
       `client/src/utils/statuts.test.js` (25 tests, les 8 fonctions),
       `npm test` 25/25 verts. Écart trouvé dans **le test lui-même** (pas
       le code source) : comparaison UTC vs heure locale sur
       `calculerDateLimiteMois` au passage du changement d'heure d'été —
       corrigé en construisant les dates de test en heure locale.
     - CI (`.github/workflows/ci.yml`) complété avec 2 jobs (`test-back`,
       `test-front`). `CLAUDE.md`/`README.md` corrigés (le statut "pas de
       tests" était devenu faux). Les deux chantiers suivis de bout en
       bout selon l'Étape 2 du protocole (spec avec "Impact sur
       l'existant" d'abord, commit avant génération vérifié propre à
       chaque fois, tests réellement exécutés — pas juste supposés).
     **Reste ⏳** : tests d'intégration sur les routes API critiques
     (appels de fonds, TMA) et tests de composants React — hors périmètre
     des deux premiers chantiers, voir les specs.
279. ⏳ **Cadre juridique minimal** (CGU, politique de confidentialité) —
     ressort du point 271, jamais tracké jusqu'ici. Nécessaire dès lors
     que des données d'acquéreurs tiers transiteraient par l'outil pour le
     compte d'un client réel — question juridique, pas technique, mais
     bloquante pour une commercialisation.
280. ⏳ **2 points supplémentaires du check-up développeur (point 237)**,
     jamais trackés jusqu'ici, en plus du point 237bis :
     - `Object.assign(lot, champs)` (lots.js, PATCH) : pas de liste
       blanche explicite des champs modifiables par route/rôle — pas une
       faille confirmée, un point à vérifier si le projet grandit.
     - Dérouler une vraie passe de vérification des cas limites (tableau
       vide, montant à 0, donnée créée avant l'ajout d'un champ récent) —
       aujourd'hui non vérifié systématiquement, pas confirmé cassé.
281. ⏳ **Inventaire "pousser les tests automatisés au bout du bout"**
     (01/09/2026, demande explicite de Nicolas de ne rien oublier sur ce
     sujet), en complément des chantiers 1/2 déjà faits (point 278) :
     - **A. ✅ Fait (01/09/2026)**, voir
       `docs/specs/tests-automatises-utilitaires.md` : `validerDatesCoherentesAvecStatut()`
       et `nettoyerPourPdf()` exportées (un seul mot-clé chacune, rien
       d'autre changé), puis testées avec `correspondRecherche`, `apiFetch`
       et `chercherCodePostal` — 32 nouveaux tests (49/49 client, 28/28
       serveur). Aucun écart de comportement trouvé cette fois.
       **`calculerLargeursColonnesFigees()` volontairement laissée de
       côté** (dépend d'un vrai objet jsPDF, plus proche d'un test
       d'intégration) — reste ⏳, à reprendre avec un outillage dédié
       (mock jsPDF), confirmé avec Nicolas.
     - **B. ✅ Fait (01/09/2026)**, voir `docs/specs/tests-automatises-auth.md` :
       `server/middleware/auth.js` (`verifierToken`, `autoriserRoles`) —
       10 tests (jeton absent/malformé/expiré/mauvais secret, rôles
       autorisés/refusés), 38/38 côté serveur. Aucun écart trouvé, le
       middleware se comportait déjà comme documenté. Non-régression
       vérifiée en conditions réelles (`GET /api/lots` sans jeton → 401).
     - **C. ✅ Fait (01/09/2026), version allégée** — voir
       `docs/specs/tests-automatises-integration.md`. Décision
       d'architecture prise avec Nicolas : `mongodb-memory-server` (vraie
       base MongoDB éphémère), **sans** passer par Express/HTTP (le plan
       initial demandait de scinder `server/index.js` pour tester de
       vraies routes — jugé trop invasif après remise en question,
       remplacé par des tests directs sur `genererAppelsDeFonds()` avec de
       vrais documents Mongoose). 3 tests, `server/test-setup.js` créé et
       réutilisable pour de futurs chantiers d'intégration. 41/41 côté
       serveur. Tests HTTP sur les vraies routes (`supertest` + split
       `app.js`/`index.js`) restent **hors périmètre**, reportés à plus
       tard si le besoin s'en fait sentir.
     - **D. ✅ Fait (01/09/2026)** — voir
       `docs/specs/tests-automatises-composants.md`. `jsdom` +
       `@testing-library/react`/`jest-dom` installés, `Badge`, `StatCard`,
       `useFermerAvecEchap` testés (12 tests), 61/61 côté client. Vrai
       blocage rencontré et corrigé : Vitest n'appliquait pas
       `@vitejs/plugin-react` sans config dédiée (`React is not defined`)
       — `client/vitest.config.js` créé (fusion de `vite.config.js` +
       `esbuild.jsx: 'automatic'` explicite), réutilisable pour tout futur
       test de composant.
     - **E. ✅ Fait (01/09/2026)** — voir
       `docs/specs/tests-automatises-coverage.md`. `@vitest/coverage-v8`
       configuré (`npm run coverage`, serveur et client),
       `coverage/` ignoré par Git. Chiffres actuels : **25,23%** côté
       serveur, **3,64%** côté client (attendu vu la stratégie "par lots" —
       100% sur tout ce qui a été testé, 0% sur le reste, pas encore
       touché). Incident d'infrastructure rencontré et résolu en cours de
       route : les deux `npm install` lancés en parallèle ont bloqué la VM
       WSL (11 processus accumulés) — corrigé par `wsl --shutdown` (accord
       explicite de Nicolas) puis réinstallation en séquentiel.
     - **F. ⏳ Fait en partie (01/09/2026)** — Nicolas a créé le dépôt
       GitHub (`nicolas-pueyo-cazalis/gestion-vefa`, **privé**) et poussé
       le code, guidé pas à pas (aucun remote n'existait avant ce jour).
       **Le CI a tourné pour la 1ʳᵉ fois réellement sur GitHub** (jamais
       arrivé avant, malgré les points 221/222 qui le décrivaient comme
       "en place") : les 4 jobs (`lint-front`, `verifie-back`, `test-back`,
       `test-front`) sont passés au vert, 18-24s chacun. **Protection de
       branche bloquée** : ni les "Rulesets" (nouvelle interface) ni les
       "Branch protection rules" (interface classique) ne s'appliquent sur
       un dépôt **privé** avec un compte GitHub gratuit (message
       GitHub explicite : nécessite un compte Team/Enterprise). Deux
       options identifiées : passer le dépôt en public (protection
       gratuite et sans limite), ou rester privé et laisser ce point de
       côté. **Nicolas choisit l'option 2 pour l'instant** (rester privé,
       pas de protection de branche active) — décision explicite, pas un
       oubli, à reconsidérer plus tard s'il change d'avis sur la
       visibilité du dépôt.
     **Ordre de traitement choisi par Nicolas : A → B → C → D → E → F.**
282. ⏳ **Explication complète et pédagogique de tous les tests
     automatisés** (demande explicite de Nicolas, 01/09/2026) : Nicolas
     est novice et veut tout comprendre — quels tests existent, pourquoi
     chacun a été écrit, à quoi il sert concrètement (pas juste "ça
     teste X"). **Report explicite à la toute fin de la série de
     chantiers de tests** (précision de Nicolas le 01/09/2026, point 289)
     — pas maintenant. Couvrira à ce moment-là l'ensemble des tests
     réellement faits (147 après le chantier 11, plus si d'autres
     chantiers s'ajoutent avant la fin) : fonctions de calcul, middleware
     d'authentification, scénarios d'intégration, composants React,
     contextes, mécanisme de couverture.
283. ✅ **`resynchroniserMontantReservation()` fait (01/09/2026)** — exportée
     (`server/routes/lots.js`), 3 tests ajoutés à
     `lots.integration.test.js` : montant de la phase Réservation qui suit
     une renégociation de prix avant l'Acté, figé une fois Acté, pas de
     plantage si aucun appel n'existe encore. 55/55 côté serveur.
284. ✅ **Chantier 8 (tests d'intégration, suite) fait (01/09/2026)** —
     voir `docs/specs/tests-automatises-integration-2.md`.
     `synchroniserAnnexesEtPrix()` et `genererAppelsAnnexeSeule()`
     exportées ; `recalculerTma()` déjà exportée. 11 nouveaux tests
     (7 dans `lots.integration.test.js`, 4 dans le nouveau
     `tmaEntreprises.integration.test.js`), 52/52 côté serveur. Un test
     corrigé **avant** exécution (pas un vrai bug) : l'hypothèse "le
     statut d'une TMA validée ne bouge jamais" était imprécise — seul le
     **montant client** est réellement figé une fois "Validé",
     `recalculerTma()` re-dérive toujours le statut depuis les dates.
285. ⏳ **Check-up de présentation/qualité d'écriture de l'ensemble du
     code** (demande explicite de Nicolas, 01/09/2026) : est-ce que le
     code est bien écrit, bien présenté — indentation, alinéas,
     cohérence de style, lisibilité — sur l'ensemble du projet (front et
     back). Différent des audits déjà faits : pas l'architecture/la
     sécurité (point 237, check-up "développeur confirmé"), pas la
     duplication/les god components (point 236, code smells) — ici,
     spécifiquement la forme du code (présentation), pas le fond. Pas
     encore fait.
286. ✅ **Chantier 9 (tests, composants avec API/contexte) fait
     (01/09/2026)** — voir `docs/specs/tests-automatises-composants-2.md`.
     `AuthContext.jsx` (contexte + `fetch`) et `RouteProtegee.jsx`
     (composant qui consomme ce contexte) testés — 9 nouveaux tests,
     70/70 côté client. Généré du premier coup, aucun blocage cette fois,
     aucun écart de comportement trouvé.
287. ✅ **Chantier 10 (tests, ProgrammeContext) fait (01/09/2026)** — voir
     `docs/specs/tests-automatises-composants-3.md`. Fonction plus riche
     que prévu (dépend d'`AuthContext`, contient le correctif d'un vrai
     bug historique, point 143) : 7 tests, dont un test explicite du
     garde-fou anti-régression. 77/77 côté client. Généré du premier
     coup.
288. ✅ **Chantier 11 (tests, `calculerLargeursColonnesFigees`) fait
     (01/09/2026)** — voir `docs/specs/tests-automatises-jspdf.md`.
     Fonction exportée, testée avec un objet jsPDF simulé (pas de vraie
     instance). 5 nouveaux tests, 82/82 côté client. Précision découverte
     (pas un bug) : `largeursMax` ne plafonne que la largeur de base, la
     colonne peut quand même dépasser ce plafond après redistribution du
     surplus. **Clôture le point A de l'inventaire "tests au bout du
     bout"** (dernière fonction laissée de côté, maintenant testée).
289. ✅ **Couverture de code relancée (01/09/2026)** après les chantiers
     8 à 11 : **32,54%** côté serveur (était 25,23% au point 281.E),
     **5,47%** côté client (était 3,64%) — progression sur les deux.
     Nicolas a choisi de reporter l'explication pédagogique (point 282) à
     la toute fin de la série de chantiers de tests, plutôt que maintenant.
290. ✅ **Chantier 12 (tests, Bandeau + ChoixProgramme) fait (01/09/2026)**
     — voir `docs/specs/tests-automatises-composants-4.md`. 12 nouveaux
     tests, 94/94 côté client. **Vrai blocage d'infrastructure trouvé et
     corrigé** (pas un bug du code source) : `@testing-library/react` ne
     nettoie pas le DOM entre deux tests par défaut avec Vitest — 1ᵉʳ
     chantier avec plusieurs tests sur le même composant dans un fichier,
     jamais posé problème avant. Corrigé au niveau infrastructure :
     nouveau `client/src/test-setup.js` (nettoyage DOM + réinitialisation
     des mocks après chaque test), branché globalement dans
     `client/vitest.config.js` — profite à tous les tests du projet,
     présents et futurs, pas seulement ce chantier.
     `Connexion.jsx`/`AlerteRetards.jsx` restent en réserve pour un
     chantier ultérieur. Les pages entières (`Lots.jsx`, `Tma.jsx`,
     `AppelsDeFonds.jsx`) restent un sujet à part, à discuter avec
     Nicolas avant de s'y lancer (rattaché à la dette des "god
     components", point 236) — pas encore tranché.

291. ✅ **Chantier 13 (tests, page `Lots.jsx`) fait (01/09/2026)** — voir
     `docs/specs/tests-automatises-page-lots.md`. Premier chantier sur
     une page entière ("god component") : approche validée avec Nicolas
     — extraire les fonctions pures plutôt que tester la page comme une
     boîte noire. `nomAcquereur()`, dupliquée à l'identique dans
     `Lots.jsx`/`Tma.jsx`/`AppelsDeFonds.jsx` (code smell point 236),
     extraite dans un nouveau fichier partagé `client/src/utils/acquereur.js`
     et importée par les 3 pages — duplication réglée pour de bon.
     11 autres fonctions de `Lots.jsx` exportées en place (`export`
     ajouté, rien déplacé) et testées dans `Lots.test.js`. 29 nouveaux
     tests (4 + 25), 123/123 côté client. **Vrai bug de grammaire trouvé
     en écrivant les tests** : `ligneAnnexesType`/`ligneSurfaces`
     accordaient le pluriel en ajoutant "s" à la fin de la phrase entière
     au lieu de chaque mot ("Parking extérieurs" au lieu de "Parkings
     extérieurs" pour un libellé à 2 mots) — Nicolas a demandé une vraie
     correction plutôt qu'un ajustement du test ; corrigé avec un nouveau
     helper `pluraliser()`, testé indépendamment. Non-régression
     vérifiée : suite complète verte, `oxlint` 0 erreur, serveur de dev
     Vite recompile sans erreur. Fonctions internes au composant
     `Lots()`, et les fonctions propres à `Tma.jsx`/`AppelsDeFonds.jsx`
     (`tmaObsolete`, `texteRechercheTma`, `texteRechercheAppel`) restent
     hors périmètre, pour un chantier ultérieur dédié à ces pages.

292. ✅ **Chantier 14 (tests, `Tma.jsx` + `AppelsDeFonds.jsx`) fait
     (01/09/2026)** — voir `docs/specs/tests-automatises-pages-tma-appels.md`.
     Suite du chantier 13, même approche : `tmaObsolete()` et
     `texteRechercheTma()` (`Tma.jsx`), `texteRechercheAppel()`
     (`AppelsDeFonds.jsx`) exportées en place et testées. 7 nouveaux
     tests, 130/130 côté client. Aucun bug trouvé cette fois. Lint et
     recompilation Vite vérifiés sans erreur. **Clôt le sujet "pages
     entières"** (point 290) : les 3 god components ont désormais toutes
     leurs fonctions module-level pures testées — le découpage interne
     des composants eux-mêmes reste une dette distincte (point 236).

293. ✅ **Check-up de présentation/qualité d'écriture du code fait
     (01/09/2026)** (point 285) — 2 sous-agents en parallèle (serveur,
     client), consigne stricte : constats sourcés (fichier + ligne),
     aucune correction pendant l'audit. Constat de départ vérifié :
     **aucun outil de formatage configuré nulle part** (pas de Prettier,
     pas de `.editorconfig`, `.oxlintrc.json` du client ne contient que 2
     règles React, rien sur le style). Résultat : code globalement très
     cohérent malgré ça (discipline manuelle sur 7 semaines), avec
     quelques dérives isolées trouvées et vérifiées personnellement avant
     restitution — 3 fichiers datés du tout premier jour du projet restés
     en guillemets doubles/points-virgules (`formatMontant.js`,
     `data/lots.js`, `data/tma.js`), un vrai bug d'indentation dans le
     `<thead>` de `Tma.jsx` (lignes 608-624), quelques lignes anormalement
     longues des deux côtés, 2 micro-incohérences côté serveur (guillemets
     pour échapper une apostrophe, position de `&&`). Recommandation
     convergente des deux audits : adopter Prettier.
     **Décision de Nicolas : adopté.** `prettier` installé en
     devDependency dans `client/` et `server/` (paquets npm séparés, pas
     de monorepo), config partagée `.prettierrc.json`/`.prettierignore` à
     la racine (`semi: false`, `singleQuote: true`, `printWidth: 100`,
     `trailingComma: "all"` — cohérent avec ce que les audits avaient déjà
     trouvé majoritaire). Scripts `format`/`format:check` ajoutés aux deux
     `package.json`. Un seul passage `--write` sur tout le code JS/JSX
     (95 fichiers touchés, formatage pur — vérifié par relecture d'un
     extrait, aucune valeur métier changée). **Non-régression vérifiée** :
     55/55 côté serveur, 130/130 côté client, `oxlint` 0 erreur.

---

294. ✅ **Mode planification pour les gros chantiers, fait (02/09/2026)**
     — Nicolas a demandé d'utiliser le mode planification (explorer/lire/
     questionner seulement, plan écrit, validation explicite avant toute
     exécution) pour toute demande large ou risquée, à consigner dans le
     protocole. Ajouté `docs/protocole-ia-vefa.md` (Étape 1bis) et
     `docs/a-prendre-en-compte.md` (point 8), sauvegardé en mémoire
     persistante. Appliqué dans la foulée pour cadrer le chantier de
     tests exhaustifs des god components (voir point suivant).
295. ✅ **Chantier de tests exhaustifs état/affichage/API des god
     components, cadré (02/09/2026)** — suite à la décision de sécuriser
     complètement (pas seulement les points les plus risqués) avant le
     découpage (point 236). Spec écrite
     (`docs/specs/tests-automatises-composants-pages-completes.md`) et
     plan détaillé validé en mode planification pour `AppelsDeFonds.jsx`
     (page pilote, la plus petite des 3) : `fireEvent` déjà installé
     suffit (pas besoin de `@testing-library/user-event`, vérifié via le
     précédent existant `ChoixProgramme.test.jsx`), nouveau mock à
     ajouter sur `utils/export.js`. Implémentation pas encore commencée.
296. ✅ **Hooks Claude Code mis en place (02/09/2026)** — Nicolas a
     transmis un extrait de cours sur les hooks (PostToolUse, PreToolUse,
     déterminisme vs simple consigne) et demandé de documenter la
     pratique ET de configurer un vrai hook maintenant. **Hook Prettier
     automatique** créé : `.claude/settings.json` (versionné, pas
     `.local.json`) déclenche `.claude/hooks/format-on-write.js` après
     chaque `Write`/`Edit` sur un fichier `.js`/`.jsx`/`.json` de
     `client/`ou `server/`. **Vrai piège technique rencontré et
     contourné** : Node.js n'existe que dans WSL sur cette machine (ni
     Git Bash ni PowerShell natif) — la commande du hook route donc par
     `wsl -e bash -lic "..."`. Testé de bout en bout avant écriture dans
     `settings.json` (introduction volontaire d'une violation de style
     dans `client/src/utils/acquereur.js`, vérifié que le hook la
     corrige, reverti) — conforme au protocole "pipe-tester avant
     d'écrire". `PreToolUse` (blocage d'actions dangereuses) documenté
     mais pas mis en place, pas de besoin concret identifié pour
     l'instant. Documenté dans `docs/protocole-ia-vefa.md` (Étape 7),
     `docs/a-prendre-en-compte.md` (point 9) et mémoire persistante.

---

297. ✅ **4 hooks supplémentaires mis en place (02/09/2026)**, suite à la
     réflexion demandée sur ce qui mérite un hook sur ce projet. En plus
     du hook Prettier (point 296) :
     - `PostToolUse` **oxlint** (`lint-on-write.js`) sur les fichiers
       `.js`/`.jsx` de `client/` — ne signale que les vraies erreurs
       (exit non nul), pas les avertissements déjà connus et acceptés
       (vérifié : `oxlint` sort en 0 même avec 13 avertissements sur
       `Lots.jsx`).
     - `PostToolUse` **alerte erreur 500 en dur** (`erreur500-on-write.js`)
       sur les fichiers `server/` : signale un `res.status(500)` écrit à
       la main au lieu de passer par `repondreErreurServeur()`.
     - `PreToolUse` **blocage `.env`** (`bloquer-env.js`) : empêche toute
       écriture directe dans un vrai `.env`/`.env.local` (secrets),
       `.env.example` reste modifiable normalement.
     - `PostToolUse` **tests en tâche de fond** (`test-on-write.js`,
       `async`/`asyncRewake`) : relance uniquement le fichier
       `*.test.js`/`*.test.jsx` modifié, ne réveille Claude qu'en cas
       d'échec — succès silencieux.
     - `Stop` **rappel git status** (`status-on-stop.sh`) : affiche les
       fichiers non commités à la fin de chaque réponse, sans passer par
       WSL (Git fonctionne nativement en Git Bash, contrairement à
       Node.js).
     Logique de conversion de chemin partagée extraite dans
     `.claude/hooks/lib.mjs` (évite la duplication entre les hooks Node).
     **Chaque hook testé individuellement en succès ET en échec** avant
     d'être écrit dans `settings.json` (ex : fichier `.jsx` avec un vrai
     hook conditionnel pour prouver la détection oxlint, test délibérément
     cassé pour prouver la détection d'échec) — aucun fichier de test
     laissé derrière. `settings.json` final validé par un parse JSON réel
     (pas de `jq` disponible ni dans Git Bash ni dans WSL sur cette
     machine).

---

## Notes

Cette liste sera tenue à jour à chaque nouvelle demande, dans le même
esprit que `journal.md` et `bugs.md`.
