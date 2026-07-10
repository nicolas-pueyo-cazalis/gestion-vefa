# Demandes de Nicolas — Gestion VEFA

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

## Notes

Cette liste sera tenue à jour à chaque nouvelle demande, dans le même
esprit que `journal.md` et `bugs.md`.
