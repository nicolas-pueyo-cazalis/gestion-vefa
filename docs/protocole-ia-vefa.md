<!--
Copié depuis le PDF "Protocole à suivre projet VEFA.pdf" fourni par
Nicolas le 21/07/2026 — protocole spécifique à VEFA (projet DÉJÀ avancé),
distinct du programme de formation général de Nicolas (apprentissage sur
16 jours, retiré du dépôt le 21/07/2026 — resté dans son dossier
personnel). Ce protocole-ci décrit COMMENT travailler au quotidien sur ce
projet précis, une fois la formation générale acquise.

**À prendre en compte tout le temps à partir de maintenant** (demande
explicite de Nicolas, 21/07/2026) — pas un document à lire une fois puis
oublier. Voir aussi docs/contexte-projet.md, qui y renvoie en premier.
-->

# Protocole IA — Projet VEFA (déjà avancé)

Adapté à l'existant : fichiers de contexte VS Code déjà en place, code déjà écrit.

**Différence principale avec un protocole "projet neuf"** : ici, le
contexte existe déjà mais peut être partiellement obsolète (dérive
documentaire), le risque de modification silencieuse est plus élevé (plus
de fichiers interdépendants), et une vraie gestion de dette technique
s'ajoute au flux de travail courant.

## Étape 0 — Consolidation initiale (à faire une fois, avant de continuer le développement)

- [ ] Vérifie que `CONTEXTE-PROJET.md` existe en synthèse courte (une
      demi-page max) des points les plus critiques — pas une réécriture
      de vos fichiers VS Code existants, juste un résumé rapide à charger
      en début de session
- [ ] Fais un test de fidélité : demande-moi d'expliquer 3 fonctions déjà
      documentées dans vos fichiers de contexte, en te basant sur le CODE
      réel. Compare à ce que dit la doc. Note les écarts (dérive
      documentaire ou erreur de ma part)
- [ ] Vérifie que Git est bien initialisé et que l'historique est propre
      (`git status`, `git log --oneline`)

## Étape 1 — Avant chaque nouvelle session de travail

- [ ] Charge tes fichiers de contexte VS Code habituels + `CONTEXTE-PROJET.md` en synthèse
- [ ] Précise la tâche du jour en une phrase claire avant de commencer
- [ ] Si la session s'annonce longue (plusieurs fonctionnalités, beaucoup
      d'allers-retours) : anticipe le risque de dilution du contexte —
      prévois de me faire reformuler une règle critique à mi-session pour
      vérifier qu'elle est toujours bien "vue"

## Étape 2 — Pour une nouvelle fonctionnalité sur l'existant

- [ ] Spec écrite (comme pour un projet neuf), MAIS avec une section
      supplémentaire : "Impact sur l'existant" — quels fichiers/fonctions
      déjà en place cette fonctionnalité pourrait toucher
- [ ] Commit avant génération
- [ ] Génération
- [ ] `git diff --stat` — vigilance renforcée ici : sur un gros projet, le
      risque qu'un fichier "annexe" soit touché sans que tu l'attendes est
      plus élevé que sur un petit projet neuf
- [ ] Test réel : cas normal, cas limite, ET un test de non-régression sur
      une fonctionnalité proche déjà existante
- [ ] Mise à jour spec + `CONTEXTE-PROJET.md` si besoin

## Étape 3 — Pour toucher à du code déjà existant (bug, refactoring, évolution)

- [ ] Bug : signalement précis (comportement observé/attendu, reproduction,
      erreur complète), diagnostic exigé avant correction, jugement du
      diagnostic à l'aune de ta connaissance métier VEFA
- [ ] Refactoring/code smell : audit SANS correction immédiate,
      priorisation par toi selon l'usage réel futur de cette partie du
      code (pas une règle abstraite de "bonne pratique")
- [ ] Dans tous les cas : `git diff --stat` avant de valider, test réel du
      comportement, jamais de clôture sur simple affirmation

## Étape 4 — Sécurité, priorité vu la nature des données VEFA

- [ ] Sur tout fichier touchant des données d'acquéreurs (identité,
      situation financière) : vérification systématique des 3 points —
      logs en clair, secrets en dur, sur-exposition d'une route API
- [ ] Cet audit sécurité peut être transformé en Skill réutilisable pour
      ne plus avoir à le reformuler à chaque fois (voir Leçon D du
      programme)

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

## Étape 6 — Automatisation et fonctionnalités IA dans VEFA (si tu avances sur cet axe)

- [ ] Avant toute intégration API : spec du besoin, estimation du coût
      réel (volume mensuel × coût par appel), vérification sur la grille
      tarifaire officielle
- [ ] Pour un besoin ponctuel et simple : envisager le no-code avant l'API
      pure (coût de développement moindre)
- [ ] Pour du RAG (interroger tes données réelles) : définir précisément
      quelles données et pour quelles questions, avant l'implémentation —
      c'est un choix produit avant d'être technique

## Rappel permanent — Checklist des pièges (identique, mais vigilance accrue sur un projet avancé)

- Modification silencieuse d'un fichier non demandé — **risque plus élevé**
  sur un gros projet avec beaucoup de fichiers interdépendants
- Test qui "passe" en trichant plutôt qu'en corrigeant le vrai problème
- Suppression discrète d'une gestion d'erreur gênante
- Affirmation de succès sans test réel de ta part
- Solution générique qui ignore une contrainte métier donnée plus tôt —
  **risque plus élevé** si la règle est ancienne et pas rappelée récemment
- Précision de la réponse ≠ exactitude de la réponse
- Donnée sensible exposée — **priorité haute** vu la nature des données VEFA

## Fréquence de contrôle indépendant

- [ ] 2 fois par semaine minimum : comparaison avec un deuxième outil IA
      sur un résultat important
- [ ] 1 fois par semaine minimum : relecture et mise à jour de `CONTEXTE-PROJET.md`
- [ ] Périodiquement : test de fidélité entre vos fichiers de contexte VS
      Code et le code réel (comme à l'Étape 0), pour détecter une dérive
      documentaire progressive
