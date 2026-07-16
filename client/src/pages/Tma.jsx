import { Fragment, useEffect, useState } from 'react'
import {
  STATUTS_TMA,
  STATUTS_EN_COURS,
  STATUTS_VALIDE,
  TRANSITIONS_AUTORISEES,
  STATUTS_NON_RECALCULABLES,
} from '../data/tma.js'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { formatMontant } from '../utils/formatMontant.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import FormulaireDatesTma from '../components/FormulaireDatesTma.jsx'
import DetailEntreprisesTma from '../components/DetailEntreprisesTma.jsx'
import FormulaireCreationTma from '../components/FormulaireCreationTma.jsx'

const NB_COLONNES = 8

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(STATUTS_TMA).map(([valeur, libelle]) => ({ valeur, libelle })),
]

// Garde contre un acquéreur manquant (13/07/2026) : `tma.acquereur` est une
// référence, pas une copie — si la fiche client venait à disparaître, le
// populate() renvoie `null` plutôt que de planter la page.
function nomAcquereur(acquereur) {
  if (!acquereur) return '—'
  return [acquereur.civilite, acquereur.prenom, acquereur.nom].filter(Boolean).join(' ')
}

// TMA obsolète (13/07/2026, point 133) : son client d'origine (figé au
// moment de la création, voir server/routes/tma.js) ne correspond plus à
// l'acquéreur ACTUEL du lot — soit le lot est repassé "Libre" (vente
// annulée, lot.acquereur absent), soit il a été revendu à quelqu'un
// d'autre sans que la TMA n'ait encore été réattribuée.
function tmaObsolete(tma) {
  return (tma.lot?.acquereur?._id ?? null) !== (tma.acquereur?._id ?? null)
}

function Tma() {
  const [tmaList, setTmaList] = useState([])
  const [lots, setLots] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [idEnEdition, setIdEnEdition] = useState(null)
  const [idEntreprisesOuvert, setIdEntreprisesOuvert] = useState(null)
  const [creationOuverte, setCreationOuverte] = useState(false)

  async function chargerTma() {
    const reponse = await apiFetch(`${API_URL}/api/tma`)
    setTmaList(await reponse.json())
  }

  useEffect(() => {
    async function chargerTout() {
      try {
        const reponseLots = await apiFetch(`${API_URL}/api/lots`)
        setLots(await reponseLots.json())
        await chargerTma()
      } catch (e) {
        setErreur(e.message)
      } finally {
        setChargement(false)
      }
    }
    chargerTout()
  }, [])

  async function creerTma(donnees) {
    const reponse = await apiFetch(`${API_URL}/api/tma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    await chargerTma()
    setCreationOuverte(false)
  }

  if (chargement) return <p>Chargement des TMA...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  async function changerStatut(id, nouveauStatut) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/statut`, {
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

  // Réattribution (13/07/2026, point 133) : le lot d'une TMA obsolète a
  // été revendu, ce nouveau client accepte de reprendre la demande — on
  // recharge toute la liste (pas juste cette TMA) puisque `tma.lot`
  // (utilisé par tmaObsolete) vient d'un populate imbriqué qu'il est plus
  // simple de refaire en entier que de reconstruire à la main.
  async function reattribuerClient(tma) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${tma._id}/acquereur`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acquereur: tma.lot.acquereur._id }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    await chargerTma()
  }

  async function annulerRefus(id) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/annuler-refus`, { method: 'PATCH' })

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
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/dates`, {
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

      {creationOuverte ? (
        <FormulaireCreationTma
          lots={lots}
          onCreer={creerTma}
          onFermer={() => setCreationOuverte(false)}
        />
      ) : (
        <button type="button" onClick={() => setCreationOuverte(true)}>Ajouter une TMA</button>
      )}

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
                <td>{tma.lot?.reference ?? '—'}</td>
                <td>
                  {/* Client d'origine obsolète (13/07/2026, point 133) : la
                      vente qui a donné lieu à cette TMA a été annulée (et
                      éventuellement remplacée par une nouvelle) depuis — le
                      client d'origine n'a plus rien à voir avec le logement,
                      donc son nom ne s'affiche plus. La TMA elle-même reste
                      (à garder si le nouveau client la reprend — bouton
                      ci-dessous — ou à supprimer soi-même, voir point 128),
                      simplement signalée tant qu'elle n'a pas été réattribuée. */}
                  {tmaObsolete(tma) ? '—' : nomAcquereur(tma.acquereur)}
                  {tmaObsolete(tma) && (
                    <>
                      <div className="avertissement-cellule">Attention, ce logement a été annulé</div>
                      {tma.lot?.acquereur && (
                        <button type="button" onClick={() => reattribuerClient(tma)}>
                          Réattribuer à {nomAcquereur(tma.lot.acquereur)}
                        </button>
                      )}
                    </>
                  )}
                </td>
                <td>{tma.localisation}</td>
                <td>{tma.description}</td>
                {/* "==" (pas "===") : capture aussi bien `null` que
                    `undefined` — un montant absent du document (jamais
                    renseigné) n'est pas forcément `null` à la lettre, et
                    formatMontant(undefined) affiche "NaN €". */}
                <td>{tma.montantEntreprises == null ? '—' : formatMontant(tma.montantEntreprises)}</td>
                <td>{tma.montantClient == null ? '—' : formatMontant(tma.montantClient)}</td>
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
