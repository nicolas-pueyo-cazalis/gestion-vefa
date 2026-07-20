import { useState } from 'react'
import { formatMontant } from '../utils/formatMontant.js'

// Modification du prix d'un logement (ou de l'annexe pour une vente
// d'annexe seule), intégrée au même panneau que le reste de l'édition
// (17/07/2026, remarque de Nicolas : un seul bouton "crayon", pas un
// bouton séparé — Paramètres ne sert plus qu'au paramétrage initial).
// Pas de <form> imbriqué (FormulaireEditionLot.jsx en a déjà un) : bouton
// "Enregistrer le prix" en type="button", géré à part du submit principal.
function FormulairePrixLot({ lot, onEnregistrer, onFermer }) {
  const [nouveauPrix, setNouveauPrix] = useState(lot.estAnnexeSeule ? (lot.prixTTC ?? '') : (lot.prixLogementSeul ?? ''))
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState('')

  async function enregistrer() {
    setErreur('')
    const message = await onEnregistrer(lot._id, { nouveauPrix: Number(nouveauPrix), motif })
    if (message) {
      setErreur(message)
      return
    }
    onFermer()
  }

  return (
    <fieldset className="fieldset-prix-lot">
      <legend>{lot.estAnnexeSeule ? "Prix de l'annexe" : 'Prix du logement'}</legend>
      <label>
        {lot.estAnnexeSeule ? "Nouveau prix de l'annexe (€)" : 'Nouveau prix du logement (€)'}
        <input
          type="number"
          step="0.01"
          value={nouveauPrix}
          onChange={(e) => setNouveauPrix(e.target.value)}
          required
        />
      </label>
      <label className="champ-description">
        Motif
        <input value={motif} onChange={(e) => setMotif(e.target.value)} required />
      </label>
      <p className="apercu-montant">Prix actuel : {formatMontant(lot.prixTTC ?? 0, 0)}</p>
      {erreur && <p className="erreur-champ">{erreur}</p>}
      <button type="button" onClick={enregistrer} disabled={!nouveauPrix || !motif}>
        Enregistrer le prix
      </button>
      <button type="button" onClick={onFermer}>Annuler</button>
    </fieldset>
  )
}

export default FormulairePrixLot
