import { NavLink } from 'react-router-dom'
import { PROGRAMME } from '../data/programme.js'

function Bandeau() {
  return (
    <header>
      <p className="bandeau-nom">{PROGRAMME.nom}</p>
      <p className="bandeau-adresse">{PROGRAMME.adresse}, {PROGRAMME.commune}</p>
      <nav className="nav">
        <NavLink to="/" end>Lots</NavLink>
        <NavLink to="/tma">TMA</NavLink>
      </nav>
    </header>
  )
}

export default Bandeau
