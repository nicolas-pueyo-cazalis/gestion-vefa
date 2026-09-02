import { useState } from 'react'
import { API_URL } from '../../config.js'
import { apiFetch } from '../../utils/api.js'
import LigneUtilisateur from './LigneUtilisateur.jsx'

const ROLES = [
  { valeur: 'lecture', libelle: 'Lecture seule' },
  { valeur: 'gestionnaire', libelle: 'Gestionnaire' },
  { valeur: 'admin', libelle: 'Admin' },
]

// Comptes d'accès à l'application (13/07/2026, authentification JWT) —
// section visible seulement par un admin (voir Parametres.jsx). Pas
// d'auto-inscription : c'est ici qu'un admin crée les comptes de ses
// collègues.
function SectionUtilisateurs({ utilisateurs, onChangement }) {
  const [email, setEmail] = useState('')
  const [nom, setNom] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [role, setRole] = useState('lecture')
  const [erreur, setErreur] = useState(null)

  async function ajouter(evenement) {
    evenement.preventDefault()
    setErreur(null)
    const reponse = await apiFetch(`${API_URL}/api/utilisateurs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nom, motDePasse, role }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      setErreur(message)
      return
    }
    setEmail('')
    setNom('')
    setMotDePasse('')
    setRole('lecture')
    onChangement()
  }

  async function enregistrer(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/utilisateurs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    onChangement()
  }

  async function supprimer(id) {
    const reponse = await apiFetch(`${API_URL}/api/utilisateurs/${id}`, { method: 'DELETE' })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    onChangement()
  }

  return (
    <section className="section-parametres">
      <h2>Utilisateurs</h2>
      <ul>
        {utilisateurs.length === 0 && <li>Aucun utilisateur pour l'instant.</li>}
        {utilisateurs.map((u) => (
          <LigneUtilisateur
            key={u._id}
            utilisateur={u}
            onEnregistrer={enregistrer}
            onSupprimer={supprimer}
          />
        ))}
      </ul>
      <form onSubmit={ajouter}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Nom
          <input value={nom} onChange={(e) => setNom(e.target.value)} />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label>
          Rôle
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.valeur} value={r.valeur}>
                {r.libelle}
              </option>
            ))}
          </select>
        </label>
        {erreur && <span className="erreur-champ">{erreur}</span>}
        <button type="submit">Ajouter</button>
      </form>
    </section>
  )
}

export default SectionUtilisateurs
