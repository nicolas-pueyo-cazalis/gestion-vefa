# Spec — Couverture de code — chantier 7 (point E)

**Projet :** Gestion VEFA · **Date :** 01/09/2026 · **Statut :** faite

## Objectif

Configurer `vitest run --coverage` (serveur et client) pour avoir une
vision objective de ce qui est réellement testé, plutôt que de deviner —
point E de l'inventaire "tests au bout du bout" (`docs/demandes.md`,
point 281). Chantier de pure configuration/outillage, aucun code
applicatif touché — spec volontairement courte, proportionnée au
périmètre.

## Comportement attendu (cas nominal)

1. `@vitest/coverage-v8` installé (devDependency) dans `server/` et
   `client/`.
2. Script `npm run coverage` (`vitest run --coverage`) disponible dans
   les deux.
3. Dossier de sortie (`coverage/`) ignoré par Git dans les deux — un
   rapport généré à la demande, pas un artefact versionné.
4. Chiffres de couverture actuels consignés dans `docs/demandes.md` une
   fois générés (photo à un instant T, évoluera à chaque nouveau
   chantier de tests).

## Impact sur l'existant

- **Fichiers concernés** : `server/package.json`, `client/package.json`
  (dépendance + script), `.gitignore` (dossier `coverage/`).
- **Règle(s) métier existante(s) à ne pas casser** : aucune.
- **Test de non-régression** : `npm test` (sans `--coverage`) doit rester
  aussi rapide qu'avant, la couverture ne doit s'activer que sur demande
  explicite.

## Contraintes techniques

- `@vitest/coverage-v8` (provider V8, le standard avec Vitest) — pas
  Istanbul, plus rapide, pas de dépendance de compilation supplémentaire.

## Hors périmètre

- Aucun seuil minimum de couverture appliqué/bloquant en CI pour
  l'instant (ex: "échoue si < 80%") — juste un outil de visibilité, pas
  une porte bloquante. À reconsidérer plus tard si Nicolas le souhaite.

## Historique des itérations

- **v1 :** version initiale, avant premier test de génération.
- **v2 (01/09/2026) :** générée avec succès, avec un vrai incident
  d'infrastructure en cours de route (sans rapport avec le code). Les deux
  `npm install` (`@vitest/coverage-v8`) lancés en parallèle ont bloqué
  toute la VM WSL (11 processus `wsl` accumulés, compteur mémoire
  aberrant) — corrigé par `wsl --shutdown` (avec l'accord explicite de
  Nicolas) puis réinstallation en séquentiel, qui a fonctionné
  immédiatement (6s et 4s). Serveurs de dev relancés après coup (coupés
  par le redémarrage WSL). `coverage/` ajouté au `.gitignore` des deux
  côtés. Chiffres de couverture obtenus (`npm run coverage`) :
  - **Serveur** : 25,23% de couverture globale (instructions) — 100% sur
    `middleware/auth.js`, la plupart des modèles ; très bas sur les
    routes elles-mêmes (attendu, seuls `lots.js` en partie et le
    scénario d'intégration sont couverts, pas le reste des routes).
  - **Client** : 3,64% de couverture globale — 100% sur `statuts.js`,
    `api.js`, `codePostal.js`, `StatCard.jsx`, `useFermerAvecEchap.js` ;
    0% sur toutes les pages et la plupart des composants (attendu, aucune
    page n'a encore été testée).
  Ces chiffres bas sont normaux et attendus vu la stratégie "par lots"
  suivie depuis le début (fonctions à haute valeur d'abord) — pas un
  signal d'alarme, juste la photo honnête de ce qui reste à faire.
  Vérifié au passage : la vulnérabilité `npm audit` réapparue côté client
  est bien l'ancienne (`uuid`/`exceljs`, déjà actée, points 225/`decisions.md`),
  pas une nouvelle introduite par ce chantier.
