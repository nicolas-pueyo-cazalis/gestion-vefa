# À prendre en compte

Liste de réflexes/actions que je (Claude) dois garder à l'esprit **à tout
moment**, dans toute session de travail sur ce projet — pour ne jamais
oublier de faire quelque chose que Nicolas m'a explicitement demandé de
répéter systématiquement, même sans qu'il ait à le redemander à chaque fois.

Différent de `docs/demandes.md` (liste chronologique des demandes) et de
`docs/protocole-ia-vefa.md` (protocole de travail détaillé) : ici, une liste
courte de réflexes concrets, complétée au fur et à mesure par Nicolas.

---

1. **Toute règle métier nouvelle ou modifiée doit être répercutée dans
   `docs/regles-metiers.md`**, dès qu'elle est décidée — pas seulement
   dans `journal.md`/`decisions.md`. Si elle est parmi les plus critiques,
   la répercuter aussi dans le résumé court de `CLAUDE.md` (racine du
   projet, anciennement `docs/contexte-projet.md`).
2. **Dès qu'une tâche passe en attente (⏳)** quelque part dans le projet —
   nouvelle demande, ou correction/décision laissée en suspens — l'ajouter
   immédiatement dans `docs/taches-a-traiter.md` (dans le bon thème), sans
   attendre qu'on le redemande. Une fois traitée, l'en retirer — **sauf**
   pour une tâche évolutive par nature (ex: "compléter tel document au fil
   de l'eau") : celle-là reste en continu tant que Nicolas ne dit pas
   explicitement qu'elle est close, jamais retirée juste parce qu'un tour
   de complément a été fait (précision de Nicolas, 31/08/2026, suite au
   point 248).
3. **En début de session** : relire ce document, puis vérifier et
   **signaler explicitement à Nicolas** si une échéance de
   `docs/protocole-ia-vefa.md` ("Fréquence de contrôle indépendant")
   tombe — comparaison avec un 2ᵉ outil IA sur un résultat important
   (~2×/semaine), relecture/mise à jour de `CLAUDE.md` (~1×/semaine), test
   de fidélité code/doc (périodique). Je n'ai aucune
   mémoire du temps réellement écoulé entre deux sessions : je dois donc le
   proposer moi-même plutôt que de compter sur un déclenchement silencieux.
4. **Nouvelle fonctionnalité touchant du code déjà existant** : exiger une
   spec avec sa section "Impact sur l'existant" (`docs/template-spec.md`),
   commit avant génération, `git diff --stat` avec vigilance renforcée
   après, et tester non seulement le cas nominal mais aussi un cas limite
   **et** un test de non-régression sur une fonctionnalité proche déjà
   existante.
5. **Bug signalé** : toujours présenter un diagnostic avant de corriger,
   jamais corriger à l'aveugle sur la base d'une simple supposition.
6. **Code smell / dette technique repéré** : signaler et documenter, ne
   jamais corriger immédiatement sans validation explicite de Nicolas
   (priorisation par usage réel, pas par principe abstrait) — et ne jamais
   corriger plusieurs zones en une seule session sans point d'étape.
7. **Fichier touchant des données d'acquéreur** (identité, coordonnées,
   situation financière) : audit sécurité systématique des 3 points — logs
   en clair, secrets en dur, sur-exposition d'une route API.
8. **Checklist des pièges à garder en tête en permanence**
   (`docs/protocole-ia-vefa.md`) : ne jamais modifier un fichier non
   demandé sans le signaler ; ne jamais affirmer un succès sans un test
   réel de ma part ; ne jamais faire "passer" un test en trichant plutôt
   qu'en corrigeant le vrai problème ; vérifier qu'une contrainte métier
   donnée plus tôt n'est pas silencieusement ignorée ; une donnée sensible
   exposée est toujours une priorité haute.
