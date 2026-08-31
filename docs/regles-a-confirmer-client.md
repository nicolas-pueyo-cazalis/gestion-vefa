# Règles à confirmer avec le client

Règles métier tranchées provisoirement par Nicolas (choix raisonnable, faute
de mieux) mais jamais réellement validées par un vrai client VEFA/TMA — donc
à considérer comme un point d'attention avant un usage en production, pas
comme une certitude au même titre que `docs/regles-metiers.md`.

À alimenter au fur et à mesure, pas rempli d'un coup.

---

1. **Barème d'appels de fonds d'une vente d'annexe seule** (`estAnnexeSeule`) :
   fixé à **Réservation 5% / Acte 95%**, non modifiable pour l'instant
   (`POURCENTAGE_RESERVATION_ANNEXE_SEULE`, `server/routes/lots.js`). Choisi
   par cohérence avec le barème classique (même pourcentage de réservation),
   sans qu'un client ait confirmé que ce découpage à deux échéances
   correspond à un usage réel — une vente d'annexe seule (parking, cave)
   pourrait très bien se régler en une seule fois selon les habitudes du
   promoteur.
