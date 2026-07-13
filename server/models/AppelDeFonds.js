import mongoose from 'mongoose'

const appelDeFondsSchema = new mongoose.Schema({
  lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true },
  // Copie figée de la phase au moment de l'émission (docs/schema-donnees.md) :
  // le barème du programme peut changer après coup, un appel déjà émis ne
  // doit pas être recalculé rétroactivement.
  phase: {
    nom: { type: String, required: true },
    pourcentage: { type: Number, required: true },
    // Figé lui aussi (11/07/2026) : si le barème du programme est réordonné
    // après coup, l'ordre d'affichage d'un appel déjà généré ne doit pas
    // changer rétroactivement — même raisonnement que nom/pourcentage.
    ordre: { type: Number, required: true },
  },
  montant: { type: Number, required: true },
  dateAttestationMOE: Date,
  dateEmission: Date,
  dateLimiteReglement: Date,
  dateReglement: Date,
}, { timestamps: true })

export default mongoose.model('AppelDeFonds', appelDeFondsSchema)
