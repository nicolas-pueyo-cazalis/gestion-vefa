import { Outlet } from 'react-router-dom'
import Bandeau from './Bandeau.jsx'
import AlerteRetards from './AlerteRetards.jsx'

function Layout() {
  return (
    <>
      <Bandeau />
      <main>
        <Outlet />
      </main>
      {/* Montée une seule fois : Layout n'est pas remonté en changeant de
          page (seul <Outlet /> change), donc l'alerte ne s'affiche bien
          qu'à l'ouverture de l'application, pas à chaque navigation. */}
      <AlerteRetards />
    </>
  )
}

export default Layout
