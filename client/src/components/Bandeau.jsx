import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import { formatDate } from '../utils/statuts.js'

function Bandeau() {
  const { utilisateur, deconnecter } = useAuth()
  const { programmeActif: programme, changerDeProgramme } = useProgramme()
  const navigate = useNavigate()

  function seDeconnecter() {
    deconnecter()
    navigate('/connexion')
  }

  function ouvrirChoixProgramme() {
    changerDeProgramme()
    navigate('/programmes')
  }

  return (
    <header>
      <div className="bandeau-top">
        <div>
          <p className="bandeau-nom">{programme?.nom}</p>
          <p className="bandeau-adresse">
            {programme?.adresse}, {programme?.commune}
          </p>
          <button type="button" className="lien-discret" onClick={ouvrirChoixProgramme}>
            Changer de programme
          </button>
        </div>
        <div className="bandeau-utilisateur">
          <span>
            {utilisateur?.nom || utilisateur?.email}{' '}
            <span className="bandeau-role">({utilisateur?.role})</span>
          </span>
          <button type="button" onClick={seDeconnecter}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Ruban de repères (13/07/2026) : infos générales du programme,
          jusque-là absentes du bandeau — maquettée et validée par
          Nicolas avant implémentation (docs/demandes.md #111). */}
      <div className="bandeau-reperes">
        <div className="bandeau-repere">
          <span className="label">Maître d'ouvrage</span>
          <span className="valeur">{programme?.maitreOuvrage || '—'}</span>
        </div>
        <div className="bandeau-repere">
          <span className="label">Logements</span>
          <span className="valeur">{programme?.nombreLogements ?? '—'}</span>
        </div>
        <div className="bandeau-repere">
          <span className="label">Livraison</span>
          <span className="valeur">{formatDate(programme?.dateLivraison)}</span>
        </div>
      </div>

      <nav className="nav">
        <NavLink to="/" end>
          Lots
        </NavLink>
        <NavLink to="/clients">Clients</NavLink>
        <NavLink to="/suivi-pret">Suivi de prêt</NavLink>
        <NavLink to="/signature-acte">Signature acte</NavLink>
        <NavLink to="/appels-de-fonds">Appels de fonds</NavLink>
        <NavLink to="/tma">TMA</NavLink>
        <NavLink to="/parametres" className="nav-parametres">
          Paramètres
        </NavLink>
      </nav>
    </header>
  )
}

export default Bandeau
