// Données fictives (aucune donnée réelle de client/programme).
export const TMA_LIST = [
  { lot: "A01", client: "M. et Mme Duprat", localisation: "Cuisine", description: "Ajout d'une prise électrique", montantEntreprises: 85, statut: "valide" },
  { lot: "A01", client: "M. et Mme Duprat", localisation: "Séjour", description: "Suppression du parquet (remplacé par du carrelage)", montantEntreprises: -320, statut: "facture" },
  { lot: "B01", client: "Mme Lopez", localisation: "Salle de bain", description: "Remplacement de la baignoire par une douche", montantEntreprises: 650, statut: "chiffre" },
  { lot: "C01", client: "M. Ferreira", localisation: "Chambre 1", description: "Ouverture entre chambre et dressing", montantEntreprises: null, statut: "etude" },
  { lot: "D01", client: "M. et Mme Aldana", localisation: "Garage", description: "Ajout d'une motorisation de portail", montantEntreprises: null, statut: "demande" },
  { lot: "B02", client: "Mme Etchegoin", localisation: "Séjour", description: "Suppression de la cheminée", montantEntreprises: 400, statut: "refuse" },
  { lot: "A01", client: "M. et Mme Duprat", localisation: "Terrasse", description: "Pose de stores extérieurs", montantEntreprises: 900, statut: "travaux" },
  { lot: "C01", client: "M. Ferreira", localisation: "Cuisine", description: "Ajout d'un îlot central", montantEntreprises: 2100, statut: "termine" },
];

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

export const STATUTS_EN_COURS = ["demande", "etude", "chiffre"];
export const STATUTS_VALIDE = ["valide", "travaux", "termine"]; // volontairement sans "facture"

// Paramètre du programme (docs/schema-donnees.md, Programme.parametres).
const TAUX_MARGE_TMA = 1.3;

export function calculerMontantClient(montantEntreprises) {
  if (montantEntreprises === null) return null; // pas encore chiffré
  if (montantEntreprises < 0) return 0; // règle "montant_zero"
  return montantEntreprises * TAUX_MARGE_TMA;
}
