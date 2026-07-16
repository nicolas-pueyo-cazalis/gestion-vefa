import { Fragment, useEffect, useState } from 'react'
import { STATUTS_LOT } from '../data/lots.js'
import { STATUTS_TMA } from '../data/tma.js'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { formatDate } from '../utils/statuts.js'
import { formatMontant } from '../utils/formatMontant.js'
import Badge from '../components/Badge.jsx'
import BoutonContact from '../components/BoutonContact.jsx'

const NB_COLONNES = 7

function nomClient(entree) {
  return [entree.civiliteClient, entree.prenomClient, entree.nomClient].filter(Boolean).join(' ') || '—'
}

// Dernière date atteinte avant l'annulation (acte > réservation > option) —
// même logique que dateActuelle() dans Lots.jsx, pour une lecture cohérente
// entre les deux pages.
function derniereDate(entree) {
  return formatDate(entree.dateActe || entree.dateReservation || entree.dateOption)
}

function HistoriqueAnnulations() {
  const [historique, setHistorique] = useState([])
  const [tmaList, setTmaList] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [idOuvert, setIdOuvert] = useState(null)

  useEffect(() => {
    async function charger() {
      try {
        const [reponseHistorique, reponseTma] = await Promise.all([
          apiFetch(`${API_URL}/api/historique-annulations`),
          apiFetch(`${API_URL}/api/tma`),
        ])
        setHistorique(await reponseHistorique.json())
        setTmaList(await reponseTma.json())
      } catch (e) {
        setErreur(e.message)
      } finally {
        setChargement(false)
      }
    }
    charger()
  }, [])

  if (chargement) return <p>Chargement de l'historique...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  return (
    <>
      <h1 className="titre-page">Annulés</h1>
      <p className="sous-titre-page">
        Historique des ventes annulées — le logement lui-même est de nouveau "Libre" et
        proposé à la vente sur la page Lots ; ce qui était renseigné au moment de
        l'annulation (client, prêt, acte, appels de fonds) reste consultable ici. Les TMA,
        elles, restent visibles sur leur propre page (avec un avertissement).
      </p>

      <div className="tableau-scroll tableau-scroll--marge">
        <table className="tableau-lots">
          <thead>
            <tr>
              <th>Logement</th>
              <th>Statut avant annulation</th>
              <th>Date</th>
              <th>Client</th>
              <th>Commentaire</th>
              <th>Annulé le</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {historique.length === 0 && (
              <tr>
                <td colSpan={NB_COLONNES}>Aucune vente annulée pour l'instant.</td>
              </tr>
            )}
            {historique.map((entree) => {
              const tmaDuLot = tmaList.filter((tma) => tma.lot?._id === entree.lot)
              return (
                <Fragment key={entree._id}>
                  <tr>
                    <td>{entree.referenceLot}</td>
                    <td><Badge statut={entree.statutAvantAnnulation} texte={STATUTS_LOT[entree.statutAvantAnnulation]} /></td>
                    <td>{derniereDate(entree)}</td>
                    <td><span className="nom-client">{nomClient(entree)}</span></td>
                    <td><span className="commentaire-cellule">{entree.commentaire || '—'}</span></td>
                    <td>{formatDate(entree.dateAnnulation)}</td>
                    <td className="actions">
                      <button type="button" onClick={() => setIdOuvert(idOuvert === entree._id ? null : entree._id)}>
                        {idOuvert === entree._id ? 'Masquer' : 'Détail'}
                      </button>
                    </td>
                  </tr>
                  {idOuvert === entree._id && (
                    <tr className="formulaire-dates">
                      <td colSpan={NB_COLONNES}>
                        <div className="detail-annulation">
                          <div className="detail-annulation-bloc">
                            <h3>Prêt</h3>
                            {entree.sansPret ? (
                              <p>Acquisition avec fonds personnels.</p>
                            ) : (
                              <ul>
                                <li>Banque : <BoutonContact titre="Banque" contact={entree.banque} /></li>
                                <li>Courtier : <BoutonContact titre="Courtier" contact={entree.courtier} /></li>
                                <li>Offre reçue le : {formatDate(entree.dateOffrePretRecue)}</li>
                              </ul>
                            )}
                          </div>
                          <div className="detail-annulation-bloc">
                            <h3>Acte</h3>
                            <ul>
                              <li>Notaire : <BoutonContact titre="Notaire" contact={entree.notaire} /></li>
                              <li>Date de l'acte : {formatDate(entree.dateActe)}</li>
                            </ul>
                          </div>
                          <div className="detail-annulation-bloc">
                            <h3>Appels de fonds ({entree.appelsDeFonds.length})</h3>
                            {entree.appelsDeFonds.length === 0 ? (
                              <p>Aucun appel de fonds généré.</p>
                            ) : (
                              <ul>
                                {entree.appelsDeFonds.map((appel, i) => (
                                  <li key={i}>
                                    {appel.phase.nom} — {formatMontant(appel.montant)}
                                    {appel.dateReglement ? ` — réglé le ${formatDate(appel.dateReglement)}` : ' — non réglé'}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="detail-annulation-bloc">
                            <h3>TMA ({tmaDuLot.length})</h3>
                            {tmaDuLot.length === 0 ? (
                              <p>Aucune TMA liée à ce logement.</p>
                            ) : (
                              <ul>
                                {tmaDuLot.map((tma) => (
                                  <li key={tma._id}>
                                    {tma.description} — <Badge statut={tma.statut} texte={STATUTS_TMA[tma.statut]} />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
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

export default HistoriqueAnnulations
