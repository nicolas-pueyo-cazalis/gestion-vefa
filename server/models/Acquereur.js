import mongoose from 'mongoose'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const contactSchema = new mongoose.Schema({
  nom: String,
  adresse: String,
  commune: String,
  codePostal: String,
  telephone: String, // format international E.164, ex: "+33612345678"
  email: { type: String, match: EMAIL_REGEX },
}, { _id: false })

const acquereurSchema = new mongoose.Schema({
  lots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lot' }],
  civilite: { type: String, enum: ['M.', 'Mme', 'M. et Mme'] },
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
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
