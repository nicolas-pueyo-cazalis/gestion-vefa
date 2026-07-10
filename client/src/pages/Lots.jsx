import { useState } from 'react'
import { LOTS, STATUTS_LOT } from '../data/lots.js'
import { formatMontant } from '../utils/formatMontant.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(STATUTS_LOT).map(([valeur, libelle]) => ({ valeur, libelle })),
]

function Lots() {
  const [statutActif, setStatutActif] = useState('tous')

  const lotsFiltres =
    statutActif === 'tous' ? LOTS : LOTS.filter((lot) => lot.statut === statutActif)

  const parStatut = Object.keys(STATUTS_LOT).reduce((compte, statut) => {
    compte[statut] = LOTS.filter((lot) => lot.statut === statut).length
    return compte
  }, {})

  const caActe = LOTS.filter((lot) => lot.statut === 'acte').reduce(
    (somme, lot) => somme + lot.prixTTC,
    0,
  )

  return (
    <>
      <h1 className="titre-page">Tableau de bord des lots</h1>

      <section className="stats">
        <StatCard valeur={LOTS.length} libelle="Lots au total" />
        <StatCard valeur={parStatut.acte} libelle="Actés" />
        <StatCard valeur={parStatut.reserve} libelle="Réservés" />
        <StatCard valeur={parStatut.libre} libelle="Libres" />
        <StatCard valeur={formatMontant(caActe)} libelle="CA acté" />
      </section>

      <FiltreStatuts statuts={STATUTS_FILTRE} actif={statutActif} onChange={setStatutActif} />

      <table>
        <thead>
          <tr>
            <th>Lot</th>
            <th>Étage</th>
            <th>Type</th>
            <th>Orientation</th>
            <th>Surface</th>
            <th>Prix TTC</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {lotsFiltres.map((lot) => (
            <tr key={lot.reference}>
              <td>{lot.reference}</td>
              <td>{lot.etage}</td>
              <td>{lot.type}</td>
              <td>{lot.orientation}</td>
              <td>{lot.surfaceHabitable} m²</td>
              <td>{formatMontant(lot.prixTTC)}</td>
              <td><Badge statut={lot.statut} texte={STATUTS_LOT[lot.statut]} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export default Lots
