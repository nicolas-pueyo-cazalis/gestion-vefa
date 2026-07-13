import { useState } from 'react'

// Même conversion que pour les TMA/Lots : MongoDB renvoie
// "2026-07-01T00:00:00.000Z", <input type="date"> attend "2026-07-01".
function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

// L'attestation MOE ne se saisit plus ici (remarque du 11/07/2026) : elle
// se fait en masse, par phase, en haut de la page
// (FormulaireAttestationMasse.jsx) — plus cohérent puisqu'une attestation
// concerne le chantier entier, pas un lot en particulier. Cette ligne ne
// permet donc plus que de saisir le règlement.
function FormulaireAppelDeFonds({ appel, colonnes, onEnregistrer, onFermer }) {
  const [dateReglement, setDateReglement] = useState(versDateInput(appel.dateReglement))

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer(appel._id, { dateReglement: dateReglement || null })
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <form onSubmit={soumettre}>
          <label>
            Date de règlement
            <input
              type="date"
              value={dateReglement}
              onChange={(e) => setDateReglement(e.target.value)}
              disabled={!appel.dateEmission}
              title={appel.dateEmission ? '' : "L'appel n'est pas encore émis"}
            />
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={onFermer}>Annuler</button>
        </form>
      </td>
    </tr>
  )
}

export default FormulaireAppelDeFonds
