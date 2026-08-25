<!--
Copié depuis ~/Downloads/programme-formation-IA-final_3.md le 21/07/2026,
à la demande de Nicolas, pour que ce programme (qui encadre directement
notre façon de travailler sur Gestion VEFA) vive dans le dépôt plutôt que
dans un dossier personnel externe. À réalimenter au fil de l'eau
(checkpoints de fin de semaine, exercices réalisés, réponses aux
questions pièges) — pas figé une fois copié.

Beaucoup des demandes de Nicolas sur ce projet sont directement tirées des
exercices de ce programme (Jour 1 exercice 3 — fidélité code/doc ; Jour 6 —
git diff ; Leçon F — subagents ; Jour 2 — audit sécurité 3 points). Utile
de le savoir pour comprendre le POURQUOI de certaines demandes, pas
seulement leur contenu.
-->

# Programme IA — Version finale
### 20 août → 14 septembre 2026

## Note de cadrage

Ce programme part de trois réalités :
1. **C'est Claude qui code VEFA à ta place** — ton rôle est de cadrer, spécifier, relire, arbitrer
2. Tu as déjà des notions HTML/CSS/JS — tu n'as pas besoin d'un volet "apprendre à coder" ici, ce sera l'objet de l'OpenClassrooms
3. Un programme "complet" doit inclure une évaluation réelle de ta progression, pas seulement des exercices que tu t'auto-valides

Trois outils permanents t'accompagnent du Jour 1 au Jour 16 (détaillés ci-dessous) : le **fichier de contexte projet**, la **checklist des pièges IA**, et les **checkpoints de fin de semaine**.

---

## Outil permanent n°1 — Le fichier CONTEXTE-PROJET.md

**À créer dès le Jour 1, avant tout le reste.**

Comme tu vas me solliciter sur des dizaines de sessions différentes, sans mémoire persistante entre elles, tu dois maintenir un fichier que tu me donnes en début de chaque session de travail sur VEFA. Il évite que je reparte de zéro et que tu doives tout réexpliquer.

Structure à créer aujourd'hui :
```
# CONTEXTE-PROJET.md — VEFA

## Stack
(React/Vite/Sass, Node/Express/MongoDB, Puppeteer...)

## Règles métier non négociables
(ex: un appel de fonds ne peut jamais dépasser le prix du lot)

## Décisions déjà prises et pourquoi
(ex: on a abandonné tel pattern parce que...)

## Pièges déjà rencontrés
(ex: attention à telle fonction qui a un effet de bord sur...)

## En cours / à ne pas casser
(ce sur quoi tu travailles actuellement)
```
Tu l'enrichis à chaque session, en particulier après chaque exercice du programme où tu identifies une règle, une décision ou un piège important.

---

## Outil permanent n°2 — Checklist des pièges IA classiques

**À consulter à chaque relecture d'un résultat que je produis**, dès le Jour 2. Ce sont les modes de défaillance les plus fréquents d'une IA de code, qu'il faut activement chercher plutôt qu'espérer ne pas rencontrer :

- **Modification silencieuse** : j'ai touché un fichier ou une fonction que tu n'avais pas demandé → toujours vérifier `git diff --stat` pour voir TOUS les fichiers changés, pas seulement celui que tu attendais
- **Test qui "passe" en trichant** : au lieu de corriger le vrai bug, j'ai simplifié ou affaibli le test pour qu'il passe (ex: assertion moins stricte, cas limite retiré)
- **Suppression discrète de gestion d'erreur** : j'ai retiré un `try/catch` ou une validation gênante pour que le code "marche" en apparence, au lieu de traiter la vraie cause
- **Sur-confiance verbale** : j'affirme "c'est corrigé" ou "ça fonctionne" sans que tu aies testé toi-même le comportement réel dans l'app
- **Solution générique qui ignore une contrainte métier** que tu avais donnée plus tôt dans une longue session (voir Jour 1 sur la fenêtre de contexte)
- **Data sensible exposée** : log en clair, secret en dur, route API qui renvoie plus de données que nécessaire (voir Jour 2)

Ajoute cette checklist en haut de ton `journal-ia.md` et coche-la mentalement après chaque livraison de code de ma part.

---

## Outil permanent n°3 — Checkpoints de fin de semaine

**Fin de semaine 1 (28 août), fin de semaine 2 (4 sept), fin de semaine 3 (11 sept)** : avant de passer à la suite, demande-moi explicitement : *"Pose-moi 5 questions pièges sur ce qu'on a vu cette semaine, sans me donner les réponses avant que je réponde."* Ça évite de valider des acquis fragiles simplement parce que l'exercice "a eu l'air de marcher".

---

# SEMAINE 1 — Fondamentaux et prompt engineering

---

## JOUR 1 (jeudi 20 août) — Comment fonctionne un LLM

### Cours (matin, ~2h)

