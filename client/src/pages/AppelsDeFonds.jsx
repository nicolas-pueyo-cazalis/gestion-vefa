import { Fragment, useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import { formatMontant } from '../utils/formatMontant.js'
import { statutAppel, formatDate } from '../utils/statuts.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import BarreRecherche from '../components/BarreRecherche.jsx'
import { correspondRecherche } from '../utils/recherche.js'
import FiltreMultiple from '../components/FiltreMultiple.jsx'
import FormulaireAppelDeFonds from '../components/FormulaireAppelDeFonds.jsx'
import FormulaireAttestationMasse from '../components/FormulaireAttestationMasse.jsx'
import FormulaireBaremeLot from '../components/FormulaireBaremeLot.jsx'
import FenetreRecapAttestations from '../components/FenetreRecapAttestations.jsx'

const NB_COLONNES = 12

const LIBELLES_STATUT = {
  attente: 'En attente',
  emis: 'Émis',
  retard: 'En retard',
  regle: 'Réglé',
}

// Texte de recherche (20/07/2026, point 187) : tout ce qui s'affiche dans
// la ligne, mêmes fonctions de formatage que le rendu du tableau.
function texteRechercheAppel(appel) {
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
  ].filter(Boolean).join(' ')
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
  const soldeRestant = totalEmis - totalPaye

  // Récapitulatif par lot (20/07/2026, remarque de Nicolas) : jusqu'ici,
  // le reste à payer n'apparaissait qu'au niveau du programme entier
  // ("Solde restant dû" ci-dessus) — impossible de savoir en un coup
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

  return (
    <>
      <h1 className="titre-page">Appels de fonds</h1>

      <section className="stats">
        <StatCard valeur={appels.length} libelle="Appels au total" />
        <StatCard valeur={emisAuTotal} libelle="Émis (au total)" />
        <StatCard valeur={enAttente} libelle="En attente" />
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
      <FiltreMultiple titre="Phase :" options={nomsPhases} valeursActives={phasesActives} onChange={setPhasesActives} />
      <FiltreMultiple titre="Lot :" options={referencesLots} valeursActives={lotsActifs} onChange={setLotsActifs} />
      <div className="barre-actions">
        <BarreRecherche valeur={recherche} onChange={setRecherche} placeholder="Rechercher un appel de fonds..." />
        <button type="button" className="bouton-accordeon" onClick={() => setRecapParLotOuvert((v) => !v)}>
          {recapParLotOuvert ? 'Masquer' : 'Voir'} le récapitulatif par lot
        </button>
      </div>

      {/* Récapitulatif par lot (20/07/2026, remarque de Nicolas) : masqué
          par défaut, affiché à la demande plutôt qu'en permanence — vue
          d'ensemble du reste à payer logement par logement, indépendante
          des filtres du tableau détaillé plus bas. */}
      {recapParLotOuvert && (
        <div className="tableau-scroll tableau-scroll--marge tableau-recap-par-lot">
          <table className="tableau-lots">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Prix TTC</th>
                <th>Total émis</th>
                <th>Total payé</th>
                <th>Reste à payer</th>
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
                  <td>{formatMontant(lot.prixTTC)}</td>
                  <td>{formatMontant(emisLot)}</td>
                  <td>{formatMontant(payeLot)}</td>
                  <td>{formatMontant(emisLot - payeLot)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="tableau-scroll">
      <table className="tableau-lots">
        <thead>
          <tr>
            <th>Lot</th>
            <th>Phase</th>
            <th>Avancement cumulé %</th>
            <th>Avancement %</th>
            <th>Montant TTC</th>
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
              <td colSpan={NB_COLONNES}>
                Aucun appel de fonds ne correspond à ce filtre.
              </td>
            </tr>
          )}
          {appelsFiltres.map((appel, index) => {
            // Une ligne par phase, mais le barème se négocie par LOGEMENT
            // (13/07/2026) : le bouton/panneau n'apparaît qu'une fois, sur
            // la dernière ligne de chaque lot (la liste est déjà triée par
            // lot puis par phase.ordre, voir appelsTries plus haut).
            const dernierDuLot = index === appelsFiltres.length - 1
              || appelsFiltres[index + 1].lot?._id !== appel.lot?._id
            const appelsDuLot = appelsFiltres.filter((a) => a.lot?._id === appel.lot?._id)
            return (
              <Fragment key={appel._id}>
                <tr>
                  <td>{appel.lot?.reference ?? '—'}</td>
                  <td>{appel.phase.nom}</td>
                  <td>{Math.round(cumulsParAppel[index] * 100)}%</td>
                  <td>{Math.round(appel.phase.pourcentage * 100)}%</td>
                  <td>{formatMontant(appel.montant)}</td>
                  <td>{formatDate(appel.dateAttestationMOE)}</td>
                  <td>{formatDate(appel.dateEmission)}</td>
                  <td>{formatDate(appel.dateLimiteReglement)}</td>
                  <td>{formatDate(appel.dateReglement)}</td>
                  <td><Badge statut={statutAppel(appel)} texte={LIBELLES_STATUT[statutAppel(appel)]} /></td>
                  <td><span className="commentaire-cellule">{appel.commentaire || '—'}</span></td>
                  <td className="actions">
                    <button
                      type="button"
                      className="bouton-icone"
                      title="Modifier"
                      aria-label="Modifier"
                      onClick={() => setIdEnEdition(appel._id)}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </td>
                </tr>
                {idEnEdition === appel._id && (
                  <FormulaireAppelDeFonds
                    appel={appel}
                    colonnes={NB_COLONNES}
                    onEnregistrer={enregistrer}
                    onFermer={() => setIdEnEdition(null)}
                    onOuvrirBaremeLot={
                      dernierDuLot && appel.lot ? () => setIdLotBaremeOuvert(appel.lot._id) : undefined
                    }
                  />
                )}
                {dernierDuLot && idLotBaremeOuvert === appel.lot?._id && (
                  <FormulaireBaremeLot
                    lotId={appel.lot._id}
                    prixTTC={appel.lot.prixTTC}
                    appels={appelsDuLot}
                    colonnes={NB_COLONNES}
                    onEnregistrer={enregistrerBaremeLot}
                    onFermer={() => setIdLotBaremeOuvert(null)}
                  />
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      </div>
    </>
  )
}

export default AppelsDeFonds
