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

---

## Vue d'ensemble des collections

```
Programme (1) ──< Lot (N)
Lot (1) ──< AppelDeFonds (N)
Lot (1) ──< TMA (N)
Lot (1) ──< Acquereur (N)          (rare, mais un lot peut avoir plusieurs acquéreurs — achat en indivision)
Acquereur (N) ──> Lot (N)          (un acquéreur peut, en théorie, acheter plusieurs lots)
TMA (1) ──< TmaEntreprise (N)
Utilisateur                         (indépendant, sert à l'authentification)
```

`(1) ──< (N)` se lit "un ... a plusieurs ...". `Programme.parametres` est un
sous-document embarqué (pas une collection séparée).

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
| `parkings`, `caves` | Number | |
| `prixTTC` | Number | montant — voir la convention monétaire en début de document (affiché avec "€", stocké en `Number` pur) |
| `statut` | enum `'libre' \| 'option' \| 'reserve' \| 'acte'` | défaut `'libre'` |
| `dateOption`, `dateReservation`, `dateActe` | Date | rempli au fil du cycle de vente |

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

## `Acquereur`

| Champ | Type | Remarque |
|---|---|---|
| `lots` | `[ObjectId → Lot]` | tableau plutôt qu'un seul, pour couvrir le cas rare d'un acquéreur multi-lots (prévu dans le cadrage initial) |
| `nom`, `prenom` | String | |
| `adresse`, `commune`, `codePostal` | String | |
| `telephone` | String | format **international** (voir remarque) |
| `email` | String | validé par un format email (regex) |
| `banque` | sous-document `Contact` | voir ci-dessous |
| `courtier` | sous-document `Contact` | voir ci-dessous |
| `offrePretRecue` | Boolean | défaut `false` |

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

Un document par (lot × phase du barème) — créé au moment où la phase est
émise, pas à l'avance pour toutes les phases futures.

| Champ | Type | Remarque |
|---|---|---|
| `lot` | ObjectId → `Lot` | |
| `phase` | `{ nom: String, pourcentage: Number }` | **copie figée** de la phase au moment de l'émission (voir ci-dessous) |
| `montant` | Number | = `lot.prixTTC × phase.pourcentage`, figé à l'émission ; montant → convention "€" en début de document |
| `dateAttestationMOE` | Date | condition n°1 de déclenchement |
| `dateEmission` | Date | posée quand les 2 conditions sont réunies (attestation MOE + lot `acte`) |
| `dateLimiteReglement` | Date | = `dateEmission + programme.parametres.delaiReglementAppelJours` |
| `dateReglement` | Date \| `null` | |

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
| `montantEntreprises` | Number | somme des `TmaEntreprise.montantDevis` liées ; montant → convention "€" |
| `montantClient` | Number | calculé selon `tauxMargeTma` / `regleMontantNegatifTma` du programme, **figé** une fois validé (même logique de snapshot que pour `AppelDeFonds`) ; montant → convention "€" |
| `dateEnvoiFactureClient`, `dateRetourClient` | Date | |
| `statut` | enum (voir machine à états ci-dessous) | |

### Machine à états de `TMA.statut`

Reprend le cycle réel observé dans Excel, complété par les étapes
post-validation identifiées comme piste d'amélioration :

```
demande → etude → chiffre → valide → facture → travaux → termine
                                 ↘
                                refuse   (possible depuis demande, etude ou chiffre)
```

Règle explicite (déjà dans le cadrage initial, à coder en dur dans le
back-end, pas seulement côté front) : **on ne peut pas passer à `facture` si
le statut n'est pas déjà `valide`** — et plus généralement, on ne peut pas
sauter une étape ni revenir en arrière une fois `valide` (sauf `refuse`, qui
n'est possible qu'avant validation).

> **Date limite de retour entreprise** (`dateEnvoiEntreprises +
> programme.parametres.delaiRetourEntrepriseTmaJours`) : calculée à la volée,
> même logique que pour les échéances de `Lot`.

---

## `TmaEntreprise`

Détail d'exécution par corps de métier — une `TMA` peut regrouper plusieurs
entreprises (ex: un percement de mur = maçon + électricien).

| Champ | Type | Remarque |
|---|---|---|
| `tma` | ObjectId → `TMA` | |
| `corpsDeTravaux` | String | ex: "GROS OEUVRE", "MENUISERIES INTERIEURES" |
| `entreprise` | String | nom de la société sous-traitante |
| `montantDevis` | Number | montant → convention "€" en début de document |
| `statut` | enum `'a_chiffrer' \| 'recu' \| 'valide' \| 'refuse' \| 'travaux' \| 'termine'` | |

> **Pourquoi `entreprise` en simple texte et pas une collection
> `Entreprise` séparée ?** Le fichier Excel a un référentiel dédié
> (`LOTS_ENTREPRISES`), mais pour la V1 on reste simple (YAGNI — on n'ajoute
> pas une collection tant qu'on n'en a pas vraiment besoin, par exemple pour
> centraliser les coordonnées d'une entreprise). Si la liste des entreprises
> devient longue et qu'on veut éviter les doublons/fautes de frappe, on
> pourra extraire une collection `Entreprise` plus tard — c'est un changement
> non bloquant.

---

## `Utilisateur`

Nécessaire pour l'authentification JWT (absente d'Excel — un vrai apport de
l'appli web, voir pistes d'amélioration).

| Champ | Type | Remarque |
|---|---|---|
| `email` | String | unique |
| `motDePasseHash` | String | jamais le mot de passe en clair |
| `nom` | String | |
| `role` | enum `'admin' \| 'gestionnaire' \| 'lecture'` | |

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

- Génération automatique des `AppelDeFonds` : quand exactement crée-t-on le
  document (dès la création du lot, pour toutes les phases à l'avance avec
  des dates vides ? ou seulement au moment où la phase est constatée ?). À
  trancher à l'étape 4 (logique métier avancée).
- Référentiel `Entreprise` séparé : voir remarque plus haut, non bloquant.
- Rôle "acquéreur" (accès lecture seule à ses propres données) évoqué dans le
  cadrage initial : pas modélisé pour l'instant, à ajouter si besoin confirmé.

---

*Prochaine étape suggérée : commencer le développement effectif, étape 1 de
la feuille de route (`decisions.md`) — une version HTML/CSS/JS vanilla pour
afficher les données avant de passer à React.*
