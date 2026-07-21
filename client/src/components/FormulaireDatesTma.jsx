import { useState } from 'react'

// Les dates de MongoDB arrivent au format "2026-07-01T00:00:00.000Z" ;
// <input type="date"> attend juste "2026-07-01".
function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

function FormulaireDatesTma({ tma, colonnes, onEnregistrer, onFermer }) {
  const [dateEnvoiEntreprises, setDateEnvoiEntreprises] = useState(versDateInput(tma.dateEnvoiEntreprises))
  const [dateEnvoiFactureClient, setDateEnvoiFactureClient] = useState(versDateInput(tma.dateEnvoiFactureClient))
  const [dateRetourClient, setDateRetourClient] = useState(versDateInput(tma.dateRetourClient))

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer(tma._id, {
      dateEnvoiEntreprises: dateEnvoiEntreprises || null,
      dateEnvoiFactureClient: dateEnvoiFactureClient || null,
      dateRetourClient: dateRetourClient || null,
    })
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        {/* Titre ajouté (20/07/2026, point 183) : le panneau du crayon
            enchaîne plusieurs sous-parties (infos, dates, entreprises) sans
            rien pour les distinguer visuellement les unes des autres. */}
        <h3 className="titre-sous-partie-crayon">Modifier les dates</h3>
        <form onSubmit={soumettre}>
          <label>
            Date envoi entreprises
            <input
              type="date"
              value={dateEnvoiEntreprises}
              onChange={(e) => setDateEnvoiEntreprises(e.target.value)}
            />
          </label>
          <label>
            Date envoi facture client
            <input
              type="date"
              value={dateEnvoiFactureClient}
              onChange={(e) => setDateEnvoiFactureClient(e.target.value)}
            />
          </label>
          <label>
            Date retour client
            <input
              type="date"
              value={dateRetourClient}
              onChange={(e) => setDateRetourClient(e.target.value)}
            />
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={onFermer}>Annuler</button>
        </form>
      </td>
    </tr>
  )
}

export default FormulaireDatesTma
