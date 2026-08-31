# Règles métier — Gestion VEFA

Référence **exhaustive et canonique** de toutes les règles métier de
l'application (ce que le système doit calculer/interdire/déduire), classées
par domaine plutôt que par date.

**À tenir à jour en continu** : toute règle métier nouvelle ou modifiée doit
être répercutée ici dès qu'elle est décidée — c'est le réflexe listé dans
`docs/a-prendre-en-compte.md`. Si elle est parmi les plus critiques, la
répercuter aussi dans le résumé très court de `docs/contexte-projet.md`.

Différence avec les autres fichiers de `docs/` :
- `docs/analyse-excel.md` est désormais **historique uniquement** (bandeau
  ajouté le 31/08/2026) — les règles d'origine, pas forcément celles
  d'aujourd'hui.
- `docs/decisions.md`/`journal.md`/`bugs.md` racontent **quand et pourquoi**
  une règle est apparue ou a changé — pas organisés pour vérifier
  rapidement "quelles sont toutes les règles de tel domaine".
- `docs/regles-a-confirmer-client.md` liste les règles tranchées
  provisoirement par Nicolas mais jamais confirmées par un vrai client — à
  distinguer des règles ci-dessous, considérées comme fiables.

Compilé le 31/08/2026 à partir d'une relecture complète de tous les fichiers
de `docs/`, puis corrigé le même jour suite à relecture de Nicolas (prix
moyen au m², vérification du code réel pour la génération des appels de
fonds et l'émission automatique).

---

## 1. VEFA — Cycle de vente du lot

- **Statuts** : `libre → option → reserve → acte`, ordre strict. Une date
  d'une étape non atteinte ne peut jamais être renseignée (`dateActe` posée
  seulement si `statut === 'acte'`, etc.) — validé côté serveur
  (`validerDatesCoherentesAvecStatut`), seule source de vérité.
- **Statut toujours déduit des dates**, jamais choisi dans une liste
  déroulante libre. Remplir `dateOption` fait passer le statut à `option`,
  etc. Passage à "Acté" impossible sans `dateReservation` déjà renseignée.
- **Suppression protégée** : un lot référencé par une TMA ou un appel de
  fonds ne peut jamais être supprimé.
- **"Annuler la vente"** : remet le lot entièrement à `libre` (jamais un
  statut "annulé" intermédiaire), après avoir sauvegardé un snapshot complet
  dans `HistoriqueAnnulation` (copies, pas des références).
- **Prix modifiable uniquement depuis la page Lots** (jamais Paramètres),
  motif obligatoire à chaque changement (`HistoriqueModificationPrix`).
  **Verrouillé dès `statut === 'acte'`** — plus de négociation après
  signature.
- **Plafond de logements** : impossible de créer plus de lots que
  `Programme.nombreLogements`, vérifié côté serveur.
- **Numéros de parking/cave/cellier uniques par programme** (catalogue
  `Annexe`, pas un champ libre sur le lot).
- **Colonne unique "Annexes"** (remplace un ancien système de colonnes
  dynamiques par type, devenu obsolète le 13/07/2026, point 156) : une
  seule cellule par lot, qui empile ligne par ligne
  Terrasse(s)/Balcon(s)/Loggia(s)/Jardin/Parking(s)/Cave(s)/Cellier(s) —
  une ligne par catégorie **présente** (les catégories vides/absentes sont
  omises, pas affichées en "—"). Un lot avec 3 terrasses a une seule ligne
  "Terrasses : X m², Y m², Z m²", pas 3 colonnes distinctes. Chaque
  catégorie de surface (`surfacesTerrasses`/`Balcons`/`Loggias`) accepte un
  nombre variable de valeurs en Paramètres (`client/src/pages/Lots.jsx`,
  `afficheAnnexes()` ; `client/src/components/parametres/LigneLot.jsx`).
- **Prix moyen au m²** (totaux du tableau Lots) = **Total des prix TTC
  affichés / Total des surfaces habitables (SHAB) affichées** — un seul
  calcul global, **pas** la moyenne des prix/m² de chaque lot pris
  individuellement (`client/src/pages/Lots.jsx`, `moyennePrixM2`).

## 2. VEFA — Annexes et vente d'annexe seule

- **Catalogue `Annexe`** (parking extérieur/intérieur, cave, cellier —
  types distingués, prix différents), attribuée à un lot ou disponible.
