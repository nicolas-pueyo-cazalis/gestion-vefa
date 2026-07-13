import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'

function Bandeau() {
  const [programme, setProgramme] = useState(null)
  const { utilisateur, deconnecter } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function chargerProgramme() {
      const reponse = await apiFetch(`${API_URL}/api/programme`)
      const donnees = await reponse.json()
      setProgramme(donnees)
    }
    chargerProgramme()
  }, [])

  function seDeconnecter() {
    deconnecter()
    navigate('/connexion')
  }

  return (
    <header>
      <p className="bandeau-nom">{programme?.nom}</p>
      <p className="bandeau-adresse">{programme?.adresse}, {programme?.commune}</p>
      <nav className="nav">
        <NavLink to="/" end>Lots</NavLink>
        <NavLink to="/clients">Clients</NavLink>
        <NavLink to="/tma">TMA</NavLink>
        <NavLink to="/appels-de-fonds">Appels de fonds</NavLink>
        <NavLink to="/suivi-pret">Suivi de prêt</NavLink>
        <NavLink to="/signature-acte">Signature acte</NavLink>
        <NavLink to="/parametres" className="nav-parametres">Paramètres</NavLink>
      </nav>
      <div className="bandeau-utilisateur">
        <span>{utilisateur?.nom || utilisateur?.email} <span className="bandeau-role">({utilisateur?.role})</span></span>
        <button type="button" onClick={seDeconnecter}>Déconnexion</button>
      </div>
    </header>
  )
}

export default Bandeau
