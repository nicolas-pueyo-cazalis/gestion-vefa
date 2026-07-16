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
  // Terrasse/Balcon/Loggia séparés en catégories distinctes (remarque du
  // 13/07/2026, point 156 — auparavant fusionnés "Terrasses/Balcons").
  // Plusieurs valeurs possibles par catégorie et par lot — une liste de
  // surfaces plutôt qu'un seul nombre, contrairement à parkings/caves
  // ci-dessous : ce sont des m², pas des numéros identifiants, donc pas
  // de contrainte d'unicité (deux terrasses de même surface sont possibles).
  surfacesTerrasses: [Number],
  surfacesBalcons: [Number],
  surfacesLoggias: [Number],
  surfaceJardin: Number,
  // Numéros identifiants (ex: place n°10), pas un simple compte — chaque
  // numéro doit être unique sur l'ensemble du programme (remarque du
  // 10/07/2026), donc on garde la liste plutôt qu'un total. Cave et
  // Cellier séparés en catégories distinctes (13/07/2026, point 156 —
  // auparavant fusionnés "Caves/Celliers"), chacune avec sa propre
  // contrainte d'unicité (comme parkings), indépendante de l'autre.
  parkings: [Number],
  caves: [Number],
  celliers: [Number],
  prixTTC: Number,
  // Pas de statut "annulé" ici (13/07/2026, points 117+118, 2e refonte) :
  // "Annuler la vente" (voir routes/lots.js) fait repartir ce lot à zéro
  // ("Libre", comme neuf) et déplace l'ancien statut/dates/client/
  // commentaire vers HistoriqueAnnulation.js — une page à part, pas un
  // statut de plus ici, pour que le tableau des lots ne montre à tout
  // instant que des logements réellement à vendre ou vendus.
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
