import { useState } from 'react'

function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

function FormulaireSignatureActe({ lot, colonnes, onEnregistrer, onFermer }) {
  const [dateActe, setDateActe] = useState(versDateInput(lot.dateActe))

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer(lot._id, dateActe)
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <form onSubmit={soumettre}>
          <label>
            Date de signature de l'acte
            <input
              type="date"
              value={dateActe}
              onChange={(e) => setDateActe(e.target.value)}
              required
            />
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={onFermer}>Annuler</button>
        </form>
      </td>
    </tr>
  )
}

export default FormulaireSignatureActe