- **Prix total TTC d'un lot = calcul automatique** :
  `prixLogementSeul` (saisi) + somme des `Annexe.prix` attribuées — jamais
  ressaisi à la main, recalculé côté serveur à chaque attribution/retrait.
- **Vente d'une annexe seule** (`estAnnexeSeule: true`) : réutilise le
  cycle de vente complet d'un `Lot` (statut, dates, appels de fonds,
  annulation), `prixLogementSeul = 0`. Barème simplifié et fixe :
  **Réservation 5% / Acte 95%** — **non confirmé par un client, voir
  `docs/regles-a-confirmer-client.md`**. Exclue du quota
  `Programme.nombreLogements` et de Paramètres > Lots.
- **Annulation d'une vente d'annexe seule** : libère l'annexe
  (`Annexe.lot = null`) **puis supprime le `Lot`** — différent d'un lot
  classique, qui repasse à `libre`. Une revente repart entièrement par
  "Vendre une annexe".

## 3. VEFA — Appels de fonds : barème et déclenchement

- **Barème des phases définissable par programme**, somme des pourcentages
  = 100% obligatoire (validé côté serveur). Défaut : Réservation 5%,
  Fondations 30%, Hors d'eau 25%, Hors d'air 30%, Achèvement 5%, Remise des
  clés 5%.
- **Génération des lignes `AppelDeFonds`, en deux temps** (vérifié dans
  `server/routes/lots.js` le 31/08/2026, code conforme) : à "Réservé" →
  uniquement la 1ʳᵉ phase du barème ; à "Acté" → les phases restantes.
  Anti-doublon **par phase**, pas par lot (permet cette génération en deux
  temps).
- **1ʳᵉ phase (Réservation) auto-émise sans attestation MOE** : un lot Acté
  a nécessairement déjà `dateReservation`, donc cette phase est émise
  directement depuis cette date — jamais d'attestation demandée pour elle,
  absente du menu d'attestation en masse.
- **Montant d'une phase figé ("snapshotté")** à la génération
  (`AppelDeFonds.phase` copie nom/pourcentage/ordre) — un appel déjà émis
  n'est jamais recalculé si le barème du programme change ensuite. Avant
  l'Acté, le montant de la phase Réservation suit une renégociation du prix
  (`resynchroniserMontantReservation`) ; il se fige définitivement à l'Acté.
- **Barème général verrouillé** dès qu'un appel de fonds a été émis pour au
  moins un lot du programme.
- **Barème modifiable pour UN logement en particulier** (négociation
  directe), même après émission d'appels sur ce lot — le total des phases
  doit toujours faire 100%. N'affecte jamais les autres lots.
- **Attestation MOE en masse** : une seule saisie (phase + date) s'applique
  à tous les lots de cette phase pas encore attestés. Une phase ne peut être
  attestée que si la phase précédente du barème l'est déjà (règle qui ne
  s'applique pas à Réservation, qui ne prend jamais d'attestation).
- **Cascade "attestation vaut pour tout le programme"** : si une phase
  (au-delà de la 1ʳᵉ) a déjà été attestée pour un autre lot du même
  programme, elle est immédiatement auto-émise pour un nouveau lot qui passe
  Acté, avec la même date d'attestation — une attestation MOE constate
  l'avancement du chantier dans son ensemble, pas lot par lot.

## 4. VEFA — Appels de fonds : règlement, échéances, statut

- **Statut affiché, jamais stocké**, calculé à la volée
  (`client/src/utils/statuts.js`, `statutAppel()`) :
  **En attente** (pas d'attestation MOE) → **À émettre** (attestation MOE
  faite, appel pas encore généré) → **Émis** (généré) → **En retard** (date
  limite de règlement dépassée) → **Réglé** — avec l'exception "réglé à
  l'acte" ci-dessous qui court-circuite tout.
- **L'attestation MOE seule n'émet jamais l'appel** (statut "À émettre"
  seulement, depuis le 20/07/2026 — point 171). L'émission effective
  (`dateEmission`) se fait via l'action "Générer un appel de fonds" (génère
  le PDF et remplit automatiquement la date, modifiable ensuite à la main).
