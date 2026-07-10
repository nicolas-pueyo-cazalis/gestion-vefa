import { useEffect, useState } from 'react'
import { STATUTS_TMA, STATUTS_EN_COURS, STATUTS_VALIDE } from '../data/tma.js'
import { API_URL } from '../config.js'
import { formatMontant } from '../utils/formatMontant.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(STATUTS_TMA).map(([valeur, libelle]) => ({ valeur, libelle })),
]

function nomAcquereur(acquereur) {
  return [acquereur.civilite, acquereur.prenom, acquereur.nom].filter(Boolean).join(' ')
}

function Tma() {
  const [tmaList, setTmaList] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')

  useEffect(() => {
    async function chargerTma() {
      try {
        const reponse = await fetch(`${API_URL}/api/tma`)
        const donnees = await reponse.json()
        setTmaList(donnees)
      } catch (e) {
        setErreur(e.message)
      } finally {
        setChargement(false)
      }
    }
    chargerTma()
  }, [])

  if (chargement) return <p>Chargement des TMA...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  const tmaFiltrees =
    statutActif === 'tous' ? tmaList : tmaList.filter((tma) => tma.statut === statutActif)

  const validees = tmaList.filter((t) => STATUTS_VALIDE.includes(t.statut)).length
  const enCours = tmaList.filter((t) => STATUTS_EN_COURS.includes(t.statut)).length
  const refusees = tmaList.filter((t) => t.statut === 'refuse').length
  const montantValide = tmaList
    .filter((t) => STATUTS_VALIDE.includes(t.statut))
    .reduce((somme, t) => somme + t.montantClient, 0)

  return (
    <>
      <h1 className="titre-page">Travaux Modificatifs Acquéreurs</h1>

      <section className="stats">
        <StatCard valeur={tmaList.length} libelle="TMA au total" />
        <StatCard valeur={validees} libelle="Validées" />
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
          {tmaFiltrees.map((tma) => (
            <tr key={tma._id}>
              <td>{tma.lot.reference}</td>
              <td>{nomAcquereur(tma.acquereur)}</td>
              <td>{tma.localisation}</td>
              <td>{tma.description}</td>
              <td>{tma.montantEntreprises === null ? '—' : formatMontant(tma.montantEntreprises)}</td>
              <td>{tma.montantClient === null ? '—' : formatMontant(tma.montantClient)}</td>
              <td><Badge statut={tma.statut} texte={STATUTS_TMA[tma.statut]} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export default Tma
