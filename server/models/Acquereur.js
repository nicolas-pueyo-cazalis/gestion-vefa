import mongoose from 'mongoose'
import contactSchema, { EMAIL_REGEX } from './contactSchema.js'

const acquereurSchema = new mongoose.Schema(
  {
    lots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lot' }],
    civilite: { type: String, enum: ['M.', 'Mme', 'M. et Mme'] },
    nom: { type: String, required: true },
    prenom: String,
    adresse: String,
    commune: String,
    codePostal: String,
    telephone: String,
    email: { type: String, match: EMAIL_REGEX },
    banque: contactSchema,
    courtier: contactSchema,
    notaire: contactSchema, // ajouté le 13/07/2026, page "Signature acte"
    // Remplace l'ancien booléen `offrePretRecue` (13/07/2026) : comme pour
    // TmaEntreprise.dateRetour, c'est un fait qui ne peut pas se déduire
    // d'ailleurs (personne ne peut savoir automatiquement quand la banque a
    // répondu), donc une vraie date saisie à la main plutôt qu'une simple
    // case à cocher — ça permet en plus de savoir si l'offre est arrivée
    // avant ou après la date limite (page "Suivi de prêt").
    dateOffrePretRecue: Date,
    // Acquisition sans financement bancaire (13/07/2026) : contrairement au
    // reste de l'appli, ça ne se déduit d'aucune date — c'est un fait déclaré
    // une fois pour toutes par le bouton "Sans prêt" (page "Suivi de prêt"),
    // qui vide au passage banque/courtier/dateOffrePretRecue.
    sansPret: { type: Boolean, default: false },
    // 20/07/2026, point 176 : libre, optionnel, même principe que
    // Lot.commentaire/Tma.commentaire.
    commentaire: String,
  },
  { timestamps: true },
)

export default mongoose.model('Acquereur', acquereurSchema)
