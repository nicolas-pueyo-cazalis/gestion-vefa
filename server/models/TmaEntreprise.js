import mongoose from 'mongoose'

const tmaEntrepriseSchema = new mongoose.Schema({
  tma: { type: mongoose.Schema.Types.ObjectId, ref: 'Tma', required: true },
  entreprise: { type: mongoose.Schema.Types.ObjectId, ref: 'Entreprise', required: true },
  // Copie figée du corps de travaux de l'entreprise au moment de l'ajout —
  // même principe que AppelDeFonds.phase (docs/schema-donnees.md) : si le
  // référentiel Entreprise change plus tard, ça ne doit pas modifier
  // rétroactivement une ligne déjà créée.
  corpsDeTravaux: String,
  dateEnvoi: { type: Date, default: Date.now },
  montantDevis: Number,
  statut: {
    type: String,
    enum: ['a_chiffrer', 'recu', 'valide', 'refuse', 'travaux', 'termine'],
    default: 'a_chiffrer',
  },
}, { timestamps: true })

export default mongoose.model('TmaEntreprise', tmaEntrepriseSchema)
