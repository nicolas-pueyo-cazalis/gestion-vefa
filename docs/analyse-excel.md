# Analyse des fichiers Excel de référence

Analyse des deux fichiers métier fournis (dossier `références/`) : structure des
onglets, colonnes, et surtout les **formules** qui encodent la vraie logique
métier (ce sont elles qui nous intéressent le plus, pas juste la mise en page).

Méthode : lecture programmatique des fichiers avec la librairie Node `xlsx`
(SheetJS), en extrayant les formules brutes de chaque cellule — plus fiable
qu'une lecture visuelle pour ne rater aucune règle de calcul.

---

## 1. Fichier `VEFA complété 4.xlsm`

### Onglets

| Onglet | Rôle |
|---|---|
| `Synthese_Programme` | Table maîtresse des **lots** : étage, type, orientation, surfaces, prix, statut de vente |
| `Base_de_donnée_clients` | Table maîtresse des **acquéreurs** : identité, contact, dates clés |
| `Listing_Acquéreurs` | Vue filtrée (coordonnées uniquement), recalculée depuis `Base_de_donnée_clients` |
| `Suivi_Prêt_et_Notaire` | Vue filtrée (prêt bancaire + signature notaire), recalculée depuis `Base_de_donnée_clients` |
| `Appels_de_Fonds` | Calcul et suivi des paiements par lot, phase par phase |
| `Tableau_Commercial` | Dashboard : statistiques de vente (comptes et sommes par statut) |
| `Parametres` | Référentiel : statuts, types de logement, étages, **barème des phases de travaux** |
| `EXPORT`, `EXPORT_Synthese_programme` | Vue d'export/impression, pas de nouvelle donnée |

**Constat important :** `Listing_Acquéreurs` et `Suivi_Prêt_et_Notaire` ne sont
pas des données indépendantes, ce sont des vues recalculées de
`Base_de_donnée_clients` via des formules `IF(...="","",...)`. En base de
données, ça n'a pas de sens de dupliquer une table trois fois : ce sera un seul
modèle `Acquereur`, et ces "vues" deviendront des filtres/projections côté API
ou des vues front (liste contacts, liste prêts/notaire).

### Modèle de données identifié

- **Programme** : nom, maître d'ouvrage, adresse, commune, nombre de logements, date de livraison
- **Lot** : référence, étage, type (T1, T1bis, T2...), orientation, surface habitable, surface terrasse/balcon, surface jardin, parkings, caves, prix TTC, prix/m², **statut** (`Libre` → `Option` → `Réservé` → `Acté`)
- **Acquéreur** : nom, prénom, adresse, téléphone, email, lot associé
- **Suivi prêt/notaire** (rattaché à l'acquéreur) : date de réservation, date limite d'obtention du prêt, banque, courtier, offre de prêt reçue (oui/non), date limite de signature d'acte, date de signature effective
- **AppelDeFonds** : un par (lot × phase de travaux), avec montant, date de paiement

### Règle métier n°1 — le barème des appels de fonds

Le référentiel `Parametres` définit un phasage fixe des travaux, avec un
pourcentage du prix à chaque phase (colonnes `Phasage travaux` / `Avancement (%)`)
:

| Phase | % du prix |
|---|---|
| Réservation | 5% |
| Achèvement des fondations | 30% |
| Mise hors d'eau | 25% |
| Mise hors d'air | 30% |
| Achèvement des travaux | 5% |
| Remise des clés | 5% |
| **Total** | **100%** |

C'est le principe légal de la VEFA : le prix est payé au fur et à mesure de
l'avancement réel du chantier, jamais en une fois (données de ce fichier
fictives, mais le principe et les paliers sont réalistes).

> **Décision (09/07/2026)** — Dans Excel, ce barème est un référentiel unique,
> partagé par tous les programmes. Nicolas a fait remarquer que le phasage et
> les % varient d'un projet à l'autre. **Le barème ne sera donc pas une
> constante de l'application : il devra être définissable par programme**,
> avec une validation que la somme des % fait bien 100%.

### Règle métier n°2 — déclenchement d'un appel de fonds

C'est la formule la plus importante du fichier (`Appels_de_Fonds`, colonne
d'un appel de phase) :

```
IF(AND(Parametres!<date_attestation_MOE><>"", Synthese_Programme!<statut>="Acté"),
   PrixTTC * Parametres!<pourcentage_phase>,
   "")
```

