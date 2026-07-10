import mongoose from 'mongoose'

const tmaSchema = new mongoose.Schema({
  lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true },
  acquereur: { type: mongoose.Schema.Types.ObjectId, ref: 'Acquereur', required: true },
  localisation: String,
  description: String,
  dateDemande: Date,
  dateEnvoiEntreprises: Date,
  priorite: { type: String, enum: ['basse', 'moyenne', 'haute'] },
  montantEntreprises: Number,
  montantClient: Number,
  dateEnvoiFactureClient: Date,
  dateRetourClient: Date,
  statut: {
    type: String,
    enum: ['demande', 'etude', 'chiffre', 'valide', 'refuse', 'facture', 'travaux', 'termine'],
    default: 'demande',
  },
}, { timestamps: true })

export default mongoose.model('Tma', tmaSchema)
