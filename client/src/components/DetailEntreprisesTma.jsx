import { useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import LigneEntreprise from './LigneEntreprise.jsx'

function DetailEntreprisesTma({ tma, colonnes, onChangement, onFermer }) {
  const [lignes, setLignes] = useState([])
  const [entreprisesDisponibles, setEntreprisesDisponibles] = useState([])
  const [chargement, setChargement] = useState(true)
  const [entrepriseChoisie, setEntrepriseChoisie] = useState('')
  const [montantDevis, setMontantDevis] = useState('')
  const [dateRetour, setDateRetour] = useState('')

  useEffect(() => {
    async function chargerDonnees() {
      const [reponseLignes, reponseEntreprises] = await Promise.all([
        apiFetch(`${API_URL}/api/tma-entreprises?tma=${tma._id}`),
        apiFetch(`${API_URL}/api/entreprises`),
      ])
      setLignes(await reponseLignes.json())
      setEntreprisesDisponibles(await reponseEntreprises.json())
      setChargement(false)
    }
    chargerDonnees()
  }, [tma._id])

  async function ajouterLigne(evenement) {
    evenement.preventDefault()
    const reponse = await apiFetch(`${API_URL}/api/tma-entreprises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tma: tma._id,
        entreprise: entrepriseChoisie,
        montantDevis: montantDevis === '' ? null : Number(montantDevis),
        dateRetour: dateRetour || null,
      }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    const nouvelleLigne = await reponse.json()
    const entrepriseDetail = entreprisesDisponibles.find((e) => e._id === entrepriseChoisie)
    setLignes((liste) => [...liste, { ...nouvelleLigne, entreprise: entrepriseDetail }])
    setEntrepriseChoisie('')
    setMontantDevis('')
    setDateRetour('')
    onChangement()
  }

  async function supprimerLigne(id) {
    const reponse = await apiFetch(`${API_URL}/api/tma-entreprises/${id}`, { method: 'DELETE' })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    setLignes((liste) => liste.filter((ligne) => ligne._id !== id))
    onChangement()
  }

  async function modifierLigne(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/tma-entreprises/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
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
          <label>
            Date de réception
            <input type="date" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)} />
          </label>
          <button type="submit">Ajouter</button>
          <button type="button" onClick={onFermer}>Fermer</button>
        </form>
      </td>
    </tr>
  )
}

export default DetailEntreprisesTma
