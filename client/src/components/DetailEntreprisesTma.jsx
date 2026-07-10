import { useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import LigneEntreprise from './LigneEntreprise.jsx'

function DetailEntreprisesTma({ tma, colonnes, onChangement, onFermer }) {
  const [lignes, setLignes] = useState([])
  const [entreprisesDisponibles, setEntreprisesDisponibles] = useState([])
  const [chargement, setChargement] = useState(true)
  const [entrepriseChoisie, setEntrepriseChoisie] = useState('')
  const [montantDevis, setMontantDevis] = useState('')

  useEffect(() => {
    async function chargerDonnees() {
      const [reponseLignes, reponseEntreprises] = await Promise.all([
        fetch(`${API_URL}/api/tma-entreprises?tma=${tma._id}`),
        fetch(`${API_URL}/api/entreprises`),
      ])
      setLignes(await reponseLignes.json())
      setEntreprisesDisponibles(await reponseEntreprises.json())
      setChargement(false)
    }
    chargerDonnees()
  }, [tma._id])

  async function ajouterLigne(evenement) {
    evenement.preventDefault()
    const reponse = await fetch(`${API_URL}/api/tma-entreprises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tma: tma._id,
        entreprise: entrepriseChoisie,
        montantDevis: montantDevis === '' ? null : Number(montantDevis),
      }),
    })
    const nouvelleLigne = await reponse.json()
    const entrepriseDetail = entreprisesDisponibles.find((e) => e._id === entrepriseChoisie)
    setLignes((liste) => [...liste, { ...nouvelleLigne, entreprise: entrepriseDetail }])
    setEntrepriseChoisie('')
    setMontantDevis('')
    onChangement()
  }

  async function supprimerLigne(id) {
    await fetch(`${API_URL}/api/tma-entreprises/${id}`, { method: 'DELETE' })
    setLignes((liste) => liste.filter((ligne) => ligne._id !== id))
    onChangement()
  }

  async function modifierLigne(id, donnees) {
    const reponse = await fetch(`${API_URL}/api/tma-entreprises/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    const ligneMiseAJour = await reponse.json()
    setLignes((liste) =>
      liste.map((ligne) =>
        ligne._id === id
          ? { ...ligne, montantDevis: ligneMiseAJour.montantDevis, dateRetour: ligneMiseAJour.dateRetour, statut: ligneMiseAJour.statut }
          : ligne,
      ),
    )
    onChangement()
  }

  return (
    <tr className="detail-entreprises">
      <td colSpan={colonnes}>
        {chargement ? (
          <p>Chargement...</p>
        ) : (
          <ul>
            {lignes.length === 0 && <li>Aucune entreprise pour l'instant.</li>}
            {lignes.map((ligne) => (
              <LigneEntreprise
                key={ligne._id}
                ligne={ligne}
                onEnregistrer={modifierLigne}
                onSupprimer={supprimerLigne}
              />
            ))}
          </ul>
        )}

        <form onSubmit={ajouterLigne}>
          <label>
            Entreprise
            <select value={entrepriseChoisie} onChange={(e) => setEntrepriseChoisie(e.target.value)} required>
              <option value="" disabled>Choisir...</option>
              {entreprisesDisponibles.map((e) => (
                <option key={e._id} value={e._id}>{e.corpsDeTravaux} — {e.nom}</option>
              ))}
            </select>
          </label>
          <label>
            Montant devis (€)
            <input
              type="number"
              step="0.01"
              value={montantDevis}
              onChange={(e) => setMontantDevis(e.target.value)}
            />
          </label>
          <button type="submit">Ajouter</button>
          <button type="button" onClick={onFermer}>Fermer</button>
        </form>
      </td>
    </tr>
  )
}

export default DetailEntreprisesTma
