import mongoose from 'mongoose'
import contactSchema from './contactSchema.js'

const entrepriseSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true },
    corpsDeTravaux: { type: String, required: true }, // ex: "GROS OEUVRE", "ELECTRICITE"
    numeroLot: String, // n° du lot de travaux (ex: "01", "02"), saisi à la main
    contact: { type: contactSchema, default: () => ({}) },
  },
  { timestamps: true },
)

export default mongoose.model('Entreprise', entrepriseSchema)
