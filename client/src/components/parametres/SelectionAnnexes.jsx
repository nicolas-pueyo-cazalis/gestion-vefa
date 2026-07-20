import { formatMontant } from '../../utils/formatMontant.js'

// Choix des annexes d'un logement parmi le catalogue du programme
// (17/07/2026, point 165) — remplace l'ancienne saisie libre de numéros
// (ListeNumeros.jsx) : plus possible de créer un numéro à la volée depuis
// ce formulaire, il doit d'abord exister dans le catalogue (Paramètres >
// Annexes). N'affiche que les annexes encore libres, PLUS celles déjà
// attribuées à CE lot (`lotId`, absent = formulaire de création, aucune
// annexe encore attribuée à personne).
function SelectionAnnexes({ type, libelle, annexesDuType, lotId, selectionnees, onChange, disabled }) {
  const choix = annexesDuType.filter((a) => !a.lot || a.lot._id === lotId)

  function basculer(id) {
    onChange(
      selectionnees.includes(id)
        ? selectionnees.filter((s) => s !== id)
        : [...selectionnees, id],
    )
  }

  return (
    <fieldset className="fieldset-annexes">
      <legend>{libelle}</legend>
      {choix.length === 0 && <p>Aucune disponible — à créer dans Paramètres.</p>}
      <ul className="liste-choix-annexes">
        {choix.map((a) => (
          <li key={a._id}>
            <label className="champ-case-a-cocher">
              <input
                type="checkbox"
                checked={selectionnees.includes(a._id)}
                onChange={() => basculer(a._id)}
                disabled={disabled}
              />
              N°{a.numero} — {formatMontant(a.prix, 0)}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

export default SelectionAnnexes
