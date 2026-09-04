import { useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import { formatMontant } from '../utils/formatMontant.js'
import { statutAppel, formatDate } from '../utils/statuts.js'
import StatCard from '../components/StatCard.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import BarreRecherche from '../components/BarreRecherche.jsx'
import { correspondRecherche } from '../utils/recherche.js'
import FiltreMultiple from '../components/FiltreMultiple.jsx'
import FormulaireAttestationMasse from '../components/FormulaireAttestationMasse.jsx'
import FenetreRecapAttestations from '../components/FenetreRecapAttestations.jsx'
import FenetreExport from '../components/FenetreExport.jsx'
import RecapitulatifAppelsParLot from '../components/RecapitulatifAppelsParLot.jsx'
import LigneAppelDeFonds from '../components/LigneAppelDeFonds.jsx'
import { exporterPDF } from '../utils/export.js'
import {
  donneesExportCourrier,
  donneesExportStatistiques,
  donneesExportRecapParLot,
  donneesExportDetailParPhase,
} from './AppelsDeFonds.exports.js'

const NB_COLONNES = 12

const LIBELLES_STATUT = {
  attente: 'En attente',
  a_emettre: 'À émettre',
  emis: 'Émis',
  retard: 'En retard',
  regle: 'Réglé',
}

// Texte de recherche (20/07/2026, point 187) : tout ce qui s'affiche dans
// la ligne, mêmes fonctions de formatage que le rendu du tableau.
export function texteRechercheAppel(appel) {
  return [
    appel.lot?.reference,
    appel.phase.nom,
    `${Math.round(appel.phase.pourcentage * 100)}%`,
    formatMontant(appel.montant),
    formatDate(appel.dateAttestationMOE),
    formatDate(appel.dateEmission),
    formatDate(appel.dateLimiteReglement),
    formatDate(appel.dateReglement),
    LIBELLES_STATUT[statutAppel(appel)],
    appel.commentaire,
  ]
    .filter(Boolean)
    .join(' ')
}

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(LIBELLES_STATUT).map(([valeur, libelle]) => ({ valeur, libelle })),
]

