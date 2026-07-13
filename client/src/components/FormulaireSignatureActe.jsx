import { useState } from 'react'
import ChampsContact from './ChampsContact.jsx'

function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

// Le notaire (remarque du 13/07/2026, point 1) est rattaché à l'acquéreur
// (comme banque/courtier) — ce champ ne s'affiche donc que si le lot a déjà
// un acquéreur lié ; sans acquéreur, seule la date de signature a un sens.
function FormulaireSignatureActe({ lot, colonnes, onEnregistrer, onFermer }) {
  const [dateActe, setDateActe] = useState(versDateInput(lot.dateActe))
  const [notaire, setNotaire] = useState(lot.acquereur?.notaire ?? {})
  const [notaireValide, setNotaireValide] = useState(true)

  function soumettre(evenement) {
    evenement.preventDefault()
    if (!notaireValide) return
    onEnregistrer(lot, { dateActe, notaire })
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <form onSubmit={soumettre} className="formulaire-contacts">
          <label>
            Date de signature de l'acte
            <input
              type="date"
              value={dateActe}
              onChange={(e) => setDateActe(e.target.value)}
              required
            />
          </label>
          {lot.acquereur && (
            <ChampsContact titre="Notaire" valeur={notaire} onChange={setNotaire} onValiditeChange={setNotaireValide} />
          )}
          <div className="boutons-alignes-champs">
            <button type="submit">Enregistrer</button>
            <button type="button" onClick={onFermer}>Annuler</button>
          </div>
        </form>
      </td>
    </tr>
  )
}

export default FormulaireSignatureActe
