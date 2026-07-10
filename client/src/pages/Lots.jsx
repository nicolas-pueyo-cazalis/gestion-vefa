import { useEffect, useState } from 'react'
import { STATUTS_LOT } from '../data/lots.js'
import { API_URL } from '../config.js'
import { formatMontant } from '../utils/formatMontant.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(STATUTS_LOT).map(([valeur, libelle]) => ({ valeur, libelle })),
]

function Lots() {
  const [lots, setLots] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')

  useEffect(() => {
    async function chargerLots() {
      try {
        const reponse = await fetch(`${API_URL}/api/lots`)
        const donnees = await reponse.json()
        setLots(donnees)
      } catch (e) {
        setErreur(e.message)
      } finally {
        setChargement(false)
      }
    }
    chargerLots()
  }, [])

  if (chargement) return <p>Chargement des lots...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  const lotsFiltres =
    statutActif === 'tous' ? lots : lots.filter((lot) => lot.statut === statutActif)

  const parStatut = Object.keys(STATUTS_LOT).reduce((compte, statut) => {
    compte[statut] = lots.filter((lot) => lot.statut === statut).length
    return compte
  }, {})

  const caParStatut = Object.keys(STATUTS_LOT).reduce((compte, statut) => {
    compte[statut] = lots
      .filter((lot) => lot.statut === statut)
      .reduce((somme, lot) => somme + lot.prixTTC, 0)
    return compte
  }, {})

  return (
    <>
      <h1 className="titre-page">Tableau de bord des lots</h1>

      <section className="stats">
        <StatCard valeur={lots.length} libelle="Lots au total" />
        <StatCard valeur={parStatut.acte} libelle="Actés" />
        <StatCard valeur={parStatut.reserve} libelle="Réservés" />
        <StatCard valeur={parStatut.option} libelle="Options" />
        <StatCard valeur={parStatut.libre} libelle="Libres" />
      </section>

      <section className="stats">
        <StatCard valeur={formatMontant(caParStatut.acte)} libelle="CA acté" />
        <StatCard valeur={formatMontant(caParStatut.reserve)} libelle="CA réservé" />
        <StatCard valeur={formatMontant(caParStatut.option)} libelle="CA options" />
        <StatCard valeur={formatMontant(caParStatut.libre)} libelle="CA libre" />
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
            <tr key={lot._id}>
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
