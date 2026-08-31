<!--
Version 2 (31/08/2026), mise à jour à partir de
`protocole-vefa-avance.md` (fourni par Nicolas, dossier Téléchargements) —
remplace la version copiée depuis le PDF "Protocole à suivre projet
VEFA.pdf" du 21/07/2026. Changement principal : migration prévue de
`docs/contexte-projet.md` vers un vrai `CLAUDE.md` à la racine du projet
(chargé automatiquement par Claude Code en début de session, plus besoin de
le coller à la main) — migration pas encore faite, trackée dans
`docs/taches-a-traiter.md` (point 245). En attendant cette migration,
`docs/contexte-projet.md` continue de jouer ce rôle.

Protocole spécifique à VEFA (projet DÉJÀ avancé), distinct du programme de
formation général de Nicolas (apprentissage sur 16 jours, retiré du dépôt
le 21/07/2026 — resté dans son dossier personnel). Ce protocole-ci décrit
COMMENT travailler au quotidien sur ce projet précis, une fois la formation
générale acquise.

**À prendre en compte tout le temps** (demande explicite de Nicolas,
21/07/2026, reconfirmée le 31/08/2026) — pas un document à lire une fois
puis oublier. Les déclencheurs concrets qui en sont tirés vivent aussi,
sous forme condensée, dans `docs/a-prendre-en-compte.md`. Voir aussi
`docs/contexte-projet.md`, qui y renvoie en premier.
-->

# Protocole IA — Projet VEFA (déjà avancé)

### Adapté à l'existant : fichiers de contexte VS Code déjà en place, code déjà écrit, migration vers CLAUDE.md

Adapté à l'existant : fichiers de contexte VS Code déjà en place, code déjà écrit.

**Différence principale avec un protocole "projet neuf"** : ici, le
contexte existe déjà mais peut être partiellement obsolète (dérive
documentaire), le risque de modification silencieuse est plus élevé (plus
de fichiers interdépendants), et une vraie gestion de dette technique
s'ajoute au flux de travail courant.

## Étape 0 — Consolidation initiale (à faire une fois, avant de continuer le développement)

- [ ] Migre `CONTEXTE-PROJET.md` vers un vrai `CLAUDE.md` à la racine du
      projet — il sera chargé automatiquement par Claude Code au début de
      chaque session, sans que Nicolas ait besoin de le coller manuellement
      (`docs/taches-a-traiter.md`, point 245)
- [ ] Garde-le en synthèse courte (une demi-page max) des points les plus
      critiques — pas une réécriture des fichiers de `docs/` existants,
      juste un résumé rapide
- [ ] Committe `CLAUDE.md` avec Git (documentation versionnée, comme le
      reste du projet)
- [ ] Si Nicolas a des préférences personnelles (pas propres au projet VEFA
      mais à sa façon de travailler en général) : créer en plus un
      `~/.claude/CLAUDE.md` au niveau utilisateur — celui-ci s'applique à
      tous ses projets, pas seulement VEFA
- [ ] Fais un test de fidélité : demande à Claude d'expliquer 3 fonctions
      déjà documentées dans les fichiers de contexte, en se basant sur le
      CODE réel. Compare à ce que dit la doc. Note les écarts (dérive
      documentaire ou erreur de Claude)
- [ ] Vérifie que Git est bien initialisé et que l'historique est propre
      (`git status`, `git log --oneline`)

## Étape 1 — Avant chaque nouvelle session de travail

- [ ] Rien à charger manuellement une fois la migration faite : `CLAUDE.md`
      se lit automatiquement dès l'ouverture de la session dans le dossier
      du projet. En attendant, charger `docs/contexte-projet.md`
- [ ] Précise la tâche du jour en une phrase claire avant de commencer
- [ ] Si la session s'annonce longue (plusieurs fonctionnalités, beaucoup
      d'allers-retours) : anticipe le risque de dilution du contexte —
      prévois de faire reformuler une règle critique à mi-session pour
      vérifier qu'elle est toujours bien "vue", même si elle vient de
      `CLAUDE.md`
- [ ] Si Claude est corrigé plusieurs fois sur la même règle au cours d'une
      session : demander explicitement de "sauvegarder cette règle en
      mémoire" plutôt que de la répéter à chaque fois — c'est le système de
      mémoire persistante déjà utilisé ce projet (fichiers `feedback_*.md`,
      voir mémoire de Claude)

## Étape 2 — Pour une nouvelle fonctionnalité sur l'existant

- [ ] Spec écrite (comme pour un projet neuf), MAIS avec une section
      supplémentaire : "Impact sur l'existant" — quels fichiers/fonctions
      déjà en place cette fonctionnalité pourrait toucher
      (`docs/template-spec.md`)
