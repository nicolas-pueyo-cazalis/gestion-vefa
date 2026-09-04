import { formatMontant } from '../utils/formatMontant.js'

// Récapitulatif par lot de la page Appels de fonds (20/07/2026, remarque
// de Nicolas), extrait de AppelsDeFonds.jsx (03/09/2026, point 236,
// découpage) — vue d'ensemble du reste à payer logement par logement,
// indépendante des filtres du tableau détaillé de la page.
function RecapitulatifAppelsParLot({
  recapParLot,
  totalPrixTTCRecap,
  totalEmis,
  totalPaye,
  soldeRestant,
}) {
  return (
    <div className="tableau-scroll tableau-scroll--marge tableau-recap-par-lot">
      <table className="tableau-lots">
        <thead>
          <tr>
            <th>Lot</th>
            <th className="colonne-montant">Prix TTC</th>
            <th className="colonne-montant">Total émis</th>
            <th className="colonne-montant">Total payé</th>
            <th className="colonne-montant">Reste à payer</th>
          </tr>
        </thead>
        <tbody>
          {recapParLot.length === 0 && (
            <tr>
              <td colSpan={5}>Aucun appel de fonds pour l'instant.</td>
            </tr>
          )}
          {recapParLot.map(({ lot, totalEmis: emisLot, totalPaye: payeLot }) => (
            <tr key={lot._id}>
              <td>{lot.reference}</td>
              <td className="colonne-montant">{formatMontant(lot.prixTTC)}</td>
              <td className="colonne-montant">{formatMontant(emisLot)}</td>
              <td className="colonne-montant">{formatMontant(payeLot)}</td>
              <td className="colonne-montant">{formatMontant(lot.prixTTC - payeLot)}</td>
            </tr>
          ))}
        </tbody>
        {recapParLot.length > 0 && (
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="colonne-montant">{formatMontant(totalPrixTTCRecap)}</td>
              <td className="colonne-montant">{formatMontant(totalEmis)}</td>
              <td className="colonne-montant">{formatMontant(totalPaye)}</td>
              <td className="colonne-montant">{formatMontant(soldeRestant)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export default RecapitulatifAppelsParLot