- **Exception "réglé à l'acte"** : si l'acte d'un lot est signé après (ou le
  jour même) qu'une phase a été attestée pour ce lot ou un autre lot du même
  programme, l'appel de cette phase est automatiquement **émis ET réglé** à
  la date de l'acte (`dateEmission = dateReglement = lot.dateActe`) — le
  notaire encaisse déjà les sommes dues. Règle fondamentale, reconfirmée
  plusieurs fois par Nicolas — ne jamais la retirer par erreur.
- **1ʳᵉ phase (Réservation) réglée automatiquement** à `lot.dateReservation`
  (`dateEmission = dateReglement`) — le dépôt de garantie est factuellement
  réglé à la réservation.
- **`dateReglement` reste modifiable à la main** dans les deux cas
  d'automatisme ci-dessus — l'automatisme ne doit jamais écraser une saisie
  manuelle.
- **Correction du statut/de la date d'acte d'un lot déjà Acté** doit
  remettre "non réglé" un appel marqué payé automatiquement à cause de cette
  date — sauf si un vrai règlement manuel avait été saisi entre-temps.
- **Date limite de règlement** = `dateEmission + delaiReglementAppelJours`
  (paramètre par programme, défaut 30 j).
- **Solde restant dû = Prix TTC du lot − Total payé** (total payé = somme
  des phases dont la date de règlement est renseignée) — **pas**
  "Total émis − Total payé", qui ignorerait les phases dues mais pas encore
  émises.

## 5. VEFA — Suivi prêt / signature acte

