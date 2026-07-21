import { Fragment, useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import { statutSignature, calculerDateLimiteMois, formatDate } from '../utils/statuts.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import FormulaireSignatureActe from '../components/FormulaireSignatureActe.jsx'
import BoutonContact from '../components/BoutonContact.jsx'
import BarreRecherche from '../components/BarreRecherche.jsx'
import { correspondRecherche } from '../utils/recherche.js'

const NB_COLONNES = 9

const LIBELLES_STATUT = {
  attente: 'En attente',
  retard: 'En retard',
  signe: 'Signé',
}

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(LIBELLES_STATUT).map(([valeur, libelle]) => ({ valeur, libelle })),
]

// Même règle que pour le suivi de prêt : un lot n'entre dans ce suivi
// qu'une fois réservé (règle métier n°4 de l'analyse Excel — le délai de
// signature notaire part lui aussi de la réservation).
function estConcerne(lot) {
  return Boolean(lot.dateReservation)
}

function nomComplet(acquereur) {
  return [acquereur?.civilite, acquereur?.prenom, acquereur?.nom].filter(Boolean).join(' ') || '—'
}

// Texte de recherche (20/07/2026, point 187) : tout ce qui s'affiche dans
// la ligne, mêmes fonctions de formatage que le rendu du tableau.
function texteRechercheSignatureActe(lot, delaiMois) {
  const statut = statutSignature(lot, delaiMois)
  return [
    lot.reference,
    nomComplet(lot.acquereur),
    formatDate(lot.dateReservation),
    lot.acquereur?.notaire?.nom,
    formatDate(calculerDateLimiteMois(lot.dateReservation, delaiMois)),
    formatDate(lot.dateActe),
    LIBELLES_STATUT[statut],
    lot.commentaire,
  ].filter(Boolean).join(' ')
}

function SignatureActe() {
  const { programmeActif: programme } = useProgramme()
  const [lots, setLots] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [recherche, setRecherche] = useState('')
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

  // Signer l'acte ici revient à passer le lot au statut "Acté" avec sa
  // date de signature — même route que la page Lots/Paramètres, qui gère
  // déjà la validation des dates et déclenche au passage la génération
  // des appels de fonds (server/routes/lots.js, genererAppelsDeFonds()).
  // Le notaire (13/07/2026) est rattaché à l'acquéreur, pas au lot : deux
  // requêtes distinctes quand un acquéreur est lié.
  // "statut: acte" envoyé UNIQUEMENT si une date est fournie (20/07/2026,
  // point 176) : sinon, ouvrir ce panneau juste pour modifier le
  // commentaire du lot forcerait une signature d'acte non voulue.
  async function enregistrer(lot, { dateActe, notaire, commentaire }) {
    const donneesLot = dateActe ? { statut: 'acte', dateActe, commentaire } : { commentaire }
    const reponseLot = await apiFetch(`${API_URL}/api/lots/${lot._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donneesLot),
    })
    if (!reponseLot.ok) {
      const { message } = await reponseLot.json()
      alert(message)
      return
    }

    if (lot.acquereur) {
      const reponseAcquereur = await apiFetch(`${API_URL}/api/acquereurs/${lot.acquereur._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaire }),
      })
      if (!reponseAcquereur.ok) {
        const { message } = await reponseAcquereur.json()
        alert(message)
        return
      }
    }

    await chargerLots()
    setIdEnEdition(null)
  }

  if (chargement) return <p>Chargement du suivi de signature...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  const delaiMois = programme.parametres.delaiSignatureNotaireMois

  const lotsConcernes = lots
    .filter(estConcerne)
    .sort((a, b) => a.reference.localeCompare(b.reference))

  const lotsFiltres = lotsConcernes
    .filter((lot) => statutActif === 'tous' || statutSignature(lot, delaiMois) === statutActif)
    .filter((lot) => correspondRecherche(texteRechercheSignatureActe(lot, delaiMois), recherche))

  const enAttente = lotsConcernes.filter((l) => statutSignature(l, delaiMois) === 'attente').length
  const enRetard = lotsConcernes.filter((l) => statutSignature(l, delaiMois) === 'retard').length
  const signes = lotsConcernes.filter((l) => statutSignature(l, delaiMois) === 'signe').length

  return (
    <>
      <h1 className="titre-page">Signature acte</h1>

      <section className="stats">
        <StatCard valeur={lotsConcernes.length} libelle="Dossiers concernés" />
        <StatCard valeur={enAttente} libelle="En attente" />
        <StatCard valeur={enRetard} libelle="En retard" />
        <StatCard valeur={signes} libelle="Signés" />
      </section>

      <div className="barre-actions">
        <FiltreStatuts statuts={STATUTS_FILTRE} actif={statutActif} onChange={setStatutActif} />
        <BarreRecherche valeur={recherche} onChange={setRecherche} placeholder="Rechercher un dossier..." />
      </div>

      <div className="tableau-scroll tableau-scroll--marge">
        <table className="tableau-lots">
          <thead>
            <tr>
              <th>Lot</th>
              <th>Client</th>
              <th>Réservation</th>
              <th>Notaire</th>
              <th>Limite signature</th>
              <th>Date de l'acte</th>
              <th>Statut</th>
              <th>Commentaire</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lotsFiltres.length === 0 && (
              <tr>
                <td colSpan={NB_COLONNES}>Aucun dossier ne correspond à ce filtre.</td>
              </tr>
            )}
            {lotsFiltres.map((lot) => (
              <Fragment key={lot._id}>
                <tr>
                  <td>{lot.reference}</td>
                  <td>{nomComplet(lot.acquereur)}</td>
                  <td>{formatDate(lot.dateReservation)}</td>
                  <td><BoutonContact titre="Notaire" contact={lot.acquereur?.notaire} /></td>
                  <td>{formatDate(calculerDateLimiteMois(lot.dateReservation, delaiMois))}</td>
                  <td>{formatDate(lot.dateActe)}</td>
                  <td>
                    <Badge statut={statutSignature(lot, delaiMois)} texte={LIBELLES_STATUT[statutSignature(lot, delaiMois)]} />
                  </td>
                  <td><span className="commentaire-cellule">{lot.commentaire || '—'}</span></td>
                  <td className="actions">
                    <button
                      type="button"
                      className="bouton-icone"
                      title="Modifier"
                      aria-label="Modifier"
                      onClick={() => setIdEnEdition(lot._id)}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </td>
                </tr>
                {idEnEdition === lot._id && (
                  <FormulaireSignatureActe
                    lot={lot}
                    colonnes={NB_COLONNES}
                    onEnregistrer={enregistrer}
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

export default SignatureActe