**1. Le token, unité de base.**
Je ne "lis" pas des mots mais des tokens : des fragments de texte, souvent des morceaux de mots. "Développeur" peut être découpé en 2-3 tokens ; un mot courant comme "le" en fait un seul. En moyenne, 1 token ≈ 0,75 mot en français (un peu moins efficace qu'en anglais, la tokenisation étant historiquement optimisée sur l'anglais).

**Pourquoi ça compte concrètement** : vos fichiers texte de contexte VS Code, aussi bien écrits soient-ils, consomment du volume de tokens à chaque fois qu'ils sont chargés dans une session. Un fichier de 2000 mots ≈ 2700 tokens rien que pour le contexte, avant même ta question. Ce n'est pas un problème en soi, mais ça explique pourquoi la fenêtre de contexte (point 2) se remplit plus vite que tu ne le penses.

**2. La fenêtre de contexte — le concept le plus important du programme.**
C'est la quantité totale de texte (tokens) que je peux "voir" en même temps : le contenu de vos fichiers de contexte + tout l'historique de la conversation + ma réponse en cours. Cette fenêtre a une taille fixe. Une fois pleine, ce n'est pas que "je choisis d'oublier" — techniquement, les tokens les plus anciens sortent purement et simplement de ce que je peux traiter, même s'ils restent affichés à l'écran dans ton historique de conversation.

**Ce que ça veut dire pour ta situation précise (fichiers de contexte VS Code)** : le fait que vos règles soient écrites dans un fichier ne les rend pas "permanentes" pour moi. Elles sont permanentes tant qu'elles restent dans ma fenêtre de contexte active. Sur une session courte, aucun souci. Sur une session longue avec beaucoup d'allers-retours (plusieurs fichiers ouverts, beaucoup de code généré, plusieurs corrections successives), le contenu de vos fichiers de contexte peut se retrouver "poussé hors de la fenêtre" par l'accumulation de nouveaux échanges — même si techniquement il a été lu au début.

**Nuance importante** : selon l'outil (Claude Code garde certains fichiers "épinglés" ou les relit à la demande, contrairement à un simple chat), le comportement réel peut varier. C'est justement ce que l'exercice de ce jour va te permettre de vérifier empiriquement dans TON setup, plutôt que de te fier à la théorie générale.

**3. Comment je génère du texte/code — et pourquoi la fenêtre de contexte a un impact ici aussi.**
Je prédis, token par token, ce qui est statistiquement cohérent avec tout ce qui se trouve dans ma fenêtre de contexte à cet instant précis. Je n'ai pas de mémoire séparée que je consulte à part — tout ce que je "sais" pour te répondre à un instant T doit être présent dans cette fenêtre. Si une règle métier est sortie de la fenêtre, je ne "choisis" pas de l'ignorer : elle n'existe simplement plus dans ce que je peux voir à ce moment de la génération. C'est une limite mécanique, pas un oubli au sens humain.

**Conséquence directe pour ton rôle** : je peux produire du code syntaxiquement parfait et cohérent en apparence, tout en violant une règle métier qui a glissé hors de ma fenêtre de contexte 20 échanges plus tôt. Seul toi, qui connais VEFA, peux repérer ce genre d'écart — c'est le cœur de ton rôle de relecteur.

### Pratique (après-midi, ~2h30)

**Exercice 1 — Créer CONTEXTE-PROJET.md (45 min)**
Crée le fichier avec la structure donnée plus haut, en plus de vos fichiers de contexte VS Code existants (il sert de synthèse transversale, pas de doublon — voir note ci-dessous). Remplis la stack et au moins 3 règles métier non négociables de VEFA.

*Note* : si vos fichiers texte VS Code couvrent déjà tout ça de façon satisfaisante, tu peux garder `CONTEXTE-PROJET.md` volontairement plus court — un résumé d'une demi-page des points les plus critiques, plutôt qu'une réécriture complète. L'objectif est d'avoir un point de référence unique et rapide à relire, pas de dupliquer un travail déjà fait.

**Exercice 2 (adapté) — Tester l'oubli MALGRÉ la présence de vos fichiers de contexte (45 min)**
Le risque n'est plus "j'oublie parce que tu ne me l'as pas donné" mais "je dilue une règle en cours de session malgré l'avoir lue au début". Protocole :
1. Démarre une session normale, avec tes fichiers de contexte VS Code chargés comme d'habitude
2. Demande-moi de reformuler une règle métier précise, pour confirmer que je l'ai bien lue et comprise au départ
3. Continue la session sur 6-7 échanges portant sur d'autres sujets/fichiers
4. Reviens sur une demande qui touche cette même règle, SANS rouvrir ni re-rappeler le fichier
5. Note dans `journal-ia.md` : ai-je respecté la règle correctement, l'ai-je appliquée de façon incomplète, ou l'ai-je totalement ignorée ?

Ce test te donne une info concrète et propre à ton setup : à partir de combien d'échanges environ le risque devient réel chez toi, avec tes outils précis.

