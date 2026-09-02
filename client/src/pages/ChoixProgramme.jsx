import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useProgramme } from '../context/ProgrammeContext.jsx'

// Page d'accueil de sélection de programme (17/07/2026, point 138) : choisir
// un programme existant, ou en créer un nouveau en le nommant — c'est ce
// choix qui fixe le "programme actif" pour toute la session (voir
// ProgrammeContext.jsx). Accessible aussi depuis le bandeau ("changer de
// programme"), pas seulement à la connexion.
function ChoixProgramme() {
  const { utilisateur } = useAuth()
  const { choisirProgramme } = useProgramme()
  const navigate = useNavigate()
  const [programmes, setProgrammes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [nomNouveauProgramme, setNomNouveauProgramme] = useState('')
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    async function chargerProgrammes() {
      const reponse = await apiFetch(`${API_URL}/api/programme`)
      setProgrammes(await reponse.json())
      setChargement(false)
    }
    chargerProgrammes()
  }, [])

  function selectionner(programme) {
    choisirProgramme(programme)
    navigate('/')
  }

  async function creer(evenement) {
    evenement.preventDefault()
    setErreur('')
    const reponse = await apiFetch(`${API_URL}/api/programme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: nomNouveauProgramme }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      setErreur(message)
      return
    }
    const nouveauProgramme = await reponse.json()
    selectionner(nouveauProgramme)
  }

  if (chargement) return <p>Chargement des programmes...</p>

  return (
    <div className="page-connexion">
      <div className="carte-connexion carte-choix-programme">
        <h1>Gestion VEFA</h1>
        <p className="sous-titre">Choisir un programme</p>

        {programmes.length > 0 && (
          <ul className="liste-programmes">
            {programmes.map((programme) => (
              <li key={programme._id}>
                <button type="button" onClick={() => selectionner(programme)}>
                  <span className="nom-programme">{programme.nom}</span>
                  {programme.commune && (
                    <span className="commune-programme">{programme.commune}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {programmes.length === 0 && <p>Aucun programme pour l'instant — crées-en un ci-dessous.</p>}

        {(utilisateur?.role === 'admin' || utilisateur?.role === 'gestionnaire') && (
          <form onSubmit={creer} className="formulaire-nouveau-programme">
            <label>
              Nouveau programme
              <input
                value={nomNouveauProgramme}
                onChange={(e) => setNomNouveauProgramme(e.target.value)}
                placeholder="ex: Les Jardins d'Émeraude"
                required
              />
            </label>
            <button type="submit">Créer</button>
            {erreur && <p className="avertissement-cellule">{erreur}</p>}
          </form>
        )}
      </div>
    </div>
  )
}

export default ChoixProgramme
