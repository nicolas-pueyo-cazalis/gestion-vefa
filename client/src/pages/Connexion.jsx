import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function Connexion() {
  const { utilisateur, connecter } = useAuth()
  const navigate = useNavigate()
  const emplacement = useLocation()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(false)

  // Déjà connecté (ex: URL /connexion tapée à la main) : pas de formulaire
  // à afficher, direction la page demandée à l'origine ou l'accueil.
  if (utilisateur) {
    return <Navigate to={emplacement.state?.depuis ?? '/'} replace />
  }

  async function soumettre(evenement) {
    evenement.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await connecter(email, motDePasse)
      navigate(emplacement.state?.depuis ?? '/', { replace: true })
    } catch (e) {
      setErreur(e.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="page-connexion">
      <form onSubmit={soumettre} className="carte-connexion">
        <h1>Gestion VEFA</h1>
        <p className="sous-titre">Connexion</p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
          />
        </label>
        {erreur && <p className="erreur-champ">{erreur}</p>}
        <button type="submit" disabled={enCours}>
          {enCours ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}

export default Connexion
