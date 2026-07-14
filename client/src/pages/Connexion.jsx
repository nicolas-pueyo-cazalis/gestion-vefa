import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function Connexion() {
  const { utilisateur, connecter } = useAuth()
  const navigate = useNavigate()
  const emplacement = useLocation()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [motDePasseVisible, setMotDePasseVisible] = useState(false)
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
          <div className="champ-mot-de-passe">
            <input
              type={motDePasseVisible ? 'text' : 'password'}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
            <button
              type="button"
              className="bouton-oeil"
              onClick={() => setMotDePasseVisible((v) => !v)}
              aria-label={motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {motDePasseVisible ? 'Masquer' : 'Afficher'}
            </button>
          </div>
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
