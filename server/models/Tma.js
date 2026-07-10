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

// Calcule automatiquement le statut d'une TMA à partir de ses dates et de
// son montant entreprises, sur le même principe que la formule Excel
// d'origine (docs/analyse-excel.md) — adapté au nouvel ordre
// chiffre → facture → valide. Ne couvre que la portion "date-driven" du
// cycle : au-delà de "valide" (travaux/termine) et pour "refuse", le
// statut reste une action manuelle (voir TRANSITIONS_AUTORISEES).
export function calculerStatutAutomatique(tma) {
  if (tma.dateRetourClient) return 'valide'
  if (tma.dateEnvoiFactureClient) return 'facture'
  if (tma.montantEntreprises !== null && tma.montantEntreprises !== undefined) return 'chiffre'
  if (tma.dateEnvoiEntreprises) return 'etude'
  return 'demande'
}

// Programme.parametres.tauxMargeTma / regleMontantNegatifTma
// (docs/schema-donnees.md). Simplification actuelle : valeurs par défaut en
// dur, pas encore lues sur le vrai programme (un seul programme pour
// l'instant) — à corriger si l'appli devient multi-programmes.
export function calculerMontantClient(montantEntreprises) {
  if (montantEntreprises === null || montantEntreprises === undefined) return null
  if (montantEntreprises < 0) return 0
  return montantEntreprises * 1.3
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
