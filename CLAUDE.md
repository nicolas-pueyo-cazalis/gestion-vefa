# Contexte projet — Gestion VEFA

Fiche de reprise rapide, chargée automatiquement par Claude Code en début
de session. Résumé volontairement court — le détail complet est dans les
autres fichiers de `docs/` (renvois ci-dessous).

> **[`docs/protocole-ia-vefa.md`](docs/protocole-ia-vefa.md)** : protocole de
> travail à suivre en permanence sur ce projet (spec avec section "Impact
> sur l'existant", `git diff --stat` systématique, audit sécurité 3 points
> sur toute donnée d'acquéreur, dette technique sur le code ancien). À
> relire en début de session, pas juste une fois.

## Stack

React 19/Vite/Sass (`client/`) · Node/Express 5/MongoDB Atlas (`server/`,
ESM) · JWT (7j) + bcrypt, API entièrement protégée, 3 rôles
(admin/gestionnaire/lecture) · Exports `exceljs`/`jspdf` générés côté
navigateur · `morgan` (logs), `oxlint` (lint front seulement) · Tests
automatisés (Vitest) : fonctions de calcul pur, middleware d'authentification
et intégration base de données (`mongodb-memory-server`) côté serveur ;
fonctions de calcul pur, composants React et contextes (`AuthContext`,
`ProgrammeContext`) côté client (`npm test` dans `server/` et dans
`client/`) — reste complété par la checklist manuelle
(`docs/checklist-tests-manuels.md`), routes HTTP réelles (via `supertest`)
pas encore couvertes · Pas déployé (plan : Render + Vercel/Netlify, voir
`docs/demandes.md` 227-229).

## Règles métiers non négociables

**Voir [`docs/regles-metiers.md`](docs/regles-metiers.md)** — référence
exhaustive et canonique de toutes les règles métier (VEFA, TMA, exports,
paramétrage, sécurité). Ne pas dupliquer ici : toute règle nouvelle ou
modifiée se répercute dans ce fichier, pas dans ce résumé.

## Décisions à retenir (impact sur le travail futur)

- **Statut toujours déduit des dates**, jamais une liste déroulante libre
  (Lot, TMA, appels de fonds) — bouton manuel seulement si vraiment
  indéductible.
- **Mémoriser un statut précédent** (`statutAvantRefus`) seulement si
  **plusieurs origines** possibles — sinon inutile.
- **Exports générés côté navigateur**, aucune route serveur dédiée.
- **Vulnérabilité `uuid` (via `exceljs`) laissée en l'état** — le correctif
  casserait `exceljs` ; décision explicite, pas un oubli (`docs/demandes.md`
  224-225).

*(Détail complet et raisons de chaque décision : `docs/decisions.md`.)*

## Pièges déjà rencontrés (détail complet : `docs/bugs.md`)

- Spécificité CSS : classes utilitaires souvent battues par des règles
  imbriquées → classes doublées ou noms explicites, jamais `nth-child`.
- Espace insécable des montants formatés : casse la recherche texte et le
  rendu jsPDF si non nettoyé.
- Un calcul dérivé de plusieurs champs doit être redéclenché depuis TOUS
  ses points d'entrée, pas juste celui déjà couvert au départ.
- `node seed.js` en parallèle d'un test manuel fait "réapparaître" des
  données déjà supprimées — toujours confirmer avant de relancer.
- "Brancher la logique" (import, état) ≠ "afficher le composant" (JSX) —
  deux étapes distinctes, chacune oubliable seule.
- Panne serveur totale : `fetch()` lève une exception, pas une réponse —
  géré une seule fois, centralisé dans `apiFetch()`.
- Erreurs 500 : ne plus jamais renvoyer `erreur.message` brut en
  production (`repondreErreurServeur()`).

## Sécurité et données sensibles

Le projet manipule des données personnelles d'acquéreurs (identité, situation financière). Sur tout code touchant ces données, vérifier systématiquement : absence de logs en clair de données sensibles, absence de secrets/clés en dur dans le code, et qu'aucune route API ne renvoie plus de données que nécessaire au frontend.

## Conventions de code

- **Noms de fonctions/variables métier en français** (`genererAppelsDeFonds`,
  `calculerStatutAutomatique`, `nomAcquereur`) ; vocabulaire technique
  générique reste en anglais (props, state, noms de libs).
- **Modules ES uniquement** (`"type": "module"` partout), jamais `require`.
- **Statuts stockés sans accent** dans les enums (valeurs techniques, ex:
  `a_emettre`, `chiffre`) — l'accent réservé à l'affichage front.
- **Montants toujours en `Number` brut** en base, jamais formatés avant
  sauvegarde ; `formatMontant()`/`Intl.NumberFormat` seulement à l'affichage.
- **Logique métier lourde extraite dans `server/utils/*.js`**, partagée
  entre plusieurs routes quand pertinent (ex: `calculerEmissionAppel()`
  réutilisée par `routes/lots.js` et `routes/appelsDeFonds.js`) — jamais
  dupliquée dans chaque route qui en a besoin.
- **Erreurs serveur toujours via `repondreErreurServeur()`**
  (`server/utils/erreurs.js`), jamais un `res.status(500).json(...)` direct.
- **Routes d'écriture toujours protégées** par
  `autoriserRoles('admin', 'gestionnaire')`.
- **Commentaires datés et référencés** au point `docs/demandes.md`
  correspondant (ex: `// 17/07/2026, point 165 : ...`) — pas de commentaire
  sans traçabilité vers la décision d'origine.
- **Pas de TypeScript/PropTypes** : JavaScript pur des deux côtés.
- **Front : composants fonctionnels + hooks uniquement**, jamais de classes.
- Connu et assumé comme dette technique (pas une convention à suivre) :
  `nomAcquereur()`/`versDateInput()` dupliquées dans plusieurs fichiers, et
  3 "god components" trop volumineux — voir `docs/taches-a-traiter.md`.

## En cours / à ne pas casser

- Statut **"À émettre"** (appels de fonds) : En attente → À émettre → Émis
  → En retard → Réglé, avec l'exception "acte signé après l'attestation"
  qui court-circuite tout.
- **"Générer un appel de fonds"** / **"Générer devis client"** : numéros
  réservés côté serveur, atomique — jamais recalculés côté client.
- **Décisions en attente de Nicolas** (`docs/demandes.md` 224-226, 229) :
  stratégie de sauvegarde MongoDB, mise à jour `exceljs`, renommage API en
  pluriel, exécution du plan de déploiement — ne pas trancher à sa place.
- **Documentation à tenir à jour en continu**, sans attendre qu'on le
  redemande.

## Comment travailler sur ce projet

- Avant toute nouvelle fonctionnalité : rédiger une spec (objectif, comportement attendu, cas limites, contraintes). Après chaque génération : vérifier git diff --stat  pour repérer toute modification hors périmètre, puis tester le comportement réel dans l'application avant de considérer une tâche terminée.
- **Toujours se référer à [`docs/a-prendre-en-compte.md`](docs/a-prendre-en-compte.md)**
  — liste de réflexes à garder à l'esprit en permanence, complétée par
  Nicolas au fil des sessions.
- **Toujours vérifier [`docs/taches-a-traiter.md`](docs/taches-a-traiter.md)**
  pour la liste consolidée de tout ce qui reste ouvert dans le projet.