- [ ] Commit avant génération
- [ ] Génération
- [ ] `git diff --stat` — vigilance renforcée ici : sur un gros projet, le
      risque qu'un fichier "annexe" soit touché sans que Nicolas l'attende
      est plus élevé que sur un petit projet neuf
- [ ] Test réel : cas normal, cas limite, ET un test de non-régression sur
      une fonctionnalité proche déjà existante
- [ ] Mise à jour spec + `CLAUDE.md` (ou `docs/contexte-projet.md` en
      attendant la migration) si une nouvelle règle/décision **durable** a
      émergé — pas les détails ponctuels d'une seule fonctionnalité, garder
      ce fichier concis. Une règle métier se répercute plutôt dans
      `docs/regles-metiers.md`

## Étape 3 — Pour toucher à du code déjà existant (bug, refactoring, évolution)

- [ ] Bug : signalement précis (comportement observé/attendu, reproduction,
      erreur complète), diagnostic exigé avant correction, jugement du
      diagnostic à l'aune de la connaissance métier VEFA
- [ ] Refactoring/code smell : audit SANS correction immédiate,
      priorisation par Nicolas selon l'usage réel futur de cette partie du
      code (pas une règle abstraite de "bonne pratique")
- [ ] Dans tous les cas : `git diff --stat` avant de valider, test réel du
      comportement, jamais de clôture sur simple affirmation

## Étape 4 — Sécurité, priorité vu la nature des données VEFA

- [ ] Sur tout fichier touchant des données d'acquéreurs (identité,
      situation financière) : vérification systématique des 3 points —
      logs en clair, secrets en dur, sur-exposition d'une route API
- [ ] Cet audit sécurité peut être transformé en Skill réutilisable pour ne
      plus avoir à le reformuler à chaque fois (voir Leçon D du programme)
      — à distinguer de `CLAUDE.md` : la Skill encode une procédure à
      exécuter à la demande, `CLAUDE.md` donne un contexte permanent lu
      automatiquement

## Étape 5 — Gestion de la dette accumulée (spécifique à un projet avancé)

- [ ] Périodiquement (pas à chaque session), consacre un temps dédié à
      l'audit de code smells sur les parties **les plus anciennes** du
      projet — celles qui ont le plus de chances d'avoir divergé du reste
      du style
- [ ] Priorise selon l'usage réel : une fonction centrale modifiée souvent
      > une fonction isolée qu'on ne touche plus
- [ ] Ne jamais corriger plusieurs zones en une seule session sans
      validation intermédiaire — un projet avancé a plus de dépendances
      cachées qu'un projet neuf

## Étape 6 — Automatisation et fonctionnalités IA dans VEFA (si Nicolas avance sur cet axe)

- [ ] Avant toute intégration API : spec du besoin, estimation du coût
      réel (volume mensuel × coût par appel), vérification sur la grille
      tarifaire officielle
- [ ] Pour un besoin ponctuel et simple : envisager le no-code avant l'API
      pure (coût de développement moindre)
- [ ] Pour du RAG (interroger les données réelles) : définir précisément
      quelles données et pour quelles questions, avant l'implémentation —
      c'est un choix produit avant d'être technique

## Rappel permanent — Checklist des pièges (identique, mais vigilance accrue sur un projet avancé)

- Modification silencieuse d'un fichier non demandé — **risque plus élevé**
  sur un gros projet avec beaucoup de fichiers interdépendants
- Test qui "passe" en trichant plutôt qu'en corrigeant le vrai problème
- Suppression discrète d'une gestion d'erreur gênante
- Affirmation de succès sans test réel de la part de Claude
- Solution générique qui ignore une contrainte métier donnée plus tôt —
  **risque plus élevé** si la règle est ancienne et pas rappelée
  récemment, même avec `CLAUDE.md` (rien ne garantit qu'une info chargée
  en début de session résiste à une très longue session)
- Précision de la réponse ≠ exactitude de la réponse
- Donnée sensible exposée — **priorité haute** vu la nature des données VEFA

## Fréquence de contrôle indépendant

- [ ] 2 fois par semaine minimum : comparaison avec un deuxième outil IA
      sur un résultat important
- [ ] 1 fois par semaine minimum : relecture et mise à jour de `CLAUDE.md`
      (ou `docs/contexte-projet.md` en attendant la migration)
- [ ] Périodiquement : test de fidélité entre les fichiers de contexte et
      le code réel (comme à l'Étape 0), pour détecter une dérive
      documentaire progressive

---

*Note sur la migration `docs/contexte-projet.md` → `CLAUDE.md` : le
contenu ne change pas, seul le mode de chargement change — automatique
plutôt que manuel. La vigilance sur la fenêtre de contexte reste
identique : `CLAUDE.md` est lu au DÉBUT de la session, mais peut tout
autant sortir de la fenêtre active sur une session très longue.*
