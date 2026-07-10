import { useState } from 'react'
import { formatMontant } from '../utils/formatMontant.js'

function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

function LigneEntreprise({ ligne, onEnregistrer, onSupprimer }) {
  const [enEdition, setEnEdition] = useState(false)
  const [montantDevis, setMontantDevis] = useState(ligne.montantDevis ?? '')
  const [dateRetour, setDateRetour] = useState(versDateInput(ligne.dateRetour))

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer(ligne._id, {
      montantDevis: montantDevis === '' ? null : Number(montantDevis),
      dateRetour: dateRetour || null,
    })
    setEnEdition(false)
  }

  if (enEdition) {
    return (
      <li>
        <form onSubmit={soumettre} className="ligne-entreprise-edition">
          <span>{ligne.corpsDeTravaux} — {ligne.entreprise.nom}</span>
          <label>
            Montant devis (€)
            <input
              type="number"
              step="0.01"
              value={montantDevis}
              onChange={(e) => setMontantDevis(e.target.value)}
            />
          </label>
          <label>
            Date de retour
            <input type="date" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)} />
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={() => setEnEdition(false)}>Annuler</button>
        </form>
      </li>
    )
  }

  return (
    <li>
      {ligne.corpsDeTravaux} — {ligne.entreprise.nom} —{' '}
      {ligne.montantDevis === null ? 'en attente de devis' : formatMontant(ligne.montantDevis)}
      <button type="button" onClick={() => setEnEdition(true)}>Modifier</button>
      <button type="button" onClick={() => onSupprimer(ligne._id)}>Retirer</button>
    </li>
  )
}

export default LigneEntreprise
