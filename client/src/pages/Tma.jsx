import { Fragment, useEffect, useState } from 'react'
import {
  STATUTS_TMA,
  STATUTS_EN_COURS,
  STATUTS_VALIDE,
  TRANSITIONS_AUTORISEES,
  STATUTS_NON_RECALCULABLES,
} from '../data/tma.js'
import { API_URL } from '../config.js'
import { formatMontant } from '../utils/formatMontant.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import FormulaireDatesTma from '../components/FormulaireDatesTma.jsx'
import DetailEntreprisesTma from '../components/DetailEntreprisesTma.jsx'

const NB_COLONNES = 8

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
  const [idEnEdition, setIdEnEdition] = useState(null)
  const [idEntreprisesOuvert, setIdEntreprisesOuvert] = useState(null)

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

  useEffect(() => {
    chargerTma()
  }, [])

  if (chargement) return <p>Chargement des TMA...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  async function changerStatut(id, nouveauStatut) {
    const reponse = await fetch(`${API_URL}/api/tma/${id}/statut`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: nouveauStatut }),
    })

    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }

    const tmaMiseAJour = await reponse.json()
    setTmaList((liste) =>
      liste.map((tma) => (tma._id === tmaMiseAJour._id ? { ...tma, statut: tmaMiseAJour.statut } : tma)),
    )
  }

  async function annulerRefus(id) {
    const reponse = await fetch(`${API_URL}/api/tma/${id}/annuler-refus`, { method: 'PATCH' })

    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }

    const tmaMiseAJour = await reponse.json()
    setTmaList((liste) =>
      liste.map((tma) => (tma._id === tmaMiseAJour._id ? { ...tma, statut: tmaMiseAJour.statut } : tma)),
    )
  }

  async function enregistrerDates(id, donnees) {
    const reponse = await fetch(`${API_URL}/api/tma/${id}/dates`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })

    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }

    const tmaMiseAJour = await reponse.json()
    setTmaList((liste) =>
      liste.map((tma) =>
        tma._id === tmaMiseAJour._id
          ? {
              ...tma,
              statut: tmaMiseAJour.statut,
              montantEntreprises: tmaMiseAJour.montantEntreprises,
              montantClient: tmaMiseAJour.montantClient,
              dateEnvoiEntreprises: tmaMiseAJour.dateEnvoiEntreprises,
              dateEnvoiFactureClient: tmaMiseAJour.dateEnvoiFactureClient,
              dateRetourClient: tmaMiseAJour.dateRetourClient,
            }
          : tma,
      ),
    )
    setIdEnEdition(null)
  }

  const tmaFiltrees =
    statutActif === 'tous' ? tmaList : tmaList.filter((tma) => tma.statut === statutActif)

  const validees = tmaList.filter((t) => STATUTS_VALIDE.includes(t.statut)).length
  const enCours = tmaList.filter((t) => STATUTS_EN_COURS.includes(t.statut)).length
  const refusees = tmaList.filter((t) => t.statut === 'refuse').length
  const tmaValidees = tmaList.filter((t) => STATUTS_VALIDE.includes(t.statut))
  const montantValideEntreprises = tmaValidees.reduce((somme, t) => somme + t.montantEntreprises, 0)
  const montantValideClient = tmaValidees.reduce((somme, t) => somme + t.montantClient, 0)
  const marge = montantValideClient - montantValideEntreprises

  return (
    <>
      <h1 className="titre-page">Travaux Modificatifs Acquéreurs</h1>

      <section className="stats">
        <StatCard valeur={tmaList.length} libelle="TMA au total" />
        <StatCard valeur={validees} libelle="Validées" />
        <StatCard valeur={enCours} libelle="En cours" />
        <StatCard valeur={refusees} libelle="Refusées" />
      </section>

      <section className="stats">
        <StatCard valeur={formatMontant(montantValideEntreprises)} libelle="Montant validé (entreprises)" />
        <StatCard valeur={formatMontant(montantValideClient)} libelle="Montant validé (clients)" />
        <StatCard valeur={formatMontant(marge)} libelle="Marge" />
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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tmaFiltrees.map((tma) => (
            <Fragment key={tma._id}>
              <tr>
                <td>{tma.lot.reference}</td>
                <td>{nomAcquereur(tma.acquereur)}</td>
                <td>{tma.localisation}</td>
                <td>{tma.description}</td>
                <td>{tma.montantEntreprises === null ? '—' : formatMontant(tma.montantEntreprises)}</td>
                <td>{tma.montantClient === null ? '—' : formatMontant(tma.montantClient)}</td>
                <td><Badge statut={tma.statut} texte={STATUTS_TMA[tma.statut]} /></td>
                <td className="actions">
                  {!STATUTS_NON_RECALCULABLES.includes(tma.statut) && (
                    <button onClick={() => setIdEnEdition(tma._id)}>Modifier les dates</button>
                  )}
                  <button onClick={() => setIdEntreprisesOuvert(tma._id)}>Entreprises</button>
                  {TRANSITIONS_AUTORISEES[tma.statut].includes('refuse') && (
                    <button onClick={() => changerStatut(tma._id, 'refuse')}>Refuser</button>
                  )}
                  {tma.statut === 'refuse' && (
                    <button onClick={() => annulerRefus(tma._id)}>Annuler le refus</button>
                  )}
                </td>
              </tr>
              {idEnEdition === tma._id && (
                <FormulaireDatesTma
                  tma={tma}
                  colonnes={NB_COLONNES}
                  onEnregistrer={enregistrerDates}
                  onFermer={() => setIdEnEdition(null)}
                />
              )}
              {idEntreprisesOuvert === tma._id && (
                <DetailEntreprisesTma
                  tma={tma}
                  colonnes={NB_COLONNES}
                  onChangement={chargerTma}
                  onFermer={() => setIdEntreprisesOuvert(null)}
                />
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </>
  )
}

export default Tma
