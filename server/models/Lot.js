import mongoose from 'mongoose'

const lotSchema = new mongoose.Schema({
  programme: { type: mongoose.Schema.Types.ObjectId, ref: 'Programme', required: true },
  reference: { type: String, required: true },
  etage: String,
  type: String,
  orientation: {
    type: String,
    enum: ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'],
  },
  surfaceHabitable: Number,
  // Plusieurs terrasses possibles par lot (remarque du 13/07/2026) — une
  // liste de surfaces plutôt qu'un seul nombre, contrairement à
  // parkings/caves ci-dessous : ce sont des m², pas des numéros
  // identifiants, donc pas de contrainte d'unicité (deux terrasses de
  // même surface sont possibles).
  surfacesTerrasses: [Number],
  surfaceJardin: Number,
  // Numéros identifiants (ex: place n°10), pas un simple compte — chaque
  // numéro doit être unique sur l'ensemble du programme (remarque du
  // 10/07/2026), donc on garde la liste plutôt qu'un total.
  parkings: [Number],
  caves: [Number],
  prixTTC: Number,
  statut: {
    type: String,
    enum: ['libre', 'option', 'reserve', 'acte'],
    default: 'libre',
  },
  dateOption: Date,
  dateReservation: Date,
  dateActe: Date,
  acquereur: { type: mongoose.Schema.Types.ObjectId, ref: 'Acquereur' },
  commentaire: String,
}, { timestamps: true })

export default mongoose.model('Lot', lotSchema)
