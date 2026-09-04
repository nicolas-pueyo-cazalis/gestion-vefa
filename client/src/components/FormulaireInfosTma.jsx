import { useState } from 'react'
import FenetreConfirmation from './FenetreConfirmation.jsx'

// Localisation/description/montant client modifiables après création
// (13/07/2026, à la demande de Nicolas) — le montant client normalement
// recalculé automatiquement à partir des devis entreprises (voir
// calculerMontantClient) peut être négocié directement avec le client :
// le modifier ici le fige définitivement (montantClientManuel côté
// serveur), d'où l'avertissement avant l'enregistrement.
// `montantClientSaisiManuellement` (20/07/2026, point 173) : réglage du
// programme qui désactive déjà tout calcul automatique — l'avertissement
// et la confirmation n'ont alors plus lieu d'être, il n'y a plus rien
// d'automatique à écraser.
function FormulaireInfosTma({
  tma,
  colonnes,
  montantClientSaisiManuellement,
  onEnregistrer,
  onFermer,
}) {
  const [localisation, setLocalisation] = useState(tma.localisation ?? '')
  const [description, setDescription] = useState(tma.description ?? '')
  const [commentaire, setCommentaire] = useState(tma.commentaire ?? '')
  const [montantClient, setMontantClient] = useState(tma.montantClient ?? '')
  const [nombreEntreprisesConcernees, setNombreEntreprisesConcernees] = useState(
    tma.nombreEntreprisesConcernees ?? '',
  )
  // Plus de négociation possible une fois validée (20/07/2026, point 182) :
  // même principe que le prix d'un lot, figé une fois Acté.
  const montantVerrouille = ['valide', 'termine'].includes(tma.statut)
  // Confirmation de montant modifié à la main (05/09/2026, point 277) :
  // vraie modale React à la place de window.confirm() — plus de valeur
  // de retour synchrone, la soumission mise en attente ici est reprise
  // depuis onConfirmer si l'utilisateur confirme.
  const [confirmationMontantOuverte, setConfirmationMontantOuverte] = useState(false)

  function enregistrer(nouveauMontant) {
    onEnregistrer(tma._id, {
      localisation,
      description,
      commentaire,
      montantClient: nouveauMontant,
      nombreEntreprisesConcernees:
        nombreEntreprisesConcernees === '' ? null : Number(nombreEntreprisesConcernees),
    })
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    const nouveauMontant = montantClient === '' ? null : Number(montantClient)
    if (!montantClientSaisiManuellement && nouveauMontant !== (tma.montantClient ?? null)) {
      setConfirmationMontantOuverte(true)
      return
    }
    enregistrer(nouveauMontant)
  }

  function confirmerEtEnregistrer() {
    setConfirmationMontantOuverte(false)
    enregistrer(montantClient === '' ? null : Number(montantClient))
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <h3 className="titre-sous-partie-crayon">Description de la TMA</h3>
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
              disabled={montantVerrouille}
              title={montantVerrouille ? "TMA validée : le montant n'est plus modifiable." : ''}
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
          <button type="button" onClick={onFermer}>
            Annuler
          </button>
          {!montantClientSaisiManuellement && !montantVerrouille && (
            <p className="avertissement-cellule avertissement-pleine-largeur">
              Modifier le montant client l'écrase définitivement : il ne sera plus recalculé
              automatiquement à partir des devis entreprises.
            </p>
          )}
        </form>
        {confirmationMontantOuverte && (
          <FenetreConfirmation
            titre="Montant client modifié à la main"
            message="Ce montant client va être modifié à la main : il ne sera plus jamais recalculé automatiquement à partir des devis entreprises. Continuer ?"
            libelleConfirmer="Continuer"
            onConfirmer={confirmerEtEnregistrer}
            onFermer={() => setConfirmationMontantOuverte(false)}
          />
        )}
      </td>
    </tr>
  )
}

export default FormulaireInfosTma
