import mongoose from 'mongoose'

// Compteur générique à clé libre (21/07/2026, numérotation des devis TMA) —
// évite de créer une collection dédiée pour chaque nouveau besoin de
// numérotation auto-incrémentée. `valeur` s'incrémente de façon atomique
// (`findOneAndUpdate` + `$inc`), jamais lue puis réécrite à la main, pour
// éviter qu'une génération concurrente ne réutilise le même numéro.
const compteurSchema = new mongoose.Schema({
  cle: { type: String, required: true, unique: true },
  valeur: { type: Number, default: 0 },
})

export default mongoose.model('Compteur', compteurSchema)
