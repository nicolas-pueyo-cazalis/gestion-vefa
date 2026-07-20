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
import { useProgramme } from '../context/ProgrammeContext.jsx'
import { formatMontant } from '../utils/formatMontant.js'
import { estEntrepriseEnRetard, formatDate } from '../utils/statuts.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FormulaireDatesTma from '../components/FormulaireDatesTma.jsx'
import DetailEntreprisesTma from '../components/DetailEntreprisesTma.jsx'
import FormulaireCreationTma from '../components/FormulaireCreationTma.jsx'
import FormulaireInfosTma from '../components/FormulaireInfosTma.jsx'

const NB_COLONNES = 13

// Filtre en liste déroulante (13/07/2026, point 130) : regroupe les 8
// statuts détaillés en 4 grandes étapes, plutôt qu'une rangée de boutons
// par statut (trop nombreux pour rester lisibles) — remplace l'ancien
// FiltreStatuts (boutons) utilisé ailleurs dans l'appli.
const GROUPES_FILTRE = {
  en_cours: STATUTS_EN_COURS,
  valide: STATUTS_VALIDE,
  refuse: ['refuse'],
  annule: ['annule'],
}

const LIBELLES_GROUPES_FILTRE = {
  tous: 'Tous',
  en_cours: 'En cours',
  valide: 'Validé',
  refuse: 'Refusé',
  annule: 'Annulé',
}

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
  const { programmeActif: programme } = useProgramme()
  const [tmaList, setTmaList] = useState([])
  const [lots, setLots] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  // Un seul panneau d'actions par TMA (13/07/2026) — regroupe "Modifier les
  // dates", "Entreprises" et "Refuser"/"Supprimer" sous un même crayon,
  // comme sur la page Lots, plutôt que des boutons épars sur la ligne.
  const [idPanneauOuvert, setIdPanneauOuvert] = useState(null)
  const [creationOuverte, setCreationOuverte] = useState(false)
  // Retard entreprise (13/07/2026, point 134) : programme (délai) et
  // tma-entreprises (dateEnvoi/montantDevis) nécessaires pour détecter, sur
  // CETTE page, une TMA "Étude" dont une entreprise sollicitée n'a pas
  // répondu à temps — sans attendre la fenêtre d'alertes au démarrage.
  const [tmaEntreprises, setTmaEntreprises] = useState([])

  async function chargerTma() {
    const reponse = await apiFetch(`${API_URL}/api/tma?programme=${programme._id}`)
    setTmaList(await reponse.json())
  }

  async function chargerTmaEntreprises() {
    const reponse = await apiFetch(`${API_URL}/api/tma-entreprises?programme=${programme._id}`)
    setTmaEntreprises(await reponse.json())
  }

  // Rafraîchit les deux à la fois : ajouter/modifier une ligne entreprise
  // (DetailEntreprisesTma.jsx) peut changer le statut ET la date d'envoi
  // qui déterminent le message de retard ci-dessous.
  async function chargerTmaEtEntreprises() {
    await Promise.all([chargerTma(), chargerTmaEntreprises()])
  }

  useEffect(() => {
    async function chargerTout() {
      try {
        const reponseLots = await apiFetch(`${API_URL}/api/lots?programme=${programme._id}`)
        setLots(await reponseLots.json())
        await Promise.all([chargerTma(), chargerTmaEntreprises()])
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

  // Localisation/description/montant client (13/07/2026, à la demande de
  // Nicolas) — voir FormulaireInfosTma.jsx pour l'avertissement affiché
  // avant l'envoi si le montant client est modifié à la main.
  async function enregistrerInfos(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/infos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
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

  async function annulerAnnulation(id) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/annuler-annulation`, { method: 'PATCH' })

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

  async function annulerTermine(id) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/annuler-termine`, { method: 'PATCH' })

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
  }

  // Retard entreprise (13/07/2026, point 134) : vrai s'il existe au moins
  // une ligne TmaEntreprise de cette TMA en retard (voir
  // estEntrepriseEnRetard, utils/statuts.js) — mêmes règles que la fenêtre
  // d'alertes au démarrage (AlerteRetards.jsx), affiché ici directement.
  function entrepriseEnRetardPourTma(tma) {
    const delai = programme.parametres.delaiRetourEntrepriseTmaJours
    return tmaEntreprises.some((ligne) => ligne.tma?._id === tma._id && estEntrepriseEnRetard(ligne, delai))
  }

  const tmaFiltrees =
    statutActif === 'tous' ? tmaList : tmaList.filter((tma) => GROUPES_FILTRE[statutActif].includes(tma.statut))

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
        <StatCard valeur={formatMontant(montantValideEntreprises)} libelle="Montant TTC validé (entreprises)" />
        <StatCard valeur={formatMontant(montantValideClient)} libelle="Montant TTC validé (clients)" />
        <StatCard valeur={formatMontant(marge)} libelle="Marge" />
      </section>

      <div className="barre-actions">
        <label className="filtre-liste-deroulante">
          Statut
          <select value={statutActif} onChange={(e) => setStatutActif(e.target.value)}>
            {Object.entries(LIBELLES_GROUPES_FILTRE).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>{libelle}</option>
            ))}
          </select>
        </label>

        {!creationOuverte && (
          <button type="button" onClick={() => setCreationOuverte(true)}>Ajouter une TMA</button>
        )}
      </div>

      {creationOuverte && (
        <FormulaireCreationTma
          lots={lots}
          onCreer={creerTma}
          onFermer={() => setCreationOuverte(false)}
        />
      )}

      <div className="tableau-scroll">
        <table className="tableau-lots tableau-tma">
          <thead>
            <tr>
              <th>Lot</th>
            <th>Client</th>
            <th><span className="th-etroit">Date de la demande</span></th>
            <th>Localisation</th>
            <th>Description</th>
            <th><span className="th-etroit">Date envoi entreprise</span></th>
            <th><span className="th-etroit">Montant TTC entreprises</span></th>
            <th><span className="th-etroit">Montant TTC client</span></th>
            <th><span className="th-etroit">Facture envoyée le</span></th>
            <th><span className="th-etroit">Facture validée le</span></th>
            <th>Statut</th>
            <th>Commentaire</th>
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
                  <span className="nom-client">{tmaObsolete(tma) ? '—' : nomAcquereur(tma.acquereur)}</span>
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
                  {/* 13/07/2026, point 127 : une TMA peut être créée dès
                      Option/Réservé, pas seulement Acté (voir
                      FormulaireCreationTma.jsx) — simple rappel visuel tant
                      que la vente n'est pas encore signée. */}
                  {!tmaObsolete(tma) && tma.lot?.statut && tma.lot.statut !== 'acte' && (
                    <div className="avertissement-cellule">Ce logement n'est pas encore acté</div>
                  )}
                </td>
                <td>{formatDate(tma.dateDemande)}</td>
                <td>{tma.localisation}</td>
                <td><span className="description-cellule">{tma.description}</span></td>
                <td>{formatDate(tma.dateEnvoiEntreprises)}</td>
                {/* "==" (pas "===") : capture aussi bien `null` que
                    `undefined` — un montant absent du document (jamais
                    renseigné) n'est pas forcément `null` à la lettre, et
                    formatMontant(undefined) affiche "NaN €". */}
                <td>{tma.montantEntreprises == null ? '—' : formatMontant(tma.montantEntreprises)}</td>
                <td>{formatMontant(tma.montantClient ?? 0)}</td>
                <td>{formatDate(tma.dateEnvoiFactureClient)}</td>
                <td>{formatDate(tma.dateRetourClient)}</td>
                <td>
                  <Badge statut={tma.statut} texte={STATUTS_TMA[tma.statut]} />
                  {tma.statut === 'etude' && entrepriseEnRetardPourTma(tma) && (
                    <div className="avertissement-cellule">Retard entreprise</div>
                  )}
                </td>
                <td><span className="commentaire-cellule">{tma.commentaire || '—'}</span></td>
                <td className="actions">
                  <button
                    type="button"
                    className="bouton-icone"
                    title="Modifier"
                    aria-label="Modifier"
                    onClick={() => setIdPanneauOuvert(idPanneauOuvert === tma._id ? null : tma._id)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                </td>
              </tr>
              {idPanneauOuvert === tma._id && (
                <>
                  <FormulaireInfosTma
                    tma={tma}
                    colonnes={NB_COLONNES}
                    montantClientSaisiManuellement={programme.parametres.montantClientSaisiManuellement}
                    onEnregistrer={enregistrerInfos}
                    onFermer={() => setIdPanneauOuvert(null)}
                  />
                  {!STATUTS_NON_RECALCULABLES.includes(tma.statut) && (
                    <FormulaireDatesTma
                      tma={tma}
                      colonnes={NB_COLONNES}
                      onEnregistrer={enregistrerDates}
                      onFermer={() => setIdPanneauOuvert(null)}
                    />
                  )}
                  <DetailEntreprisesTma
                    tma={tma}
                    colonnes={NB_COLONNES}
                    onChangement={chargerTmaEtEntreprises}
                    onFermer={() => setIdPanneauOuvert(null)}
                  />
                  <tr className="formulaire-dates">
                    <td colSpan={NB_COLONNES}>
                      <div className="boutons-panneau-tma">
                        {TRANSITIONS_AUTORISEES[tma.statut].includes('termine') && (
                          <button type="button" className="bouton-fonce" onClick={() => changerStatut(tma._id, 'termine')}>Marquer les travaux comme terminés</button>
                        )}
                        {tma.statut === 'termine' && (
                          <button type="button" className="bouton-fonce" onClick={() => annulerTermine(tma._id)}>Annuler la fin des travaux</button>
                        )}
                        {TRANSITIONS_AUTORISEES[tma.statut].includes('refuse') && (
                          <button type="button" onClick={() => changerStatut(tma._id, 'refuse')}>Refuser la TMA</button>
                        )}
                        {tma.statut === 'refuse' && (
                          <button type="button" onClick={() => annulerRefus(tma._id)}>Annuler le refus</button>
                        )}
                        {TRANSITIONS_AUTORISEES[tma.statut].includes('annule') && (
                          <button type="button" className="bouton-danger" onClick={() => changerStatut(tma._id, 'annule')}>Annuler la TMA</button>
                        )}
                        {tma.statut === 'annule' && (
                          <button type="button" onClick={() => annulerAnnulation(tma._id)}>Annuler l'annulation</button>
                        )}
                      </div>
                    </td>
                  </tr>
                </>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
    </>
  )
}

export default Tma
