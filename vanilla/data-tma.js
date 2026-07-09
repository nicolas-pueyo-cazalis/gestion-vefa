// Données fictives de demandes de TMA, reliées aux lots de data.js par
// leur référence. Le taux de marge (1.3) et la règle "montant client = 0€
// si montant entreprise négatif" viennent de programme.parametres
// (docs/schema-donnees.md) — ici recopiés en dur puisqu'il n'y a pas encore
// de backend pour les lire dynamiquement.

const TMA_LIST = [
  {
    lot: "A01",
    client: "M. et Mme Duprat",
    localisation: "Cuisine",
    description: "Ajout d'une prise électrique",
    montantEntreprises: 85,
    statut: "valide",
  },
  {
    lot: "A01",
    client: "M. et Mme Duprat",
    localisation: "Séjour",
    description: "Suppression du parquet (remplacé par du carrelage)",
    montantEntreprises: -320,
    statut: "facture",
  },
  {
    lot: "B01",
    client: "Mme Lopez",
    localisation: "Salle de bain",
    description: "Remplacement de la baignoire par une douche",
    montantEntreprises: 650,
    statut: "chiffre",
  },
  {
    lot: "C01",
    client: "M. Ferreira",
    localisation: "Chambre 1",
    description: "Ouverture entre chambre et dressing",
    montantEntreprises: null,
    statut: "etude",
  },
  {
    lot: "D01",
    client: "M. et Mme Aldana",
    localisation: "Garage",
    description: "Ajout d'une motorisation de portail",
    montantEntreprises: null,
    statut: "demande",
  },
  {
    lot: "B02",
    client: "Mme Etchegoin",
    localisation: "Séjour",
    description: "Suppression de la cheminée",
    montantEntreprises: 400,
    statut: "refuse",
  },
  {
    lot: "A01",
    client: "M. et Mme Duprat",
    localisation: "Terrasse",
    description: "Pose de stores extérieurs",
    montantEntreprises: 900,
    statut: "travaux",
  },
  {
    lot: "C01",
    client: "M. Ferreira",
    localisation: "Cuisine",
    description: "Ajout d'un îlot central",
    montantEntreprises: 2100,
    statut: "termine",
  },
];
