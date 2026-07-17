// Les données (TMA_LIST) viennent maintenant de l'API (/api/tma) — ce
// fichier ne garde que les constantes d'affichage (libellés, regroupements
// de statuts), qui restent une préoccupation du front, pas de la base.

export const STATUTS_TMA = {
  demande: "Demande",
  etude: "Étude",
  chiffre: "Chiffré",
  facture: "Facturé",
  valide: "Validé",
  refuse: "Refusé",
  travaux: "Travaux",
  termine: "Terminé",
  annule: "Annulé",
};

// "facture" est classé "en cours" : le client n'a pas encore donné son
// accord final (décision du 10/07/2026, révisée par rapport au 09/07).
export const STATUTS_EN_COURS = ["demande", "etude", "chiffre", "facture"];
export const STATUTS_VALIDE = ["valide", "travaux", "termine"];

// Copie de server/models/Tma.js — uniquement pour savoir quels boutons
// afficher côté interface. La vraie vérification (celle qui compte pour la
// sécurité des données) est faite côté serveur : même si ce fichier était
// modifié ou contourné, le serveur refuserait quand même une transition
// interdite.
// "annule" (13/07/2026, point 129) : le client renonce à cette TMA (pas
// forcément un refus du promoteur) — infos toujours visibles, jamais
// effacées, comme "refuse". Mêmes étapes de départ possibles que "refuse".
export const TRANSITIONS_AUTORISEES = {
  demande: ["etude", "refuse", "annule"],
  etude: ["chiffre", "refuse", "annule"],
  chiffre: ["facture", "refuse", "annule"],
  facture: ["valide", "refuse", "annule"],
  valide: ["travaux"],
  travaux: ["termine"],
  refuse: [],
  termine: [],
  annule: [],
};

// Statuts pour lesquels modifier les dates n'a plus d'effet sur le statut
// (copie de server/routes/tma.js, même raison : juste pour l'affichage).
export const STATUTS_NON_RECALCULABLES = ["travaux", "termine", "refuse", "annule"];
