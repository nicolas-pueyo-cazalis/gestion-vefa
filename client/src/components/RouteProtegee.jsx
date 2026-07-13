import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Bloque l'accès à tout ce qu'elle englobe (via <Outlet />) tant que
// personne n'est connecté — 13/07/2026 : toute l'application est derrière
// la connexion, y compris la simple consultation. `state={{ depuis }}`
// permet à la page Connexion de renvoyer exactement là où l'utilisateur
// voulait aller, plutôt que systématiquement à l'accueil.
function RouteProtegee() {
  const { utilisateur, chargement } = useAuth()
  const emplacement = useLocation()

  if (chargement) return null
  if (!utilisateur) {
    return <Navigate to="/connexion" state={{ depuis: emplacement.pathname }} replace />
  }
  return <Outlet />
}

export default RouteProtegee
