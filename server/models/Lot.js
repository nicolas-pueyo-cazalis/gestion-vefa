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
  surfaceTerrasse: Number,
  surfaceJardin: Number,
  parkings: Number,
  caves: Number,
  prixTTC: Number,
  statut: {
    type: String,
    enum: ['libre', 'option', 'reserve', 'acte'],
    default: 'libre',
  },
  dateOption: Date,
  dateReservation: Date,
  dateActe: Date,
}, { timestamps: true })

export default mongoose.model('Lot', lotSchema)
