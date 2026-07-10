import mongoose from 'mongoose'
import contactSchema, { EMAIL_REGEX } from './contactSchema.js'

const acquereurSchema = new mongoose.Schema({
  lots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lot' }],
  civilite: { type: String, enum: ['M.', 'Mme', 'M. et Mme'] },
  nom: { type: String, required: true },
  prenom: String,
  adresse: String,
  commune: String,
  codePostal: String,
  telephone: String,
  email: { type: String, match: EMAIL_REGEX },
  banque: contactSchema,
  courtier: contactSchema,
  offrePretRecue: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('Acquereur', acquereurSchema)
