# Journal de bord — Gestion VEFA

Ce journal retrace chaque étape du projet : ce qui a été fait, pourquoi, et les
commandes clés utilisées. Objectif : pouvoir reprendre le fil à tout moment, et
pouvoir réexpliquer le projet (par exemple en entretien d'alternance).

---

## 2026-07-09 — Lancement du projet

**Contexte**

Le repo contenait déjà un commit initial (README.md minimal, .gitattributes,
.git). Objectif du projet : recréer en application web deux outils métier
immobilier (suivi VEFA et gestion des TMA) actuellement gérés sous Excel/VBA,
dans le cadre d'une recherche d'alternance développeur web.

**Décisions prises aujourd'hui**

- Documentation continue du projet dans `docs/` (ce journal, un glossaire métier,
  un fichier de décisions techniques). Voir `decisions.md`.
- Terminal de référence pour ce projet : **WSL (Ubuntu)**, plutôt que PowerShell,
  pour prendre dès maintenant les habitudes d'un environnement de développement
  professionnel Node/Mongo.
- Les commandes du projet seront exécutées directement (par l'assistant), avec
  une explication systématique de ce qui est fait et pourquoi, tracée dans ce
  journal.
- Deux fichiers Excel métier existants (suivi VEFA, suivi TMA) vont servir de
  base de compréhension du métier, sans être reproduits à l'identique — objectif
  d'amélioration, pas de copie.

**Prochaine étape**

Récupération et analyse des deux fichiers Excel pour en extraire la logique
métier réelle (calcul des appels de fonds, statuts des TMA...) avant de
commencer le développement (étape 1 : version HTML/CSS/JS vanilla).

---

## 2026-07-09 — Analyse des fichiers Excel de référence

**Ce qui a été fait**

Les deux fichiers (`VEFA complété 4.xlsm`, `Tableau de suivi TMA - Complété
1.xlsm`) ont été déposés dans `références/`. Analyse programmatique de leur
contenu (feuilles, colonnes, et surtout les formules) via un script Node
utilisant la librairie `xlsx` (SheetJS), exécuté dans WSL. Les fichiers
`.xlsm` binaires ne peuvent pas être lus comme du texte brut — d'où le passage
par un script dédié plutôt qu'une lecture directe.

**Résultat**

Analyse complète consignée dans `docs/analyse-excel.md` : structure des deux
fichiers, modèle de données observé, et surtout les **règles métier réelles**
qui étaient cachées dans les formules Excel, notamment :
- le barème des phases de travaux et la condition de déclenchement d'un appel
  de fonds (attestation MOE + statut "Acté") ;
- le workflow réel des statuts de TMA (plus fin que prévu : Demande → Étude →
  Chiffré → Validé/Refusé, avec des étapes d'exécution Travaux/Terminé
  entrevues mais non formalisées) ;
- la règle de marge commerciale de 30% sur les TMA (sauf avoirs négatifs).

Une première liste de pistes d'amélioration (par rapport au fonctionnement
Excel) a été identifiée — voir la fin de `docs/analyse-excel.md`.

**Prochaine étape**

Conception du schéma de données définitif (collections MongoDB : Programme,
Lot, Acquereur, AppelDeFonds, TMA...) à partir de cette analyse.

---

## 2026-07-09 — Retours de Nicolas sur l'analyse Excel

**Ce qui a été fait**

Nicolas a relu `docs/analyse-excel.md` et transmis des remarques (PDF). Elles
ont été intégrées directement dans le document sous forme de blocs
"Décision (09/07/2026)", plus une synthèse en fin de fichier (section 4).

**Décision structurante**

Ce qui semblait être des constantes métier dans les fichiers Excel (barème
des phases de travaux, délai prêt +45j, délai notaire +3 mois, délai retour
entreprise TMA +15j, taux de marge TMA 30%, comportement sur montant TMA
négatif) doit en réalité être **paramétrable par programme/client**. Décision
tracée dans `docs/decisions.md` ("Paramétrage par programme"). Nouvelle
règle ajoutée (absente d'Excel) : alerte sur les appels de fonds émis mais
non réglés à temps, avec une fenêtre de notification à l'ouverture de
l'application listant tous les retards (prêt, notaire, appels de fonds).

Correction métier : la règle Excel sur les montants de TMA négatifs ("pas de
marge, le client récupère l'avoir") est remplacée par une règle différente
demandée par Nicolas : montant facturé au client = 0€ si le montant
entreprise est négatif.

**Prochaine étape**

Conception du schéma de données définitif (collections MongoDB), en intégrant
dès le départ ces paramètres configurables par programme.

---

## 2026-07-09 — Conception du schéma de données + retours de Nicolas

**Ce qui a été fait**

Conception complète du modèle de données dans `docs/schema-donnees.md` :
7 collections (`Programme`, `Lot`, `Acquereur`, `AppelDeFonds`, `TMA`,
`TmaEntreprise`, `Utilisateur`), avec pour chacune la justification par
rapport à l'analyse Excel et aux décisions de paramétrage. Délai par défaut
de règlement d'un appel de fonds tranché à **30 jours**.

Nicolas a relu ce premier jet et transmis de nouvelles remarques (PDF),
intégrées directement dans le document :

- **Étages** : liste déroulante mais modifiable par programme → nouveau
  paramètre `programme.parametres.listeEtages` (au lieu d'un enum figé).
- **Orientation** : liste fixe des 8 orientations → vrai enum Mongoose.
- **Prix/montants** : toujours affichés avec "€", mais stockés en `Number`
  pur pour ne pas casser les calculs — formatage centralisé côté front.
  Discussion pédagogique sur pourquoi on ne stocke jamais le symbole
  monétaire dans la donnée elle-même.
- **Téléphone** : Nicolas a signalé que les clients peuvent avoir un numéro
  étranger → abandon d'un regex "numéro français" au profit de la librairie
  `libphonenumber-js` et d'un stockage normalisé au format international
  E.164.
- **Email** : validation par regex.
- **Banque / courtier** : passent de simples noms texte à un sous-document
  `Contact` complet (coordonnées).

Ces décisions sont tracées dans `docs/decisions.md` ("Conventions de saisie
et librairies de validation").

**Décisions de conception notables (validées, hors retours ci-dessus)**

- Les paramètres métier sont un **sous-document embarqué** dans `Programme`,
  pas une collection séparée.
- Le pourcentage d'une phase et le montant TMA client sont **figés
  ("snapshottés")** au moment de l'émission/validation, pour ne pas changer
  rétroactivement si les paramètres du programme sont corrigés après coup.
- Les échéances calculées (dates limites, statut "en retard") ne sont
  **jamais stockées**, seulement calculées à la volée.
- Statuts codés sans accent dans les enums (valeurs techniques), l'accent
  restant réservé à l'affichage front.
- Machine à états `TMA.statut` définitive : `demande → etude → chiffre →
  valide → facture → travaux → termine`, avec `refuse` possible uniquement
  avant `valide`.

**Points laissés ouverts** (non bloquants, listés en fin de
`schema-donnees.md`) : moment de génération des `AppelDeFonds`, référentiel
`Entreprise` séparé ou non, rôle "acquéreur" en lecture seule.

**Prochaine étape**

Démarrage du développement effectif, étape 1 de la feuille de route : version
HTML/CSS/JS vanilla pour afficher des données avant de passer à React.

---

## 2026-07-09 — Étape 1 : première page HTML/CSS/JS vanilla

**Ce qui a été fait**

Création du dossier `vanilla/` (isolé du futur code React, pour ne rien avoir
à nettoyer à l'étape 2) avec une première page fonctionnelle :

- `data.js` : données fictives d'un programme (« Résidence Les Tilleuls ») et
  de 8 lots, codées en dur (pas encore de backend).
- `index.html` : structure de la page (en-tête, statistiques, filtres,
  tableau des lots).
- `style.css` : mise en forme, avec des couleurs de badge par statut.
- `script.js` : affichage dynamique — calcul des statistiques (répartition
  par statut, CA acté), rendu du tableau, filtrage par statut via délégation
  d'événements.

Notions pratiquées (expliquées en détail dans le chat au moment de l'écriture) :
`document.querySelector`, `textContent` vs `innerHTML`, template literals,
`Array.filter/map/reduce`, délégation d'événements, `Intl.NumberFormat` pour
formater les montants en euros (première application concrète de la
convention monétaire définie dans `schema-donnees.md`).

Choix délibéré de ne pas utiliser `import`/`export` (modules ES) à ce stade,
pour rester simple et éviter les soucis liés au chargement de fichiers en
local — ce sera introduit proprement avec Vite à l'étape 2.

**Test et ajustement**

Page testée via un serveur local (`python3 -m http.server`, lancé dans WSL) —
tous les fichiers se chargent correctement. Nicolas a ensuite modifié
`style.css` lui-même : le montant "CA acté" débordait de sa carte à cause
d'une espace insécable introduite par `Intl.NumberFormat('fr-FR', ...)`
entre les milliers (`530␣000,00␣€`), qui empêche tout retour à la ligne à cet
endroit. Solution retenue (plutôt qu'un retour à la ligne) : réduire
`.stats .carte .valeur` de `1.75rem` à `1.30rem` — une seule règle CSS
s'appliquant à toutes les cartes, donc la taille reste homogène partout sans
dupliquer de code.

**Prochaine étape**

Continuer la version vanilla (ex: page TMA) ou passer à la migration React —
à décider avec Nicolas.
