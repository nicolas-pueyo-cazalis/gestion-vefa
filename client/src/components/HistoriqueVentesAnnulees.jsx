import { Fragment } from 'react'
import { STATUTS_LOT } from '../data/lots.js'
import { STATUTS_TMA } from '../data/tma.js'
import { formatMontant } from '../utils/formatMontant.js'
import { formatDate } from '../utils/statuts.js'
import Badge from './Badge.jsx'
import BoutonContact from './BoutonContact.jsx'

// Table "Ventes annulées" de l'historique fusionné de la page Lots
// (17/07/2026, remarque de Nicolas), extraite de Lots.jsx (04/09/2026,
// point 236, découpage) — même principe que RecapitulatifAppelsParLot.jsx
// du découpage AppelsDeFonds.jsx : composant-table autonome (fait sa
// propre boucle sur `historiqueAnnulations`), pas juste une ligne.
// `derniereDateAnnulation`/`nomClient` restent définis dans Lots.jsx
// (testés directement par Lots.test.js) et sont transmis ici tels
// quels, en paramètre — évite un import circulaire.
function HistoriqueVentesAnnulees({
  historiqueAnnulations,
  tmaList,
  idAnnulationOuverte,
  onBasculerAnnulation,
  derniereDateAnnulation,
  nomClient,
}) {
  return (
    <>
      <h3>Ventes annulées</h3>
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
            {historiqueAnnulations.length === 0 && (
              <tr>
                <td colSpan={7}>Aucune vente annulée pour l'instant.</td>
              </tr>
            )}
            {historiqueAnnulations.map((entree) => {
              const tmaDuLot = tmaList.filter((tma) => tma.lot?._id === entree.lot)
              const detailOuvert = idAnnulationOuverte === entree._id
              return (
                <Fragment key={entree._id}>
                  <tr>
                    <td>{entree.referenceLot}</td>
                    <td>
                      <Badge
                        statut={entree.statutAvantAnnulation}
                        texte={STATUTS_LOT[entree.statutAvantAnnulation]}
                      />
                    </td>
                    <td>{derniereDateAnnulation(entree)}</td>
                    <td>
                      <span className="nom-client">{nomClient(entree)}</span>
                    </td>
                    <td>
                      <span className="commentaire-cellule">{entree.commentaire || '—'}</span>
                    </td>
                    <td>{formatDate(entree.dateAnnulation)}</td>
                    <td className="actions">
                      <button type="button" onClick={() => onBasculerAnnulation(entree._id)}>
                        {detailOuvert ? 'Masquer' : 'Détail'}
                      </button>
                    </td>
                  </tr>
                  {detailOuvert && (
                    <tr className="formulaire-dates">
                      <td colSpan={7}>
                        <div className="detail-annulation">
                          <div className="detail-annulation-bloc">
                            <h3>Prêt</h3>
                            {entree.sansPret ? (
                              <p>Acquisition avec fonds personnels.</p>
                            ) : (
                              <ul>
                                <li>
                                  Banque : <BoutonContact titre="Banque" contact={entree.banque} />
                                </li>
                                <li>
                                  Courtier :{' '}
                                  <BoutonContact titre="Courtier" contact={entree.courtier} />
                                </li>
                                <li>Offre reçue le : {formatDate(entree.dateOffrePretRecue)}</li>
                              </ul>
                            )}
                          </div>
                          <div className="detail-annulation-bloc">
                            <h3>Acte</h3>
                            <ul>
                              <li>
                                Notaire : <BoutonContact titre="Notaire" contact={entree.notaire} />
                              </li>
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
                                    {appel.dateReglement
                                      ? ` — réglé le ${formatDate(appel.dateReglement)}`
                                      : ' — non réglé'}
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
                                    {tma.description} —{' '}
                                    <Badge statut={tma.statut} texte={STATUTS_TMA[tma.statut]} />
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

export default HistoriqueVentesAnnulees
