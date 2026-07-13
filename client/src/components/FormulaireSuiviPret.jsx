import { useState } from 'react'
import ChampsContact from './ChampsContact.jsx'

function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

// Coordonnées complètes (13/07/2026, remarque 1) : banque et courtier ne
// sont plus qu'un nom, mais un vrai contact (adresse, téléphone, email...),
// consultable ensuite via la fenêtre ouverte par BoutonContact, et
// disponible pour un futur export PDF.
function FormulaireSuiviPret({ acquereur, colonnes, onEnregistrer, onFermer }) {
  const [banque, setBanque] = useState(acquereur.banque ?? {})
  const [courtier, setCourtier] = useState(acquereur.courtier ?? {})
  const [dateOffrePretRecue, setDateOffrePretRecue] = useState(versDateInput(acquereur.dateOffrePretRecue))
  const [banqueValide, setBanqueValide] = useState(true)
  const [courtierValide, setCourtierValide] = useState(true)

  function soumettre(evenement) {
    evenement.preventDefault()
    // Ne pas enregistrer silencieusement une saisie invalide (ex: téléphone
    // incomplet) — les messages d'erreur sont déjà affichés sous les champs
    // concernés par ChampsContact, il suffit de bloquer l'envoi.
    if (!banqueValide || !courtierValide) return
    onEnregistrer(acquereur._id, {
      banque,
      courtier,
      dateOffrePretRecue: dateOffrePretRecue || null,
    })
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <form onSubmit={soumettre} className="formulaire-contacts">
          <ChampsContact titre="Banque" valeur={banque} onChange={setBanque} onValiditeChange={setBanqueValide} />
          <ChampsContact titre="Courtier" valeur={courtier} onChange={setCourtier} onValiditeChange={setCourtierValide} />
          <label>
            Offre de prêt reçue le
            <input
              type="date"
              value={dateOffrePretRecue}
              onChange={(e) => setDateOffrePretRecue(e.target.value)}
            />
          </label>
          <div className="boutons-alignes-champs">
            <button type="submit">Enregistrer</button>
            <button type="button" onClick={onFermer}>Annuler</button>
          </div>
        </form>
      </td>
    </tr>
  )
}

export default FormulaireSuiviPret