Un appel de fonds pour une phase n'est calculé **que si les deux conditions
sont réunies** :
1. La phase a une **date d'attestation MOE** renseignée — c'est-à-dire que la
   maîtrise d'œuvre (l'architecte / le conducteur de travaux) a officiellement
   constaté que cette étape du chantier est atteinte.
2. Le lot a le statut **"Acté"** — la vente est définitivement signée chez le
   notaire (pas juste réservée).

→ Tant que l'une des deux conditions manque, aucun montant n'est exigible. Le
montant, quand il apparaît, vaut toujours `Prix TTC du lot × % de la phase`.

### Règle métier n°3 — suivi des paiements

- `Total payé` = somme des montants des phases dont la **date de règlement**
  est renseignée (le montant calculé n'est compté que s'il a effectivement été
  payé).
- `Solde restant dû` = `Prix TTC − Total payé`.

Le fichier Excel ne gère aucune échéance de paiement pour un appel de fonds
une fois qu'il est émis — il n'y a que la date de règlement (remplie une fois
payé), pas de date limite.

> **Décision (09/07/2026)** — Nicolas veut être alerté quand un appel de
> fonds émis n'est pas réglé à temps. Ça implique un ajout par rapport au
> fichier Excel : chaque appel de fonds aura, en plus de sa date d'émission,
> une **date limite de règlement** (émission + un délai — voir règle n°5
> ci-dessous), pour pouvoir détecter les impayés en retard.

### Règle métier n°4 — échéances prêt / notaire

- Date limite d'obtention du prêt = date de réservation **+ 45 jours**.
- Date limite de signature de l'acte notarié = date de réservation **+ 3 mois**.

