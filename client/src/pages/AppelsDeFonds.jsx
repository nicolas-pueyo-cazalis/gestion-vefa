import { Fragment, useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { formatMontant } from '../utils/formatMontant.js'
import { statutAppel, formatDate } from '../utils/statuts.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import FiltreMultiple from '../components/FiltreMultiple.jsx'
import FormulaireAppelDeFonds from '../components/FormulaireAppelDeFonds.jsx'
import FormulaireAttestationMasse from '../components/FormulaireAttestationMasse.jsx'

const NB_COLONNES = 9

const LIBELLES_STATUT = {
  attente: 'En attente',
  emis: 'Émis',
  retard: 'En retard',
  regle: 'Réglé',
}

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(LIBELLES_STATUT).map(([valeur, libelle]) => ({ valeur, libelle })),
]

function AppelsDeFonds() {
  const [appels, setAppels] = useState([])
  const [programme, setProgramme] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [phasesActives, setPhasesActives] = useState([])
  const [lotsActifs, setLotsActifs] = useState([])
  const [idEnEdition, setIdEnEdition] = useState(null)

  async function chargerAppels() {
    const reponse = await apiFetch(`${API_URL}/api/appels-de-fonds`)
    setAppels(await reponse.json())
  }

  useEffect(() => {
    async function init() {
      try {
        const reponseProgramme = await apiFetch(`${API_URL}/api/programme`)
        setProgramme(await reponseProgramme.json())
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

  async function appliquerAttestationMasse(donnees) {
    const reponse = await apiFetch(`${API_URL}/api/appels-de-fonds/phase`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
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

      <FormulaireAttestationMasse phases={nomsPhasesAttestables} onAppliquer={appliquerAttestationMasse} />

      <FiltreStatuts statuts={STATUTS_FILTRE} actif={statutActif} onChange={setStatutActif} />
      <FiltreMultiple titre="Phase :" options={nomsPhases} valeursActives={phasesActives} onChange={setPhasesActives} />
      <FiltreMultiple titre="Lot :" options={referencesLots} valeursActives={lotsActifs} onChange={setLotsActifs} />

      <table>
        <thead>
          <tr>
            <th>Lot</th>
            <th>Phase</th>
            <th>%</th>
            <th>Montant</th>
            <th>Attestation MOE</th>
            <th>Limite règlement</th>
            <th>Réglé le</th>
            <th>Statut</th>
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
          {appelsFiltres.map((appel) => (
            <Fragment key={appel._id}>
              <tr>
                <td>{appel.lot?.reference ?? '—'}</td>
                <td>{appel.phase.nom}</td>
                <td>{Math.round(appel.phase.pourcentage * 100)}%</td>
                <td>{formatMontant(appel.montant)}</td>
                <td>{formatDate(appel.dateAttestationMOE)}</td>
                <td>{formatDate(appel.dateLimiteReglement)}</td>
                <td>{formatDate(appel.dateReglement)}</td>
                <td><Badge statut={statutAppel(appel)} texte={LIBELLES_STATUT[statutAppel(appel)]} /></td>
                <td className="actions">
                  <button type="button" onClick={() => setIdEnEdition(appel._id)}>Modifier</button>
                </td>
              </tr>
              {idEnEdition === appel._id && (
                <FormulaireAppelDeFonds
                  appel={appel}
                  colonnes={NB_COLONNES}
                  onEnregistrer={enregistrer}
                  onFermer={() => setIdEnEdition(null)}
                />
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </>
  )
}

export default AppelsDeFonds
