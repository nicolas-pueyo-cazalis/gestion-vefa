# Tâches à traiter

Liste consolidée de **tout ce qui reste ouvert** dans le projet (⏳ en
attente ou ❓ décision à prendre), regroupée par thème pour s'y retrouver
rapidement — plutôt que de reparcourir tout `docs/demandes.md` dans l'ordre
chronologique.

**Tenue à jour automatiquement** : dès qu'une tâche passe ⏳ (en attente)
quelque part dans le projet — nouvelle demande, ou correction/décision
laissée en suspens — elle est ajoutée ici en même temps, sans attendre
qu'on le redemande (réflexe noté dans `docs/a-prendre-en-compte.md`). Une
fois traitée, elle est retirée d'ici et son ✅ reste dans `docs/demandes.md`
(qui garde l'historique complet, y compris ce qui est déjà fait).

Chaque entrée renvoie au(x) point(s) numéroté(s) de `docs/demandes.md` pour
le détail complet et le contexte d'origine.

Compilée le 31/08/2026 à partir d'une relecture complète de
`docs/demandes.md`.

---

## A. Suivi qualité / audits du projet

- **Étendre le test de fidélité code/doc à toutes les fonctions du projet**
  (pas seulement les 6 déjà faites) — chantier à dérouler par lots.
  *(point 232)*
- **Créer un tableau de suivi de l'audit sécurité** (`docs/audit-securite.md`
  probablement), consolidant tous les points d'audit sécurité/RGPD/qualité
  déjà menés. *(point 233)*
- **Corriger les 3 code smells déjà identifiés** (audit sans correction) :
  `nomAcquereur()` dupliquée dans 3 pages, `versDateInput()` dupliquée dans
  8 composants, 3 "god components" (Tma.jsx/Lots.jsx/AppelsDeFonds.jsx) à
  découper. *(point 236)*
- **5 trouvailles concrètes du check-up "développeur confirmé"** (fait le
  01/09/2026, note 66/100) : aucun rate-limiting sur la connexion, aucune
  couche de validation explicite des entrées aux frontières des routes,
  concurrence non gérée (pas de verrouillage optimiste), pas de liste
  blanche explicite des champs modifiables (`Object.assign` dans
  `lots.js`), aucune passe systématique de vérification des cas limites.
  *(points 237, 237bis, 280)*