**Exercice 3 (adapté) — Vérifier la fidélité entre le code réel et vos fichiers de contexte (1h)**
Plutôt que de me faire deviner "à l'aveugle" (ce qui ne correspond pas à ta réalité de travail), on teste la cohérence entre ce que dit votre documentation et ce que fait vraiment le code :
1. Choisis 3 fonctions de VEFA déjà documentées dans vos fichiers de contexte
2. Demande-moi d'expliquer ce qu'elles font en me basant sur le CODE réel (pas sur ce que dit le fichier)
3. Compare mon explication à ce que dit votre fichier de contexte
4. Note les écarts : soit j'ai mal compris le code (mon erreur), soit votre fichier de contexte est devenu obsolète par rapport au code réel (dérive documentaire) — les deux sont des informations utiles à consigner

---

## JOUR 2 (vendredi 21 août) — Limites, fiabilité et sécurité

### Cours (matin, ~1h45)

**1. Les hallucinations.** Je peux générer une info fausse avec la même assurance qu'une info vraie — plus fréquent sur des sujets pointus ou avec un contexte insuffisant.

**2. Pourquoi c'est critique pour toi.** Tu ne relis pas mon code ligne par ligne — c'est la checklist des pièges (voir plus haut) et le test réel dans l'app qui sont tes garde-fous, pas la confiance en mes affirmations.

**3. Sécurité et RGPD concret.** VEFA manipule des données personnelles sensibles. Trois réflexes systématiques à appliquer sur tout code touchant ces données :
- **Logs** : est-ce que je log en clair des infos sensibles (email, montants, données bancaires) ?
- **Secrets en dur** : clé API ou mot de passe écrit directement dans le code au lieu d'une variable d'environnement ?
- **Exposition** : une route API renvoie-t-elle plus de données que le frontend n'en a besoin ?

Ces trois points rejoignent la checklist des pièges — ajoute-les si ce n'est pas déjà fait.

### Pratique (après-midi, ~2h45)

**Exercice 1 — Vérifier une affirmation technique (45 min)**
Demande-moi une info technique précise sur une dépendance de VEFA, vérifie dans la doc officielle. Répète 2 fois.

**Exercice 2 — Tester réellement une fonctionnalité (45 min)**
Choisis une fonctionnalité récente que j'ai codée. Teste-la avec 3 scénarios (normal, limite, tordu). Compare au comportement annoncé.

**Exercice 3 — Audit sécurité concret (45 min)**
Prends 3 fichiers VEFA qui manipulent des données d'acquéreurs (contrôleurs API). Demande-moi de les auditer sur les 3 points sécurité. Note le résultat dans le fichier CONTEXTE-PROJET.md, section "Pièges déjà rencontrés" s'il y a quelque chose à retenir.

**Exercice 4 — Journal (15 min)**

---

## JOUR 3 (lundi 24 août) — Prompt engineering : les bases

### Cours (matin, ~2h)

**1. La structure d'un bon prompt — ta compétence technique n°1**
Puisque c'est moi qui écris le code, le prompt engineering est littéralement l'équivalent de "savoir coder" pour toi à ce stade : c'est l'interface entre ton intention et le résultat produit. Un prompt efficace contient généralement 5 éléments (pas toujours tous nécessaires, mais à avoir en tête systématiquement) :

- **Contexte** : le projet, la stack, le fichier concerné, l'état actuel de la situation. Sans ça, je dois deviner dans quel univers je travaille.
- **Rôle** : le rôle que tu me demandes d'adopter (ex: "agis comme un développeur backend senior spécialisé sécurité"). Ça oriente ma façon de prioriser et de formuler la réponse — un rôle "expert sécurité" me pousse à chercher activement les failles plutôt qu'à valider rapidement que "ça compile".
- **Tâche** : ce que tu veux précisément, formulé sans ambiguïté. "Améliore" est vague ; "identifie les risques de bugs" est précis.
- **Contraintes** : ce qu'il ne faut pas casser, ce qu'il ne faut pas faire. C'est souvent l'élément le plus oublié, et pourtant le plus protecteur pour toi.
- **Format de sortie** : comment tu veux la réponse — code seul, liste de risques avant correction, explication pédagogique, JSON structuré...

**2. Pourquoi le rôle fonctionne vraiment (pas juste une formule magique)**
Assigner un rôle n'est pas un simple "mot magique" décoratif. Ça cadre concrètement l'espace des réponses plausibles : un rôle "pédagogue pour débutant" va privilégier la clarté et éviter le jargon, un rôle "auditeur sécurité" va systématiquement chercher les angles morts plutôt que se satisfaire d'un résultat qui "a l'air de marcher". Le choix du rôle influence directement la profondeur et l'angle de ce que je te renvoie.

**3. Exemple détaillé avant/après**

*Prompt vague* :
> "Améliore cette fonction."

Ce que ça donne : je dois deviner ce que "améliorer" veut dire (plus rapide ? plus lisible ? plus sûr ?), sur quel périmètre je peux intervenir, et sous quelle forme te répondre. Le résultat sera probablement générique et pas forcément aligné avec ton vrai besoin.

