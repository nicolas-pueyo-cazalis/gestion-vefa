import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { API_URL } from '../config.js'

function Bandeau() {
  const [programme, setProgramme] = useState(null)

  useEffect(() => {
    async function chargerProgramme() {
      const reponse = await fetch(`${API_URL}/api/programme`)
      const donnees = await reponse.json()
      setProgramme(donnees)
    }
    chargerProgramme()
  }, [])

  return (
    <header>
      <p className="bandeau-nom">{programme?.nom}</p>
      <p className="bandeau-adresse">{programme?.adresse}, {programme?.commune}</p>
      <nav className="nav">
        <NavLink to="/" end>Lots</NavLink>
        <NavLink to="/tma">TMA</NavLink>
        <NavLink to="/parametres" className="nav-parametres">Paramètres</NavLink>
      </nav>
    </header>
  )
}

export default Bandeau
