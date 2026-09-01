# Spec — Tests automatisés (middleware d'authentification) — chantier 4 (point B)

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Combler l'angle mort de sécurité identifié dans le check-up "développeur
confirmé" (`docs/demandes.md`, point 237) : `server/middleware/auth.js`
(`verifierToken`, `autoriserRoles`) protège **toute** l'API et avait 0% de
couverture — point B de l'inventaire "tests au bout du bout" (point 281).

## Comportement attendu (cas nominal)

1. Tests écrits pour `verifierToken` : jeton valide → `req.utilisateur`
   posé depuis le contenu du jeton, `next()` appelé ; jeton absent,
   malformé, expiré ou signé avec un autre secret → 401, `next()` jamais
   appelé.
2. Tests écrits pour `autoriserRoles(...)` : rôle autorisé → `next()`
   appelé ; rôle non autorisé → 403, `next()` jamais appelé ; plusieurs
   rôles autorisés à la fois.
3. Vrais jetons JWT générés avec `jsonwebtoken` (même librairie que le
   code réel) dans les tests — pas de mock de la librairie elle-même, pour
   tester le comportement réel de `jwt.verify`.
4. `req`/`res`/`next` simulés (objets simples, sans serveur Express
   réellement démarré) — un middleware Express est une fonction pure du
   point de vue de son appelant, testable en isolation.

## Impact sur l'existant

- **Fichiers concernés** : nouveau fichier `server/middleware/auth.test.js`
  (colocalisé) — aucun fichier de logique existant modifié, contrairement
  aux chantiers 1 et 3 (rien à exporter ici, les deux fonctions le sont
  déjà).
- **Règle(s) métier existante(s) à ne pas casser** : aucune — tests en
  lecture seule.
- **Test de non-régression à prévoir** : vérifier qu'une requête réelle
  vers une route protégée (ex: `GET /api/lots` sans jeton) renvoie
  toujours 401 dans l'appli réelle après ce chantier.

## Cas limites

- En-tête `Authorization` absent → 401 "Connexion requise" (pas de
  distinction avec un jeton invalide au niveau du message, comportement
  actuel à documenter tel quel).
- En-tête présent mais sans le préfixe `"Bearer "` (ex: juste le jeton nu,
  ou `"Basic xxx"`) → traité comme absent → 401.
- Jeton syntaxiquement valide mais signé avec un secret différent → 401
  "Session expirée ou invalide, reconnectez-vous" (même message qu'un
  jeton expiré, `jwt.verify` lève la même famille d'erreur dans les deux
  cas).
- Jeton expiré (`jwt.sign(..., { expiresIn: '-1s' })`, techniquement déjà
  expiré à sa création) → même 401.
- `autoriserRoles()` appelé sans aucun rôle en argument → toujours 403
  (aucun rôle ne peut jamais matcher une liste vide) — cas limite
  théorique, pas utilisé dans le code actuel, mais le comportement doit
  rester cohérent.

## Contraintes techniques

- Vitest + `jsonwebtoken` réel (déjà une dépendance du projet), pas de
  nouvelle dépendance.
- `process.env.JWT_SECRET` fixé à une valeur de test au démarrage du
  fichier de test (ne dépend pas d'un vrai `.env`).
- Ne pas démarrer de vrai serveur Express ni ouvrir de port — uniquement
  des objets `req`/`res`/`next` simulés.

## Points à trancher

- [ ] Aucun — spec directement actionnable, même principe que les
      chantiers précédents, pas de nouvelle décision d'architecture.

## Hors périmètre (pour ce chantier)

- Tests des routes elles-mêmes (`GET /api/lots`, etc.) — c'est le
  chantier C (tests d'intégration), pas celui-ci. Ce chantier teste
  uniquement le middleware en isolation.

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 (01/09/2026) :** générée avec succès. `server/middleware/auth.test.js`
  (10 tests), aucun fichier de logique existant modifié (les deux
  fonctions étaient déjà exportées). `npm test` confirmé réellement
  exécuté : 38/38 côté serveur (10 nouveaux + 28 déjà là). Aucun écart de
  comportement trouvé — le middleware se comportait déjà exactement comme
  documenté. Non-régression vérifiée en conditions réelles : une requête
  `GET /api/lots` sans jeton sur le serveur de dev renvoie toujours 401.
