// Types d'annexes numérotées et prixées (17/07/2026, point 165) — miroir de
// l'enum Mongoose côté serveur (server/models/Annexe.js). Parkings
// extérieurs et intérieurs distingués (remarque de Nicolas) : deux
// catégories à part entière, chacune avec sa propre numérotation.
export const TYPES_ANNEXES = [
  { valeur: 'parking_ext', libelle: 'Parkings extérieurs' },
  { valeur: 'parking_int', libelle: 'Parkings intérieurs' },
  { valeur: 'cave', libelle: 'Caves' },
  { valeur: 'cellier', libelle: 'Celliers' },
]
