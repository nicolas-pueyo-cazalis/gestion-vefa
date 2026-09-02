import { useState } from 'react'
import { STATUTS_LOT, ORDRE_STATUTS } from '../data/lots.js'
import FormulairePrixLot from './FormulairePrixLot.jsx'

// Même conversion que pour les TMA : MongoDB renvoie "2026-07-01T00:00:00.000Z",
// <input type="date"> attend juste "2026-07-01".
function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

const NOUVEL_ACQUEREUR = '__nouveau__'

function FormulaireEditionLot({
  lot,
  acquereurs,
  colonnes,
  onEnregistrer,
  onAnnulerVente,
  onEnregistrerPrix,
  onFermer,
}) {
  // Prix modifiable uniquement depuis ce panneau (17/07/2026, remarque de
  // Nicolas : un seul bouton "crayon" — Paramètres ne sert plus qu'au
  // paramétrage initial), et seulement avant l'Acté (plus de négociation
  // possible après, voir server/routes/lots.js).
  const [prixOuvert, setPrixOuvert] = useState(false)
  const [statut, setStatut] = useState(lot.statut)
  const [dateOption, setDateOption] = useState(versDateInput(lot.dateOption))
  const [dateReservation, setDateReservation] = useState(versDateInput(lot.dateReservation))
  const [dateActe, setDateActe] = useState(versDateInput(lot.dateActe))
  const [acquereurChoisi, setAcquereurChoisi] = useState(lot.acquereur?._id ?? '')
  const [civiliteNom, setCiviliteNom] = useState(lot.acquereur?.civilite ?? 'M.')
  const [nomNom, setNomNom] = useState(lot.acquereur?.nom ?? '')
  const [commentaire, setCommentaire] = useState(lot.commentaire ?? '')

  // La civilité/le nom affichés suivent le client sélectionné dans la
  // liste déroulante, et restent modifiables — que ce soit pour corriger
  // le nom d'un client déjà lié (sans créer de fiche fantôme, voir
  // docs/bugs.md) ou saisir un nouveau client.
  function changerAcquereur(id) {
    setAcquereurChoisi(id)
    if (id === NOUVEL_ACQUEREUR || id === '') {
      setCiviliteNom('M.')
      setNomNom('')
    } else {
      const trouve = acquereurs.find((a) => a._id === id)
      setCiviliteNom(trouve?.civilite ?? 'M.')
      setNomNom(trouve?.nom ?? '')
    }
  }

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
      donnees.acquereurNouveau = { civilite: civiliteNom, nom: nomNom }
    } else {
      donnees.acquereur = acquereurChoisi || null
      if (acquereurChoisi) {
        donnees.acquereurMiseAJour = { civilite: civiliteNom, nom: nomNom }
      }
    }
    onEnregistrer(lot._id, donnees)
  }

  // Remarque du 13/07/2026 (points 117+118, 2e refonte) : le logement
  // repart à zéro ("Libre", comme neuf, de nouveau à la vente) — tout ce
  // qui était renseigné (statut, dates, client, commentaire) est déplacé
  // vers la page "Annulés" (historique), pas mélangé au tableau des lots
  // actifs. Distinct du bouton "Annuler" ci-dessous, qui lui ferme
  // simplement le formulaire sans rien modifier (juste "revenir en
  // arrière" sur l'édition en cours, sans toucher au logement).
  function annulerVente() {
    if (
      window.confirm(
        `Annuler la vente du logement ${lot.reference} ? Il repassera "Libre" (de nouveau à la vente) ; le statut, les dates, le client et le commentaire actuels seront conservés dans l'historique des annulations.`,
      )
    ) {
      onAnnulerVente(lot._id)
    }
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <form onSubmit={soumettre}>
          <label>
            Statut
            <select value={statut} onChange={(e) => changerStatut(e.target.value)}>
              {Object.entries(STATUTS_LOT).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
            </select>
          </label>
          <label>
            Client
            <select value={acquereurChoisi} onChange={(e) => changerAcquereur(e.target.value)}>
              <option value="">— Aucun —</option>
              {acquereurs.map((a) => (
                <option key={a._id} value={a._id}>
                  {[a.civilite, a.prenom, a.nom].filter(Boolean).join(' ')}
                </option>
              ))}
              <option value={NOUVEL_ACQUEREUR}>+ Nouveau client...</option>
            </select>
          </label>
          {acquereurChoisi !== '' && (
            <>
              <label>
                Civilité
                <select value={civiliteNom} onChange={(e) => setCiviliteNom(e.target.value)}>
                  <option value="M.">M.</option>
                  <option value="Mme">Mme</option>
                  <option value="M. et Mme">M. et Mme</option>
                </select>
              </label>
              <label>
                Nom
                <input value={nomNom} onChange={(e) => setNomNom(e.target.value)} required />
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
          <button type="button" onClick={onFermer}>
            Annuler
          </button>
          {statut !== 'libre' && (
            <button type="button" className="bouton-danger" onClick={annulerVente}>
              Annuler la vente
            </button>
          )}
          {lot.statut !== 'acte' && !prixOuvert && (
            <button type="button" onClick={() => setPrixOuvert(true)}>
              Modifier le prix
            </button>
          )}
          {prixOuvert && (
            <FormulairePrixLot
              lot={lot}
              onEnregistrer={onEnregistrerPrix}
              onFermer={() => setPrixOuvert(false)}
            />
          )}
        </form>
      </td>
    </tr>
  )
}

export default FormulaireEditionLot
