import { useState } from 'react'

function nomAcquereur(acquereur) {
  return [acquereur.civilite, acquereur.prenom, acquereur.nom].filter(Boolean).join(' ')
}

// N'affiche que les lots ayant déjà un acquéreur : une TMA est une demande
// de modification faite par un acquéreur pour son propre lot, impossible
// sans acquéreur (voir la validation côté serveur, POST /api/tma).
function FormulaireCreationTma({ lots, onCreer, onFermer }) {
  const lotsAvecAcquereur = lots.filter((lot) => lot.acquereur)

  const [lot, setLot] = useState('')
  const [localisation, setLocalisation] = useState('')
  const [description, setDescription] = useState('')
  const [dateDemande, setDateDemande] = useState('')
  const [nombreEntreprisesConcernees, setNombreEntreprisesConcernees] = useState('')

  function soumettre(evenement) {
    evenement.preventDefault()
    onCreer({
      lot,
      localisation,
      description,
      dateDemande: dateDemande || null,
      nombreEntreprisesConcernees: nombreEntreprisesConcernees === '' ? null : Number(nombreEntreprisesConcernees),
    })
  }

  return (
    <section className="section-parametres">
      <h2>Nouvelle TMA</h2>
      <form onSubmit={soumettre}>
        <label>
          Lot
          <select value={lot} onChange={(e) => setLot(e.target.value)} required>
            <option value="" disabled>Choisir un lot...</option>
            {lotsAvecAcquereur.map((l) => (
              <option key={l._id} value={l._id}>
                {l.reference} — {nomAcquereur(l.acquereur)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Localisation
          <input
            value={localisation}
            onChange={(e) => setLocalisation(e.target.value)}
            placeholder="ex: Cuisine"
          />
        </label>
        <label className="champ-description">
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex: Ajout d'une prise électrique"
          />
        </label>
        <label>
          Date de la demande
          <input type="date" value={dateDemande} onChange={(e) => setDateDemande(e.target.value)} />
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
        <div className="boutons-alignes-champs">
          <button type="submit">Créer</button>
          <button type="button" onClick={onFermer}>Annuler</button>
        </div>
      </form>
    </section>
  )
}

export default FormulaireCreationTma
