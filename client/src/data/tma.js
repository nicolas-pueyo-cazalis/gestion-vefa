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
};

// "facture" est classé "en cours" : le client n'a pas encore donné son
// accord final (décision du 10/07/2026, révisée par rapport au 09/07).
export const STATUTS_EN_COURS = ["demande", "etude", "chiffre", "facture"];
export const STATUTS_VALIDE = ["valide", "travaux", "termine"];
