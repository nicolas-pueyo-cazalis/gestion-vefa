import { Outlet } from 'react-router-dom'
import Bandeau from './Bandeau.jsx'

function Layout() {
  return (
    <>
      <Bandeau />
      <main>
        <Outlet />
      </main>
    </>
  )
}

export default Layout
