import { useEffect, useState } from 'react'
import { STATUTS_TMA, STATUTS_EN_COURS, STATUTS_VALIDE } from '../data/tma.js'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import { formatMontant } from '../utils/formatMontant.js'
import { estEntrepriseEnRetard, formatDate } from '../utils/statuts.js'
import StatCard from '../components/StatCard.jsx'
import FormulaireCreationTma from '../components/FormulaireCreationTma.jsx'
import BarreRecherche from '../components/BarreRecherche.jsx'
import { correspondRecherche } from '../utils/recherche.js'
import FenetreExport from '../components/FenetreExport.jsx'
import LigneTma from '../components/LigneTma.jsx'
import { exporterPDF } from '../utils/export.js'
import { nomAcquereur } from '../utils/acquereur.js'
import {
  donneesExportStatistiques,
  donneesExportDemandesClients,
  donneesExportDetailEntreprises,
} from './Tma.exports.js'

const NB_COLONNES = 14

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

// TMA obsolète (13/07/2026, point 133) : son client d'origine (figé au
// moment de la création, voir server/routes/tma.js) ne correspond plus à
// l'acquéreur ACTUEL du lot — soit le lot est repassé "Libre" (vente
// annulée, lot.acquereur absent), soit il a été revendu à quelqu'un
// d'autre sans que la TMA n'ait encore été réattribuée.
export function tmaObsolete(tma) {
  return (tma.lot?.acquereur?._id ?? null) !== (tma.acquereur?._id ?? null)
}

// Texte de recherche (20/07/2026, point 187) : tout ce qui s'affiche dans
// la ligne, mêmes fonctions de formatage que le rendu du tableau.
export function texteRechercheTma(tma) {
  return [
    tma.lot?.reference,
    tmaObsolete(tma) ? null : nomAcquereur(tma.acquereur),
    formatDate(tma.dateDemande),
    tma.localisation,
    tma.description,
    formatDate(tma.dateEnvoiEntreprises),
    tma.montantEntreprises == null ? null : formatMontant(tma.montantEntreprises),
    formatMontant(tma.montantClient ?? 0),
    formatDate(tma.dateEnvoiFactureClient),
    formatDate(tma.dateRetourClient),
    STATUTS_TMA[tma.statut],
    tma.commentaire,
  ]
    .filter(Boolean)
    .join(' ')
}