Ces échéances sont calculées automatiquement à partir de la date de
réservation ; le fichier prévoit des colonnes "Alerte" à côté (pour signaler
un retard), actuellement pilotées par la mise en forme conditionnelle
plutôt que par une formule — dans l'appli web, ce sera une vraie règle
serveur (comparer la date limite à aujourd'hui) exposée au dashboard.

> **Décision (09/07/2026)** — Ces délais (45 jours, 3 mois) sont propres à
> Excel, pas à la loi : en réalité ils **se négocient avec chaque client**.
> Ce seront donc des **paramètres modifiables par programme**, avec les
> valeurs actuelles gardées comme valeurs par défaut.

### Règle métier n°5 — alertes actives (nouveau, hors périmètre Excel)

Le fichier Excel se contente d'une mise en forme conditionnelle sur les
colonnes "Alerte" — il faut ouvrir le fichier et regarder pour s'en rendre
compte. Nicolas veut une détection active des retards, avec deux composants :

1. Un indicateur visuel dans les tableaux (équivalent à l'existant), pour un
   retard sur : prêt, signature notaire, **et désormais** règlement d'un
   appel de fonds.
2. **Une fenêtre de notification à l'ouverture de l'application**, listant :
   - les lots en retard sur une échéance (prêt ou signature notaire dépassée) ;
   - les appels de fonds émis et non réglés au-delà de leur date limite.

Tous les délais utilisés par ces alertes (prêt, notaire, règlement d'appel de
fonds) sont les paramètres modifiables définis dans les règles n°3 et n°4.

---

## 2. Fichier `Tableau de suivi TMA - Complété 1.xlsm`

### Onglets

| Onglet | Rôle |
|---|---|
| `Suivi_TMA` (= `TMA_DB`) | Table maîtresse des **demandes de TMA** (une ligne = une demande acquéreur) |
| `TMA_Entreprises` | Détail **par corps de métier / entreprise sous-traitante** d'une TMA (une TMA peut avoir plusieurs lignes ici) |
| `LOTS_ENTREPRISES` | Référentiel des corps de métier (gros œuvre, charpente, zinguerie...) et entreprise associée |
| `Paramètres` | Référentiel localisations (Séjour, Cuisine, SDB...) et types de logement |
| `DASHBOARD_V2` | Statistiques (nb de TMA par statut, montants validés/en cours/refusés) |
| `EXPORT_*` (5 onglets) | Vues d'impression (par entreprise, par client, par maître d'ouvrage/d'œuvre, devis client) — aucune nouvelle donnée |
| `REF_CLIENTS`, `REF_LOTS`, `REF_ENTREPRISES` | Listes déroulantes auto-générées (filtres de saisie) |

**Constat important :** il y a **deux niveaux** de suivi pour une même TMA :
- Le niveau "acquéreur" (`Suivi_TMA`) : ce que le client a demandé, le prix
  qu'on va lui facturer, son statut global.
- Le niveau "exécution" (`TMA_Entreprises`) : la même TMA peut nécessiter
  plusieurs entreprises différentes (ex: un percement de mur = maçon +
  électricien si une prise est déplacée), chacune avec son propre devis et son
  propre statut d'avancement.

C'est une vraie relation **1 TMA → N lignes d'exécution**, actuellement
simulée dans Excel avec des `XLOOKUP`/`VLOOKUP` fragiles entre deux tables. En
base de données, ce sera une vraie relation (un modèle `TMA` + un modèle
`TmaExecution` ou équivalent, avec une clé étrangère).

### Modèle de données identifié

- **TMA** : lot, client, localisation (pièce), description, date de demande,
  date d'envoi aux entreprises, priorité, montant total TTC entreprises,
  montant total TTC facturé au client, date de facturation, date de retour
  client, statut
- **TmaEntreprise** (détail d'exécution) : TMA parente, corps de travaux,
  entreprise sous-traitante, montant devis, statut d'exécution

### Règle métier n°1 — workflow des statuts (plus fin que prévu)

La formule de statut de `Suivi_TMA` calcule automatiquement un statut à partir
des dates/réponses saisies, dans cet ordre de priorité :

```
SI date de retour client renseignée         → "Validé"
SINON SI refus manuel marqué ("NON")        → "Refusé"
SINON SI retour entreprise reçu ("Oui")     → "Chiffré"
SINON SI envoyé aux entreprises              → "Étude"
SINON SI demande initiale enregistrée        → "Demande"
SINON                                         → (vide)
```

Soit le cycle réel : **Demande → Étude → Chiffré → Validé** (ou **Refusé** à
tout moment). C'est plus fin que le "demandé → chiffré → validé → facturé"
envisagé dans la fiche de cadrage initiale — il manque une étape intermédiaire
("Étude" = en attente de retour entreprise) que le vrai fichier gère.

Autre écart avec la fiche de cadrage : il n'y a **pas de statut "Facturé"**
distinct dans ce fichier — la facturation est une simple date posée une fois
"Validé" atteint, pas un vrai statut. Et côté `TMA_Entreprises`, les formules
laissent voir des statuts d'exécution encore plus avancés (**"Travaux"**,
**"Terminé"**) qui ne sont pas exploités dans `Suivi_TMA`. → Piste
d'amélioration ci-dessous.

### Règle métier n°2 — calcul du prix client (marge commerciale)

```
Montant facturé au client = Montant entreprise × 1.3   (si positif)
Montant facturé au client = Montant entreprise          (si négatif ou nul)
```

Une marge de **30%** est appliquée sur le coût du sous-traitant pour obtenir le
prix facturé à l'acquéreur — **sauf si le montant est négatif** (un avoir :
par exemple "Suppression du parquet" = -402,53€, un remboursement suite à une
suppression de prestation). Dans ce cas, aucune marge n'est appliquée : le
client récupère exactement ce qui est économisé, sans marge dessus.

> **Décision (09/07/2026)** — Deux corrections par rapport à la formule
> Excel, données par Nicolas :
> 1. Le **taux de marge (30%)** n'est pas une constante : il dépend du client
>    (maître d'ouvrage) et doit être **paramétrable par programme**.
> 2. La règle sur les montants négatifs est **différente** de ce que fait
>    Excel : ce n'est pas "le client récupère l'avoir sans marge" mais
>    **le montant facturé au client tombe à 0€** si le montant entreprise est
>    négatif (pas de remboursement direct au client dans ce cas — l'avoir
>    n'est pas répercuté). Cette règle doit elle aussi être paramétrable par
>    client, car un fonctionnement différent pourrait être demandé selon les
>    programmes.
>
> Règle mise à jour :
> ```
> Montant facturé au client = Montant entreprise × taux de marge   (si positif)
> Montant facturé au client = 0 €                                   (si négatif)
> ```
> (`taux de marge` et le comportement sur montant négatif = paramètres du
> programme/client, valeur par défaut 1.3 pour rester cohérent avec les
> données existantes)

### Règle métier n°3 — délai de retour entreprise

Date limite de retour entreprise = date d'envoi aux entreprises **+ 15 jours**
(colonne "Retard" calculée en comparant à aujourd'hui).

> **Décision (09/07/2026)** — Comme les autres délais, ce **+15 jours doit
> être paramétrable par programme/client**, pas figé en dur.

---

## 3. Pistes d'amélioration identifiées (objectif : ne pas reproduire à l'identique)

Ces constats vont nourrir la conception du modèle de données de l'appli web —
on garde la logique métier réelle, mais on corrige ce que le format Excel gère
mal :

1. **Statut TMA plus complet et explicite** : reprendre le cycle réel
   (Demande → Étude → Chiffré → Validé/Refusé) et **ajouter formellement** les
   étapes post-validation qu'Excel ne fait qu'esquisser (**Facturé**,
   **Travaux**, **Terminé**) comme une vraie machine à états, au lieu de les
   déduire de dates éparpillées dans plusieurs colonnes.
2. **Relation TMA → exécutions par entreprise en vraie base relationnelle**
   (au lieu de deux tables Excel synchronisées par `XLOOKUP`, source d'erreurs
   si une ligne est décalée).
3. **Barème des appels de fonds comme référentiel réutilisable et validé** :
   un programme immobilier doit pouvoir définir son propre phasage, avec une
   validation serveur que la somme des pourcentages fait bien 100% (dans Excel,
   rien n'empêche une erreur de saisie qui casserait ce total).
4. **Calcul des soldes centralisé côté serveur**, source de vérité unique
   (dans Excel, `Reste à payer` recopie simplement `Solde livraison`, une
   duplication qui n'a pas lieu d'être en base de données).
5. **Alertes de retard comme vraies règles métier actives** (prêt à 45 jours,
   acte à 3 mois, retour entreprise TMA à 15 jours), exposées sur un vrai
   dashboard temps réel plutôt que via la mise en forme conditionnelle d'une
   feuille figée.
6. **Permissions par rôle** : absentes du fichier Excel (tout le monde qui
   ouvre le fichier voit et modifie tout) — c'est un vrai apport de l'appli
   web (JWT + rôles admin/gestionnaire/lecture seule).

> **Validé (09/07/2026)** — Nicolas est d'accord avec l'ensemble de ces
> pistes.

---

## 4. Retours de Nicolas (09/07/2026) — synthèse

Après relecture, un principe transversal ressort de toutes les remarques : ce
que le fichier Excel traite comme des **constantes codées en dur** (barème des
phases, délais de 45 jours / 3 mois / 15 jours, taux de marge, comportement
sur montant négatif) sont en réalité des **paramètres qui varient par
programme/client**. Conséquence directe sur la conception : il faudra un
modèle de **paramètres de programme** (nom à définir, ex: `ConfigProgramme`)
qui stocke ces valeurs avec des valeurs par défaut reprenant celles observées
dans les fichiers Excel — plutôt que des constantes dans le code.

Récapitulatif des paramètres à rendre configurables (par programme, sauf
mention contraire) :

| Paramètre | Valeur par défaut (issue d'Excel) |
|---|---|
| Barème des phases de travaux (nom + %) | Réservation 5%, Fondations 30%, Hors d'eau 25%, Hors d'air 30%, Achèvement 5%, Remise des clés 5% |
| Délai limite d'obtention du prêt | 45 jours après réservation |
| Délai limite de signature notaire | 3 mois après réservation |
| Délai limite de règlement d'un appel de fonds *(nouveau)* | 30 jours (décidé le 09/07/2026, pas de valeur Excel existante) |
| Délai de retour entreprise (TMA) | 15 jours après envoi aux entreprises |
| Taux de marge commerciale (TMA) | 30% (×1.3) |
| Comportement TMA à montant négatif | Montant facturé au client = 0€ |

**Question de Nicolas — peut-on changer une règle en cours de route si elle
ne convient pas à l'usage ?** Oui, sans problème. C'est justement l'intérêt de
documenter chaque décision avec sa raison (comme dans ce fichier) : si une
règle se révèle inadaptée pendant le développement ou les tests, on retrouve
facilement pourquoi elle avait été posée ainsi, et on peut la faire évoluer en
connaissance de cause. Plus une règle est identifiée tôt (comme ici, avant
d'avoir écrit le code), moins son changement coûte cher.

---

*Prochaine étape : conception du schéma de données définitif (collections
MongoDB) en s'appuyant sur ce document, en intégrant dès le départ ces
paramètres configurables.*
