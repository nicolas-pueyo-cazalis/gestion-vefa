# Schéma de données — Gestion VEFA

Conception du modèle de données (collections MongoDB / schémas Mongoose), à
partir de l'analyse des fichiers Excel (`analyse-excel.md`) et des décisions
de paramétrage (`decisions.md`).

**Statut :** conception uniquement — l'implémentation réelle (fichiers
Mongoose dans le back-end Express) viendra à l'étape 3 de la feuille de route
(`decisions.md`). Ce document sert de plan.

## Deux notions Mongoose utilisées partout ci-dessous

Avant d'entrer dans le détail, deux notions reviennent sur presque chaque
collection :

- **Référence (`ObjectId ref: '...'`)** : un document stocke seulement
  l'identifiant d'un document d'une autre collection (comme une clé étrangère
  en SQL). Utilisé quand les données ont un cycle de vie indépendant (un `Lot`
  existe indépendamment d'un `AppelDeFonds`).
- **Sous-document embarqué** : un objet est stocké directement à l'intérieur
  du document parent, sans collection séparée. Utilisé quand la donnée n'a
  aucun sens hors de son parent (les paramètres d'un programme n'existent que
  pour ce programme).

## Convention monétaire (remarque de Nicolas du 09/07/2026)

Règle demandée : partout où un champ représente un montant (`Lot.prixTTC`,
`AppelDeFonds.montant`, `TMA.montantEntreprises`, `TMA.montantClient`,
`TmaEntreprise.montantDevis`), il doit être visible avec le symbole "€".

**Comment on applique ça sans casser les calculs :** le champ reste stocké en
base comme un `Number` pur (ex: `150000`, pas `"150000 €"`). Un `Number`
est indispensable pour pouvoir additionner, comparer, trier ces montants
(le calcul d'un appel de fonds, la somme "Total payé"...) — si on stockait le
"€" dans la donnée elle-même (en `String`), tous ces calculs deviendraient
impossibles ou demanderaient de re-parser le texte à chaque fois, ce qui est
fragile et lent.

Le "€" est donc une question d'**affichage**, pas de stockage : à chaque
endroit où un montant est montré à l'écran (étape React), on le formate avec
`Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })` — ce qui
donne directement `150 000,00 €`. Ce sera une petite fonction utilitaire
partagée (ex: `formatMontant()`), appelée partout où un montant s'affiche,
pour être sûr que le formatage est identique dans toute l'application.

### TTC / HT et TVA (décision du 10/07/2026)

Tous les montants stockés (`Lot.prixTTC`, `TMA.montantEntreprises`,
`TMA.montantClient`, `AppelDeFonds.montant`, `TmaEntreprise.montantDevis`)
sont en **TTC** — c'est la référence unique en base. Le montant **HT** n'est
jamais stocké : il se calcule à la volée (`TTC / (1 + tauxTva)`), sur le
même principe que les échéances de paiement (calculées, pas stockées — voir
plus haut). Le taux de TVA est un nouveau paramètre du programme,
`programme.parametres.tauxTva` (défaut **20%**, modifiable — même logique de
paramétrage que le reste, voir `decisions.md`).

Le HT n'est pas encore affiché nulle part dans l'application (v1) — prévu
pour plus tard, notamment dans les exports et au moment de la saisie des
devis entreprises (souvent exprimés en HT à la base).

---

## Vue d'ensemble des collections

```
Programme (N, multi-programme depuis le 17/07/2026) ──< Lot (N)
Programme (1) ──< Annexe (N)                        (catalogue, ajouté le 17/07/2026)
Lot (1) ──< Annexe (N)                              (populate virtuel, pas un champ stocké sur Lot)
Lot (1) ──< AppelDeFonds (N)
Lot (1) ──< TMA (N)
Lot (1) ──< Acquereur (N)          (rare, mais un lot peut avoir plusieurs acquéreurs — achat en indivision)
Acquereur (N) ──> Lot (N)          (un acquéreur peut, en théorie, acheter plusieurs lots)
Lot (1) ──< HistoriqueAnnulation (N)                (snapshot, ajouté le 13/07/2026)
Lot (1) ──< HistoriqueModificationPrix (N)          (ajouté le 17/07/2026)
TMA (1) ──< TmaEntreprise (N)
Entreprise (1) ──< TmaEntreprise (N)   (ajouté le 10/07/2026)
Utilisateur                         (indépendant, sert à l'authentification)
```

`(1) ──< (N)` se lit "un ... a plusieurs ...". `Programme.parametres` est un
sous-document embarqué (pas une collection séparée).

> **Multi-programme (17/07/2026)** : l'application a d'abord été conçue
> avec un seul `Programme` en base. Passage à une vraie liste de
> programmes en parallèle — voir `decisions.md`, section "Multi-programme".
> Seuls `Entreprise` et `Utilisateur` restent des référentiels globaux,
> partagés entre tous les programmes ; toutes les autres collections
> appartiennent (directement ou indirectement, via leur lot) à un
> programme précis.

---

## `Programme`

| Champ | Type | Remarque |
|---|---|---|
| `nom` | String | ex: "Résidence Les Joliettes" |
| `maitreOuvrage` | String | le promoteur |
| `adresse`, `commune`, `codePostal` | String | |
| `nombreLogements` | Number | |
| `dateLivraison` | Date | |
| `parametres` | sous-document | voir ci-dessous — **c'est la traduction directe de vos remarques du 09/07** |

### `Programme.parametres` (sous-document embarqué)

| Champ | Type | Valeur par défaut | Origine |
|---|---|---|---|
| `baremePhases` | `[{ nom: String, pourcentage: Number, ordre: Number }]` | Réservation 5%, Fondations 30%, Hors d'eau 25%, Hors d'air 30%, Achèvement 5%, Remise des clés 5% | Barème observé dans `Parametres` (fichier VEFA) — désormais par programme, pas global |
| `delaiObtentionPretJours` | Number | 45 | `Base_de_donnée_clients` (réservation + 45j) |
| `delaiSignatureNotaireMois` | Number | 3 | `Base_de_donnée_clients` (`EDATE(réservation, 3)`) |
| `delaiReglementAppelJours` | Number | **30** | Nouveau (n'existait pas dans Excel) — valeur retenue le 09/07/2026 |
| `delaiRetourEntrepriseTmaJours` | Number | 15 | `TMA_Entreprises` (date envoi + 15j) |
| `tauxMargeTma` | Number | 1.3 | `Suivi_TMA` (montant × 1.3) |
| `montantClientSaisiManuellement` | Boolean | `false` | 20/07/2026, point 173 : si activé, `tauxMargeTma` n'est plus appliqué automatiquement — le montant client de chaque TMA se saisit à la main |
| `fraisOuvertureDossierTma` | Number | `0` | 20/07/2026, point 184 : montant fixe ajouté au montant client de chaque TMA, en plus du coût des modifications |
| `appliquerFraisOuvertureDossierTma` | Boolean | `false` | 20/07/2026, point 184 : sans cette case, `fraisOuvertureDossierTma` n'a aucun effet — voir `calculerMontantClient()` |
| `tauxTva` | Number | **0.20** | Nouveau (10/07/2026) : sert à calculer le HT à la volée (`TTC / (1 + tauxTva)`), jamais stocké — voir "TTC / HT et TVA" plus haut |
| `regleMontantNegatifTma` | enum `'montant_zero' \| 'avoir_sans_marge'` | `'montant_zero'` | Règle demandée le 09/07 (`montant_zero`) ; `avoir_sans_marge` correspond à l'ancien comportement Excel, gardé en option puisque vous avez dit que ça pouvait varier par client |
| `listeEtages` | `[String]` | `['R-1','RDJ','RDC','R+1','R+2','R+3','R+4','R+5','R+6','R+7','R+8']` | Remarque du 09/07 : liste déroulante des étages, modifiable par programme (chaque bâtiment a un nombre d'étages différent) |

> **Pourquoi un sous-document et pas une collection séparée ?** Ces
> paramètres n'ont aucun sens sans leur programme, et on les lit à chaque
> calcul (appel de fonds, alerte, TMA) — les charger avec le programme en une
> seule requête est plus simple et plus rapide qu'une jointure séparée.

> **Validation à prévoir (côté serveur, pas juste côté front) :** la somme
> des `pourcentage` de `baremePhases` doit faire 100%. C'est exactement le
> genre d'erreur qu'Excel ne peut pas empêcher et qu'on corrige ici.

---

## `Lot`

| Champ | Type | Remarque |
|---|---|---|
| `programme` | ObjectId → `Programme` | |
| `reference` | String | ex: "A01" |
| `etage` | String | **liste déroulante**, valeurs autorisées = `programme.parametres.listeEtages` (voir remarque ci-dessous) |
| `type` | String | ex: T1, T2, T3bis... |
| `orientation` | enum `'Nord' \| 'Nord-Est' \| 'Est' \| 'Sud-Est' \| 'Sud' \| 'Sud-Ouest' \| 'Ouest' \| 'Nord-Ouest'` | liste fixe (les 8 orientations n'ont pas de raison de varier d'un programme à l'autre) |
| `surfaceHabitable`, `surfaceTerrasse`, `surfaceJardin` | Number | m² |
| `surfaceSousPlafondBas` | Number | ajouté le 17/07/2026, optionnel — surface sous plafond à moins de 1,80m (comble, sous pente), distincte de la surface habitable ; colonne du tableau Lots affichée uniquement si au moins un lot du programme a cette valeur renseignée |
| `prixLogementSeul` | Number | renommé/clarifié le 17/07/2026 (portait la confusion "prix du lot" alors qu'il ne couvre pas les annexes) : prix du logement seul, **saisi** à la création puis modifiable uniquement depuis la page Lots (motif obligatoire, voir `HistoriqueModificationPrix` plus bas) |
| `annexes` | virtuel Mongoose (pas stocké) | ajouté le 17/07/2026 : `Annexe` documents dont `lot` pointe vers ce lot (`populate('annexes')`) — remplace les anciens tableaux `parkings`/`caves`/`celliers` de simples numéros. Voir collection `Annexe` plus bas |
| `prixTTC` | Number | montant — voir la convention monétaire en début de document. **Calculé côté serveur** depuis le 17/07/2026 = `prixLogementSeul` + somme des `Annexe.prix` attribuées (`synchroniserAnnexesEtPrix()`, `server/routes/lots.js`), plus une simple saisie manuelle |
| `estAnnexeSeule` | Boolean | ajouté le 17/07/2026, défaut `false` — un `Lot` avec ce champ à `true` représente la vente d'une annexe seule (parking/cave/cellier sans logement), voir encadré plus bas. `prixLogementSeul` vaut alors `0`, le prix affiché ne vient que de l'annexe attribuée |
| `statut` | enum `'libre' \| 'option' \| 'reserve' \| 'acte'` | défaut `'libre'` |
| `dateOption`, `dateReservation`, `dateActe` | Date | rempli au fil du cycle de vente |
| `acquereur` | ObjectId → `Acquereur` | ajouté le 10/07/2026 : référence directe vers l'acquéreur principal du lot (relation inverse de `Acquereur.lots`), nécessaire pour afficher/éditer le client directement dans le tableau des lots. Le cas rare d'indivision (plusieurs acquéreurs pour un même lot) reste couvert par `Acquereur.lots` mais n'a pas d'interface dédiée pour l'instant |
| `commentaire` | String | ajouté le 10/07/2026, libre, optionnel |

> **Vente d'une annexe seule (`estAnnexeSeule`, 17/07/2026)** : plutôt que
> construire un second système de vente en parallèle pour le cas d'un
> parking/cave/cellier vendu sans logement (ex: un lot déjà Acté sur
> lequel plus aucune négociation n'est possible, mais dont une annexe
> reste disponible), un `Lot` à part entière est créé avec
> `estAnnexeSeule: true` — il réutilise tel quel tout le cycle de vente
> déjà en place (statut, dates, acquéreur, appels de fonds, annulation),
> sans dupliquer cette logique. Deux différences seulement : un barème
> d'appels de fonds simplifié à deux échéances fixes (Réservation 5% /
> Acte 95%, non modifiable pour l'instant — voir `AppelDeFonds` plus
> bas), et l'exclusion de ces lots du quota `Programme.nombreLogements`
> ainsi que de la liste "Lots" de Paramètres (aucune caractéristique
> technique de logement n'a de sens pour une annexe seule). Décision
> détaillée dans `decisions.md`.

> **Pourquoi des valeurs d'enum sans accent (`reserve`, `acte`) ?** Les
> valeurs d'enum sont lues par le code (comparaisons, URLs d'API, filtres) —
> mélanger des accents dans ces valeurs techniques est une source classique de
> bugs (encodage, comparaison de chaînes). L'accent reste seulement dans ce
> qui s'affiche à l'écran (ex: "Réservé"), géré côté front.

> **Pourquoi `etage` n'est pas un enum Mongoose classique comme `statut` ou
> `orientation` ?** Un `enum` Mongoose vérifie une valeur contre une liste
> **fixe, écrite dans le code**. Mais ici la liste des étages dépend du
> programme (un immeuble de 3 étages vs une résidence de 8 étages) et doit
> rester modifiable sans toucher au code — donc elle est stockée comme donnée
> (`programme.parametres.listeEtages`), pas comme enum. La vérification
> ("est-ce que cet étage existe bien dans la liste du programme ?") se fera
> par une validation applicative (dans le contrôleur Express à l'étape 3), pas
> par le schéma Mongoose seul. C'est une limite normale des enums statiques :
> dès qu'une liste doit être modifiable par l'utilisateur, elle devient de la
> donnée, pas du schéma.

> Les dates limites de prêt et de signature notaire (**§ Règle métier n°4** de
> l'analyse Excel) ne sont **pas stockées** : elles se calculent à la volée
> (`dateReservation + programme.parametres.delaiObtentionPretJours`, etc.). Ça
> évite d'avoir une donnée qui se périme si personne ne la recalcule — un des
> points d'amélioration identifiés par rapport à Excel.

---

## `Annexe` (ajouté le 17/07/2026)

Catalogue des parkings/caves/celliers d'un programme — remplace les
anciens tableaux `Lot.parkings`/`caves`/`celliers` (simples numéros sans
prix ni existence propre).

| Champ | Type | Remarque |
|---|---|---|
| `programme` | ObjectId → `Programme` | |
| `type` | enum `'parking_ext' \| 'parking_int' \| 'cave' \| 'cellier'` | parkings extérieurs et intérieurs distingués (remarque de Nicolas — pas le même produit, ni le même prix) |
| `numero` | Number | identifiant, unique par `(programme, type, numero)` |
| `prix` | Number | montant → convention "€" en début de document |
| `lot` | ObjectId → `Lot` \| `null` | `null` = disponible à la vente ; renseigné = attribuée à un logement OU vendue seule (`Lot.estAnnexeSeule`) |

> **Pourquoi une relation `Annexe.lot` plutôt que `Lot.annexes: [ObjectId]`
> ?** Une annexe appartient à un seul lot à la fois (ou à aucun) — porter
> la référence côté `Annexe` évite un tableau à synchroniser à la main
> des deux côtés. Côté `Lot`, la relation inverse est exposée par un
> **populate virtuel** Mongoose (`schema.virtual('annexes', { ref:
> 'Annexe', localField: '_id', foreignField: 'lot' })`), pas par un champ
> stocké — voir `concepts-techniques.md`.

---

## `HistoriqueAnnulation` (ajouté le 13/07/2026)

Snapshot complet d'une vente annulée — permet de "repartir à zéro" sur le
lot (remis à `libre`) tout en gardant une trace consultable de la vente
annulée, y compris si l'acquéreur concerné est supprimé par la suite.

| Champ | Type | Remarque |
|---|---|---|
| `lot` | ObjectId → `Lot` | le lot dont la vente a été annulée |
| `programme` | ObjectId → `Programme` | |
| `referenceLot` | String | copiée (pas juste l'ObjectId), pour rester lisible même si le lot est ensuite supprimé (cas d'une annexe seule, voir plus bas) |
| `statut`, `client`, `dates`, `pret`, `acte`, `appelsDeFonds`, `tma`, `commentaire` | copies (pas des références) | **snapshot complet**, pas juste un pointeur — l'annulation d'une vente ne doit rien perdre de son historique même si les documents source changent ou disparaissent ensuite |

> **Consultation** : fusionnée dans la page Lots depuis le 17/07/2026
> (section repliable "Voir l'historique", voir plus bas) — il n'existe
> plus de page/route front dédiée `/annules`.

> **Cas particulier `estAnnexeSeule`** : annuler la vente d'une annexe
> seule libère l'annexe (`Annexe.lot = null`) puis **supprime le `Lot`**
> plutôt que de le remettre à `libre` — un lot `estAnnexeSeule` n'a pas
> vocation à exister en dehors d'une vente en cours ; sa revente repasse
> entièrement par "Vendre une annexe". Voir `bugs.md` pour le bug initial
> où cette libération manquait.

---

## `HistoriqueModificationPrix` (ajouté le 17/07/2026)

Trace chaque changement de prix d'un lot (ou d'une annexe vendue seule)
après sa création — motif obligatoire à chaque fois, cohérent avec des
négociations réelles qui doivent pouvoir se justifier après coup.

| Champ | Type | Remarque |
|---|---|---|
| `lot` | ObjectId → `Lot` | |
| `programme` | ObjectId → `Programme` | |
| `referenceLot` | String | copiée, même raison que sur `HistoriqueAnnulation` |
| `ancienPrix`, `nouveauPrix` | Number | montant → convention "€" |
| `motif` | String | **requis** |

> Modification possible uniquement depuis la page Lots (route `PATCH
> /api/lots/:id/prix`), jamais depuis Paramètres — voir `decisions.md`,
> section "Prix modifiable uniquement depuis la page Lots". Bloquée dès
> que `Lot.statut === 'acte'` (plus de négociation possible après
> signature). Consultable en bas de la page Lots, dans la même section
> repliable que l'historique des annulations.

---

## `Acquereur`

| Champ | Type | Remarque |
|---|---|---|
| `lots` | `[ObjectId → Lot]` | tableau plutôt qu'un seul, pour couvrir le cas rare d'un acquéreur multi-lots (prévu dans le cadrage initial) |
| `civilite` | enum `'M.' \| 'Mme' \| 'M. et Mme'` | ajouté le 10/07/2026 : distinct du prénom (ex: "M. et Mme Duprat" n'est pas un prénom, c'est une civilité + un nom) |
| `nom` | String | requis |
| `prenom` | String | optionnel depuis le 10/07/2026 : la création rapide d'un acquéreur depuis la page Lots (voir `Lot.acquereur`) ne saisit que civilité + nom, le prénom se complète plus tard via la page Clients |
| `adresse`, `commune`, `codePostal` | String | |
| `telephone` | String | format **international** (voir remarque) |
| `email` | String | validé par un format email (regex) |
| `banque` | sous-document `Contact` | voir ci-dessous |
| `courtier` | sous-document `Contact` | voir ci-dessous |
| `dateOffrePretRecue` | Date \| `null` | remplace l'ancien booléen `offrePretRecue` (13/07/2026) : une vraie date, **saisie manuelle** comme `TmaEntreprise.dateRetour` (personne ne peut deviner quand la banque a répondu), qui permet en plus de savoir si l'offre est arrivée avant ou après la date limite (page "Suivi de prêt") |
| `notaire` | sous-document `Contact` | ajouté le 13/07/2026, page "Signature acte" — même sous-schéma que `banque`/`courtier` |
| `sansPret` | Boolean | ajouté le 13/07/2026 : acquisition financée sur fonds personnels, sans prêt bancaire — **saisie manuelle** (bouton "Sans prêt", page "Suivi de prêt"), rien dans les dates ne permet de le déduire. Vide `banque`/`courtier`/`dateOffrePretRecue` au passage |
| `commentaire` | String | ajouté le 20/07/2026, point 176, libre, optionnel — même principe que `Lot.commentaire`/`Tma.commentaire`, affiché sur la page Clients |

> **Remarque du 09/07 — téléphone international :** un client peut avoir un
> numéro étranger (belge, suisse, autre...), donc un simple regex "numéro
> français" (`0X XX XX XX XX`) serait trop restrictif. La bonne pratique dans
> ce cas n'est pas d'écrire son propre regex "universel" (les formats varient
> énormément d'un pays à l'autre, un regex maison serait soit trop strict,
> soit trop permissif) mais d'utiliser une librairie dédiée :
> [`libphonenumber-js`](https://www.npmjs.com/package/libphonenumber-js),
> maintenue à partir de la base de données de Google qui connaît le format de
> chaque pays. Concrètement :
> - Le numéro est **stocké normalisé** au format international **E.164**
>   (ex: `+33612345678`, `+32470123456`) — un format unique, non ambigu, facile
>   à comparer/rechercher.
> - `libphonenumber-js` valide le numéro et permet de détecter automatiquement
>   à quel pays correspond l'indicatif, au moment de la saisie.
> - Ce sera un vrai composant de saisie téléphonique international côté React
>   (étape 2), pas juste un champ texte libre — l'utilisateur choisit le pays,
>   le composant formate et valide.
>
> Pour l'email, un simple regex reste suffisant et standard :
> `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.

> **Remarque du 09/07 — coordonnées complètes pour banque/courtier :** au
> lieu d'un simple nom en `String`, `banque` et `courtier` deviennent chacun
> un sous-document avec les mêmes coordonnées qu'un contact classique :
>
> | Champ | Type |
> |---|---|
> | `nom` | String |
> | `adresse` | String |
> | `commune` | String |
> | `codePostal` | String |
> | `telephone` | String (même format international que ci-dessus) |
> | `email` | String |
>
> Ce sous-document `Contact` est assez générique pour être réutilisé tel quel
> pour `banque` et pour `courtier` (pas besoin de deux schémas différents).

---

## `AppelDeFonds`

Un document par (lot × phase du barème).

> **Décision (11/07/2026) — moment de création, point tranché.** Question
> restée ouverte depuis la conception initiale du schéma : crée-t-on les 6
> lignes (une par phase) dès la création du lot, ou seulement au moment où
> chaque phase est constatée ? Tranché en faveur d'une troisième option :
> **les 6 lignes sont générées d'un coup, automatiquement, au moment précis
> où le lot passe au statut "Acté"** (`server/routes/lots.js`,
> `genererAppelsDeFonds()`, appelée depuis `PATCH /api/lots/:id`). Avant
> "Acté", un appel de fonds n'a de toute façon aucun sens (règle métier n°2
> de l'analyse Excel — les deux conditions de déclenchement sont attestation
> MOE **et** lot Acté), donc pas de lignes "pour rien" à afficher pour les
> lots pas encore vendus ; et à l'inverse, pas besoin d'une action manuelle
> "ajouter une phase" une fois le lot vendu.

| Champ | Type | Remarque |
|---|---|---|
| `lot` | ObjectId → `Lot` | |
| `phase` | `{ nom: String, pourcentage: Number }` | **copie figée** de la phase au moment de la génération (voir ci-dessous) |
| `montant` | Number | = `lot.prixTTC × phase.pourcentage`, figé à la génération ; montant → convention "€" en début de document |
| `dateAttestationMOE` | Date | condition n°1 de déclenchement, **saisie manuelle** (en masse, par phase) — absente pour la 1ère phase du barème (voir plus bas) |
| `dateEmission` | Date | **plus automatique depuis le 20/07/2026** (point 171) : l'attestation MOE seule ne suffit plus à la poser. Posée soit via l'action "Générer un appel de fonds" (saisie explicite), soit automatiquement dans le seul cas "réglé à l'acte" (voir "Règlement automatique" ci-dessous) |
| `dateLimiteReglement` | Date | calculée automatiquement en même temps que `dateEmission` = `dateEmission + programme.parametres.delaiReglementAppelJours` |
| `dateReglement` | Date \| `null` | **saisie manuelle** en général, mais posée **automatiquement** dans deux cas précis où le règlement est factuellement acquis dès la génération (voir "Règlement automatique" ci-dessous) |
| `commentaire` | String | ajouté le 20/07/2026, point 176, libre, optionnel — propre à CETTE échéance, pas au lot entier |

### Règlement automatique (13/07/2026)

Deux cas où `dateReglement` se déduit automatiquement plutôt que d'attendre
une saisie manuelle — implémentés dans `calculerEmissionAppel()`
(`server/utils/appelsDeFonds.js`), partagée entre `genererAppelsDeFonds()`
(`server/routes/lots.js`) et `emettreAttestation()`
(`server/routes/appelsDeFonds.js`) :

1. **1ʳᵉ phase du barème (ex: "Réservation")** : le dépôt de garantie est
   réglé au moment même de la réservation, factuellement — `dateEmission`
   **et** `dateReglement` valent tous les deux `lot.dateReservation`. Cette
   phase ne demande jamais d'attestation MOE (voir plus haut).
2. **Toute autre phase, si `lot.dateActe` est postérieure ou égale à la
   date à laquelle cette phase a été attestée** (pour ce lot ou pour un
   autre lot du même programme) : l'acquéreur signe son acte alors que
   cette phase est déjà constatée, donc déjà due — le notaire encaisse la
   somme au moment de la signature. `dateEmission` **et** `dateReglement`
   valent alors `lot.dateActe` (pas la date de traitement du script/de la
   requête). Dans le cas normal inverse (`lot.dateActe` antérieure à
   l'attestation — l'acquéreur a acheté avant que la phase ne soit
   constatée), le circuit reste inchangé : `dateEmission` = maintenant,
   `dateReglement` reste `null` en attente d'une vraie saisie.

Dans les deux cas, `dateReglement` reste modifiable à la main ensuite
(bouton "Modifier", en vidant la date) si l'automatisme ne correspondait
pas à la réalité.

### Révision du moment de génération (17/07/2026)

Le principe "les 6 lignes sont générées d'un coup à l'Acté" ci-dessus a
été révisé : Nicolas a fait remarquer qu'un dépôt de réservation est
factuellement dû dès la **réservation**, pas seulement à l'acte — et
qu'une négociation de prix reste possible entre la réservation et l'acte
(mais plus après, une fois l'acte signé). `genererAppelsDeFonds(lot,
{ seulementReservation })` génère donc maintenant :
- **à "Réservé"** : uniquement la 1ʳᵉ phase du barème ;
- **à "Acté"** : les phases restantes (anti-doublon par **phase**, pas
  par lot, pour permettre cette génération en deux temps).

Tant que le lot n'est pas encore Acté, le montant de la phase
"Réservation" **suit automatiquement** une renégociation du prix
(`resynchroniserMontantReservation()`) ; il se fige définitivement dès
l'Acté, comme le prix lui-même.

**Vente d'annexe seule (`Lot.estAnnexeSeule`)** : barème dédié, à deux
échéances fixes non modifiables pour l'instant —
`genererAppelsAnnexeSeule()` (`server/routes/lots.js`) : Réservation 5%
/ Acte 95% (`POURCENTAGE_RESERVATION_ANNEXE_SEULE = 0.05`), plutôt que
les 6 phases du barème de construction complet, qui n'ont pas de sens
pour un simple parking/cave/cellier.

> **Pourquoi copier `phase` au lieu de juste stocker un `pourcentage` recalculé
> à la volée depuis `Programme.parametres.baremePhases` ?** Parce que le
> barème d'un programme pourrait être corrigé après coup (erreur de saisie,
> renégociation) — si un appel de fonds a déjà été émis avec l'ancien
> pourcentage, il ne doit pas changer rétroactivement. On fige ("snapshot")
> la valeur au moment de l'émission. C'est un principe courant dès qu'une
> donnée sert de preuve/historique (comme une ligne de facture qui garde son
> prix même si le tarif catalogue change ensuite).

> **"En retard" n'est pas un champ stocké** : c'est calculé à la volée
> (`dateLimiteReglement < aujourd'hui ET dateReglement est vide`), exactement
> comme évoqué dans la Règle métier n°5 de l'analyse — pour alimenter la
> fenêtre d'alerte au démarrage sans risquer une donnée obsolète.

---

## Suivi prêt / notaire (13/07/2026)

Ne correspond pas à une nouvelle collection : ces deux suivis se
construisent entièrement à partir de champs déjà existants
(`Lot.dateReservation`, `Lot.dateActe`, `Acquereur.banque/courtier/
dateOffrePretRecue`, `programme.parametres.delaiObtentionPretJours`,
`programme.parametres.delaiSignatureNotaireMois`) — aucun nouveau modèle,
uniquement deux nouvelles pages front qui recombinent ces données
différemment (règle métier n°4 de `analyse-excel.md`).

> **Décision d'organisation** — dans le fichier Excel d'origine, prêt et
> notaire sont réunis dans une seule vue (`Suivi_Prêt_et_Notaire`). Nicolas
> a préféré **deux pages séparées** (`/suivi-pret` et `/signature-acte`),
> chacune avec ses propres cartes de stats et son propre filtre par statut
> — plus simple à lire qu'un seul tableau avec deux sujets mélangés.

- Un lot n'apparaît dans ces deux pages qu'une fois **réservé**
  (`dateReservation` renseignée) — avant, les échéances n'ont pas de point
  de départ.
- **Suivi de prêt** : date limite = `dateReservation +
  delaiObtentionPretJours` (jours). Statut dérivé (jamais stocké, même
  principe que partout ailleurs) : `recue` si `dateOffrePretRecue` est
  renseignée, sinon `retard` si la date limite est dépassée, sinon
  `attente`.
- **Signature acte** : date limite = `dateReservation +
  delaiSignatureNotaireMois` (mois, via `setMonth()` plutôt que
  `setDate()` — gère seul le débordement d'année). Statut dérivé : `signe`
  si `Lot.dateActe` est renseignée, sinon `retard`/`attente` selon la date
  limite. Signer l'acte depuis cette page revient à faire un `PATCH
  /api/lots/:id` avec `{ statut: 'acte', dateActe }` — **la même route**
  que la page Lots, qui déclenche donc aussi, sans code supplémentaire, la
  génération des appels de fonds (`genererAppelsDeFonds()`).

### Contacts secondaires et acquisition sans prêt (13/07/2026)

- **Banque / courtier / notaire** : coordonnées complètes (pas juste un
  nom), sur le modèle de `Contact` déjà utilisé ailleurs — affichées comme
  un lien cliquable dans le tableau (composant `BoutonContact.jsx`), qui
  ouvre une fenêtre (`FenetreContact.jsx`) avec le détail. Le formulaire
  d'édition (`ChampsContact.jsx`, réutilisé sur les deux pages) ne
  duplique pas la validation stricte du formulaire Client (commune/code
  postal/email) — ce sont des contacts de référence, pas ceux de
  l'acquéreur lui-même.
- **Acquisition sans prêt** (`Acquereur.sansPret`) : le bouton "Sans prêt"
  vide `banque`/`courtier`/`dateOffrePretRecue` et bascule la ligne dans un
  état à part sur la page "Suivi de prêt" — les colonnes concernées se
  fusionnent en une seule cellule ("Acquisition avec fonds personnels"),
  et le dossier sort du décompte "en attente"/"en retard"/"offre reçue"
  (nouvelle catégorie de statut dédiée, `sans_pret`). Réversible via
  "Reprendre le suivi".

## Alertes de retard (13/07/2026)

Implémentation de la règle métier n°5 de `analyse-excel.md` (fenêtre de
notification à l'ouverture) et des deux alertes TMA actées le 10/07/2026 —
aucune nouvelle collection, uniquement une nouvelle lecture transversale
des données déjà en place.

- **`client/src/utils/statuts.js`** : centralise tous les calculs "en
  retard" (`statutAppel`, `statutPret`, `statutSignature`,
  `estEntrepriseEnRetard`, `estFactureTmaEnRetard`) — utilisé à la fois
  par les pages dédiées (Appels de fonds, Suivi de prêt, Signature acte)
  et par `AlerteRetards.jsx`, pour garantir que la fenêtre d'alertes
  affiche exactement les mêmes retards que ce que montre chaque page.
- **`AlerteRetards.jsx`**, montée une seule fois dans `Layout.jsx` (pas
  remonté en changeant de page) : récupère lots, programme, appels de
  fonds, TMA et lignes `TmaEntreprise`, calcule 5 catégories de retard, et
  s'affiche automatiquement s'il y en a au moins un. Fermeture manuelle,
  pas de réapparition avant un rechargement complet de la page — cohérent
  avec "à l'ouverture de l'application".
- **Deux alertes TMA** (décisions du 10/07/2026, absentes d'Excel) :
  une entreprise sollicitée qui n'a pas transmis de devis dans le délai
  (`TmaEntreprise.dateEnvoi + delaiRetourEntrepriseTmaJours`), et un
  client qui n'a pas répondu à une facture TMA dans le délai
  (`Tma.dateEnvoiFactureClient + delaiReponseFactureTmaJours`, uniquement
  si le statut est encore `facture`).
- **`GET /api/tma-entreprises`** assoupli : le paramètre `?tma=` devient
  optionnel (sans lui, renvoie toutes les lignes, avec la TMA et son lot
  peuplés) — nécessaire pour balayer tout le programme d'un coup, plutôt
  qu'une TMA à la fois comme le faisait jusqu'ici `DetailEntreprisesTma.jsx`.

## `TMA`

| Champ | Type | Remarque |
|---|---|---|
| `lot` | ObjectId → `Lot` | |
| `acquereur` | ObjectId → `Acquereur` | |
| `localisation` | String | ex: "Chambre 1" |
| `description` | String | |
| `dateDemande` | Date | |
| `dateEnvoiEntreprises` | Date | |
| `priorite` | enum `'basse' \| 'moyenne' \| 'haute'` | optionnel |
| `montantEntreprises` | Number | somme des `TmaEntreprise.montantDevis` liées ; montant → convention "€". **Non modifiable directement** (retiré de `PATCH /api/tma/:id/dates` le 10/07/2026) — uniquement recalculé via les routes `TmaEntreprise` |
| `montantClient` | Number | calculé selon `tauxMargeTma` / `regleMontantNegatifTma` du programme, **figé** une fois validé (même logique de snapshot que pour `AppelDeFonds`) ; montant → convention "€" |
| `dateEnvoiFactureClient`, `dateRetourClient` | Date | |
| `statut` | enum (voir machine à états ci-dessous) | |
| `statutAvantRefus` | enum `'demande' \| 'etude' \| 'chiffre' \| 'facture'` | ajouté le 10/07/2026 : mémorise l'étape quittée au moment d'un refus, pour permettre d'y revenir exactement (pas un retour systématique à "demande") |

### Machine à états de `TMA.statut`

Reprend le cycle réel observé dans Excel, complété par les étapes
post-validation identifiées comme piste d'amélioration :

```
demande → etude → chiffre → facture → valide → termine
                     ↘          ↘
                      ────────→ refuse   (possible depuis demande, etude, chiffre ou facture)
```

> **Correction du 10/07/2026** — l'ordre initial (`valide` avant `facture`)
> était incohérent avec le sens métier : `facture` correspond à l'envoi du
> devis/facture au client pour accord (`dateEnvoiFactureClient`), et `valide`
> à son retour signé (`dateRetourClient`) — la facture est donc envoyée
> **avant** que le client ne valide, pas après. D'où le nouvel ordre :
> `chiffre → facture → valide`. Les cartes de statistiques du
> front (« En cours » / « Validées ») suivent ce nouvel ordre : `facture`
> est compté dans « En cours », pas dans « Validées ».

> **Statut "travaux" retiré (20/07/2026, point 172)** — prévu à l'origine
> entre "Validé" et "Terminé", mais jamais réellement câblé côté
> interface (aucun bouton n'y menait). "Terminé" est désormais une action
> manuelle directement depuis "Validé" (`PATCH /api/tma/:id/statut`, le
> client va constater sur chantier que les travaux ont bien été réalisés
> par les entreprises), avec un moyen de revenir en arrière
> (`PATCH /api/tma/:id/annuler-termine`, repose simplement `statut =
> 'valide'` — pas de `statutAvantTermine` équivalent à
> `statutAvantRefus`, puisque "termine" n'a qu'une seule origine possible
> dans cette machine à états, rien à mémoriser). Une fois "Validé", le
> montant TTC client devient également non modifiable (point 182) — la
> négociation s'arrête là, comme pour le prix d'un lot une fois Acté.

Règle explicite (déjà dans le cadrage initial, à coder en dur dans le
back-end, pas seulement côté front) : **on ne peut pas passer à `valide` si
le statut n'est pas déjà `facture`** — et plus généralement, on ne peut pas
sauter une étape ni revenir en arrière une fois `valide` (sauf `refuse`, qui
n'est possible qu'avant validation).

> **Rattrapage d'un refus par erreur (10/07/2026)** — un clic accidentel sur
> "Refuser" ne doit pas forcer à tout reprendre depuis "demande" (le
> chiffrage entreprises déjà fait ne doit pas être perdu). Le statut quitté
> est mémorisé dans `statutAvantRefus` au moment du refus, et une action
> dédiée (`PATCH /api/tma/:id/annuler-refus`, distincte de la transition
> générique) restaure exactement cette valeur. Ce n'est **pas** une
> transition normale de la machine à états (elle dépend d'une donnée, pas
> d'une règle fixe statut → statut), d'où la route séparée.

> **Calcul automatique depuis les dates (10/07/2026)** — reprend le principe
> Excel d'origine (`docs/analyse-excel.md`) : `demande → etude → chiffre →
> facture → valide` ne se clique pas à la main, ça se déduit des dates
> saisies (`dateEnvoiEntreprises`, `montantEntreprises`, `dateEnvoiFactureClient`,
> `dateRetourClient`) via `calculerStatutAutomatique()` (`server/models/Tma.js`),
> appelée par `PATCH /api/tma/:id/dates`. Au-delà de `valide` (`termine`)
> et pour `refuse`, il n'y a pas de date correspondante dans le
> modèle actuel — ça reste une action manuelle via `PATCH /api/tma/:id/statut`.

> **Passage à "chiffre" conditionné à TOUTES les réponses entreprises
> (10/07/2026)** — quand une TMA a plusieurs lignes `TmaEntreprise` (voir
> plus bas), `montantEntreprises` ne se remplit (et le statut ne passe à
> `chiffre`) que si **toutes** les entreprises sollicitées ont répondu
> (`montantDevis` renseigné sur chaque ligne) — une seule entreprise encore
> en attente doit garder la TMA à `etude`. Logique dans `recalculerTma()`
> (`server/routes/tmaEntreprises.js`).

> **Date limite de retour entreprise** (`dateEnvoiEntreprises +
> programme.parametres.delaiRetourEntrepriseTmaJours`) : calculée à la volée,
> même logique que pour les échéances de `Lot`.

### Corrections et compléments du 13/07/2026 (points 134-137)

- **`nombreEntreprisesConcernees`** (`TMA`, Number) : ajouté pour corriger
  le passage automatique à `chiffre`, qui se basait jusque-là sur "toutes
  les lignes `TmaEntreprise` déjà créées ont répondu" — un sous-ensemble
  trompeur si toutes les entreprises concernées n'avaient pas encore été
  saisies une à une. Le calcul compare désormais le nombre de lignes
  chiffrées à cette valeur explicite plutôt qu'au nombre de lignes
  existantes.
- **Bug corrigé — `TmaEntreprise.dateEnvoi` jamais réellement saisie** :
  le champ existait dans le schéma (10/07/2026) mais n'était ni proposé
  au formulaire d'ajout ni éditable ensuite — il retombait toujours sur
  la valeur par défaut du schéma (l'instant de création), donc l'alerte
  de retard entreprise ne se déclenchait jamais avec une vraie date
  passée. Corrigé : champ ajouté aux formulaires d'ajout et d'édition, et
  synchronisation automatique sur chaque ligne quand la date d'envoi
  globale de la TMA (`Tma.dateEnvoiEntreprises`) est renseignée.
- **Alertes désactivables** (`Programme.parametres`, section
  `SectionAlertes.jsx`) : chaque catégorie de retard (prêt, notaire,
  appel de fonds, entreprise TMA, facture TMA) peut être désactivée
  individuellement par programme, pour les cas où une alerte ne
  correspond pas à l'organisation réelle du client.

---

## `TmaEntreprise`

Détail d'exécution par corps de métier — une `TMA` peut regrouper plusieurs
entreprises (ex: un percement de mur = maçon + électricien).

| Champ | Type | Remarque |
|---|---|---|
| `tma` | ObjectId → `TMA` | |
| `entreprise` | ObjectId → `Entreprise` | référence (10/07/2026 : remplace l'ancien texte libre) |
| `corpsDeTravaux` | String | **copie figée** du corps de métier de l'entreprise au moment de l'ajout — même principe que `AppelDeFonds.phase` : si le référentiel change plus tard, une ligne déjà créée ne doit pas changer rétroactivement |
| `description` | String | ajouté le 21/07/2026 : ce qui est demandé à CETTE entreprise précisément — distinct de `TMA.description` (la demande globale du client), une même TMA pouvant nécessiter des interventions différentes selon l'entreprise |
| `dateEnvoi` | Date | défaut à la création — sert de point de départ à l'alerte "entreprise n'a pas répondu à temps" |
| `dateRetour` | Date | ajouté le 10/07/2026, **saisie manuelle** (pas déduite automatiquement, contrairement à d'autres dates de l'appli) — demandé par Nicolas pour le suivi, pas encore exploité dans un calcul |
| `montantDevis` | Number | montant → convention "€" en début de document |
| `statut` | enum `'a_chiffrer' \| 'recu' \| 'valide' \| 'refuse' \| 'travaux' \| 'termine'` | passe à `recu` automatiquement dès qu'un `montantDevis` est renseigné (création ou modification) |

> **`PATCH /api/tma-entreprises/:id`** permet de modifier une ligne
> existante (montant et/ou date de retour) — nécessaire pour le cas d'une
> entreprise en attente qui répond après coup, sans avoir à supprimer/recréer
> la ligne.

---

## `Entreprise` (ajouté le 10/07/2026)

Référentiel des sous-traitants, remplace l'ancien texte libre sur
`TmaEntreprise.entreprise` — demandé par Nicolas notamment pour un futur
export des TMA envoyé directement aux entreprises.

| Champ | Type | Remarque |
|---|---|---|
| `nom` | String | |
| `corpsDeTravaux` | String | ex: "GROS OEUVRE", "MENUISERIES INTERIEURES" |
| `numeroLot` | String | ajouté le 10/07/2026 : n° du lot de travaux (ex: "01", "02"), saisi à la main — numérotation propre aux marchés de travaux, distincte des `Lot` (logements) du programme |
| `contact` | sous-document `Contact` | même sous-schéma que `banque`/`courtier` sur `Acquereur` (extrait dans `server/models/contactSchema.js`, réutilisé plutôt que dupliqué) |

---

## `Compteur` (ajouté le 21/07/2026)

Compteur générique à clé libre, pour tout besoin de numérotation
auto-incrémentée (1ᵉʳ usage : numéro de devis TMA, "TMA-2026-005") — évite
de créer une collection dédiée à chaque nouveau besoin de ce genre.

| Champ | Type | Remarque |
|---|---|---|
| `cle` | String, unique | ex: `devis-tma-<idProgramme>-<année>` — une suite par programme et par année |
| `valeur` | Number, défaut 0 | incrémentée de façon **atomique** (`findOneAndUpdate` + `$inc`), jamais lue puis réécrite à la main — évite qu'une génération concurrente ne récupère deux fois le même numéro |

---

## `Utilisateur`

Nécessaire pour l'authentification JWT (absente d'Excel — un vrai apport de
l'appli web). **Implémentée le 13/07/2026** (voir section suivante).

| Champ | Type | Remarque |
|---|---|---|
| `email` | String | unique |
| `motDePasseHash` | String | jamais le mot de passe en clair — haché avec `bcryptjs` |
| `nom` | String | |
| `role` | enum `'admin' \| 'gestionnaire' \| 'lecture'` | |

## Authentification JWT (13/07/2026)

Toute l'application est désormais derrière la connexion — aucune page ni
donnée accessible sans être connecté, y compris en simple lecture
(décision explicite de Nicolas : cohérent avec des données clients/
financières réelles une fois déployé).

### Création des comptes

**Pas d'auto-inscription publique** (décision explicite) : les 3 rôles
(`admin`/`gestionnaire`/`lecture`) correspondent à une petite équipe
interne, pas à du grand public. Le premier compte (admin) a été créé par
un script ponctuel ; tous les suivants se créent depuis Paramètres >
Utilisateurs (`SectionUtilisateurs.jsx`), réservé aux admins.

### Mécanisme

- **Connexion** (`POST /api/auth/connexion`) : compare le mot de passe
  saisi au hachage stocké (`bcrypt.compare`), puis signe un jeton JWT
  contenant uniquement `{ id, role }` (jamais le mot de passe, même
  haché) — durée 7 jours (outil interne, pas une appli bancaire).
- **`server/middleware/auth.js`** : `verifierToken` (lit l'en-tête
  `Authorization: Bearer <jeton>`, renvoie 401 si absent/invalide, pose
  `req.utilisateur`) appliqué **globalement** à `/api/*` dans
  `server/index.js` (sauf `/api/auth`, qui doit rester public). `autoriserRoles(...roles)`
  renvoie 403 si le rôle de `req.utilisateur` n'est pas dans la liste —
  appliqué à chaque route d'écriture (`POST`/`PATCH`/`DELETE`) avec
  `autoriserRoles('admin', 'gestionnaire')` : le rôle `lecture` peut tout
  consulter mais ne peut jamais rien modifier.
- **`GET /api/auth/moi`** : revalide un jeton déjà stocké (utilisé par
  `AuthContext.jsx` au chargement de l'app) — un compte supprimé
  entre-temps par un admin ne doit pas laisser croire qu'on est encore
  connecté.
- **Front** : `client/src/utils/api.js` (`apiFetch`, remplace `fetch`
  partout dans l'appli — même signature, ajoute automatiquement le jeton,
  redirige vers `/connexion` sur un 401), `client/src/context/
  AuthContext.jsx` (premier contexte React du projet — état partagé
  "qui est connecté", `localStorage` comme source de vérité entre deux
  rechargements), `RouteProtegee.jsx` (bloque l'accès à `<Layout />` tant
  que `utilisateur` est `null`), `pages/Connexion.jsx`.
- **Rôle `lecture`** : le back bloque déjà toute écriture (403 avec
  message clair, affiché comme les autres erreurs de l'appli). Les
  boutons d'action ne sont **pas** encore masqués côté interface pour ce
  rôle — laissé volontairement pour une itération suivante, le blocage
  serveur suffit à garantir la sécurité réelle des données.

---

## Exemple concret (pour ancrer la théorie) : schéma Mongoose de `Programme`

À titre d'illustration de ce à quoi ça ressemblera en code (étape 3 de la
feuille de route) :

```js
import mongoose from 'mongoose';

const phaseSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  pourcentage: { type: Number, required: true }, // ex: 0.30 pour 30%
  ordre: { type: Number, required: true },
}, { _id: false });

const parametresSchema = new mongoose.Schema({
  baremePhases: { type: [phaseSchema], default: () => ([
    { nom: 'Réservation', pourcentage: 0.05, ordre: 1 },
    { nom: 'Achèvement des fondations', pourcentage: 0.30, ordre: 2 },
    { nom: "Mise hors d'eau", pourcentage: 0.25, ordre: 3 },
    { nom: "Mise hors d'air", pourcentage: 0.30, ordre: 4 },
    { nom: 'Achèvement des travaux', pourcentage: 0.05, ordre: 5 },
    { nom: 'Remise des clés', pourcentage: 0.05, ordre: 6 },
  ])},
  delaiObtentionPretJours: { type: Number, default: 45 },
  delaiSignatureNotaireMois: { type: Number, default: 3 },
  delaiReglementAppelJours: { type: Number, default: 30 },
  delaiRetourEntrepriseTmaJours: { type: Number, default: 15 },
  tauxMargeTma: { type: Number, default: 1.3 },
  tauxTva: { type: Number, default: 0.20 },
  regleMontantNegatifTma: {
    type: String,
    enum: ['montant_zero', 'avoir_sans_marge'],
    default: 'montant_zero',
  },
  listeEtages: {
    type: [String],
    default: () => (['R-1', 'RDJ', 'RDC', 'R+1', 'R+2', 'R+3', 'R+4', 'R+5', 'R+6', 'R+7', 'R+8']),
  },
}, { _id: false });

const programmeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  maitreOuvrage: String,
  adresse: String,
  commune: String,
  codePostal: String,
  nombreLogements: Number,
  dateLivraison: Date,
  parametres: { type: parametresSchema, default: () => ({}) },
}, { timestamps: true });

export default mongoose.model('Programme', programmeSchema);
```

`{ timestamps: true }` ajoute automatiquement `createdAt`/`updatedAt` — pratique
pour savoir quand une fiche a été créée/modifiée, sans avoir à le gérer à la
main.

## Exemple concret : schéma Mongoose de `Acquereur` (validation + sous-document réutilisable)

Illustre la validation par regex et le sous-document `Contact` partagé entre
`banque` et `courtier` :

```js
import mongoose from 'mongoose';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactSchema = new mongoose.Schema({
  nom: String,
  adresse: String,
  commune: String,
  codePostal: String,
  telephone: String, // format E.164, validé via libphonenumber-js à la saisie
  email: { type: String, match: EMAIL_REGEX },
}, { _id: false });

const acquereurSchema = new mongoose.Schema({
  lots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lot' }],
  civilite: { type: String, enum: ['M.', 'Mme', 'M. et Mme'] },
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  adresse: String,
  commune: String,
  codePostal: String,
  telephone: String, // format E.164, ex: "+33612345678"
  email: { type: String, match: EMAIL_REGEX },
  banque: contactSchema,
  courtier: contactSchema,
  offrePretRecue: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Acquereur', acquereurSchema);
```

`match: EMAIL_REGEX` fait échouer la sauvegarde si l'email ne respecte pas le
format — c'est une validation **au niveau du schéma**, la même qu'on
retrouvera côté formulaire React pour un retour immédiat à l'utilisateur.

---

## Points restés ouverts (à trancher plus tard, sans bloquer la suite)

- Rôle "acquéreur" (accès lecture seule à ses propres données) évoqué dans le
  cadrage initial : pas modélisé pour l'instant, à ajouter si besoin confirmé.
- **Plan de règlement négocié (11/07/2026)** : `genererAppelsDeFonds()`
  suppose que chaque acquéreur suit le barème standard du programme
  (`Programme.parametres.baremePhases`). Nicolas a soulevé le cas d'un
  client qui négocierait un autre système de règlement (ex : tout payé à
  l'acte, plutôt qu'au fil des phases) — *"je ne sais pas encore comment
  faire, mais il se peut qu'un client négocie un autre système de
  règlement... je ne sais pas comment on pourrait intégrer cette règle"*.
  Aucune piste actée pour l'instant (pas encore un besoin concret avec un
  cas réel à modéliser) — à reprendre quand une vraie négociation de ce
  type se présentera, plutôt que d'anticiper une solution générique sans
  cas d'usage précis.
- **Export PDF** (reporté le 11/07/2026, `docs/demandes.md` #90) : un
  document par lot avec le détail des appels de fonds par phase et le
  solde restant dû. Les coordonnées complètes banque/courtier/notaire
  (13/07/2026) ont été construites avec cet export en tête — les données
  sont prêtes à l'accueillir, l'export lui-même reste à construire.
- **Masquage des actions selon le rôle "lecture"** (13/07/2026) : depuis
  l'authentification JWT, le serveur refuse déjà toute écriture pour ce
  rôle (403), mais les boutons (Modifier/Ajouter/Supprimer...) restent
  visibles côté interface même quand l'action va échouer. À reprendre si
  ce rôle est réellement utilisé un jour — masquer/désactiver ces boutons
  selon `useAuth().utilisateur.role` plutôt que de laisser l'utilisateur
  cliquer pour rien.

## Décisions du 10/07/2026 (fin de session étape 4) — travaux à venir

Trois demandes de Nicolas :

1. ✅ **Référentiel `Entreprise`** — **fait** le 10/07/2026. Nouvelle
   collection (`server/models/Entreprise.js`) : `nom`, `corpsDeTravaux`, et
   un sous-document `contact` (même sous-schéma `Contact` réutilisé pour
   `banque`/`courtier` sur `Acquereur` — extrait dans
   `server/models/contactSchema.js` pour ne plus être dupliqué).
   `TmaEntreprise.entreprise` est désormais une référence `ObjectId →
   Entreprise` (liste déroulante côté formulaire) plutôt qu'un texte libre ;
   `TmaEntreprise.corpsDeTravaux` reste une **copie figée** du corps de
   métier de l'entreprise au moment de l'ajout (même principe que
   `AppelDeFonds.phase`). Routes `GET`/`POST /api/entreprises`. Ajout au
   passage de `TmaEntreprise.dateEnvoi` (nécessaire pour l'alerte du point 3
   ci-dessous). Seed enrichi avec 6 entreprises fictives, reprenant les
   corps de métier observés dans le fichier Excel de référence.

2. **Page "Paramètres"** : nouvelle route React `/parametres` (lien dans le
   bandeau, à côté de Lots/TMA). Rassemble tout ce qui est aujourd'hui dans
   `programme.parametres` mais non modifiable ailleurs que dans `seed.js` :
   infos programme, barème des phases, entreprises (référentiel du point 1),
   liste des étages, règles TMA (marge, montant négatif), tous les délais.
   Nécessite une route `PATCH /api/programme` (aujourd'hui lecture seule) et
   les routes CRUD `Entreprise`. **À réserver aux rôles
   admin/gestionnaire** une fois l'authentification JWT en place (pas encore
   faite) — pas de contrôle d'accès pour l'instant.

3. **Deux nouvelles alertes**, dans le même esprit que l'alerte déjà prévue
   le 09/07 (dates limites dépassées, prêt/notaire/appels de fonds) :
   - **Entreprise qui n'a pas chiffré à temps** : le délai existe déjà
     (`delaiRetourEntrepriseTmaJours`), mais `TmaEntreprise` n'a pas de date
     de départ fiable — à ajouter : `dateEnvoi` (aujourd'hui seul `createdAt`
     existe, pas modifiable).
   - **Client qui n'a pas répondu à une facture TMA** : nouveau paramètre à
     créer, `delaiReponseFactureTmaJours` (n'existe pas encore — on a
     `delaiReglementAppelJours` pour les appels de fonds, mais rien
     d'équivalent pour la réponse à une facture TMA). Alerte déclenchée si
     `TMA.statut === 'facture'` et `dateEnvoiFactureClient + délai` dépassée
     sans être passée à `valide` ou `refuse`.

---

*Prochaine étape suggérée : commencer le développement effectif, étape 1 de
la feuille de route (`decisions.md`) — une version HTML/CSS/JS vanilla pour
afficher les données avant de passer à React.*