function AppelsDeFonds() {
  const { programmeActif: programme } = useProgramme()
  const [appels, setAppels] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [phasesActives, setPhasesActives] = useState([])
  const [lotsActifs, setLotsActifs] = useState([])
  const [idEnEdition, setIdEnEdition] = useState(null)
  const [idLotBaremeOuvert, setIdLotBaremeOuvert] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [recapOuvert, setRecapOuvert] = useState(false)
  const [recapParLotOuvert, setRecapParLotOuvert] = useState(false)
  const [exportOuvert, setExportOuvert] = useState(false)

  async function chargerAppels() {
    const reponse = await apiFetch(`${API_URL}/api/appels-de-fonds?programme=${programme._id}`)
    setAppels(await reponse.json())
  }

  useEffect(() => {
    async function init() {
      try {
        await chargerAppels()
      } catch (e) {
        setErreur(e.message)
      } finally {
        setChargement(false)
      }
    }
    init()
  }, [])

  async function enregistrer(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/appels-de-fonds/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    await chargerAppels()
    setIdEnEdition(null)
  }

  // Barème négocié pour UN logement (13/07/2026) : contrairement au barème
  // général (Paramètres, verrouillé dès qu'un appel est émis — point 123),
  // ce cas particulier reste volontairement modifiable même après émission.
  async function enregistrerBaremeLot(lotId, phases) {
    const reponse = await apiFetch(`${API_URL}/api/appels-de-fonds/lot/${lotId}/bareme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phases }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    await chargerAppels()
    setIdLotBaremeOuvert(null)
  }

  async function appliquerAttestationMasse(donnees) {
    const reponse = await apiFetch(`${API_URL}/api/appels-de-fonds/phase`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...donnees, programme: programme._id }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    const { nombreMisAJour } = await reponse.json()
    await chargerAppels()
    alert(`${nombreMisAJour} appel(s) de fonds mis à jour.`)
  }

  if (chargement) return <p>Chargement des appels de fonds...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  // Ordre voulu par Nicolas : celui défini dans Paramètres > Barème, pas
  // l'ordre de création — chaque appel garde son `phase.ordre` figé au
  // moment de sa génération (docs/schema-donnees.md).
  const phasesTriees = [...programme.parametres.baremePhases].sort((a, b) => a.ordre - b.ordre)
  const nomsPhases = phasesTriees.map((p) => p.nom)
  // La 1ère phase (ex: "Réservation") ne s'atteste jamais à la main — elle
  // s'auto-émet dès la génération à partir de la date de réservation du
  // lot (remarque du 11/07/2026) — inutile de la proposer ici.
  const nomsPhasesAttestables = nomsPhases.slice(1)

  const referencesLots = [...new Set(appels.map((a) => a.lot?.reference).filter(Boolean))].sort()

  const appelsTries = [...appels].sort((a, b) => {
    const parLot = (a.lot?.reference ?? '').localeCompare(b.lot?.reference ?? '')
    if (parLot !== 0) return parLot
    return a.phase.ordre - b.phase.ordre
  })
  const appelsFiltres = appelsTries
    .filter((a) => statutActif === 'tous' || statutAppel(a) === statutActif)
    .filter((a) => phasesActives.length === 0 || phasesActives.includes(a.phase.nom))
    .filter((a) => lotsActifs.length === 0 || lotsActifs.includes(a.lot?.reference))
    .filter((a) => correspondRecherche(texteRechercheAppel(a), recherche))

  // "Avancement cumulé %" (20/07/2026, remarque de Nicolas) : somme des
  // pourcentages de phase d'un même lot, du début jusqu'à cette ligne —
  // atteint 100% à la dernière phase (si aucun filtre phase/statut ne
  // masque de lignes). Repose sur `appelsFiltres` déjà trié lot puis
  // phase.ordre (voir appelsTries) : un simple cumul qui se remet à zéro
  // à chaque changement de lot pendant le parcours de la liste.
  let cumulCourant = 0
  let lotCourantPourCumul = null
  const cumulsParAppel = appelsFiltres.map((appel) => {
    const idLot = appel.lot?._id
    if (idLot !== lotCourantPourCumul) {
      cumulCourant = 0
      lotCourantPourCumul = idLot
    }
    cumulCourant += appel.phase.pourcentage
    return cumulCourant
  })

  const enAttente = appels.filter((a) => statutAppel(a) === 'attente').length
  const aEmettre = appels.filter((a) => statutAppel(a) === 'a_emettre').length
  const enRetard = appels.filter((a) => statutAppel(a) === 'retard').length
  const regles = appels.filter((a) => statutAppel(a) === 'regle').length
  // "Émis" ici = a été émis au moins une fois (cumulatif), qu'il soit
  // ensuite en retard ou déjà réglé — pas seulement le sous-statut actif
  // "emis" (émis, pas en retard, pas encore réglé). C'est la question que
  // s'est posée Nicolas : sur 3 lots avec 2 phases déclenchées chacun, on
  // doit bien lire "6", peu importe où en est chaque appel ensuite.
  const emisAuTotal = appels.filter((a) => a.dateEmission).length
  const totalEmis = appels.filter((a) => a.dateEmission).reduce((s, a) => s + a.montant, 0)
  const totalPaye = appels.filter((a) => a.dateReglement).reduce((s, a) => s + a.montant, 0)

  // Récapitulatif par lot (20/07/2026, remarque de Nicolas) : jusqu'ici,
  // le reste à payer n'apparaissait qu'au niveau du programme entier
  // ("Solde restant dû" ci-dessous) — impossible de savoir en un coup
  // d'œil où ça coince lot par lot. Construit sur `appels` (pas
  // `appelsFiltres`) : comme les cartes de stats ci-dessus, indépendant
  // des filtres du tableau détaillé en dessous, pour toujours voir
  // l'ensemble des lots.
  const recapParLot = Object.values(
    appels.reduce((parLot, appel) => {
      const idLot = appel.lot?._id
      if (!idLot) return parLot
      if (!parLot[idLot]) {
        parLot[idLot] = { lot: appel.lot, totalEmis: 0, totalPaye: 0 }
      }
      if (appel.dateEmission) parLot[idLot].totalEmis += appel.montant
      if (appel.dateReglement) parLot[idLot].totalPaye += appel.montant
      return parLot
    }, {}),
  ).sort((a, b) => a.lot.reference.localeCompare(b.lot.reference))

  // Solde restant dû (21/07/2026, correction de Nicolas) : le reste à payer
  // d'un logement, c'est son prix TTC total moins ce qui a déjà été réglé —
  // pas "ce qui a été émis moins ce qui a été réglé" (les phases pas
  // encore émises restent quand même dues). Même règle sur la carte de
  // stat (somme sur tous les lots ayant au moins un appel) et dans le
  // récapitulatif par lot ci-dessous (ligne par ligne).
  const soldeRestant = recapParLot.reduce(
    (s, { lot, totalPaye: payeLot }) => s + lot.prixTTC - payeLot,
    0,
  )
  const totalPrixTTCRecap = recapParLot.reduce((s, { lot }) => s + lot.prixTTC, 0)

  // "Générer un appel de fonds" (20/07/2026, point 171, remarque de
  // Nicolas) — remplace l'ancienne option "Courrier appel de fonds (par
  // lot)" par un vrai envoi collectif : choix d'une phase (Réservation
  // exclue, comme pour l'attestation en masse — elle ne se déclenche
  // jamais à la main), puis des logements concernés à cocher/décocher.
  // Seuls les logements dont l'attestation MOE est déjà faite ET pas
  // encore émis sont proposés — générer un appel n'a de sens que dans ce
  // cas (règle métier n°2 de l'analyse Excel).
  function lotsPourPhase(phaseNom) {
    return appels
      .filter((a) => a.phase.nom === phaseNom && a.dateAttestationMOE && !a.dateEmission)
      .map((a) => ({ valeur: a.lot?._id, libelle: a.lot?.reference ?? '—' }))
      .sort((a, b) => a.libelle.localeCompare(b.libelle))
  }

  // Génère le courrier de chaque logement coché ET remplit "Envoyé le"
  // sur l'appel correspondant (modifiable à la main ensuite, comme
  // partout ailleurs dans l'appli) — les deux dans la même action, comme
  // demandé au point 171.
  async function genererAppelsDeFonds(phaseNom, idsLots) {
    const appelsAGenerer = idsLots
      .map((idLot) => appels.find((a) => a.phase.nom === phaseNom && a.lot?._id === idLot))
      .filter(Boolean)

    for (const appel of appelsAGenerer) {
      exporterPDF(donneesExportCourrier({ idAppel: appel._id, appels, appelsTries, programme }))
    }

    const dateDuJour = new Date().toISOString().slice(0, 10)
    const reponses = await Promise.all(
      appelsAGenerer.map((appel) =>
        apiFetch(`${API_URL}/api/appels-de-fonds/${appel._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateEmission: dateDuJour }),
        }),
      ),
    )
    if (reponses.some((r) => !r.ok)) {
      alert(
        'Les courriers ont été générés, mais "Envoyé le" n\'a pas pu être mis à jour pour tous les logements.',
      )
    }

    await chargerAppels()
  }

  return (
    <>
      <h1 className="titre-page">Appels de fonds</h1>

      <section className="stats">
        <StatCard valeur={appels.length} libelle="Appels au total" />
        <StatCard valeur={emisAuTotal} libelle="Émis (au total)" />
        <StatCard valeur={enAttente} libelle="En attente" />
        <StatCard valeur={aEmettre} libelle="À émettre" />
        <StatCard valeur={enRetard} libelle="En retard" />
        <StatCard valeur={regles} libelle="Réglés" />
      </section>

      <section className="stats">
        <StatCard valeur={formatMontant(totalEmis)} libelle="Total émis" />
        <StatCard valeur={formatMontant(totalPaye)} libelle="Total payé" />
        <StatCard valeur={formatMontant(soldeRestant)} libelle="Solde restant dû" />
      </section>

      <FormulaireAttestationMasse
        phases={nomsPhasesAttestables}
        onAppliquer={appliquerAttestationMasse}
        onVoirRecap={() => setRecapOuvert(true)}
      />
      {recapOuvert && (
        <FenetreRecapAttestations
          phasesTriees={phasesTriees.slice(1)}
          appels={appels}
          onFermer={() => setRecapOuvert(false)}
        />
      )}

      <FiltreStatuts statuts={STATUTS_FILTRE} actif={statutActif} onChange={setStatutActif} />
      <FiltreMultiple
        titre="Phase :"
        options={nomsPhases}
        valeursActives={phasesActives}
        onChange={setPhasesActives}
      />
      <FiltreMultiple
        titre="Lot :"
        options={referencesLots}
        valeursActives={lotsActifs}
        onChange={setLotsActifs}
      />
      <div className="barre-actions">
        <BarreRecherche
          valeur={recherche}
          onChange={setRecherche}
          placeholder="Rechercher un appel de fonds..."
        />
        <button
          type="button"
          className="bouton-accordeon"
          onClick={() => setRecapParLotOuvert((v) => !v)}
        >
          {recapParLotOuvert ? 'Masquer' : 'Voir'} le récapitulatif par lot
        </button>
        <button type="button" className="bouton-accordeon" onClick={() => setExportOuvert(true)}>
          Exporter
        </button>
      </div>

      {exportOuvert && (
        <FenetreExport
          options={[
            {
              valeur: 'generation',
              libelle: 'Générer un appel de fonds',
              type: 'generation',
              phases: nomsPhasesAttestables.map((nom) => ({ valeur: nom, libelle: nom })),
              lotsPourPhase,
              generer: genererAppelsDeFonds,
            },
            {
              valeur: 'statistiques',
              libelle: 'Statistiques (cartes)',
              donnees: () =>
                donneesExportStatistiques({
                  appels,
                  emisAuTotal,
                  enAttente,
                  aEmettre,
                  enRetard,
                  regles,
                  totalEmis,
                  totalPaye,
                  soldeRestant,
                  programme,
                }),
            },
            {
              valeur: 'recap-par-lot',
              libelle: 'Récapitulatif par lot',
              donnees: () =>
                donneesExportRecapParLot({
                  recapParLot,
                  totalPrixTTCRecap,
                  totalEmis,
                  totalPaye,
                  soldeRestant,
                  programme,
                }),
            },
            {
              valeur: 'detail-par-phase',
              libelle: 'Récapitulatif détaillé par phase',
              donnees: () =>
                donneesExportDetailParPhase({
                  programme,
                  phasesTriees,
                  recapParLot,
                  appels,
                  totalPrixTTCRecap,
                  totalPaye,
                  soldeRestant,
                }),
            },
          ]}
          onFermer={() => setExportOuvert(false)}
        />
      )}

      {/* Récapitulatif par lot (20/07/2026, remarque de Nicolas) : masqué
          par défaut, affiché à la demande plutôt qu'en permanence — vue
          d'ensemble du reste à payer logement par logement, indépendante
          des filtres du tableau détaillé plus bas. */}
      {recapParLotOuvert && (
        <RecapitulatifAppelsParLot
          recapParLot={recapParLot}
          totalPrixTTCRecap={totalPrixTTCRecap}
          totalEmis={totalEmis}
          totalPaye={totalPaye}
          soldeRestant={soldeRestant}
        />
      )}

      <div className="tableau-scroll">
        <table className="tableau-lots">
          <thead>
            <tr>
              <th>Lot</th>
              <th>Phase</th>
              <th>Avancement cumulé %</th>
              <th>Avancement %</th>
              <th className="colonne-montant">Montant TTC</th>
              <th>Date attestation</th>
              <th>Émis le</th>
              <th>Limite règlement</th>
              <th>Réglé le</th>
              <th>Statut</th>
              <th>Commentaire</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {appelsFiltres.length === 0 && (
              <tr>
                <td colSpan={NB_COLONNES}>Aucun appel de fonds ne correspond à ce filtre.</td>
              </tr>
            )}
            {appelsFiltres.map((appel, index) => {
              // Une ligne par phase, mais le barème se négocie par LOGEMENT
              // (13/07/2026) : le bouton/panneau n'apparaît qu'une fois, sur
              // la dernière ligne de chaque lot (la liste est déjà triée par
              // lot puis par phase.ordre, voir appelsTries plus haut).
              const dernierDuLot =
                index === appelsFiltres.length - 1 ||
                appelsFiltres[index + 1].lot?._id !== appel.lot?._id
              const appelsDuLot = appelsFiltres.filter((a) => a.lot?._id === appel.lot?._id)
              return (
                <LigneAppelDeFonds
                  key={appel._id}
                  appel={appel}
                  cumul={cumulsParAppel[index]}
                  dernierDuLot={dernierDuLot}
                  appelsDuLot={appelsDuLot}
                  colonnes={NB_COLONNES}
                  idEnEdition={idEnEdition}
                  idLotBaremeOuvert={idLotBaremeOuvert}
                  onModifier={setIdEnEdition}
                  onFermerModifier={() => setIdEnEdition(null)}
                  onEnregistrer={enregistrer}
                  onOuvrirBareme={setIdLotBaremeOuvert}
                  onFermerBareme={() => setIdLotBaremeOuvert(null)}
                  onEnregistrerBaremeLot={enregistrerBaremeLot}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default AppelsDeFonds
