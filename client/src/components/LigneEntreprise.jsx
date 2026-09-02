import { useState } from 'react'
import { formatMontant } from '../utils/formatMontant.js'
import { estEntrepriseEnRetard } from '../utils/statuts.js'

function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

function LigneEntreprise({ ligne, delaiRetourEntrepriseTmaJours, onEnregistrer, onSupprimer }) {
  const [enEdition, setEnEdition] = useState(false)
  // Modifiable (13/07/2026, point 134) : corrige les lignes créées avant
  // l'ajout de ce champ (toutes figées sur leur date de création faute de
  // mieux), sans quoi une erreur de saisie serait impossible à rattraper.
  const [dateEnvoi, setDateEnvoi] = useState(versDateInput(ligne.dateEnvoi))
  const [montantDevis, setMontantDevis] = useState(ligne.montantDevis ?? '')
  const [dateRetour, setDateRetour] = useState(versDateInput(ligne.dateRetour))
  const [description, setDescription] = useState(ligne.description ?? '')

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer(ligne._id, {
      dateEnvoi: dateEnvoi || null,
      montantDevis: montantDevis === '' ? null : Number(montantDevis),
      dateRetour: dateRetour || null,
      description: description || null,
    })
    setEnEdition(false)
  }

  if (enEdition) {
    return (
      <li>
        <form onSubmit={soumettre} className="ligne-entreprise-edition">
          <span>
            {ligne.corpsDeTravaux} — Lot {ligne.entreprise.numeroLot ?? '—'} —{' '}
            {ligne.entreprise.nom}
          </span>
          <label>
            Description
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            Date d'envoi
            <input
              type="date"
              value={dateEnvoi}
              onChange={(e) => setDateEnvoi(e.target.value)}
              required
            />
          </label>
          <label>
            Montant TTC devis (€)
            <input
              type="number"
              step="0.01"
              value={montantDevis}
              onChange={(e) => setMontantDevis(e.target.value)}
            />
          </label>
          <label>
            Date de retour
            <input type="date" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)} />
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={() => setEnEdition(false)}>
            Annuler
          </button>
        </form>
      </li>
    )
  }

  // "En retard" en rouge (21/07/2026, remarque de Nicolas) : remplace "reçu
  // le ..." tant que l'entreprise n'a pas répondu et que le délai est
  // dépassé — même règle que le message déjà affiché sous le statut
  // "Étude" sur la ligne de la TMA (Tma.jsx, entrepriseEnRetardPourTma).
  const enRetard = estEntrepriseEnRetard(ligne, delaiRetourEntrepriseTmaJours)

  return (
    <li>
      {ligne.corpsDeTravaux} — Lot {ligne.entreprise.numeroLot ?? '—'} — {ligne.entreprise.nom}
      {ligne.description && <> — {ligne.description}</>} — envoyée le{' '}
      {versDateInput(ligne.dateEnvoi) || '—'} —{' '}
      {ligne.montantDevis === null ? 'en attente de devis' : formatMontant(ligne.montantDevis)} —{' '}
      {enRetard ? (
        <span className="avertissement-cellule">En retard</span>
      ) : (
        <>reçu le {versDateInput(ligne.dateRetour) || '—'}</>
      )}
      <button type="button" onClick={() => setEnEdition(true)}>
        Modifier
      </button>
      <button type="button" onClick={() => onSupprimer(ligne._id)}>
        Retirer
      </button>
    </li>
  )
}

export default LigneEntreprise
