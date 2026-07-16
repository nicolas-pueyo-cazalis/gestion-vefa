import { useState } from 'react'
import { formatMontant } from '../utils/formatMontant.js'

// Ajuste le barème d'UN logement en particulier (13/07/2026, demande de
// Nicolas : une négociation directe avec un client peut donner un
// découpage différent du barème général — verrouillé côté Paramètres dès
// qu'un appel est émis, voir point 123). Mêmes phases que celles déjà
// générées pour ce lot (pas d'ajout/retrait ici, contrairement au barème
// général) : seul le % de chacune se corrige, avec le même contrôle
// "total = 100%" que SectionBareme.jsx.
function FormulaireBaremeLot({ lotId, prixTTC, appels, colonnes, onEnregistrer, onFermer }) {
  const [pourcentages, setPourcentages] = useState(
    Object.fromEntries(appels.map((a) => [a._id, Math.round(a.phase.pourcentage * 100)])),
  )

  const totalPourcent = Object.values(pourcentages).reduce((somme, v) => somme + Number(v), 0)

  function modifier(id, valeur) {
    setPourcentages({ ...pourcentages, [id]: valeur })
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    if (totalPourcent !== 100) {
      alert(`La somme des pourcentages doit faire 100% (actuellement ${totalPourcent}%).`)
      return
    }
    const phases = appels.map((a) => ({ id: a._id, pourcentage: Number(pourcentages[a._id]) / 100 }))
    onEnregistrer(lotId, phases)
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <form onSubmit={soumettre} className="formulaire-bareme-lot">
          {appels.map((appel) => (
            <label key={appel._id}>
              {appel.phase.nom}
              <input
                type="number"
                step="1"
                value={pourcentages[appel._id]}
                onChange={(e) => modifier(appel._id, e.target.value)}
              />
              <span className="apercu-montant">
                = {formatMontant(prixTTC * (Number(pourcentages[appel._id] || 0) / 100), 0)}
              </span>
            </label>
          ))}
          <p className={totalPourcent === 100 ? 'total-ok' : 'total-erreur'}>
            Total : {totalPourcent}% {totalPourcent !== 100 && '— doit faire 100%'}
          </p>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={onFermer}>Annuler</button>
        </form>
      </td>
    </tr>
  )
}

export default FormulaireBaremeLot
