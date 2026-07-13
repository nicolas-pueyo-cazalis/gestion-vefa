import { Fragment, useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { statutSignature, calculerDateLimiteMois, formatDate } from '../utils/statuts.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import FormulaireSignatureActe from '../components/FormulaireSignatureActe.jsx'
import BoutonContact from '../components/BoutonContact.jsx'

const NB_COLONNES = 8

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

function SignatureActe() {
  const [lots, setLots] = useState([])
  const [programme, setProgramme] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [idEnEdition, setIdEnEdition] = useState(null)

  async function chargerLots() {
    const reponse = await fetch(`${API_URL}/api/lots`)
    setLots(await reponse.json())
  }

  useEffect(() => {
    async function init() {
      try {
        const reponseProgramme = await fetch(`${API_URL}/api/programme`)
        setProgramme(await reponseProgramme.json())
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
  async function enregistrer(lot, { dateActe, notaire }) {
    const reponseLot = await fetch(`${API_URL}/api/lots/${lot._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'acte', dateActe }),
    })
    if (!reponseLot.ok) {
      const { message } = await reponseLot.json()
      alert(message)
      return
    }

    if (lot.acquereur) {
      const reponseAcquereur = await fetch(`${API_URL}/api/acquereurs/${lot.acquereur._id}`, {
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

      <FiltreStatuts statuts={STATUTS_FILTRE} actif={statutActif} onChange={setStatutActif} />

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
                  <td className="actions">
                    <button type="button" onClick={() => setIdEnEdition(lot._id)}>Modifier</button>
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
