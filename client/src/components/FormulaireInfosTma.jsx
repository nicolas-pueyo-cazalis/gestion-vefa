import { useState } from 'react'

// Localisation/description/montant client modifiables après création
// (13/07/2026, à la demande de Nicolas) — le montant client normalement
// recalculé automatiquement à partir des devis entreprises (voir
// calculerMontantClient) peut être négocié directement avec le client :
// le modifier ici le fige définitivement (montantClientManuel côté
// serveur), d'où l'avertissement avant l'enregistrement.
function FormulaireInfosTma({ tma, colonnes, onEnregistrer, onFermer }) {
  const [localisation, setLocalisation] = useState(tma.localisation ?? '')
  const [description, setDescription] = useState(tma.description ?? '')
  const [commentaire, setCommentaire] = useState(tma.commentaire ?? '')
  const [montantClient, setMontantClient] = useState(tma.montantClient ?? '')
  const [nombreEntreprisesConcernees, setNombreEntreprisesConcernees] = useState(
    tma.nombreEntreprisesConcernees ?? '',
  )

  function soumettre(evenement) {
    evenement.preventDefault()
    const nouveauMontant = montantClient === '' ? null : Number(montantClient)
    if (nouveauMontant !== (tma.montantClient ?? null)) {
      const confirme = window.confirm(
        'Ce montant client va être modifié à la main : il ne sera plus jamais recalculé automatiquement à partir des devis entreprises. Continuer ?',
      )
      if (!confirme) return
    }
    onEnregistrer(tma._id, {
      localisation,
      description,
      commentaire,
      montantClient: nouveauMontant,
      nombreEntreprisesConcernees: nombreEntreprisesConcernees === '' ? null : Number(nombreEntreprisesConcernees),
    })
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <form onSubmit={soumettre}>
          <label>
            Localisation
            <input value={localisation} onChange={(e) => setLocalisation(e.target.value)} />
          </label>
          <label className="champ-description">
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="champ-description">
            Commentaire
            <input value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
          </label>
          <label>
            Montant TTC client (€)
            <input
              type="number"
              step="0.01"
              value={montantClient}
              onChange={(e) => setMontantClient(e.target.value)}
            />
          </label>
          <label>
            Nombre d'entreprises concernées
            <input
              type="number"
              min="1"
              step="1"
              value={nombreEntreprisesConcernees}
              onChange={(e) => setNombreEntreprisesConcernees(e.target.value)}
            />
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={onFermer}>Annuler</button>
          <p className="avertissement-cellule avertissement-pleine-largeur">
            Modifier le montant client l'écrase définitivement : il ne sera plus recalculé
            automatiquement à partir des devis entreprises.
          </p>
        </form>
      </td>
    </tr>
  )
}

export default FormulaireInfosTma