- **Protection de la branche `main`** — bloquée tant que le dépôt GitHub
  reste privé (limite du compte gratuit, ni les Rulesets ni les Branch
  protection rules classiques ne s'appliquent). Nicolas a choisi de
  rester privé pour l'instant (01/09/2026) — à reconsidérer si un jour il
  passe le dépôt en public. *(point 281, F)*
  - Tests HTTP sur de vraies routes Express (`supertest`, nécessite de
    scinder `server/index.js` en `app.js`/`index.js`) — volontairement
    reporté lors du chantier C (jugé trop invasif pour l'instant), à
    reprendre si le besoin de vraies routes testées se fait sentir.
  - Composants React avec appel API/contexte (`AuthContext`,
    `ProgrammeContext`) — hors périmètre du chantier D (composants
    purement présentationnels seulement), chantier de composants
    ultérieur.
  - **E.** Couverture de code (`vitest run --coverage`).
  - **F.** Vérifier si la branche `main` est protégée sur GitHub contre un
    échec de tests (à vérifier par Nicolas, pas accessible depuis ce
    terminal).
  - **`calculerLargeursColonnesFigees()`** (`export.js`) laissée de côté
    lors du point A (dépend d'un vrai objet jsPDF) — à reprendre avec un
    outillage dédié.
  *(point 281, complète le point 278)*
- **Rédiger la liste récapitulative de tout ce qui a été fait côté
  check-up** (plus large que le point 233, couvre tous les audits de la
  session). *(point 238)*
- **Transformer l'audit sécurité 3 points en Skill Claude réutilisable.**
  *(point 239)*
- **Programmer un audit de dette technique périodique**, ciblé sur les
  parties les plus anciennes du projet. *(point 239)*
- **Ajouter un réflexe "test de non-régression"** dans
  `docs/checklist-tests-manuels.md` pour toute nouvelle fonctionnalité
  touchant l'existant. *(point 239)*
- **Refaire périodiquement le test de fidélité code/doc** — pas une action
  ponctuelle, un contrôle récurrent. *(point 239)*
- **Bilan final de l'application** — maintenu explicitement ouvert par
  Nicolas tant que le projet n'est pas vraiment déployé/terminé. *(point 178)*
- **Passe de revue sur l'ensemble des docs** : liens entre eux, cohérence,
  s'assurer que la mise à jour de chacun est bien automatique (sauf
  indication contraire explicite de Nicolas). *(point 253)*
- **4 points UX découverts lors de la revue visuelle du code** : page
  Paramètres sans onglets (long scroll), confirmations natives du
  navigateur à remplacer par une vraie modale, absence de page d'accueil/
  tableau de bord transversal, écrans de connexion/choix de programme trop
  nus (rejoint le logo client, point 267). *(point 277)*

## B. Fonctionnalités et UX à faire

- **Export : génération d'un envoi de demandes de devis TMA aux
  entreprises** (distinct de "Générer devis client", déjà fait). *(point 132)*
- **Repenser l'esthétique générale de l'application** (thème sombre actuel
  validé, améliorations à proposer). *(point 139)*
- **Rendre l'application responsive** (toutes tailles d'écran). *(point 144)*
- **Carte "Taux de commercialisation"** (logements Actés+Réservés / total,
  en %) — emplacement et arrondis pas encore décidés. *(points 158, 166)*
- **Vérifier s'il manque des éléments dans "Suivi de prêt" et "Signature
  acte".** *(point 177)*
- **Décider s'il faut créer une version démo.** *(point 179)*
- **Historique (page Lots) : polish esthétique** — fusion technique faite,
  mais le volet esthétique précis de la demande d'origine n'a pas pu être
  confirmé avec certitude lors de la relecture du 31/08/2026. *(point 181)*
- **Import de documents** (plans, contrats de réservation, offres de prêt,
  actes signés, devis entreprises...) — gros chantier, prévu après les
  exports. *(point 186)*
- **Champ "Adresse" du maître d'ouvrage manquant** — vide sur le devis TMA
  et le courrier d'appel de fonds, à ajouter dans Paramètres > Informations
  du programme. *(point 210)*
- **Appels de fonds — numéro d'appel affiché** : "Appel de fonds n°X :
  <Phase>" (ex: "n°1 : Réservation"), dans le tableau (après colonne Lot)
  et dans tous les exports concernés. *(point 254)*
- **Idée à cadrer** : agent IA jouant un client professionnel de
  l'immobilier neuf, maîtrisant les données de l'appli — spec + coût avant
  toute implémentation. *(point 255)*
- **Nouvelle page "TS" (Travaux Supplémentaires)** — travaux demandés en
  cours de chantier, hors marchés déjà signés (distinct de la TMA). À
  traiter avec le même principe que la page TMA (workflow/écrans), sans
  les confondre. Nécessite une vraie spec avant implémentation. *(point 256)*
- **TMA, export "Devis client"** : remettre les décimales sur les montants,
  vérifier la cohérence sur les autres exports. *(point 257)*
- **Page Lots** : aligner visuellement le signe "€" de la colonne "Prix
  TTC" quel que soit le nombre de chiffres du montant. *(point 259)*
- **Export "Tableau de suivi de prêt"** : ajouter les coordonnées (adresse,
  commune, code postal, téléphone, email) de la banque et/ou du courtier.
  *(point 261)*
- **Export Signature acte (équivalent)** : ajouter les coordonnées du
  notaire. *(point 262)*
- **Export "Statistiques"** (Suivi de prêt ET Signature acte) : ajouter une
  colonne "%" (pourcentage de chaque étape sur le nombre total de
  dossiers). *(points 263, 264)*
- **Retravailler l'ensemble des exports de statistiques**, toutes pages.
  *(point 265)*
- **Export "Récapitulatif détaillé par phase"** (Appels de fonds) :
  afficher "En retard" en rouge dans la case de la date de règlement
  dépassée sans règlement. *(point 266)*
- **Réfléchir à l'intégration d'un logo client** dans l'entête des exports
  (à retravailler) et le bandeau d'entête de l'application. *(point 267)*
- **Appels de fonds : revoir les cartes de statistiques** de la page.
  *(point 268)*
- **Grosse amélioration de tous les exports, sans exception.** *(point 269)*
- **TMA : améliorer visuellement le bouton de réattribution des TMA.**
  *(point 273)*
- **Aligner les boutons "Exporter"** avec le reste des boutons de chaque
  page. *(point 274)*

## C. Règles métier / paramétrage non tranchés

*(Voir aussi `docs/regles-metiers.md` § 11, "Points restés ouverts".)*

- **Système de règlement négocié par un client**, différent du barème
  standard (ex. tout payé à l'acte) — aucune piste actée. *(point 96)*
- **Rôle "acquéreur" en lecture seule** sur ses propres données — évoqué en
  cadrage initial, jamais modélisé. *(point 242)*
- **Boutons d'action masqués/désactivés pour le rôle "lecture"** — le
  blocage serveur est déjà effectif, seule l'UI ne l'empêche pas
  visuellement pour l'instant. *(point 243)*
- **Dernier appel de fonds = solde restant dû exact** — s'assurer qu'aucun
  écart d'arrondi cumulé ne subsiste sur la dernière phase d'un lot ; règle
  à ajouter dans `docs/regles-metiers.md` une fois implémentée. *(point 270)*

## D. Sécurité / infrastructure — décisions en attente de Nicolas

- **Sauvegarde MongoDB** : vérifier le tier Atlas actuel, puis choisir entre
  `mongodump` périodique ou upgrade vers un tier payant avec sauvegarde
  continue. *(points 223, 224)*
- **Mise à jour d'`exceljs`** (vulnérabilité `uuid` restante, modérée) — à
  faire quand Nicolas est prêt à retester tous les exports Excel derrière.
  *(point 225)*
- **Renommage `/api/programme` et `/api/tma`** en pluriel — cosmétique,
  casserait des URLs déjà utilisées, à confirmer si ça vaut le coup avant un
  entretien. *(point 226)*
- **Exécution du plan de déploiement** (Render + Vercel/Netlify) — proposé,
  pas encore lancé. *(point 229)*
- **Point sur l'infrastructure** : où en est-on, avec explications
  pédagogiques — rejoint les points ci-dessus. *(point 272)*
- **Cadre juridique minimal** (CGU, politique de confidentialité) —
  nécessaire dès que des données d'acquéreurs tiers transiteraient par
  l'outil pour un client réel ; question juridique, pas technique, mais
  bloquante pour une commercialisation. *(point 279)*

## E. Documents à réaliser / compléter

- **Retravailler `CLAUDE.md`** — créé le 31/08/2026 (migration de
  `docs/contexte-projet.md`, point 251), mais Nicolas souhaite qu'on y
  retravaille encore (même besoin que l'ancien point 249, fusionné ici
  maintenant que `docs/contexte-projet.md` n'est plus qu'une redirection).
  *(points 245, 249)*
- **Test : sujet à approfondir** — à préciser avec Nicolas avant de s'y
  mettre. *(point 246)*
- **Compléter `docs/regles-a-confirmer-client.md`** (une seule entrée pour
  l'instant, à alimenter au fil de l'eau). *(point 247)*
- **Compléter `docs/a-prendre-en-compte.md`** (8 entrées pour l'instant, à
  alimenter au fil de l'eau). *(point 248)*
- **Créer `~/.claude/CLAUDE.md`** (niveau utilisateur, préférences
  personnelles valables sur tous les projets, pas seulement VEFA) — laissé
  de côté pour l'instant, à reprendre plus tard. *(point 252)*
- **Mettre à jour `docs/concepts-techniques.md`.** *(point 258)*
- **Retirer physiquement du dossier** les fichiers Word/PDF de remarques
  déjà ignorés par Git. *(point 260)*

## F. Présentation / valorisation (entretien, vente éventuelle)

- **Topo complet sur ce qu'impliquerait la vente de l'application**
  (création d'entreprise, faisabilité sans diplôme, assurances, aspects
  techniques). *(point 145)*
- **Estimation de prix de vente** (mise en service + mises à jour).
  *(point 146)*
- **Étudier un usage mobile de l'application.** *(point 147)*
- **Récapitulatif simple des technologies utilisées**, pour que Nicolas
  puisse se l'approprier en entretien. *(point 148)*
- **Document récapitulatif de tout ce qui a été fait sur le projet.**
  *(point 149)*
- **Question ouverte** : une fois le projet visible sur GitHub pour des
  recruteurs, comment s'assurer qu'il n'y a pas de risque de vol
  d'informations ? *(point 150)*
