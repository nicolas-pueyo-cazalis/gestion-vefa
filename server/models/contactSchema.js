import mongoose from 'mongoose'

// Sous-schéma réutilisable pour toute entité qui n'a besoin que de
// coordonnées simples (pas un modèle à part entière) : banque/courtier
// sur Acquereur, et l'Entreprise du référentiel TMA.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const contactSchema = new mongoose.Schema({
  nom: String,
  adresse: String,
  commune: String,
  codePostal: String,
  telephone: String, // format international E.164, ex: "+33612345678"
  email: { type: String, match: EMAIL_REGEX },
}, { _id: false })

export default contactSchema
