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
  delaiReponseFactureTmaJours: { type: Number, default: 15 }, // délai client pour valider/refuser une facture TMA
  tauxMargeTma: { type: Number, default: 1.3 },
  // 20/07/2026, point 173 : si activé, montantClient ne se pré-remplit plus
  // automatiquement via tauxMargeTma (voir recalculerTma,
  // routes/tmaEntreprises.js) — saisi à la main sur chaque TMA à la place.
  montantClientSaisiManuellement: { type: Boolean, default: false },
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
  // Fenêtre d'alertes au démarrage (AlerteRetards.jsx, 17/07/2026, point
  // 137) : un interrupteur général, plus un par type de retard — coupé
  // globalement OU juste sur un type, sans jamais supprimer le suivi
  // sous-jacent (les pages concernées restent inchangées).
  alertesActivees: { type: Boolean, default: true },
  alertesActivesParType: {
    pret: { type: Boolean, default: true },
    signature: { type: Boolean, default: true },
    appelsDeFonds: { type: Boolean, default: true },
    entreprisesTma: { type: Boolean, default: true },
    facturesTma: { type: Boolean, default: true },
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
