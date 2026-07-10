import mongoose from 'mongoose'

// Machine à états de TMA.statut (docs/schema-donnees.md). Pour chaque statut
// actuel, la liste des statuts vers lesquels on a le droit de passer — un
// enum Mongoose seul ne suffit pas à empêcher de sauter une étape, cette
// règle doit être vérifiée explicitement dans les routes.
export const TRANSITIONS_AUTORISEES = {
  demande: ['etude', 'refuse'],
  etude: ['chiffre', 'refuse'],
  chiffre: ['facture', 'refuse'],
  facture: ['valide', 'refuse'],
  valide: ['travaux'],
  travaux: ['termine'],
  refuse: [],
  termine: [],
}

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
    enum: ['demande', 'etude', 'chiffre', 'facture', 'valide', 'refuse', 'travaux', 'termine'],
    default: 'demande',
  },
  // Mémorise le statut juste avant un refus, pour pouvoir y revenir
  // exactement (ex: annuler un refus par erreur au stade "facture" doit
  // ramener à "facture", pas repartir de zéro).
  statutAvantRefus: {
    type: String,
    enum: ['demande', 'etude', 'chiffre', 'facture'],
  },
}, { timestamps: true })

export default mongoose.model('Tma', tmaSchema)
