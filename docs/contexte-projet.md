# Contexte projet — Gestion VEFA

Fiche de reprise rapide, à lire en premier dans une nouvelle conversation.
Le détail complet reste dans les autres fichiers de `docs/` — cette fiche
n'en est qu'un résumé volontairement court.

> **[`docs/protocole-ia-vefa.md`](protocole-ia-vefa.md) : à prendre en
> compte en permanence, à partir du 21/07/2026.** Décrit comment travailler
> au quotidien sur ce projet précis (spec + section "Impact sur
> l'existant" pour toute nouvelle fonctionnalité, `git diff --stat`
> systématique, audit sécurité 3 points sur tout fichier touchant des
> données d'acquéreurs, gestion de la dette technique sur les parties les
> plus anciennes, fréquence de contrôle indépendant). Distinct du
> programme de formation général de Nicolas (apprentissage sur 16 jours,
> retiré du dépôt le 21/07/2026) : celui-ci est le protocole du quotidien,
> pas un cursus.

## Stack

- **Front** : React 19 + Vite + React Router + Sass (`client/`). Une
  version HTML/CSS/JS vanilla existe aussi (`vanilla/`, étape 1, non
  maintenue depuis la migration React).
- **Back** : Node.js + Express 5 + MongoDB/Mongoose (`server/`), modules
  ES (`"type": "module"` partout, jamais `require`).
- **Authentification** : JWT (jeton 7 jours, payload `{ id, role }`
  minimal) + bcrypt. Toute l'API est protégée (`/api/*` sauf
  `/api/auth/connexion`), y compris en lecture. 3 rôles :
  admin/gestionnaire/lecture (lecture = aucune écriture nulle part).
- **Base de données** : MongoDB Atlas (cloud, pas de base locale).
- **Exports** : `exceljs` (Excel) + `jspdf`/`jspdf-autotable` (PDF),
  générés entièrement côté navigateur (pas de route serveur dédiée).
- **Autres** : `morgan` (logs HTTP), `oxlint` (lint front uniquement,
  aucun lint côté back), GitHub Actions (lint front + vérification de
  syntaxe back à chaque push).
- **Pas de suite de tests automatisés** — validation manuelle rejouée à
  chaque fois (voir `docs/checklist-tests-manuels.md`), limite assumée et
  documentée, pas cachée.
- **Déploiement** : pas encore fait. Plan proposé (pas exécuté) : back sur
  Render, front sur Vercel/Netlify, Atlas déjà prêt (voir
  `docs/demandes.md`, points 227-229).

## Processus de travail — vérification par diff (mis en place le 21/07/2026)

Nicolas ne vérifie plus mon travail seulement sur ma parole — il relit
systématiquement le `git diff` de chaque livraison, pour la même raison
qu'un `git diff` est utile à n'importe qui : il montre uniquement ce qui a
changé (`-` supprimé, `+` ajouté), sans avoir à relire tout un fichier.

- **Avant chaque nouvelle demande importante** : Nicolas commite l'état
  courant s'il ne l'est pas déjà (`git add .` puis `git commit`), pour
  repartir d'une base propre — sinon d'anciennes modifications non
  validées se mélangent avec les miennes dans le diff suivant.
- **Après chaque livraison de ma part** : réflexe systématique —
  `git diff --stat` (ou `git status`) d'abord pour la liste rapide des
  fichiers touchés (un fichier inattendu dans cette liste = signal d'une
  "modification silencieuse"), puis `git diff` (ou le panneau Source
  Control de VSCode, `Ctrl+Shift+G`, plus visuel) pour le détail
  fichier par fichier. `git log -p -1` pour revoir un commit déjà validé.
- Terminal ou panneau visuel VSCode, au choix de Nicolas.
- **Rien de nouveau attendu de ma part** au-delà de la règle déjà en place
  (ne jamais committer à sa place, signaler les bons points de commit,
  voir plus bas) — mais lister précisément les fichiers modifiés dans mes
  résumés de fin de tâche prend plus d'importance, puisque c'est
  exactement ce que Nicolas va vérifier lui-même.
