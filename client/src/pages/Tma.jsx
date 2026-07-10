import { useState } from 'react'
import {
  TMA_LIST,
  STATUTS_TMA,
  STATUTS_EN_COURS,
  STATUTS_VALIDE,
  calculerMontantClient,
} from '../data/tma.js'
import { formatMontant } from '../utils/formatMontant.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(STATUTS_TMA).map(([valeur, libelle]) => ({ valeur, libelle })),
]

function Tma() {
  const [statutActif, setStatutActif] = useState('tous')

  const tmaFiltrees =
    statutActif === 'tous' ? TMA_LIST : TMA_LIST.filter((tma) => tma.statut === statutActif)

  const validees = TMA_LIST.filter((t) => STATUTS_VALIDE.includes(t.statut)).length
  const enCours = TMA_LIST.filter((t) => STATUTS_EN_COURS.includes(t.statut)).length
  const refusees = TMA_LIST.filter((t) => t.statut === 'refuse').length
  const montantValide = TMA_LIST.filter((t) => STATUTS_VALIDE.includes(t.statut)).reduce(
    (somme, t) => somme + calculerMontantClient(t.montantEntreprises),
    0,
  )

  return (
    <>
      <h1 className="titre-page">Travaux Modificatifs Acquéreurs</h1>

      <section className="stats">
        <StatCard valeur={validees} libelle="Validées" />
        <StatCard valeur={TMA_LIST.length} libelle="TMA au total" />
        <StatCard valeur={enCours} libelle="En cours" />
        <StatCard valeur={refusees} libelle="Refusées" />
        <StatCard valeur={formatMontant(montantValide)} libelle="Montant validé" />
      </section>

      <FiltreStatuts statuts={STATUTS_FILTRE} actif={statutActif} onChange={setStatutActif} />

      <table>
        <thead>
          <tr>
            <th>Lot</th>
            <th>Client</th>
            <th>Localisation</th>
            <th>Description</th>
            <th>Montant entreprises</th>
            <th>Montant client</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {tmaFiltrees.map((tma, index) => {
            const montantClient = calculerMontantClient(tma.montantEntreprises)
            return (
              <tr key={`${tma.lot}-${index}`}>
                <td>{tma.lot}</td>
                <td>{tma.client}</td>
                <td>{tma.localisation}</td>
                <td>{tma.description}</td>
                <td>{tma.montantEntreprises === null ? '—' : formatMontant(tma.montantEntreprises)}</td>
                <td>{montantClient === null ? '—' : formatMontant(montantClient)}</td>
                <td><Badge statut={tma.statut} texte={STATUTS_TMA[tma.statut]} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

export default Tma
