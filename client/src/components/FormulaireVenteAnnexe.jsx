import { useState } from 'react'
import { formatMontant } from '../utils/formatMontant.js'
import { TYPES_ANNEXES } from '../data/annexes.js'
import { STATUTS_LOT, ORDRE_STATUTS } from '../data/lots.js'

function libelleAnnexe(annexe) {
  const type = TYPES_ANNEXES.find((t) => t.valeur === annexe.type)
  return `${type?.libelle.replace(/s$/, '')} n°${annexe.numero} — ${formatMontant(annexe.prix, 0)}`
}

const NOUVEL_ACQUEREUR = '__nouveau__'

// Vente d'une annexe seule (17/07/2026, remarque de Nicolas) : un
// logement déjà Acté ne peut plus recevoir de nouvelle annexe (plus de
// négociation possible, voir LigneLot.jsx) — une annexe disponible se
// vend alors à part, comme un "lot" indépendant qui suit son propre
// cycle de vente (statut/dates/client), au même titre qu'une annexe
// vendue à quelqu'un qui n'a pas acheté de logement dans le programme.
// Mêmes champs statut/client/dates que FormulaireEditionLot.jsx (remarque
// de Nicolas : renseignés dès la création, pas seulement modifiables
// après coup) — reste ensuite modifiable exactement comme un logement
// classique, depuis le même formulaire d'édition.
function FormulaireVenteAnnexe({ annexesDisponibles, acquereurs, onCreer, onFermer }) {
  const [annexeId, setAnnexeId] = useState('')
  const [statut, setStatut] = useState('libre')
  const [dateOption, setDateOption] = useState('')
  const [dateReservation, setDateReservation] = useState('')
  const [dateActe, setDateActe] = useState('')
  const [acquereurChoisi, setAcquereurChoisi] = useState('')
  const [civiliteNom, setCiviliteNom] = useState('M.')
  const [nomNom, setNomNom] = useState('')
  const [commentaire, setCommentaire] = useState('')

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

  // Même règle que FormulaireEditionLot.jsx : changer le statut vide les
  // dates d'étapes non encore atteintes.
  function changerStatut(nouveauStatut) {
    setStatut(nouveauStatut)
    const index = ORDRE_STATUTS.indexOf(nouveauStatut)
    if (index < 1) setDateOption('')
    if (index < 2) setDateReservation('')
    if (index < 3) setDateActe('')
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    const infosVente = {
      statut,
      dateOption: dateOption || null,
      dateReservation: dateReservation || null,
      dateActe: dateActe || null,
      commentaire: commentaire || null,
    }
    if (acquereurChoisi === NOUVEL_ACQUEREUR) {
      infosVente.acquereurNouveau = { civilite: civiliteNom, nom: nomNom }
    } else if (acquereurChoisi) {
      infosVente.acquereur = acquereurChoisi
      infosVente.acquereurMiseAJour = { civilite: civiliteNom, nom: nomNom }
    }
    // Le nom du client sert de référence (17/07/2026, remarque de
    // Nicolas) — pas de champ "Référence" séparé à saisir. Si aucun
    // client n'est encore choisi, l'annexe elle-même sert de repère
    // provisoire (reference reste un champ obligatoire côté serveur).
    const reference = nomNom ? `${civiliteNom} ${nomNom}` : libelleAnnexe(annexesDisponibles.find((a) => a._id === annexeId))
    onCreer({ annexeId, reference, infosVente })
  }

  if (annexesDisponibles.length === 0) {
    return (
      <section className="section-parametres">
        <h2>Vendre une annexe</h2>
        <p>Aucune annexe de disponible à la vente.</p>
        <button type="button" onClick={onFermer}>Fermer</button>
      </section>
    )
  }

  return (
    <section className="section-parametres">
      <h2>Vendre une annexe</h2>
      <form onSubmit={soumettre}>
        <label>
          Annexe
          <select value={annexeId} onChange={(e) => setAnnexeId(e.target.value)} required>
            <option value="" disabled>Choisir...</option>
            {annexesDisponibles.map((a) => (
              <option key={a._id} value={a._id}>{libelleAnnexe(a)}</option>
            ))}
          </select>
        </label>
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
        <div className="boutons-alignes-champs">
          <button type="submit">Créer</button>
          <button type="button" onClick={onFermer}>Annuler</button>
        </div>
      </form>
    </section>
  )
}

export default FormulaireVenteAnnexe