- **Date limite d'obtention du prêt** = `dateReservation +
  delaiObtentionPretJours` (défaut 45 j).
- **Date limite de signature de l'acte** = `dateReservation +
  delaiSignatureNotaireMois` (défaut 3 mois).
- Un lot n'apparaît sur ces deux pages qu'une fois réservé (les échéances
  n'ont pas de point de départ avant).
- **Statuts dérivés (jamais stockés)**, `client/src/utils/statuts.js` :
  prêt → `sans_pret`/`recue`/`retard`/`attente` (`sans_pret` prioritaire dès
  que `Acquereur.sansPret` est coché, avant même de regarder l'offre
  reçue) ; acte → `signe`/`retard`/`attente`. Les deux retournent `null`
  tant que le lot n'est pas réservé (pas de point de départ).
- **Signer l'acte** depuis cette page utilise la même route que la page
  Lots (`PATCH /api/lots/:id`), donc déclenche automatiquement la
  génération des appels de fonds — pas de logique dupliquée.
- **Acquisition sans prêt** (`Acquereur.sansPret`) : exclut le dossier des
  décomptes attente/retard/reçue, réversible via "Reprendre le suivi".

## 6. VEFA — Alertes de retard

- Fenêtre à l'ouverture listant tous les retards : prêt, signature notaire,
  appels de fonds émis non réglés, entreprises TMA (retour), factures TMA
  (réponse client) — **5 catégories**.
- Chaque catégorie désactivable individuellement par programme (Paramètres).
- Fermeture manuelle de la fenêtre, pas de réapparition avant rechargement
  complet.

## 7. TMA — Workflow des statuts

- **Machine à états stricte** : `demande → etude → chiffre → facture →
  valide → termine`, avec `refuse` **et** `annule` possibles chacun depuis
  `demande`/`etude`/`chiffre`/`facture` (jamais après `valide` — une TMA
  validée va vers `termine`, plus vers `refuse`/`annule`). Codée en dur
  côté **serveur** (`TRANSITIONS_AUTORISEES`, `server/models/Tma.js`) — un
  `enum` seul ne suffit pas, il vérifie une valeur hors-liste, pas l'ordre
  des transitions.
- **`refuse` et `annule` sont symétriques** : chacun mémorise le statut
  quitté (`statutAvantRefus`/`statutAvantAnnulation`) avant la transition,
  et dispose de sa propre route de restauration exacte (`annuler-refus`/
  `annuler-annulation`) — "Annuler la TMA" (bouton) est une vraie
  transition de la machine à états, pas une simple trace côté UI. Différent
  de l'annulation de la VENTE d'un lot (ci-dessus) : annuler la vente d'un
  lot ne touche jamais au statut de sa TMA, qui reste inchangée.
- **Statut calculé automatiquement depuis les dates saisies**, jamais cliqué
  à la main, sauf `refuse` (décision manuelle, vraiment indéductible).
- **Passage à "Chiffré" conditionné à la réponse de TOUTES les entreprises
  concernées** (`TMA.nombreEntreprisesConcernees`) — une seule entreprise en
  attente garde la TMA à "Étude". Corriger ce nombre après coup doit
  relancer le recalcul du statut.
- **"Terminé"** : action manuelle depuis "Validé" (le client constate sur
  chantier), retour arrière simple à `statut = 'valide'` (pas d'historique à
  mémoriser, une seule origine possible).
- **Rattrapage d'un refus par erreur** : le statut quitté est mémorisé dans
  `statutAvantRefus`, restauré exactement par `annuler-refus` (pas un retour
  systématique à "demande").
- **Vente annulée avec TMA en cours** : la TMA n'est pas supprimée, garde
  son acquéreur d'origine (référence figée), réattribution possible en un
  clic si le lot est revendu.
- **Pas de suppression de TMA** — seulement "Annuler la TMA" (statut
  `annule`, voir ci-dessus).
- **Une TMA peut être créée sur un lot Option ou Réservé**, pas seulement
  Acté (avertissement si pas encore acté). Un lot sans acquéreur ne peut pas
  recevoir de TMA.
- **`TmaEntreprise.statut`** (`a_chiffrer`/`recu`/`valide`/`refuse`/
  `travaux`/`termine`) est un statut d'**exécution par entreprise**, distinct
  du statut global `TMA.statut` (qui n'a plus de valeur `travaux`) — les deux
  enums ne se correspondent pas terme à terme, c'est intentionnel.

## 8. TMA — Calcul du montant client

- **Marge commerciale** : `montantClient = montantEntreprises × tauxMargeTma`
  si positif. **Avoir (montant négatif) : montantClient = 0 €** par défaut
  — différent de l'Excel d'origine (qui appliquait "avoir sans marge",
  gardé en option `regleMontantNegatifTma: 'avoir_sans_marge'`,
  sélectionnable par programme).
- **`montantEntreprises`** = somme des `TmaEntreprise.montantDevis` liées,
  jamais modifié directement.
- **`montantClient` figé une fois "Validé"** — plus aucune modification
  possible après, y compris via le recalcul automatique déclenché par une
  nouvelle ligne entreprise.
- **`montantClient` modifiable à la main** (négociation directe) : avertit
  et **fige définitivement** ce montant (plus jamais recalculé
  automatiquement ensuite).
- **Frais d'ouverture de dossier TMA** : montant fixe par programme, ajouté
  au montant client, activé si la case "À appliquer" est cochée.
  **S'applique systématiquement, y compris sur un avoir** — chaque TMA
  (avoir compris) a un dossier à ouvrir, dû dès la création du dossier.

## 9. TMA — Délais et suivi entreprises

- **Délai de retour entreprise** = `dateEnvoi +
  delaiRetourEntrepriseTmaJours` (défaut 15 j).
- **Délai de réponse à une facture** = `delaiReponseFactureTmaJours`
  (paramètre sans équivalent Excel), déclenché si `statut === 'facture'` et
  le délai après `dateEnvoiFactureClient` est dépassé sans passage à
  `valide`/`refuse`.
- **`TmaEntreprise.dateEnvoi` obligatoire avant d'ajouter une entreprise.**
- **`TmaEntreprise.dateRetour` : saisie manuelle exclusivement**, jamais
  déduite automatiquement (contrairement à la plupart des autres dates).
- **`TmaEntreprise.statut` passe à `recu` automatiquement** dès qu'un
  `montantDevis` est renseigné.
- **`corpsDeTravaux` sur `TmaEntreprise` est une copie figée** au moment de
  l'ajout — ne change pas rétroactivement si le référentiel `Entreprise`
  change ensuite.
- **N° de demande** = rang chronologique de la demande par logement, jamais
  stocké, toujours déduit de `dateDemande`.

## 10. Exports

- **Chaque export doit exister en Excel ET PDF**, sauf documents type
  courrier/devis (PDF uniquement — pas d'équivalent tableur utile).
- **Jamais la colonne "Action"** dans un export, quel que soit le format.
- **Chaque export respecte les filtres et la recherche actifs à l'écran.**
- **"Générer un appel de fonds"** : sélection phase (Réservation exclue)
  puis logements à cocher (seuls ceux avec attestation MOE faite et pas
  encore émis sont proposés) — télécharge un PDF par logement et remplit
  automatiquement "Envoyé le".
- **"Générer devis client"** : sélection logement puis demandes à cocher
  (un devis peut regrouper plusieurs demandes). **Numéro de devis réservé
  côté serveur, jamais réutilisé** (même en régénérant après correction),
  suite séparée **par programme**, compteur atomique.
- **Barre de recherche** : doit retrouver tout ce qui s'affiche dans le
  tableau, y compris les valeurs calculées/formatées — reconstruite à partir
  des mêmes fonctions d'affichage que le rendu, pas des valeurs brutes.

## 11. Paramètres par programme (`Programme.parametres`)

| Paramètre | Défaut |
|---|---|
| Barème des phases (somme = 100%) | Réservation 5% / Fondations 30% / Hors d'eau 25% / Hors d'air 30% / Achèvement 5% / Remise des clés 5% |
| `delaiObtentionPretJours` | 45 j |
| `delaiSignatureNotaireMois` | 3 mois |
| `delaiReglementAppelJours` | 30 j |
| `delaiRetourEntrepriseTmaJours` | 15 j |
| `delaiReponseFactureTmaJours` | — (nouveau, sans équivalent Excel) |
| `tauxMargeTma` | 1.3 (30%) |
| `montantClientSaisiManuellement` | false |
| `fraisOuvertureDossierTma` / `appliquerFraisOuvertureDossierTma` | 0 € / false |
| `tauxTva` | 0.20 |
| `regleMontantNegatifTma` | `montant_zero` (option `avoir_sans_marge`) |
| `listeEtages` | `['R-1','RDJ','RDC','R+1'...'R+8']` |

- **Tous les montants stockés sont en TTC** — le HT n'est jamais stocké,
  calculé à la volée `TTC / (1 + tauxTva)`.
- **Montant = toujours un `Number` pur** en base (jamais le symbole "€" dans
  la donnée), affiché partout via `Intl.NumberFormat('fr-FR', {style:
  'currency', currency: 'EUR'})`.
- **Téléphone** : normalisé au format international **E.164**
  (`libphonenumber-js`), accepte les numéros étrangers.
- **Code postal** : rempli automatiquement au blur du champ Commune
  (`geo.api.gouv.fr`), jamais réécrasé une fois rempli à la main. Si une
  commune a plus de deux codes postaux possibles, le champ reste vide plutôt
  que de deviner.
- **Civilité distincte du prénom** (`M.`/`Mme`/`M. et Mme`) — le prénom est
  optionnel.
- **Multi-programme** : chaque programme a son propre jeu de paramètres.
  `Entreprise` et `Utilisateur` restent des référentiels **globaux**,
  partagés entre tous les programmes.

### Points restés ouverts (non tranchés)

- Un client pourrait négocier un autre système de règlement des appels de
  fonds que le barème standard (ex. tout payé à l'acte) — aucune piste
  actée.
- Rôle "acquéreur" en lecture seule sur ses propres données — évoqué en
  cadrage initial, jamais modélisé.
- Boutons d'action pas encore masqués/désactivés côté UI pour le rôle
  "lecture" (le blocage serveur suffit à la sécurité réelle, mais l'UI ne
  l'empêche pas visuellement).

## 12. Sécurité / rôles / suppression

- **Trois rôles** : `admin`/`gestionnaire`/`lecture`. Le rôle `lecture` peut
  tout consulter mais ne peut jamais rien modifier — appliqué **côté
  serveur** sur chaque route d'écriture, pas seulement côté front.
- **Toute l'application est derrière la connexion**, y compris la simple
  lecture (JWT obligatoire partout).
- **Pas d'auto-inscription publique** — comptes créés uniquement par un
  admin (Paramètres > Utilisateurs).
- **Un admin ne peut pas se supprimer lui-même.**
- **Suppression d'un lot bloquée** s'il est référencé par une TMA ou un
  appel de fonds.
- **Erreurs 500 : jamais le détail technique exposé au client en
  production** — toujours loggué côté serveur, message générique au client
  hors dev.
- **Numéro de dossier/devis jamais généré côté client** — uniquement via un
  compteur atomique serveur (`Compteur`), pour éviter une collision entre
  deux générations concurrentes.

---

*Une règle métier peut être révisée en cours de développement si l'usage
montre qu'elle ne convient pas — voir `docs/decisions.md` pour le
raisonnement derrière chaque évolution.*
