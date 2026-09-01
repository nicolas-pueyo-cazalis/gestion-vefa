<!--
Modèle de spec (Jour 7 du programme de formation personnel de Nicolas) —
copié depuis le PDF fourni par Nicolas pour être modifiable directement
en Markdown plutôt que resté figé en PDF.

Complété le 31/08/2026 avec la section "Impact sur l'existant" exigée par
docs/protocole-ia-vefa.md (Étape 2) pour toute nouvelle fonctionnalité sur
un projet déjà avancé — absente du modèle générique d'origine
(docs/demandes.md, point 239).

Usage : copier ce fichier (ex: docs/specs/nom-de-la-fonctionnalite.md,
dossier à créer au premier usage) et remplir chaque section pour toute
nouvelle fonctionnalité travaillée en spec-first. Ne pas modifier ce
modèle lui-même sauf pour l'améliorer consciemment (dans ce cas, le noter
dans docs/decisions.md).
-->

# Template — Spec [nom de la fonctionnalité]

**Projet :** VEFA / Expense tracker · **Date :** ___ · **Statut :** brouillon / validée / en cours d'itération

## Objectif

*À quoi sert cette fonctionnalité, pour qui. Une ou deux phrases, pas plus.*

## Comportement attendu (cas nominal)

*Étape par étape, ce qui doit se passer dans le cas normal, sans exception.*

1.
2.
3.

## Impact sur l'existant

*Spécifique à un projet déjà avancé (voir `docs/protocole-ia-vefa.md`,
Étape 2) — absent d'une spec "projet neuf". Quels fichiers/fonctions déjà
en place cette fonctionnalité pourrait toucher, même indirectement (ex:
une route partagée, un composant réutilisé ailleurs, une règle métier déjà
codée à un autre endroit). Vérifier notamment `CLAUDE.md` (racine du
projet — "Règles métiers non négociables" et "En cours / à ne pas casser",
et son renvoi vers `docs/regles-metiers.md` pour le détail) pour tout ce
qui ne doit surtout pas changer par effet de bord.*

- Fichiers/fonctions concernés : ...
- Règle(s) métier existante(s) à ne pas casser : ...
- Test de non-régression à prévoir sur (fonctionnalité proche déjà
  existante) : ...

## Cas limites

*Le cœur de la valeur de la spec — ne pas bâcler cette section. Pour
chaque cas limite envisagé : quelle donnée/situation, quel comportement
attendu.*

- Cas : ... → Comportement attendu : ...
- Cas : ... → Comportement attendu : ...
- Cas : ... → Comportement attendu : ...

## Contraintes techniques

*Ce qu'il ne faut pas casser, la stack imposée, la compatibilité avec
l'existant. PAS de solution technique détaillée ici (voir note en fin de
document) — seulement des contraintes réelles et justifiées.*

-
-

## Points à trancher

*Ce qui reste ouvert et doit être décidé AVANT de lancer la génération —
ne pas laisser ces cases vides en passant à la pratique.*

- [ ]
- [ ]

## Hors périmètre

*Ce qui est volontairement exclu de cette version, pour éviter toute
ambiguïté sur ce qui n'est PAS demandé.*

-

## Historique des itérations

*À compléter à chaque écart constaté après génération — ne jamais
corriger le résultat sans noter ici pourquoi.*

- **v1 :** version initiale, avant premier test de génération

---

**Note de rappel (Jour 7)** — *Une spec décrit CE QUE le système doit
faire, pas COMMENT je dois l'implémenter techniquement. Sauf contrainte
réellement justifiée, laisse le champ « Contraintes techniques » au
niveau du comportement et des règles métier — pas d'une solution
technique pré-mâchée que tu n'as pas les moyens d'évaluer toi-même.*
