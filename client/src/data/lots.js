export const STATUTS_LOT = {
  libre: "Libre",
  option: "Option",
  reserve: "Réservé",
  acte: "Acté",
};

// Ordre du cycle de vente — utilisé pour n'autoriser une date (option,
// réservation, acte) que si le statut a bien atteint (ou dépassé) cette
// étape. Remarque du 10/07/2026 : "il faut que la date affichée
// corresponde au statut du lot".
export const ORDRE_STATUTS = ["libre", "option", "reserve", "acte"];

// Liste fixe (enum Mongoose côté serveur, server/models/Lot.js) : les 8
// orientations n'ont pas de raison de varier d'un programme à l'autre,
// contrairement aux étages (programme.parametres.listeEtages).
export const ORIENTATIONS = [
  "Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ouest", "Ouest", "Nord-Ouest",
];
