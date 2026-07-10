// Données fictives (aucune donnée réelle de client/programme).
export const LOTS = [
  { reference: "A01", etage: "RDC", type: "T2", orientation: "Sud", surfaceHabitable: 45, prixTTC: 210000, statut: "acte" },
  { reference: "A02", etage: "RDC", type: "T1", orientation: "Nord", surfaceHabitable: 32, prixTTC: 150000, statut: "libre" },
  { reference: "B01", etage: "R+1", type: "T3", orientation: "Sud-Est", surfaceHabitable: 68, prixTTC: 265000, statut: "reserve" },
  { reference: "B02", etage: "R+1", type: "T2", orientation: "Est", surfaceHabitable: 48, prixTTC: 198000, statut: "option" },
  { reference: "C01", etage: "R+2", type: "T4", orientation: "Sud-Ouest", surfaceHabitable: 92, prixTTC: 320000, statut: "acte" },
  { reference: "C02", etage: "R+2", type: "T1bis", orientation: "Ouest", surfaceHabitable: 34, prixTTC: 158000, statut: "libre" },
  { reference: "D01", etage: "R+3", type: "T3bis", orientation: "Sud", surfaceHabitable: 72, prixTTC: 275000, statut: "reserve" },
  { reference: "D02", etage: "R+3", type: "T2bis", orientation: "Nord-Est", surfaceHabitable: 50, prixTTC: 205000, statut: "option" },
];

export const STATUTS_LOT = {
  libre: "Libre",
  option: "Option",
  reserve: "Réservé",
  acte: "Acté",
};
