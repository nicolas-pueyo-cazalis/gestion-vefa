import { Fragment, useEffect, useState } from 'react'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import StatCard from '../components/StatCard.jsx'
import FormulaireEditionClient from '../components/FormulaireEditionClient.jsx'

const NB_COLONNES = 8

function nomComplet(acquereur) {
  return [acquereur.civilite, acquereur.prenom, acquereur.nom].filter(Boolean).join(' ')
}

// Coordonnées "complètes" = tout ce qui est utile pour un futur export/
// listing (adresse, commune, code postal, téléphone, email) — sert juste
// à repérer d'un coup d'œil les fiches encore à compléter.
function coordonneesCompletes(acquereur) {
  return Boolean(
    acquereur.adresse && acquereur.commune && acquereur.codePostal
      && acquereur.telephone && acquereur.email,
  )
}

function numerosLogements(acquereur) {
  return acquereur.lots?.length > 0 ? acquereur.lots.map((l) => l.reference).join(', ') : '—'
}

// Affichage demandé par Nicolas : format national "06 XX XX XX XX" pour
// les numéros français, format international (avec le "+") pour les
// numéros étrangers — le stockage reste en E.164 (+33...) dans les deux
// cas, seul l'affichage change.
function formatTelephoneAffichage(telephone) {
  if (!telephone) return null
  const numero = parsePhoneNumberFromString(telephone)
  if (!numero) return telephone
  return numero.country === 'FR' ? numero.formatNational() : numero.formatInternational()
}

// Tri par n° de logement (et non par nom) — les clients sans lot lié
// passent en fin de liste.
function comparerParLogement(a, b) {
  const refA = a.lots?.[0]?.reference ?? null
  const refB = b.lots?.[0]?.reference ?? null
  if (refA === null && refB === null) return 0
  if (refA === null) return 1
  if (refB === null) return -1
  return refA.localeCompare(refB)
}

function Clients() {
  const { programmeActif } = useProgramme()
  const [acquereurs, setAcquereurs] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [idEnEdition, setIdEnEdition] = useState(null)

  async function chargerAcquereurs() {
    const reponse = await apiFetch(`${API_URL}/api/acquereurs?programme=${programmeActif._id}`)
    setAcquereurs(await reponse.json())
  }

  useEffect(() => {
    async function chargerTout() {
      try {
        await chargerAcquereurs()
      } catch (e) {
        setErreur(e.message)
      } finally {
        setChargement(false)
      }
    }
    chargerTout()
  }, [])

  async function enregistrerAcquereur(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/acquereurs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    await chargerAcquereurs()
    setIdEnEdition(null)
  }

  if (chargement) return <p>Chargement des clients...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  const completes = acquereurs.filter(coordonneesCompletes).length
  const acquereursTries = [...acquereurs].sort(comparerParLogement)

  return (
    <>
      <h1 className="titre-page">Clients</h1>

      <section className="stats">
        <StatCard valeur={acquereurs.length} libelle="Clients au total" />
        <StatCard valeur={completes} libelle="Coordonnées complètes" />
        <StatCard valeur={acquereurs.length - completes} libelle="À compléter" />
      </section>

      <div className="tableau-scroll tableau-scroll--marge">
        <table className="tableau-lots">
          <thead>
            <tr>
              <th>N° logement</th>
              <th>Nom</th>
              <th>Adresse</th>
              <th>Commune</th>
              <th>Code postal</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {acquereursTries.length === 0 && (
              <tr>
                <td colSpan={NB_COLONNES}>Aucun client pour l'instant.</td>
              </tr>
            )}
            {acquereursTries.map((acquereur) => (
              <Fragment key={acquereur._id}>
                <tr>
                  <td className="logement-cellule">{numerosLogements(acquereur)}</td>
                  <td><span className="nom-client">{nomComplet(acquereur)}</span></td>
                  <td><span className="adresse-cellule">{acquereur.adresse || '—'}</span></td>
                  <td>{acquereur.commune || '—'}</td>
                  <td>{acquereur.codePostal || '—'}</td>
                  <td>{formatTelephoneAffichage(acquereur.telephone) || '—'}</td>
                  <td><span className="email-cellule">{acquereur.email || '—'}</span></td>
                  <td className="actions">
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
                  </td>
                </tr>
                {idEnEdition === acquereur._id && (
                  <FormulaireEditionClient
                    acquereur={acquereur}
                    colonnes={NB_COLONNES}
                    onEnregistrer={enregistrerAcquereur}
                    onFermer={() => setIdEnEdition(null)}
                  />
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default Clients
