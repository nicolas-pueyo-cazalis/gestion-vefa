import mongoose from 'mongoose'

const tmaEntrepriseSchema = new mongoose.Schema({
  tma: { type: mongoose.Schema.Types.ObjectId, ref: 'Tma', required: true },
  corpsDeTravaux: String,
  entreprise: String,
  montantDevis: Number,
  statut: {
    type: String,
    enum: ['a_chiffrer', 'recu', 'valide', 'refuse', 'travaux', 'termine'],
    default: 'a_chiffrer',
  },
}, { timestamps: true })

export default mongoose.model('TmaEntreprise', tmaEntrepriseSchema)
