import mongoose from 'mongoose'

const tmaEntrepriseSchema = new mongoose.Schema({
  // `index: true` (21/07/2026, audit performance) : filtré à chaque
  // requête `?tma=<id>` (panneau "Entreprises concernées") et
  // `{ tma: { $in: ... } }` (une par programme).
  tma: { type: mongoose.Schema.Types.ObjectId, ref: 'Tma', required: true, index: true },
  entreprise: { type: mongoose.Schema.Types.ObjectId, ref: 'Entreprise', required: true },
  // Copie figée du corps de travaux de l'entreprise au moment de l'ajout —
  // même principe que AppelDeFonds.phase (docs/schema-donnees.md) : si le
  // référentiel Entreprise change plus tard, ça ne doit pas modifier
  // rétroactivement une ligne déjà créée.
  corpsDeTravaux: String,
  // Description libre de ce qui est demandé à CETTE entreprise (21/07/2026,
  // remarque de Nicolas) — distincte de `Tma.description` (la demande
  // globale du client) : une même TMA peut nécessiter des interventions
  // différentes selon l'entreprise sollicitée.
  description: String,
  dateEnvoi: { type: Date, default: Date.now },
  // Date à laquelle l'entreprise a effectivement répondu (devis reçu) —
  // distincte de dateEnvoi. Pas encore exploitée dans un calcul, gardée
  // pour le suivi/historique (remarque de Nicolas du 10/07/2026).
  dateRetour: Date,
  montantDevis: Number,
  statut: {
    type: String,
    enum: ['a_chiffrer', 'recu', 'valide', 'refuse', 'travaux', 'termine'],
    default: 'a_chiffrer',
  },
}, { timestamps: true })

export default mongoose.model('TmaEntreprise', tmaEntrepriseSchema)