function Tma() {
  const { programmeActif: programme } = useProgramme()
  const [tmaList, setTmaList] = useState([])
  const [lots, setLots] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [recherche, setRecherche] = useState('')
  // Un seul panneau d'actions par TMA (13/07/2026) — regroupe "Modifier les
  // dates", "Entreprises" et "Refuser"/"Supprimer" sous un même crayon,
  // comme sur la page Lots, plutôt que des boutons épars sur la ligne.
  const [idPanneauOuvert, setIdPanneauOuvert] = useState(null)
  const [creationOuverte, setCreationOuverte] = useState(false)
  const [exportOuvert, setExportOuvert] = useState(false)
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
      liste.map((tma) =>
        tma._id === tmaMiseAJour._id ? { ...tma, statut: tmaMiseAJour.statut } : tma,
      ),
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
      liste.map((tma) =>
        tma._id === tmaMiseAJour._id ? { ...tma, statut: tmaMiseAJour.statut } : tma,
      ),
    )
  }

  async function annulerAnnulation(id) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/annuler-annulation`, {
      method: 'PATCH',
    })

    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }

    const tmaMiseAJour = await reponse.json()
    setTmaList((liste) =>
      liste.map((tma) =>
        tma._id === tmaMiseAJour._id ? { ...tma, statut: tmaMiseAJour.statut } : tma,
      ),
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
      liste.map((tma) =>
        tma._id === tmaMiseAJour._id ? { ...tma, statut: tmaMiseAJour.statut } : tma,
      ),
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
    return tmaEntreprises.some(
      (ligne) => ligne.tma?._id === tma._id && estEntrepriseEnRetard(ligne, delai),
    )
  }

  // Numéro de la demande PAR LOGEMENT (21/07/2026, remarque de Nicolas) : un
  // même logement peut faire plusieurs demandes TMA à des moments
  // différents — "demande n°1", "demande n°2"... Jamais stocké, déduit du
  // rang chronologique (date de la demande, création en repli) parmi les
  // TMA du même lot — même philosophie que le reste de l'appli (la logique
  // se déduit des données, rien de figé en base).
  function numeroDemandePourTma(tma) {
    const tmaDuMemeLot = tmaList
      .filter((t) => t.lot?._id === tma.lot?._id)
      .sort(
        (a, b) => new Date(a.dateDemande || a.createdAt) - new Date(b.dateDemande || b.createdAt),
      )
    return tmaDuMemeLot.findIndex((t) => t._id === tma._id) + 1
  }

  // Classement par lot (21/07/2026, remarque de Nicolas) : plus lisible
  // qu'un classement par ordre d'ajout — et regroupe naturellement les
  // demandes n°1/n°2/... d'un même logement les unes à la suite des autres.
  const tmaFiltrees = [...tmaList]
    .sort((a, b) => {
      const parLot = (a.lot?.reference ?? '').localeCompare(b.lot?.reference ?? '')
      return parLot !== 0 ? parLot : numeroDemandePourTma(a) - numeroDemandePourTma(b)
    })
    .filter((tma) => statutActif === 'tous' || GROUPES_FILTRE[statutActif].includes(tma.statut))
    .filter((tma) => correspondRecherche(texteRechercheTma(tma), recherche))

  const validees = tmaList.filter((t) => STATUTS_VALIDE.includes(t.statut)).length
  const enCours = tmaList.filter((t) => STATUTS_EN_COURS.includes(t.statut)).length
  const refusees = tmaList.filter((t) => t.statut === 'refuse').length
  const tmaValidees = tmaList.filter((t) => STATUTS_VALIDE.includes(t.statut))
  const montantValideEntreprises = tmaValidees.reduce((somme, t) => somme + t.montantEntreprises, 0)
  const montantValideClient = tmaValidees.reduce((somme, t) => somme + t.montantClient, 0)
  const marge = montantValideClient - montantValideEntreprises

  // Totaux TTC/TVA/HT du tableau (21/07/2026, remarque de Nicolas) : sur
  // les deux colonnes chiffrées du tableau (Montant TTC entreprises,
  // Montant TTC client), respectant le statut/la recherche actifs comme le
  // reste du tableau (même principe que Lots) — différent des totaux
  // "validées" ci-dessus, qui ne portent que sur les TMA validées quel que
  // soit le filtre affiché. Réutilisées telles quelles dans le tfoot du
  // tableau ET dans l'export "Demandes clients" (Tma.exports.js).
  const tauxTva = programme.parametres.tauxTva
  const totalEntreprisesTTC = tmaFiltrees.reduce((s, t) => s + (t.montantEntreprises ?? 0), 0)
  const totalClientTTC = tmaFiltrees.reduce((s, t) => s + (t.montantClient ?? 0), 0)

  function ligneTotalTableau(libelle, entreprisesTTC, clientTTC) {
    return [
      libelle,
      '',
      '',
      '',
      '',
      '',
      '',
      formatMontant(entreprisesTTC),
      formatMontant(clientTTC),
      '',
      '',
      '',
      '',
    ]
  }
  const ligneTotalTTC = ligneTotalTableau('Montant total TTC', totalEntreprisesTTC, totalClientTTC)
  const ligneTotalHT = ligneTotalTableau(
    'Montant total HT',
    totalEntreprisesTTC / (1 + tauxTva),
    totalClientTTC / (1 + tauxTva),
  )
  const ligneTotalTVA = ligneTotalTableau(
    `TVA (${Math.round(tauxTva * 100)}%)`,
    totalEntreprisesTTC - totalEntreprisesTTC / (1 + tauxTva),
    totalClientTTC - totalClientTTC / (1 + tauxTva),
  )

  // Export "Générer devis client" (21/07/2026, remarque de Nicolas, modèle
  // PDF fourni, revu le jour même) : choix en deux temps dans la fenêtre
  // d'export — d'abord le LOGEMENT, puis les DEMANDES de ce logement à
  // cocher/décocher (un même devis peut regrouper plusieurs demandes) —
  // même mécanique que "Générer un appel de fonds" (AppelsDeFonds.jsx,
  // FenetreExport.jsx, `type: 'generation'` : `phases`/`lotsPourPhase`
  // réutilisés ici pour porter logements/demandes, pas de nouveau mode à
  // ajouter au composant).
  const referencesLotsAvecTma = [
    ...new Set(tmaList.map((t) => t.lot?.reference).filter(Boolean)),
  ].sort()

  function demandesPourLot(referenceLot) {
    return tmaList
      .filter((t) => t.lot?.reference === referenceLot)
      .sort((a, b) => numeroDemandePourTma(a) - numeroDemandePourTma(b))
      .map((t) => ({
        valeur: t._id,
        libelle: `Demande n°${numeroDemandePourTma(t)} — ${t.description || 'sans description'}`,
      }))
  }

  // Le numéro de devis (ex: "TMA-2026-005") est réservé côté SERVEUR à
  // CHAQUE génération (compteur par programme et par année, voir POST
  // /api/tma/:id/devis-numero) — jamais réutilisé, même en régénérant le
  // même devis après correction. Une seule réservation par génération,
  // même si plusieurs demandes sont cochées (un devis, un numéro).
  async function genererDevisClient(referenceLot, idsTma) {
    const tmaChoisies = idsTma
      .map((id) => tmaList.find((t) => t._id === id))
      .filter(Boolean)
      .sort((a, b) => numeroDemandePourTma(a) - numeroDemandePourTma(b))
    if (tmaChoisies.length === 0) return
    const premiere = tmaChoisies[0]

    const reponse = await apiFetch(`${API_URL}/api/tma/${premiere._id}/devis-numero`, {
      method: 'POST',
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    const { numeroDevis } = await reponse.json()

    exporterPDF({
      typeDevis: true,
      nomFichier: `devis-${numeroDevis}-${referenceLot}`,
      numeroDevis,
      dateGeneration: new Date(),
      clientNom: tmaObsolete(premiere) ? '—' : nomAcquereur(premiere.acquereur),
      maitreOuvrageNom: programme.maitreOuvrage,
      programmeNom: programme.nom,
      lotReference: referenceLot,
      lignesDemandes: tmaChoisies.map((tma) => ({
        numeroDemande: numeroDemandePourTma(tma),
        dateDemande: tma.dateDemande,
        designation: tma.description,
        montantTTC: tma.montantClient ?? 0,
      })),
      tauxTva,
    })
  }

  function fermerPanneau() {
    setIdPanneauOuvert(null)
  }

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
        <StatCard
          valeur={formatMontant(montantValideEntreprises)}
          libelle="Montant TTC validé (entreprises)"
        />
        <StatCard
          valeur={formatMontant(montantValideClient)}
          libelle="Montant TTC validé (clients)"
        />
        <StatCard valeur={formatMontant(marge)} libelle="Marge" />
      </section>

      <div className="barre-actions">
        <label className="filtre-liste-deroulante">
          Statut
          <select value={statutActif} onChange={(e) => setStatutActif(e.target.value)}>
            {Object.entries(LIBELLES_GROUPES_FILTRE).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </select>
        </label>

        <BarreRecherche
          valeur={recherche}
          onChange={setRecherche}
          placeholder="Rechercher une TMA..."
        />

        <button type="button" className="bouton-accordeon" onClick={() => setExportOuvert(true)}>
          Exporter
        </button>

        {!creationOuverte && (
          <button type="button" onClick={() => setCreationOuverte(true)}>
            Ajouter une TMA
          </button>
        )}
      </div>

      {creationOuverte && (
        <FormulaireCreationTma
          lots={lots}
          onCreer={creerTma}
          onFermer={() => setCreationOuverte(false)}
        />
      )}

      {exportOuvert && (
        <FenetreExport
          options={[
            {
              valeur: 'statistiques',
              libelle: 'Statistiques (cartes)',
              donnees: () =>
                donneesExportStatistiques({
                  tmaList,
                  validees,
                  enCours,
                  refusees,
                  montantValideEntreprises,
                  montantValideClient,
                  marge,
                  programme,
                }),
            },
            {
              valeur: 'demandes-clients',
              libelle: 'Demandes clients',
              donnees: () =>
                donneesExportDemandesClients({
                  tmaFiltrees,
                  numeroDemandePourTma,
                  tmaObsolete,
                  ligneTotalTTC,
                  ligneTotalTVA,
                  ligneTotalHT,
                  programme,
                }),
            },
            {
              valeur: 'detail-entreprises',
              libelle: 'Détail entreprises',
              donnees: () =>
                donneesExportDetailEntreprises({
                  tmaFiltrees,
                  tmaEntreprises,
                  numeroDemandePourTma,
                  tmaObsolete,
                  programme,
                }),
            },
            {
              valeur: 'devis-client',
              libelle: 'Générer devis client',
              type: 'generation',
              phases: referencesLotsAvecTma.map((ref) => ({ valeur: ref, libelle: ref })),
              lotsPourPhase: demandesPourLot,
              generer: genererDevisClient,
              libelleChoix1: 'Quel logement ?',
              libelleChoix2: 'Demandes concernées',
              messageChoix2Vide: 'Aucune demande TMA pour ce logement.',
            },
          ]}
          onFermer={() => setExportOuvert(false)}
        />
      )}

      <div className="tableau-scroll">
        <table className="tableau-lots tableau-tma">
          <thead>
            <tr>
              <th>Lot</th>
              <th>
                <span className="th-etroit">N° demande</span>
              </th>
              <th>Client</th>
              <th>
                <span className="th-etroit">Date de la demande</span>
              </th>
              <th>Localisation</th>
              <th>Description</th>
              <th>
                <span className="th-etroit">Date envoi entreprise</span>
              </th>
              <th className="colonne-montant">
                <span className="th-etroit">Montant TTC entreprises</span>
              </th>
              <th className="colonne-montant">
                <span className="th-etroit">Montant TTC client</span>
              </th>
              <th>
                <span className="th-etroit">Facture envoyée le</span>
              </th>
              <th>
                <span className="th-etroit">Facture validée le</span>
              </th>
              <th>Statut</th>
              <th>Commentaire</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tmaFiltrees.map((tma) => (
              <LigneTma
                key={tma._id}
                tma={tma}
                numeroDemande={numeroDemandePourTma(tma)}
                estObsolete={tmaObsolete(tma)}
                entrepriseEnRetard={entrepriseEnRetardPourTma(tma)}
                colonnes={NB_COLONNES}
                montantClientSaisiManuellement={programme.parametres.montantClientSaisiManuellement}
                delaiRetourEntrepriseTmaJours={programme.parametres.delaiRetourEntrepriseTmaJours}
                panneauOuvert={idPanneauOuvert === tma._id}
                onBasculerPanneau={() =>
                  setIdPanneauOuvert(idPanneauOuvert === tma._id ? null : tma._id)
                }
                onFermerPanneau={fermerPanneau}
                onReattribuer={reattribuerClient}
                onEnregistrerInfos={enregistrerInfos}
                onEnregistrerDates={enregistrerDates}
                onChangementEntreprises={chargerTmaEtEntreprises}
                onChangerStatut={changerStatut}
                onAnnulerRefus={annulerRefus}
                onAnnulerAnnulation={annulerAnnulation}
                onAnnulerTermine={annulerTermine}
              />
            ))}
          </tbody>
          {tmaFiltrees.length > 0 && (
            <tfoot>
              {[ligneTotalTTC, ligneTotalTVA, ligneTotalHT].map((ligne) => (
                <tr key={ligne[0]}>
                  {ligne.map((valeur, i) => (
                    <td key={i} className={i === 7 || i === 8 ? 'colonne-montant' : undefined}>
                      {valeur}
                    </td>
                  ))}
                  <td />
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}

export default Tma
