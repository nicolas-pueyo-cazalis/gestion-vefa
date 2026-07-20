import { Fragment, useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import { statutPret, calculerDateLimiteJours, formatDate } from '../utils/statuts.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import FormulaireSuiviPret from '../components/FormulaireSuiviPret.jsx'
import BoutonContact from '../components/BoutonContact.jsx'

const NB_COLONNES = 9
// Nombre de colonnes fusionnées pour une acquisition "sans prêt" : Banque,
// Courtier, Limite obtention prêt, Offre reçue le, Statut.
const NB_COLONNES_FUSIONNEES = 5

const LIBELLES_STATUT = {
  attente: 'En attente',
  retard: 'En retard',
  recue: 'Offre reçue',
  sans_pret: 'Sans prêt',
}

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(LIBELLES_STATUT).map(([valeur, libelle]) => ({ valeur, libelle })),
]

// Un lot n'entre dans ce suivi qu'une fois réservé (règle métier n°4 de
// l'analyse Excel : le délai d'obtention du prêt part de la réservation) —
// les lots encore "libre"/"option" n'ont pas de date de réservation.
function estConcerne(lot) {
  return Boolean(lot.dateReservation)
}

function nomComplet(acquereur) {
  return [acquereur?.civilite, acquereur?.prenom, acquereur?.nom].filter(Boolean).join(' ') || '—'
}

function SuiviPret() {
  const { programmeActif: programme } = useProgramme()
  const [lots, setLots] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [idEnEdition, setIdEnEdition] = useState(null)

  async function chargerLots() {
    const reponse = await apiFetch(`${API_URL}/api/lots?programme=${programme._id}`)
    setLots(await reponse.json())
  }

  useEffect(() => {
    async function init() {
      try {
        await chargerLots()
      } catch (e) {
        setErreur(e.message)
      } finally {
        setChargement(false)
      }
    }
    init()
  }, [])

  async function enregistrer(idAcquereur, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/acquereurs/${idAcquereur}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    await chargerLots()
    setIdEnEdition(null)
  }

  // Bouton "Sans prêt" (remarque du 13/07/2026, point 2) : vide banque/
  // courtier/date d'offre, la ligne se fusionne ensuite côté affichage.
  // "Reprendre le suivi" fait l'inverse, pour ne pas être un aller simple.
  async function basculerSansPret(idAcquereur, sansPret) {
    await enregistrer(idAcquereur, {
      sansPret,
      ...(sansPret && { banque: null, courtier: null, dateOffrePretRecue: null }),
    })
  }

  if (chargement) return <p>Chargement du suivi de prêt...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  const delaiJours = programme.parametres.delaiObtentionPretJours

  const lotsConcernes = lots
    .filter(estConcerne)
    .sort((a, b) => a.reference.localeCompare(b.reference))

  const lotsFiltres = lotsConcernes
    .filter((lot) => statutActif === 'tous' || statutPret(lot, delaiJours) === statutActif)

  const enAttente = lotsConcernes.filter((l) => statutPret(l, delaiJours) === 'attente').length
  const enRetard = lotsConcernes.filter((l) => statutPret(l, delaiJours) === 'retard').length
  const recues = lotsConcernes.filter((l) => statutPret(l, delaiJours) === 'recue').length
  const sansPretNombre = lotsConcernes.filter((l) => statutPret(l, delaiJours) === 'sans_pret').length

  return (
    <>
      <h1 className="titre-page">Suivi de prêt</h1>

      <section className="stats">
        <StatCard valeur={lotsConcernes.length} libelle="Dossiers concernés" />
        <StatCard valeur={enAttente} libelle="En attente" />
        <StatCard valeur={enRetard} libelle="En retard" />
        <StatCard valeur={recues} libelle="Offres reçues" />
        <StatCard valeur={sansPretNombre} libelle="Sans prêt" />
      </section>

      <FiltreStatuts statuts={STATUTS_FILTRE} actif={statutActif} onChange={setStatutActif} />

      <div className="tableau-scroll tableau-scroll--marge">
        <table className="tableau-lots">
          <thead>
            <tr>
              <th>Lot</th>
              <th>Client</th>
              <th>Réservation</th>
              <th>Banque</th>
              <th>Courtier</th>
              <th>Limite obtention prêt</th>
              <th>Offre reçue le</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lotsFiltres.length === 0 && (
              <tr>
                <td colSpan={NB_COLONNES}>Aucun dossier ne correspond à ce filtre.</td>
              </tr>
            )}
            {lotsFiltres.map((lot) => {
              const statut = statutPret(lot, delaiJours)
              const acquereur = lot.acquereur
              return (
                <Fragment key={lot._id}>
                  <tr>
                    <td>{lot.reference}</td>
                    <td>{nomComplet(acquereur)}</td>
                    <td>{formatDate(lot.dateReservation)}</td>
                    {statut === 'sans_pret' ? (
                      <td colSpan={NB_COLONNES_FUSIONNEES} className="cellule-fusionnee">
                        Acquisition avec fonds personnels
                      </td>
                    ) : (
                      <>
                        <td><BoutonContact titre="Banque" contact={acquereur?.banque} /></td>
                        <td><BoutonContact titre="Courtier" contact={acquereur?.courtier} /></td>
                        <td>{formatDate(calculerDateLimiteJours(lot.dateReservation, delaiJours))}</td>
                        <td>{formatDate(acquereur?.dateOffrePretRecue)}</td>
                        <td>
                          <Badge statut={statut} texte={LIBELLES_STATUT[statut]} />
                        </td>
                      </>
                    )}
                    <td className="actions">
                      {acquereur && statut !== 'sans_pret' && (
                        <>
                          <button
                            type="button"
                            className="bouton-icone"
                            title="Modifier"
                            aria-label="Modifier"
                            onClick={() => setIdEnEdition(acquereur._id)}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button type="button" onClick={() => basculerSansPret(acquereur._id, true)}>Sans prêt</button>
                        </>
                      )}
                      {acquereur && statut === 'sans_pret' && (
                        <button type="button" onClick={() => basculerSansPret(acquereur._id, false)}>
                          Reprendre le suivi
                        </button>
                      )}
                    </td>
                  </tr>
                  {acquereur && idEnEdition === acquereur._id && (
                    <FormulaireSuiviPret
                      acquereur={acquereur}
                      colonnes={NB_COLONNES}
                      onEnregistrer={enregistrer}
                      onFermer={() => setIdEnEdition(null)}
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

export default SuiviPret