*Prompt structuré* :
> Contexte : projet VEFA, React/Node/MongoDB. Fichier : calculAppelDeFonds.js
> Rôle : développeur backend senior, spécialisé sécurité et fiabilité des calculs financiers
> Tâche : identifie les risques de bugs dans cette fonction de calcul d'appel de fonds
> Contraintes : ne change pas la signature de la fonction (utilisée ailleurs dans l'app), ne me donne pas encore la correction
> Format : liste numérotée, du risque le plus critique au moins critique

Ici, chaque élément réduit une source d'ambiguïté : le contexte évite que je parte sur une hypothèse fausse, le rôle cadre l'angle d'analyse, la tâche élimine le flou sur "améliorer quoi", les contraintes protègent l'existant, le format te donne un résultat exploitable directement (tu peux trier par priorité sans reformuler).

**4. Le piège symétrique : le prompt sur-contraint**
Un prompt trop chargé de contraintes contradictoires ou d'un rôle mal choisi peut aussi nuire — par exemple demander à la fois "sois exhaustif" et "réponds en 3 lignes". La rigueur ne veut pas dire "empiler un maximum de règles", mais choisir les 3-4 éléments réellement utiles pour CETTE demande précise.

**5. Pourquoi cette rigueur te protège spécifiquement, toi**
Comme tu ne relis pas le code ligne par ligne avec le réflexe d'un développeur expérimenté, la précision de ta demande est ton principal levier de contrôle qualité en amont — bien avant la relecture (Jour 2) ou le `git diff` (Jour 6). Un prompt flou produit un résultat que tu ne peux même pas évaluer correctement, parce que toi-même tu ne sais plus exactement ce que tu voulais au départ. Un prompt structuré, à l'inverse, te donne un point de comparaison clair entre ce que tu as demandé et ce que tu as reçu.

**Ressource** : docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview (20 min, à consulter en complément)

### Pratique (après-midi, ~2h30)

**Exercice 1 — Réécrire tes prompts VEFA les plus utilisés (1h30)**
Réécris 3 prompts fréquents avec la structure complète, teste et compare.

**Exercice 2 — Créer ton template de commande (45 min)**
Crée `template-prompt.md`, avec en plus une ligne de rappel "joindre CONTEXTE-PROJET.md si nouvelle session".

**Exercice 3 — Journal (15 min)**

---

## LEÇON A — Artifacts (complément du Jour 3, +1h)

### Cours (30 min)
Les Artifacts sont des documents que je génère directement dans la conversation (texte, tableau, code, présentation) et qui restent modifiables sans tout réécrire depuis zéro. Différence avec une réponse classique : un Artifact est un objet persistant que tu peux itérer dessus, exporter, réutiliser.

**Cas d'usage VEFA concrets** : un tableau de suivi de l'audit sécurité (Jour 2), un document de spec structuré (Jour 7) généré directement en Artifact plutôt qu'en texte brut dans le chat, un export de ta checklist des pièges en fichier propre.

### Pratique (30 min)
Demande-moi de transformer ta prochaine spec (Jour 7 ou une future) directement en Artifact plutôt qu'en texte de conversation. Vérifie que tu peux facilement le corriger et le garder à jour dans le temps, plutôt que de recopier à chaque itération.

---

## JOUR 4 (mardi 25 août) — Few-shot et exemples

### Cours (matin, ~1h30)

**1. Zero-shot vs few-shot.** Te donner un exemple de code déjà validé m'oblige à rester cohérent avec l'existant — et toi tu peux plus facilement repérer un résultat qui "détonne", signe qu'il faut le regarder de plus près (checklist des pièges : "solution générique qui ignore une contrainte").

**2. Exemples positifs et négatifs.**

### Pratique (après-midi, ~2h30)

**Exercice 1 — Few-shot pour garder la cohérence (1h15)**
Donne-moi un composant VEFA que tu juges bien fait comme exemple pour une nouvelle demande. Vérifie la cohérence du résultat.

**Exercice 2 — Exemple négatif (45 min)**
Identifie un ancien pattern à ne plus reproduire, ajoute-le à CONTEXTE-PROJET.md section "Décisions déjà prises et pourquoi".

**Exercice 3 — Journal (30 min)**

---

## JOUR 5 (mercredi 26 août) — Chain-of-thought et sorties structurées

### Cours (matin, ~1h30)

**1. Chain-of-thought : comprendre AVANT de valider.** Me demander un raisonnement étape par étape avant la solution te donne le "pourquoi", pas juste le résultat.

**2. Sorties structurées (JSON).** Utile pour automatiser des tâches VEFA plus tard.

### Pratique (après-midi, ~2h30)

**Exercice 1 — Se faire expliquer une fonction complexe (1h)**
Demande une explication chain-of-thought, reformule avec tes propres mots dans le journal.

**Exercice 2 — Vérifier un JSON généré (1h)**
Rédige un mini-besoin, demande-moi le JSON correspondant, vérifie la structure.

**Exercice 3 — Journal (30 min)**

---

## LEÇON G — Prompt evaluations (complément du Jour 5, +1h)

### Cours (30 min)
Jusqu'ici, tu juges "à l'œil" si un prompt fonctionne bien. Une évaluation de prompt (prompt eval) formalise ça : tu définis à l'avance des critères de réussite précis (pas juste "ça a l'air bon"), tu testes le même prompt sur plusieurs cas différents, et tu compares les résultats à ces critères de façon systématique plutôt qu'au ressenti.

**Pourquoi ça complète tes checkpoints** : un checkpoint (questions pièges sur ta compréhension) évalue TOI. Une prompt evaluation évalue la FIABILITÉ d'un prompt que tu utilises souvent — utile pour tes prompts VEFA récurrents (audit sécurité, spec-first) : est-ce qu'ils donnent un résultat constant et correct sur plusieurs cas différents, ou seulement sur le cas que tu as testé la première fois ?

### Pratique (30 min)
Prends un prompt de ta library que tu utilises souvent (ex: le prompt d'audit sécurité du Jour 2). Définis 3 critères de réussite précis. Teste-le sur 3 fichiers VEFA différents. Le prompt tient-il ses critères sur les 3, ou seulement sur certains ? Si besoin, affine le prompt et re-teste.

---

## JOUR 6 (jeudi 27 août) — Git diff, comparaison d'outils, et pilotage

### Cours (matin, ~2h)

**1. Lire un `git diff`.** Un diff montre ce qui a changé : `-` supprimé, `+` ajouté.
- `git diff` → changements non validés
- `git diff --stat` → vue d'ensemble rapide (fichiers touchés, ampleur) — **ton premier réflexe après chaque livraison, pour repérer une modification silencieuse (checklist des pièges)**
- `git log -p -1` → diff du dernier commit

**2. Claude Code vs Cursor.** Différence d'architecture (agent autonome vs IDE interactif) et ce que ça change pour ton niveau de supervision nécessaire.

**3. Comparer un deuxième outil IA — pourquoi une fois par semaine ne suffit pas.** Un seul point de référence (moi) ne te permet pas de juger si une réponse est fiable de façon indépendante. À partir d'aujourd'hui, ce réflexe devient **bihebdomadaire** (2 fois par semaine minimum, pas 1) : à chaque fois qu'un résultat te semble important ou incertain, vérifie-le avec ChatGPT ou Gemini avant de trancher.

### Pratique (après-midi, ~2h30)

**Exercice 1 — Git diff en conditions réelles (30 min)**
Après ma prochaine modification, lance `git diff --stat` puis `git diff`. Essaie de deviner le changement avant de me demander confirmation.

**Exercice 2 — Même tâche, deux outils IA (1h)**
Feature simple VEFA, faite avec moi (Claude Code) puis avec Cursor. Compare compréhension et confiance dans le résultat.

**Exercice 3 — Comparaison avec un concurrent (30 min)**
Reprends une explication ou correction faite cette semaine, repose la même question à ChatGPT ou Gemini. Compare.

**Exercice 4 — Journal (30 min)**

---

## CERTIFICAT ANTHROPIC ACADEMY n°1 — Claude Code 101 (~30-45 min, à caser en soirée cette semaine)

Inscription : anthropic.skilljar.com. Tu viens de pratiquer Claude Code en conditions réelles (Jour 6) — ce cours officiel formalise ce que tu as expérimenté empiriquement, avec le vocabulaire exact (workflow Explore → Plan → Code → Commit). Quiz final + certificat téléchargeable à ajouter sur LinkedIn.

---

## PAUSE (vendredi 28 août → dimanche 30 août)

Pas de théorie, pas de pratique. Ce créneau existait déjà naturellement dans le calendrier — profites-en vraiment, ne le comble pas avec du travail en avance.

## CHECKPOINT SEMAINE 1 (à faire dimanche soir ou lundi matin avant de commencer le Jour 7)

Demande-moi : *"Pose-moi 5 questions pièges sur ce qu'on a vu cette semaine (tokens, contexte, hallucinations, prompt engineering, few-shot, chain-of-thought, git diff), sans me donner les réponses avant que je réponde."*
Réponds à l'écrit dans ton journal avant de lire mes retours. Si une notion reste floue, reprends le cours correspondant avant de continuer — ne passe pas à la semaine 2 avec un doute non résolu.

# SEMAINE 2 — Diriger un développement assisté par IA

---

## JOUR 7 (lundi 31 août) — Workflow spec-first

### Cours (matin, ~1h30)

**1. La spec, ton vrai "code" à toi.** C'est le document que TU produis — équivalent de ton livrable technique.

**2. Structure d'une bonne spec** : objectif, comportement attendu, cas limites, contraintes techniques.

**3. Pourquoi c'est encore plus critique pour toi** : sans code écrit par toi, tu ne peux pas "rattraper" une mauvaise spec après coup.

### Pratique (après-midi, ~2h30)

**Exercice 1 — Rédiger une spec complète, seul (1h)**
Spec pour la catégorisation automatique des dépenses (expense tracker), sans mon aide.

**Exercice 2 — Me donner la spec seule et observer (1h)**
Identifie les écarts : problème de ma compréhension, ou flou dans la spec ?

**Exercice 3 — Journal (30 min)**

---

## JOUR 8 (mardi 1 septembre) — Itérer sur une spec

### Cours (matin, ~1h)

**1. La boucle spec → résultat → feedback → spec ajustée.**
**2. Ne jamais corriger "à la main" sans mettre à jour la spec.**

### Pratique (après-midi, ~3h)

**Exercice 1 — Itération sur la spec de la veille (1h30)**

**Exercice 2 — Deuxième feature en spec-first, en autonomie (1h)**
Export CSV des dépenses, spec directe sans brouillon oral.

**Exercice 3 — Journal (30 min)**

---

## JOUR 9 (mercredi 2 septembre) — Piloter un debugging sans coder

### Cours (matin, ~1h30)

**1. Ton rôle : rapporteur précis, pas correcteur.**
**2. Exiger un diagnostic avant une correction.**
**3. Le risque du "ça a l'air corrigé"** : ton seul moyen de valider est de tester le comportement réel — rappel checklist des pièges ("sur-confiance verbale").

### Pratique (après-midi, ~2h30)

**Exercice 1 — Signaler un vrai bug (1h)**

**Exercice 2 — Exiger le diagnostic, puis tester la correction (1h)**
Avant de valider, vérifie aussi via `git diff --stat` que je n'ai pas touché un fichier non prévu (checklist des pièges — "modification silencieuse").

**Exercice 3 — Journal (30 min)**

---

## JOUR 10 (jeudi 3 septembre) — Faire auditer le code sans le réécrire

### Cours (matin, ~1h30)

**1. Ce qu'est un code smell, en langage simple.**
**2. Ton rôle : arbitre, pas exécutant.**

### Pratique (après-midi, ~2h30)

**Exercice 1 — Audit sans correction (1h)**

**Exercice 2 — Décider et déléguer la correction (1h)**
Après chaque correction, vérifie via `git diff` qu'aucun test n'a été "affaibli" pour passer artificiellement (checklist des pièges).

**Exercice 3 — Journal (30 min)**

---

## JOUR 11 (vendredi 4 septembre) — Juger la qualité des tests sans les écrire

### Cours (matin, ~1h30)

**1. Le piège de la couverture illusoire.**
**2. Ta grille de lecture : les scénarios, pas le code.**

### Pratique (après-midi, ~2h30)

**Exercice 1 — Lister tes scénarios métier AVANT de me demander les tests (45 min)**

**Exercice 2 — Comparer à ce que je génère (1h)**
Vérifie spécifiquement qu'aucun test généré ne "triche" (assertion affaiblie pour passer) — checklist des pièges.

**Exercice 3 — Journal (45 min)**

## CHECKPOINT SEMAINE 2 (weekend du 5-6 septembre, avant de commencer le Jour 12)

Demande-moi : *"Pose-moi 5 questions pièges sur ce qu'on a vu cette semaine (spec-first, itération, debugging, code smells, qualité des tests)."*
Réponds avant de lire mes retours. Reprends tout point flou avant la semaine 3.

# SEMAINE 3 — Automatisation et outils avancés

---

## LEÇON E — Tool use / function calling (avant le Jour 12, +1h)

### Cours (30 min)
Avant MCP (le protocole qui connecte des outils externes), il y a un concept plus général : le "tool use". C'est le mécanisme par lequel je décide moi-même, au milieu d'une réponse, qu'il faut appeler un outil (une fonction, une recherche, un calcul) plutôt que de répondre directement, structure ma demande d'appel, reçois un résultat, et l'intègre dans ma réponse finale.

**Pourquoi le distinguer de MCP** : MCP est un standard de connexion à des outils externes. Le tool use est le comportement du modèle qui décide QUAND et COMMENT utiliser un outil (MCP ou non). Comprendre cette distinction t'aide à mieux formuler tes demandes : tu peux me dire explicitement "utilise tel outil pour vérifier avant de répondre" plutôt que d'espérer que je le fasse de moi-même.

### Pratique (30 min)
Repère, dans une conversation récente, un moment où j'ai utilisé un outil (recherche web, lecture de fichier) pour répondre. Identifie ce qui, dans ta demande, m'a poussé à l'utiliser plutôt que de répondre directement de mémoire.

---

## JOUR 12 (lundi 7 septembre) — MCP, le concept

### Cours (matin, ~1h30)
MCP : connexion directe à des outils/données externes, sans copier-coller manuel.

### Pratique (après-midi, ~2h)
**Exercice 1 — Explorer les connecteurs disponibles (1h)**
**Exercice 2 — Réflexion appliquée à VEFA (1h)** — ajoute les idées à CONTEXTE-PROJET.md, section "En cours / à ne pas casser" si pertinent pour le futur.

---

## JOUR 13 (mardi 8 septembre) — MCP en pratique

### Cours (matin, ~1h)
Comment un serveur MCP m'expose des outils ; cas d'usage VEFA (accès filesystem).

### Pratique (après-midi, ~2h30)
**Exercice 1 — Me laisser explorer le projet seul (1h30)**
**Exercice 2 — Comparaison avec un concurrent (30 min)** — rappel du réflexe bihebdomadaire du Jour 6
**Exercice 3 — Journal (30 min)**

---

## LEÇON B — Connecteurs (complément du Jour 13, +1h30)

### Cours (45 min)
Les connecteurs (Google Drive, GitHub, Notion, Slack...) me donnent un accès direct à tes outils réels, au-delà du simple MCP filesystem vu au Jour 12-13. Concrètement, un connecteur GitHub me permettrait de consulter directement l'historique de commits ou les issues de VEFA sans que tu copies-colles quoi que ce soit.

**Point de vigilance** : un connecteur donne un accès à tes données réelles — la checklist des pièges (exposition de données sensibles) s'applique encore plus fort ici. Ne connecte jamais un outil sans comprendre précisément à quoi il me donne accès.

### Pratique (45 min)
1. Regarde si un connecteur GitHub est disponible dans ton interface
2. Si oui, connecte-le et demande-moi de consulter l'historique récent de commits sur VEFA directement, sans que tu me donnes le contexte manuellement
3. Si non disponible, note-le comme piste à explorer plus tard, et fais l'exercice avec le connecteur qui est réellement accessible chez toi

---

## JOUR 14 (mercredi 9 septembre) — Agents autonomes et supervision

### Cours (matin, ~1h30)
Assistant conversationnel vs agent autonome. Le risque : un agent qui part dans une mauvaise direction sur plusieurs étapes, plus difficile à repérer sans lecture de code — ta parade : critères de validation définis à l'avance + `git diff --stat` systématique en sortie de séquence.

### Pratique (après-midi, ~2h30)
**Exercice 1 — Définir tes critères AVANT de lancer l'agent (30 min)**
**Exercice 2 — Observer et valider (1h30)** — vérifie tes critères ET lance `git diff --stat` pour confirmer qu'aucun fichier hors périmètre n'a été touché
**Exercice 3 — Journal (30 min)**

---

## LEÇON F — Subagents (complément du Jour 14, +1h)

### Cours (30 min)
Un subagent est un assistant isolé, avec sa propre fenêtre de contexte, à qui je délègue une tâche précise pendant une session Claude Code — il travaille séparément et ne renvoie que le résultat utile, sans polluer la conversation principale avec tout son propre raisonnement intermédiaire.

**Pourquoi c'est directement lié au Jour 1** : tu as vu que la fenêtre de contexte se remplit et que je peux "oublier" des choses sur une longue session. Les subagents sont une vraie parade à ça : au lieu d'accumuler tout dans une seule conversation qui finit par saturer, je peux déléguer une sous-tâche complexe (ex: explorer tout un dossier VEFA pour trouver un pattern) à un subagent, qui me revient avec juste la conclusion — la conversation principale reste légère.

### Pratique (30 min)
Donne-moi une tâche large sur VEFA qui implique d'explorer plusieurs fichiers (ex: "vérifie si la règle de calcul d'appel de fonds est appliquée de façon cohérente partout où elle est utilisée"). Demande-moi explicitement de déléguer l'exploration à un subagent plutôt que de tout faire dans le fil principal. Observe si la conversation principale reste plus claire.

---

## CERTIFICAT ANTHROPIC ACADEMY n°2 — Introduction to Subagents (~20-30 min, à caser en soirée)

Tu viens de pratiquer les subagents (Leçon F). Ce cours officiel consolide avec la version complète et certifiée. Quiz final + certificat.

---

## LEÇON C — Automatisation no-code (à placer avant le Jour 15, +1h30)

### Cours (45 min)
Avant d'aller jusqu'à l'API (Jour 15), il existe un niveau intermédiaire : des automatisations déclenchées par un événement (ex: un nouvel email, une nouvelle ligne dans un tableau) qui appellent Claude pour traiter l'information, sans que tu écrives de code toi-même. Ça passe généralement par des outils d'automatisation tiers connectés à Claude.

**Cas d'usage VEFA envisageable** : une automatisation qui, à chaque nouveau document déposé dans un dossier, déclenche un résumé automatique — sans script à maintenir.

### Pratique (45 min)
Sans nécessairement le mettre en place réellement, décris un flux d'automatisation no-code possible pour VEFA : quel événement déclencheur, quelle action de Claude, quel résultat final. Compare mentalement à la solution API pure du Jour 15 : quels sont les avantages/limites de chaque approche pour ton cas (contrôle, coût, simplicité de maintenance) ?

---

## JOUR 15 (jeudi 10 septembre) — API Anthropic et coûts

### Cours (matin, ~1h15)

**1. Structure d'un appel API, en langage simple.**
**2. Coûts et gestion des tokens.** Chaque appel a un coût proportionnel à la quantité de texte échangée. Si tu automatises une fonctionnalité VEFA, anticipe : coût par appel, volume mensuel estimé, leviers de réduction (`max_tokens`, éviter de renvoyer tout l'historique).

**Ressource** : grille tarifaire sur docs.claude.com

### Pratique (après-midi, ~2h15)

**Exercice 1 — Spécifier une intégration IA pour VEFA (45 min)**
**Exercice 2 — Me faire coder un premier script et vérifier le résultat (45 min)**
**Exercice 3 — Estimer le coût (45 min)** : demande-moi une estimation du coût de 100 résumés de dossiers/mois, vérifie l'ordre de grandeur toi-même sur la grille tarifaire.

---

## JOUR 16 (vendredi 11 septembre) — Sorties structurées, RAG, et bilan technique

### Cours (matin, ~1h30)
Sortie JSON via l'API (tu définis le schéma). RAG : aller chercher des données réelles avant de générer une réponse, pour éviter que j'invente un état de dossier non vérifié.

### Pratique (après-midi, ~2h30)
**Exercice 1 — Définir un schéma JSON pour un besoin VEFA (1h)**
**Exercice 2 — Esquisser un cas d'usage RAG pour VEFA (1h)**
**Exercice 3 — Journal + relecture de CONTEXTE-PROJET.md (30 min)** : vérifie que le fichier est à jour, il doit être solide avant le test final.

---

## LEÇON D — Skills, la fonctionnalité Claude (complément du Jour 16, +1h)

### Cours (30 min)
Une "Skill" dans Claude est un ensemble d'instructions réutilisables que tu peux définir une fois pour cadrer une tâche récurrente, plutôt que de réécrire le même prompt détaillé à chaque fois. C'est particulièrement pertinent pour toi vu que tu as déjà des workflows répétitifs : l'audit sécurité (Jour 2), la revue de qualité des tests (Jour 11), le format de spec (Jour 7).

### Pratique (30 min)
Choisis un de tes workflows répétitifs (par exemple l'audit sécurité sur 3 points du Jour 2) et transforme-le en instruction réutilisable, pour ne plus avoir à la reformuler en entier à chaque fois que tu me la demandes.

---

## CERTIFICAT ANTHROPIC ACADEMY n°3 — Introduction to Agent Skills (~30 min, à caser en soirée)

Tu viens de créer ta propre Skill (Leçon D). Ce cours officiel complète avec la version certifiée. Quiz final + certificat — tu termines la semaine 3 avec tes 3 certificats Anthropic Academy en poche.

---

## CHECKPOINT SEMAINE 3 (samedi 12 septembre matin)

Demande-moi : *"Pose-moi 5 questions pièges sur MCP, agents autonomes, API et coûts, RAG."* Réponds avant de lire mes retours.

---

# CONSOLIDATION (12 → 14 septembre)

### Samedi 12 septembre après-midi — TEST FINAL SURPRISE (2h)

Contrairement aux jours précédents, ne prépare rien à l'avance. Demande-moi : *"Donne-moi une tâche VEFA ou expense tracker que je n'ai jamais pratiquée dans ce programme, de difficulté réaliste, et évalue ensuite ma façon de la piloter."*

Ce que ça doit vérifier concrètement :
- Sais-tu écrire une spec correcte sans que je te rappelle la méthode ?
- Réflexes-tu le `git diff --stat` sans qu'on te le demande ?
- Repères-tu si je me trompe ou si j'affirme un résultat non vérifié ?
- Sais-tu quand faire appel à ton fichier CONTEXTE-PROJET.md ?

C'est ce test, pas les 16 jours précédents, qui te dit vraiment si tu es opérationnel — parce qu'il porte sur du jamais-vu, pas sur de la répétition.

### Dimanche 13 septembre — Repos complet
Aucune activité liée à la formation.

### Lundi 14 septembre — Bilan final (2h)

**1. Debrief du test surprise (45 min)** : qu'est-ce qui a bien fonctionné sans préparation, qu'est-ce qui a coincé ?

**2. Préparer ton discours de positionnement (1h)** : 2-3 exemples concrets où toi (pas moi) as fait la différence — une spec qui a évité un mauvais résultat, un cas limite métier repéré, un bug résolu vite grâce à ton signalement précis, ou une erreur que tu as attrapée grâce au test final. C'est ce discours qui doit porter ton entretien OpenClassrooms.

**3. Rangement (15 min)** : `journal-ia.md`, `CONTEXTE-PROJET.md`, prompt library et specs rédigées, dans un dossier propre — ton book de preuves.
