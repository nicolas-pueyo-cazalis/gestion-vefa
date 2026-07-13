import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

const ROLES = [
  { valeur: 'lecture', libelle: 'Lecture seule' },
  { valeur: 'gestionnaire', libelle: 'Gestionnaire' },
  { valeur: 'admin', libelle: 'Admin' },
]

function LigneUtilisateur({ utilisateur, onEnregistrer, onSupprimer }) {
  const { utilisateur: connecte } = useAuth()
  const [enEdition, setEnEdition] = useState(false)
  const [role, setRole] = useState(utilisateur.role)
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer(utilisateur._id, {
      role,
      ...(nouveauMotDePasse && { motDePasse: nouveauMotDePasse }),
    })
    setNouveauMotDePasse('')
    setEnEdition(false)
  }

  if (enEdition) {
    return (
      <li>
        <form onSubmit={soumettre} className="ligne-entreprise-edition">
          <span>{utilisateur.nom || utilisateur.email}</span>
          <label>
            Rôle
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r.valeur} value={r.valeur}>{r.libelle}</option>)}
            </select>
          </label>
          <label>
            Nouveau mot de passe
            <input
              type="password"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              placeholder="laisser vide = inchangé"
            />
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={() => setEnEdition(false)}>Annuler</button>
        </form>
      </li>
    )
  }

  // On ne peut pas se supprimer soi-même (même règle côté serveur, voir
  // routes/utilisateurs.js) — pour éviter de se retrouver sans accès admin
  // par erreur de clic.
  const estSoiMeme = utilisateur._id === connecte?.id

  return (
    <li>
      {utilisateur.nom || '—'} — {utilisateur.email} — {ROLES.find((r) => r.valeur === utilisateur.role)?.libelle}
      {estSoiMeme && ' (vous)'}
      <button type="button" onClick={() => setEnEdition(true)}>Modifier</button>
      {!estSoiMeme && (
        <button type="button" onClick={() => onSupprimer(utilisateur._id)}>Retirer</button>
      )}
    </li>
  )
}

export default LigneUtilisateur