- **Prérequis vérifié** : Git installé et accessible (`git --version` →
  2.54.0), aucun blocage.

## Règles métiers non négociables

- **VEFA** : le prix se paie par appels de fonds selon l'avancement des
  travaux — les pourcentages exigibles à chaque étape sont encadrés par la
  loi, pas un choix libre.
- **TMA — machine à états stricte** : `demande → étude → chiffré → facturé
  → validé → terminé` (+ `refusé`/`annulé` depuis plusieurs étapes). Le
  statut ne passe à "chiffré" que si **toutes** les entreprises sollicitées
  ont répondu (`nombreEntreprisesConcernees`), pas juste certaines.
- **TMA, montant négatif (avoir)** : facturé au client = 0 € par défaut
  (réglable par programme, `regleMontantNegatifTma`) — **changé par
  rapport à l'Excel d'origine**, décision explicite de Nicolas.
- **Frais d'ouverture de dossier TMA** : appliqué systématiquement, avoir
  compris (chaque TMA a un dossier à ouvrir, sans exception).
- **Barème des appels de fonds** : le pourcentage de chaque phase est
  **figé** sur chaque `AppelDeFonds` au moment de sa génération — un appel
  déjà émis n'est jamais recalculé rétroactivement si le barème du
  programme change ensuite. Le barème général est **verrouillé** dès qu'un
  appel a déjà été émis pour ce programme.
