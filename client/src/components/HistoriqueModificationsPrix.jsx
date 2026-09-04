import { formatMontant } from '../utils/formatMontant.js'
import { formatDate } from '../utils/statuts.js'

// Table "Modifications de prix" de l'historique fusionné de la page Lots
// (17/07/2026, remarque de Nicolas), extraite de Lots.jsx (04/09/2026,
// point 236, découpage) — table plate, aucune interactivité, aucune
// dépendance à un helper de Lots.jsx.
function HistoriqueModificationsPrix({ historiqueModificationsPrix }) {
  return (
    <>
      <h3>Modifications de prix</h3>
      <div className="tableau-scroll tableau-scroll--marge">
        <table className="tableau-lots">
          <thead>
            <tr>
              <th>Logement</th>
              <th className="colonne-montant">Ancien prix</th>
              <th className="colonne-montant">Nouveau prix</th>
              <th>Motif</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {historiqueModificationsPrix.length === 0 && (
              <tr>
                <td colSpan={5}>Aucune modification de prix pour l'instant.</td>
              </tr>
            )}
            {historiqueModificationsPrix.map((entree) => (
              <tr key={entree._id}>
                <td>{entree.referenceLot}</td>
                <td className="colonne-montant">{formatMontant(entree.ancienPrix)}</td>
                <td className="colonne-montant">{formatMontant(entree.nouveauPrix)}</td>
                <td>
                  <span className="commentaire-cellule">{entree.motif}</span>
                </td>
                <td>{formatDate(entree.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default HistoriqueModificationsPrix
