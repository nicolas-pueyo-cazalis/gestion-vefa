import mongoose from 'mongoose'

// Catalogue d'annexes numérotées et prixées, propre à chaque programme
// (17/07/2026, point 165) — remplace l'ancienne saisie libre de numéros
// (Lot.parkings/caves/celliers, simples tableaux de nombres sans prix).
// `lot: null` = annexe encore disponible, pas encore attribuée à un
// logement ; `lot` renseigné = vendue avec ce lot (voir server/routes/
// lots.js, qui recalcule alors Lot.prixTTC à partir de Lot.prixLogementSeul
// + la somme des annexes qui lui sont attribuées).
const annexeSchema = new mongoose.Schema(
  {
    programme: { type: mongoose.Schema.Types.ObjectId, ref: 'Programme', required: true },
    // Parkings extérieurs et intérieurs distingués (17/07/2026, remarque de
    // Nicolas) — deux catégories à part entière, chacune avec sa propre
    // numérotation et son propre prix, pas une simple info complémentaire
    // sur un même "parking".
    type: { type: String, enum: ['parking_ext', 'parking_int', 'cave', 'cellier'], required: true },
    numero: { type: Number, required: true },
    prix: { type: Number, required: true },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', default: null },
  },
  { timestamps: true },
)

// Un même numéro ne peut pas être utilisé deux fois pour le même type au
// sein d'un programme (même règle que l'ancienne saisie libre).
annexeSchema.index({ programme: 1, type: 1, numero: 1 }, { unique: true })

export default mongoose.model('Annexe', annexeSchema)
