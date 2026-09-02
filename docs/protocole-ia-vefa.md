<!--
Version 2 (31/08/2026), mise à jour à partir de
`protocole-vefa-avance.md` (fourni par Nicolas, dossier Téléchargements) —
remplace la version copiée depuis le PDF "Protocole à suivre projet
VEFA.pdf" du 21/07/2026. Changement principal : migration de
`docs/contexte-projet.md` vers un vrai `CLAUDE.md` à la racine du projet
(chargé automatiquement par Claude Code en début de session, plus besoin de
le coller à la main) — **migration faite le 31/08/2026** (Étape 0, voir
`docs/demandes.md` point 251). `docs/contexte-projet.md` n'est plus qu'une
redirection vers `CLAUDE.md`. Le contenu de `CLAUDE.md` reste cependant à
retravailler plus en profondeur (`docs/taches-a-traiter.md`, points
245/249) — la migration mécanique ne veut pas dire que le contenu est figé.

Protocole spécifique à VEFA (projet DÉJÀ avancé), distinct du programme de
formation général de Nicolas (apprentissage sur 16 jours, retiré du dépôt
le 21/07/2026 — resté dans son dossier personnel). Ce protocole-ci décrit
COMMENT travailler au quotidien sur ce projet précis, une fois la formation
générale acquise.

**À prendre en compte tout le temps** (demande explicite de Nicolas,
21/07/2026, reconfirmée le 31/08/2026) — pas un document à lire une fois
puis oublier. Les déclencheurs concrets qui en sont tirés vivent aussi,
sous forme condensée, dans `docs/a-prendre-en-compte.md`. Voir aussi
`CLAUDE.md` (racine du projet), qui y renvoie en premier.
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

- [ ] Rien à charger manuellement : `CLAUDE.md` se lit automatiquement dès
      l'ouverture de la session dans le dossier du projet
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

## Étape 1bis — Mode planification pour les demandes longues et risquées (ajouté le 02/09/2026)

Pour toute demande **large ou risquée** (nouvelle fonctionnalité touchant
plusieurs fichiers, refactor, choix d'architecture — ex: le découpage
des "god components", point 236) : passer en **mode planification**
avant de toucher à quoi que ce soit.

- [ ] En mode planification : explorer, lire des fichiers, poser des
      questions — mais **ne modifier aucun fichier et ne lancer aucune
      commande qui change quelque chose**.
- [ ] Une fois l'approche claire, présenter un **plan écrit** (étapes,
      fichiers concernés, choix faits) à Nicolas.
- [ ] **Rien ne s'exécute tant que le plan n'est pas validé
      explicitement.** Si le plan ne convient pas, l'ajuster avant de
      toucher à quoi que ce soit.

**Pourquoi** : voir l'intention avant l'exécution est plus facile à
corriger qu'un diff déjà fait — cohérent avec le principe "vérifier avant
de faire confiance" déjà appliqué sur ce projet (`git diff --stat`
systématique, spec avant génération).

**Quand s'en servir** : demandes larges/risquées seulement — pas pour de
petites corrections ponctuelles où le contexte est déjà clair (la
majorité des chantiers de tests, un correctif CSS ciblé, une décimale à
remettre...).

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
- [ ] Mise à jour spec + `CLAUDE.md` si une nouvelle règle/décision
      **durable** a émergé — pas les détails ponctuels d'une seule
      fonctionnalité, garder
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

## Étape 7 — Hooks Claude Code : automatiser ce qui doit se produire systématiquement (ajouté le 02/09/2026)

**Principe de base** : si une action doit se produire à tous les coups
(sans exception), ne pas compter sur une instruction dans `CLAUDE.md` ou
un prompt (Claude peut l'oublier) — la mettre dans un **hook**, configuré
dans `.claude/settings.json`. Les hooks sont déterministes, ils
s'exécutent toujours, contrairement à une consigne suivie "la plupart du
temps".

- [ ] **`PostToolUse`** (matcher `Write|Edit`) : pour du formatage
      automatique après modification de fichier, de la journalisation,
      ou toute action qui doit suivre systématiquement une écriture.
      Exemple déjà en place sur ce projet : `.claude/settings.json`
      lance Prettier automatiquement (`.claude/hooks/format-on-write.js`)
      après chaque `Write`/`Edit` sur un fichier `.js`/`.jsx`/`.json` de
      `client/` ou `server/` — adopté le 02/09/2026, suite au check-up de
      présentation du code (point 285/293).
- [ ] **`PreToolUse`** : pour **bloquer** une action avant son exécution
      (pas juste la déconseiller). Le hook reçoit le nom de l'outil et
      ses données en JSON sur l'entrée standard ; le code de sortie
      décide : `0` = laisser passer, `2` = bloquer (le message d'erreur
      est renvoyé à Claude, qui peut s'adapter), tout autre code = erreur
      non bloquante juste affichée. Utile pour imposer des règles dures
      plutôt que de les suggérer (ex : bloquer l'écriture dans un
      répertoire de config production, bloquer un commit sur `main`,
      bloquer une commande bash dangereuse) — **pas encore mis en place
      sur ce projet**, à faire si un besoin concret se présente.
- [ ] **Hooks versionnés** : `.claude/settings.json` (au niveau du
      projet, pas `.claude/settings.local.json`) est commité dans le
      dépôt — toute l'équipe (ou toute future session) en bénéficie
      automatiquement, pas seulement la session qui l'a configuré.
- [ ] **`$CLAUDE_PROJECT_DIR`** : variable d'environnement disponible dans
      les commandes de hook pour référencer des scripts du projet
      indépendamment du répertoire de travail courant de Claude — non
      utilisée dans le hook Prettier actuel (chemin absolu codé en dur à
      la place, faute d'avoir pu tester son format exact dans cet
      environnement Windows/WSL à double couche) ; à reconsidérer si
      utilisée ailleurs.
- [ ] **Particularité de ce projet** : Node.js n'existe que dans WSL sur
      cette machine (pas dans Git Bash ni PowerShell natif — voir
      `CLAUDE.md`) — tout hook qui a besoin d'exécuter du JS/npm doit
      router sa commande via `wsl -e bash -lic "..."`, pas l'invoquer
      directement.

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
- [ ] Périodiquement : test de fidélité entre les fichiers de contexte et
      le code réel (comme à l'Étape 0), pour détecter une dérive
      documentaire progressive

---

*Note sur la migration `docs/contexte-projet.md` → `CLAUDE.md` : le
contenu ne change pas, seul le mode de chargement change — automatique
plutôt que manuel. La vigilance sur la fenêtre de contexte reste
identique : `CLAUDE.md` est lu au DÉBUT de la session, mais peut tout
autant sortir de la fenêtre active sur une session très longue.*
