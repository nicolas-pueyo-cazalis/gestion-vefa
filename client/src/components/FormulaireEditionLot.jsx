import { useState } from 'react'
import { STATUTS_LOT, ORDRE_STATUTS } from '../data/lots.js'

// Même conversion que pour les TMA : MongoDB renvoie "2026-07-01T00:00:00.000Z",
// <input type="date"> attend juste "2026-07-01".
function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

const NOUVEL_ACQUEREUR = '__nouveau__'

function FormulaireEditionLot({ lot, acquereurs, colonnes, onEnregistrer, onFermer }) {
  const [statut, setStatut] = useState(lot.statut)
  const [dateOption, setDateOption] = useState(versDateInput(lot.dateOption))
  const [dateReservation, setDateReservation] = useState(versDateInput(lot.dateReservation))
  const [dateActe, setDateActe] = useState(versDateInput(lot.dateActe))
  const [acquereurChoisi, setAcquereurChoisi] = useState(lot.acquereur?._id ?? '')
  const [civiliteNouveau, setCiviliteNouveau] = useState('M.')
  const [nomNouveau, setNomNouveau] = useState('')
  const [commentaire, setCommentaire] = useState(lot.commentaire ?? '')

  const indexStatut = ORDRE_STATUTS.indexOf(statut)
  const optionAutorisee = indexStatut >= 1
  const reservationAutorisee = indexStatut >= 2
  const acteAutorise = indexStatut >= 3

  // Changer le statut vide automatiquement les dates d'étapes non encore
  // atteintes — remarque du 10/07/2026 : la date affichée doit toujours
  // correspondre au statut du lot (ex: pas de date d'acte sur un lot
  // seulement "Réservé").
  function changerStatut(nouveauStatut) {
    setStatut(nouveauStatut)
    const index = ORDRE_STATUTS.indexOf(nouveauStatut)
    if (index < 1) setDateOption('')
    if (index < 2) setDateReservation('')
    if (index < 3) setDateActe('')
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    const donnees = {
      statut,
      dateOption: dateOption || null,
      dateReservation: dateReservation || null,
      dateActe: dateActe || null,
      commentaire: commentaire || null,
    }
    if (acquereurChoisi === NOUVEL_ACQUEREUR) {
      donnees.acquereurNouveau = { civilite: civiliteNouveau, nom: nomNouveau }
    } else {
      donnees.acquereur = acquereurChoisi || null
    }
    onEnregistrer(lot._id, donnees)
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <form onSubmit={soumettre}>
          <label>
            Statut
            <select value={statut} onChange={(e) => changerStatut(e.target.value)}>
              {Object.entries(STATUTS_LOT).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>{libelle}</option>
              ))}
            </select>
          </label>
          <label>
            Client
            <select value={acquereurChoisi} onChange={(e) => setAcquereurChoisi(e.target.value)}>
              <option value="">— Aucun —</option>
              {acquereurs.map((a) => (
                <option key={a._id} value={a._id}>
                  {[a.civilite, a.prenom, a.nom].filter(Boolean).join(' ')}
                </option>
              ))}
              <option value={NOUVEL_ACQUEREUR}>+ Nouveau client...</option>
            </select>
          </label>
          {acquereurChoisi === NOUVEL_ACQUEREUR && (
            <>
              <label>
                Civilité
                <select value={civiliteNouveau} onChange={(e) => setCiviliteNouveau(e.target.value)}>
                  <option value="M.">M.</option>
                  <option value="Mme">Mme</option>
                  <option value="M. et Mme">M. et Mme</option>
                </select>
              </label>
              <label>
                Nom
                <input value={nomNouveau} onChange={(e) => setNomNouveau(e.target.value)} required />
              </label>
            </>
          )}
          <label>
            Date option
            <input
              type="date"
              value={dateOption}
              onChange={(e) => setDateOption(e.target.value)}
              disabled={!optionAutorisee}
              title={optionAutorisee ? '' : 'Le statut doit être au moins "Option"'}
            />
          </label>
          <label>
            Date réservation
            <input
              type="date"
              value={dateReservation}
              onChange={(e) => setDateReservation(e.target.value)}
              disabled={!reservationAutorisee}
              title={reservationAutorisee ? '' : 'Le statut doit être au moins "Réservé"'}
            />
          </label>
          <label>
            Date acte
            <input
              type="date"
              value={dateActe}
              onChange={(e) => setDateActe(e.target.value)}
              disabled={!acteAutorise}
              title={acteAutorise ? '' : 'Le statut doit être "Acté"'}
            />
          </label>
          <label>
            Commentaire
            <input value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={onFermer}>Annuler</button>
        </form>
      </td>
    </tr>
  )
}

export default FormulaireEditionLot