- **Attestation MOE ≠ émission** : une attestation MOE seule n'émet jamais
  l'appel (statut "À émettre", pas "Émis") — **sauf** si l'acte du lot a
  été signé après ou le jour même de l'attestation (`lot.dateActe >=
  dateAttestation`), auquel cas l'appel est automatiquement émis ET réglé
  à la date de l'acte (le notaire encaisse déjà les sommes dues). Règle
  reconfirmée plusieurs fois par Nicolas, fondamentale — ne jamais la
  retirer par erreur en retouchant ce code.
- **Numéro de devis TMA** : change à **chaque génération**, jamais
  réutilisé, une suite par programme et par année (compteur atomique
  serveur, jamais calculé côté client).
- **N° de demande TMA** : rang chronologique de la demande **par
  logement** (pas un numéro global) — jamais stocké, toujours déduit.
- **Exports** : jamais la colonne "Action" ; chaque export doit exister en
  Excel ET PDF, sauf les documents type courrier/devis (PDF uniquement,
  pas d'équivalent tableur utile).
- **Suppression protégée** : un lot référencé par une TMA ou un appel de
  fonds ne peut jamais être supprimé.

## Décisions déjà prises et pourquoi

- **MongoDB Atlas plutôt que local** dès le début — cohérent avec le
  déploiement prévu, pas de migration à faire plus tard.
- **Statut déduit des dates, jamais une liste déroulante libre** (Lot,
  TMA, appels de fonds) — comme les formules Excel d'origine. Un bouton
  manuel seulement pour ce qui ne peut vraiment pas se déduire (ex:
  "Marquer les travaux comme terminés").
- **Mémoriser un statut précédent** (`statutAvantRefus`...) seulement
  quand **plusieurs origines** sont possibles vers ce statut — sinon
  (ex: "Terminé", une seule origine "Validé") inutile, juste reposer le
  statut fixe suffit.
- **Exports générés côté navigateur**, pas de route serveur dédiée —
  simplicité, déploiement plus léger, réutilise directement les données
  déjà filtrées à l'écran.
- **`exceljs` plutôt que `xlsx`/SheetJS** — seule librairie testée capable
  d'écrire vraiment du style Excel (gras, couleurs, largeurs de colonnes),
  pas seulement des données brutes.
- **Numérotation des devis TMA séparée par programme** (pas une suite
  globale) — chaque programme peut avoir son propre maître d'ouvrage/sa
  propre comptabilité.
- **Texte de recherche reconstruit à partir des mêmes fonctions
  d'affichage que le rendu du tableau** (pas les valeurs brutes stockées)
  — pour que "ce qu'on tape" corresponde à "ce qu'on lit à l'écran".
- **Vulnérabilité `uuid` (via `exceljs`) laissée en l'état** — le correctif
  automatique downgraderait `exceljs` en version cassante ; pas appliqué
  pour ne pas risquer de casser les exports Excel tout juste terminés
  (voir décision 224/225 dans `demandes.md`).

## Pièges déjà rencontrés

- **Spécificité CSS** : des règles imbriquées (ex: `table { ... button
  {...} }`) battent souvent des classes utilitaires simples — corrigé par
  des classes doublées ou des noms de classe explicites plutôt que des
  sélecteurs positionnels (`nth-child`, qui casse dès qu'un élément
  conditionnel change de position).
- **Espace insécable des montants formatés** (`Intl.NumberFormat('fr-FR')`)
  : invisible au clavier (casse la recherche texte tant qu'on ne retire
  pas les espaces des deux côtés de la comparaison) ET mal rendu par la
  police "helvetica" intégrée à jsPDF (s'affichait en "/") — nettoyage
  systématique avant tout envoi à jsPDF (`nettoyerPourPdf`, `export.js`).
- **Calcul dérivé dépendant de plusieurs champs** : doit être redéclenché
  depuis TOUS les points d'entrée qui modifient un de ces champs, pas
  seulement celui déjà couvert au départ (bug réel : corriger
  `nombreEntreprisesConcernees` après coup ne relançait pas le calcul du
  montant/statut TMA).
- **`node seed.js` en parallèle d'un test manuel** fait "réapparaître" des
  données fictives déjà supprimées — toujours demander confirmation et
  **attendre la réponse** avant de relancer le seed.
- **"Brancher la logique" ≠ "afficher le composant"** : un composant
  importé et câblé dans la logique de filtrage peut très bien ne jamais
  être ajouté au JSX rendu — deux étapes distinctes, chacune oubliable
  indépendamment.
- **Panne serveur totale échouait en silence côté client** : `fetch()`
  lève une exception (pas une réponse HTTP) quand le serveur est
  injoignable — seul le chargement initial de chaque page l'attrapait,
  pas les actions (créer/modifier/supprimer). Corrigé une seule fois,
  centralisé dans `apiFetch()`.
- **Erreurs 500 renvoyaient `erreur.message` brut au client**, y compris
  en production — corrigé via `repondreErreurServeur()`
  (`server/utils/erreurs.js`), détail toujours loggué côté serveur,
  renvoyé au client seulement hors production.

## En cours / à ne pas casser

- Le statut **"À émettre"** (appels de fonds) tout juste ajouté — bien
  respecter la règle exacte : En attente → À émettre → Émis → En retard →
  Réglé, avec l'exception "acte signé après (ou le jour même de)
  l'attestation" qui court-circuite tout (voir plus haut).
- **"Générer un appel de fonds"** et **"Générer devis client"** : les
  numéros (n° d'appel émis, numéro de devis) sont réservés côté **serveur**
  de façon atomique — ne jamais recalculer ou dupliquer cette logique côté
  client.
- **3 décisions en attente de Nicolas**, ne pas trancher à sa place (voir
  `docs/demandes.md`, points 224-226) : stratégie de sauvegarde MongoDB,
  mise à jour d'`exceljs` (vulnérabilité restante), renommage éventuel de
  `/api/programme`/`/api/tma` en pluriel.
- **Plan de déploiement proposé mais pas exécuté** (Render + Vercel/
  Netlify) — ne pas créer de comptes/déployer sans validation explicite de
  Nicolas au préalable.
- **Documentation à tenir à jour en continu** (`journal.md`, `decisions.md`,
  `bugs.md`, `schema-donnees.md`, `demandes.md`) à chaque nouvelle étape,
  sans attendre qu'on le redemande — habitude déjà bien ancrée dans ce
  projet, à ne pas relâcher.
