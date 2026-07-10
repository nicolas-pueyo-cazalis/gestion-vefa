import mongoose from 'mongoose'
import contactSchema from './contactSchema.js'

const entrepriseSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  corpsDeTravaux: { type: String, required: true }, // ex: "GROS OEUVRE", "ELECTRICITE"
  contact: { type: contactSchema, default: () => ({}) },
}, { timestamps: true })

export default mongoose.model('Entreprise', entrepriseSchema)
