import mongoose from 'mongoose'

// Historique des modifications de prix d'un lot (17/07/2026, point 169) —
// une négociation ou réévaluation avant l'Acté (plus possible après, voir
// routes/lots.js) doit toujours être motivée et laisser une trace, plutôt
// que d'écraser silencieusement l'ancien prix. `referenceLot` dupliqué
// (comme HistoriqueAnnulation.referenceLot) pour rester lisible même si le
// lot est supprimé par la suite (cas d'une vente d'annexe annulée).
const historiqueModificationPrixSchema = new mongoose.Schema(
  {
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true },
    // `index: true` (21/07/2026, audit performance) : filtré directement par
    // `?programme=<id>` (route dédiée, `historiqueModificationsPrix.js`).
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programme',
      required: true,
      index: true,
    },
    referenceLot: { type: String, required: true },
    ancienPrix: { type: Number, required: true },
    nouveauPrix: { type: Number, required: true },
    motif: { type: String, required: true },
  },
  { timestamps: true },
)

export default mongoose.model('HistoriqueModificationPrix', historiqueModificationPrixSchema)
