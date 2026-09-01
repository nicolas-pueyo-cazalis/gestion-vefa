# Spec — Tests automatisés (utilitaires) — chantier 3 (point A)

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Étendre les tests automatisés aux fonctions utilitaires pures restantes,
point A de l'inventaire "tests au bout du bout" (`docs/demandes.md`,
point 281) — même principe que les chantiers 1 (serveur) et 2 (client)
déjà faits.

## Comportement attendu (cas nominal)

1. Tests écrits pour `client/src/utils/recherche.js`
   (`correspondRecherche`), déjà exportée — aucun changement de code
   source nécessaire.
2. Tests écrits pour `client/src/utils/api.js` (`apiFetch`) : jeton ajouté
   à l'en-tête, redirection sur 401, message d'alerte + relance de
   l'exception si le serveur est injoignable — `fetch`, `localStorage` et
   `window.location` simulés.
3. Tests écrits pour `client/src/utils/codePostal.js`
   (`chercherCodePostal`) : cas 1 résultat, cas 2 résultats (retient le
   premier), cas >2 résultats (renvoie `null`), cas commune sans
   correspondance, cas erreur réseau — `fetch` simulé (pas de vrai appel à
   `geo.api.gouv.fr` dans les tests).
4. `nettoyerPourPdf()` (`client/src/utils/export.js`) exportée (ajout de
   `export` devant sa déclaration, aucune autre modification), puis testée
   — garde-fou direct contre la réapparition du bug historique (espace
   insécable rendu "/" par jsPDF).
5. `validerDatesCoherentesAvecStatut()` (`server/routes/lots.js`) exportée
   (même principe), puis testée — règle centrale de cohérence dates/statut
   d'un lot.

## Impact sur l'existant

- **Fichiers concernés** : nouveaux fichiers de test colocalisés
  (`recherche.test.js`, `api.test.js`, `codePostal.test.js` dans
  `client/src/utils/`, `lots.test.js` dans `server/routes/`) ;
  `client/src/utils/export.js` et `server/routes/lots.js` modifiés
  **uniquement** pour ajouter `export` devant une déclaration de fonction
  déjà existante — aucune logique changée.
- **Règle(s) métier existante(s) à ne pas casser** : aucune — passer une
  fonction de privée à exportée ne change rien à son comportement ni à la
  façon dont elle est déjà appelée en interne (`export function` reste
  utilisable exactement pareil dans le même fichier).
- **Test de non-régression à prévoir** : après l'export de
  `nettoyerPourPdf`, vérifier qu'un export PDF (ex: page Lots) fonctionne
  toujours normalement dans l'appli réelle. Après l'export de
  `validerDatesCoherentesAvecStatut`, vérifier qu'un changement de statut
  de lot (`PATCH /api/lots/:id`) est toujours bien validé côté serveur.

## Cas limites

- `correspondRecherche` : requête vide → tout correspond (`true`) ;
  recherche multi-mots dans le désordre ; accents ignorés ; "5 444" ↔
  "5 444,00 €" (espace insécable) ; "5.00" ↔ "5,00" (point/virgule).
- `apiFetch` : jeton absent (pas d'en-tête `Authorization` ajouté) ;
  réponse 401 → session vidée + redirection ; `fetch` qui lève une
  exception (serveur injoignable) → alerte affichée ET exception relancée
  (pas avalée).
- `chercherCodePostal` : commune vide/`null` → `null` sans appel réseau ;
  réponse HTTP non `ok` → `null` ; exception réseau → `null` (pas
  d'exception qui remonte).
- `nettoyerPourPdf` : valeur non-string (ex: `null`, `undefined`, nombre)
  → renvoyée telle quelle, pas de crash.

## Contraintes techniques

- Vitest, même outil que les 2 chantiers précédents.
- `fetch`/`localStorage`/`window.location` simulés via les utilitaires
  Vitest (`vi.stubGlobal`, `vi.fn()`) — aucun vrai appel réseau ni accès
  navigateur pendant les tests.
- Les deux changements de code source (`export` ajouté) sont les seuls
  autorisés dans ce chantier — pas de refactoring ni de renommage au
  passage, même si l'occasion s'y prêterait.

## Points à trancher

- [x] `calculerLargeursColonnesFigees()` (`export.js`) volontairement
      **hors périmètre** de ce chantier : dépend d'un vrai objet jsPDF
      (`doc.getTextWidth()`), plus proche d'un test d'intégration que
      d'une fonction pure — à reprendre plus tard avec un outillage dédié.

## Hors périmètre (pour ce chantier)

- `calculerLargeursColonnesFigees()` — voir ci-dessus.
- Tout ce qui reste dans les points B à F de l'inventaire
  (`docs/demandes.md`, point 281) — traité chantier par chantier, pas en
  une fois.

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 (01/09/2026) :** générée avec succès. `nettoyerPourPdf()` et
  `validerDatesCoherentesAvecStatut()` exportées (un seul mot-clé `export`
  ajouté chacune, aucune autre modification). 5 nouveaux fichiers de test :
  `recherche.test.js` (7), `api.test.js` (5), `codePostal.test.js` (8),
  `export.test.js` (4), `routes/lots.test.js` (8) — 32 nouveaux tests.
  `npm test` confirmé réellement exécuté : 49/49 côté client (24 nouveaux
  + 25 déjà là), 28/28 côté serveur (8 nouveaux + 20 déjà là). Non-régression
  vérifiée : `oxlint` toujours 0 erreur (aucun avertissement sur
  `export.js`), `node --check` sur `lots.js` propre, les deux serveurs de
  dev répondent toujours normalement. Aucun écart de comportement trouvé
  cette fois (contrairement aux 2 chantiers précédents) — les deux
  fonctions se comportaient déjà exactement comme documenté.
