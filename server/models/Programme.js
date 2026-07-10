import mongoose from 'mongoose'

const phaseSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  pourcentage: { type: Number, required: true }, // ex: 0.30 pour 30%
  ordre: { type: Number, required: true },
}, { _id: false })

const parametresSchema = new mongoose.Schema({
  baremePhases: {
    type: [phaseSchema],
    default: () => ([
      { nom: 'Réservation', pourcentage: 0.05, ordre: 1 },
      { nom: 'Achèvement des fondations', pourcentage: 0.30, ordre: 2 },
      { nom: "Mise hors d'eau", pourcentage: 0.25, ordre: 3 },
      { nom: "Mise hors d'air", pourcentage: 0.30, ordre: 4 },
      { nom: 'Achèvement des travaux', pourcentage: 0.05, ordre: 5 },
      { nom: 'Remise des clés', pourcentage: 0.05, ordre: 6 },
    ]),
  },
  delaiObtentionPretJours: { type: Number, default: 45 },
  delaiSignatureNotaireMois: { type: Number, default: 3 },
  delaiReglementAppelJours: { type: Number, default: 30 },
  delaiRetourEntrepriseTmaJours: { type: Number, default: 15 },
  tauxMargeTma: { type: Number, default: 1.3 },
  // Tous les montants stockés (prixTTC, montantEntreprises, montantClient...)
  // sont en TTC ; le HT se calcule à la volée (TTC / (1 + tauxTva)) quand
  // besoin, jamais stocké — voir "Convention monétaire" dans schema-donnees.md.
  tauxTva: { type: Number, default: 0.20 },
  regleMontantNegatifTma: {
    type: String,
    enum: ['montant_zero', 'avoir_sans_marge'],
    default: 'montant_zero',
  },
  listeEtages: {
    type: [String],
    default: () => (['R-1', 'RDJ', 'RDC', 'R+1', 'R+2', 'R+3', 'R+4', 'R+5', 'R+6', 'R+7', 'R+8']),
  },
}, { _id: false })

const programmeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  maitreOuvrage: String,
  adresse: String,
  commune: String,
  codePostal: String,
  nombreLogements: Number,
  dateLivraison: Date,
  parametres: { type: parametresSchema, default: () => ({}) },
}, { timestamps: true })

export default mongoose.model('Programme', programmeSchema)
