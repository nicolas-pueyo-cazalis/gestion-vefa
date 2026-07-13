import { useState } from 'react'

function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

function FormulaireSuiviPret({ acquereur, colonnes, onEnregistrer, onFermer }) {
  const [banque, setBanque] = useState(acquereur.banque?.nom ?? '')
  const [courtier, setCourtier] = useState(acquereur.courtier?.nom ?? '')
  const [dateOffrePretRecue, setDateOffrePretRecue] = useState(versDateInput(acquereur.dateOffrePretRecue))

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer(acquereur._id, {
      banque: banque ? { nom: banque } : null,
      courtier: courtier ? { nom: courtier } : null,
      dateOffrePretRecue: dateOffrePretRecue || null,
    })
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <form onSubmit={soumettre}>
          <label>
            Banque
            <input value={banque} onChange={(e) => setBanque(e.target.value)} />
          </label>
          <label>
            Courtier
            <input value={courtier} onChange={(e) => setCourtier(e.target.value)} />
          </label>
          <label>
            Offre de prêt reçue le
            <input
              type="date"
              value={dateOffrePretRecue}
              onChange={(e) => setDateOffrePretRecue(e.target.value)}
            />
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={onFermer}>Annuler</button>
        </form>
      </td>
    </tr>
  )
}

export default FormulaireSuiviPret
