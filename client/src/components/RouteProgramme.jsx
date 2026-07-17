import { Navigate, Outlet } from 'react-router-dom'
import { useProgramme } from '../context/ProgrammeContext.jsx'

// Même principe que RouteProtegee.jsx (17/07/2026, point 138), mais pour le
// choix du programme plutôt que la connexion — imbriquée à l'intérieur
// d'elle (voir App.jsx) : inutile de vérifier un programme actif tant que
// personne n'est connecté.
function RouteProgramme() {
  const { programmeActif, chargement } = useProgramme()

  if (chargement) return null
  if (!programmeActif) {
    return <Navigate to="/programmes" replace />
  }
  return <Outlet />
}

export default RouteProgramme
