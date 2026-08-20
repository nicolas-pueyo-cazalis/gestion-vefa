import mongoose from 'mongoose'

const appelDeFondsSchema = new mongoose.Schema({
  // `index: true` (21/07/2026, audit performance) : filtré à chaque
  // requête `{ lot: { $in: idsLots } }` (une par programme).
  lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true, index: true },
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
  // Distingue un règlement déduit automatiquement (acte signé après
  // l'attestation MOE, ou 1ère phase réglée à la date de réservation —
  // voir calculerEmissionAppel()) d'un vrai règlement saisi à la main
  // (13/07/2026, point 125) : sert à savoir, si la date/le statut du lot
  // qui a déclenché ce calcul est corrigé après coup, s'il faut annuler ce
  // règlement (déduction devenue caduque) ou le laisser tel quel (le
  // client a vraiment payé, peu importe la correction).
  regleAutomatiquement: { type: Boolean, default: false },
  // 20/07/2026, point 176 : libre, optionnel, propre à CETTE échéance
  // (pas au lot entier) — même principe que Lot.commentaire/Tma.commentaire.
  commentaire: String,
}, { timestamps: true })

export default mongoose.model('AppelDeFonds', appelDeFondsSchema)
