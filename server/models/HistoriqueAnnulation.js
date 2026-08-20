import mongoose from 'mongoose'
import contactSchema from './contactSchema.js'

// Snapshot d'un appel de fonds déjà généré au moment de l'annulation
// (13/07/2026, point 2) — les AppelDeFonds vivants sont supprimés (sinon
// une revente future du même lot ne regénérerait jamais rien, voir
// genererAppelsDeFonds dans routes/lots.js), leur contenu est donc copié
// ici pour rester consultable dans l'historique.
const appelSnapshotSchema = new mongoose.Schema({
  phase: { nom: String, pourcentage: Number },
  montant: Number,
  dateEmission: Date,
  dateAttestationMOE: Date,
  dateLimiteReglement: Date,
  dateReglement: Date,
}, { _id: false })

// Trace d'une vente annulée (13/07/2026, points 117+118, 2e refonte) — le
// logement lui-même repart à zéro sur l'interface principale (statut
// "Libre", plus aucune info de vente), mais tout ce qui était renseigné
// avant l'annulation reste consultable ici, sur une page distincte plutôt
// que via un filtre du tableau des lots. Client/prêt/acte sont des COPIES
// (pas juste une référence à l'acquéreur) : l'acquéreur peut être
// supprimé après l'annulation (s'il n'a plus aucun autre lot), l'historique
// doit rester lisible malgré tout. Seules les TMA ne sont pas dupliquées
// ici (voir point 133) : elles restent vivantes sur leur propre page,
// signalées par un avertissement plutôt que déplacées.
const historiqueAnnulationSchema = new mongoose.Schema({
  lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true },
  // `index: true` (21/07/2026, audit performance) : filtré directement par
  // `?programme=<id>` (route dédiée, `historiqueAnnulations.js`).
  programme: { type: mongoose.Schema.Types.ObjectId, ref: 'Programme', required: true, index: true },
  referenceLot: { type: String, required: true },
  statutAvantAnnulation: {
    type: String,
    enum: ['option', 'reserve', 'acte'],
    required: true,
  },
  dateOption: Date,
  dateReservation: Date,
  dateActe: Date,
  commentaire: String,
  dateAnnulation: { type: Date, default: Date.now },

  civiliteClient: String,
  nomClient: String,
  prenomClient: String,

  banque: contactSchema,
  courtier: contactSchema,
  dateOffrePretRecue: Date,
  sansPret: Boolean,

  notaire: contactSchema,

  appelsDeFonds: [appelSnapshotSchema],
}, { timestamps: true })

export default mongoose.model('HistoriqueAnnulation', historiqueAnnulationSchema)
