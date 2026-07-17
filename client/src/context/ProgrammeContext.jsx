import { createContext, useContext, useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useAuth } from './AuthContext.jsx'

// Même principe que AuthContext (17/07/2026, point 138) : le programme
// "actif" est choisi une fois (page ChoixProgramme.jsx) et reste valable
// pour toute la session — chaque page filtre ses données dessus au lieu de
// mélanger tous les programmes. `localStorage` garde le choix entre deux
// rechargements ; comme pour la session utilisateur, on revérifie auprès du
// serveur au démarrage plutôt que de lui faire confiance aveuglément (un
// programme supprimé entre-temps ne doit pas laisser croire qu'il est
// toujours actif).
const ProgrammeContext = createContext(null)

export function ProgrammeProvider({ children }) {
  const { utilisateur, chargement: chargementAuth } = useAuth()
  const [programmeActif, setProgrammeActif] = useState(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    async function verifierProgramme() {
      // Tant qu'AuthContext n'a pas fini de revalider la session, ne rien
      // décider ici (bug corrigé le 17/07/2026, trouvé lors de la revue
      // générale, point 143) : sans ce garde-fou, ce useEffect se déclenchait
      // une première fois avec `utilisateur` encore `null` (avant qu'AuthContext
      // ait fini), passait `chargement` à `false` prématurément, et
      // RouteProgramme redirigeait à tort vers /programmes avant même que la
      // vraie vérification (une fois connecté) ait eu la moindre chance de
      // s'exécuter — un utilisateur déjà connecté avec un programme déjà
      // choisi se retrouvait renvoyé au choix de programme à chaque rechargement.
      if (chargementAuth) return
      if (!utilisateur) {
        setProgrammeActif(null)
        setChargement(false)
        return
      }
      const id = localStorage.getItem('programmeId')
      if (!id) {
        setProgrammeActif(null)
        setChargement(false)
        return
      }
      const reponse = await apiFetch(`${API_URL}/api/programme/${id}`)
      if (reponse.ok) {
        setProgrammeActif(await reponse.json())
      } else {
        localStorage.removeItem('programmeId')
        setProgrammeActif(null)
      }
      setChargement(false)
    }
    verifierProgramme()
  }, [utilisateur, chargementAuth])

  function choisirProgramme(programme) {
    localStorage.setItem('programmeId', programme._id)
    setProgrammeActif(programme)
  }

  function changerDeProgramme() {
    localStorage.removeItem('programmeId')
    setProgrammeActif(null)
  }

  return (
    <ProgrammeContext.Provider value={{ programmeActif, chargement, choisirProgramme, changerDeProgramme, setProgrammeActif }}>
      {children}
    </ProgrammeContext.Provider>
  )
}

export function useProgramme() {
  return useContext(ProgrammeContext)
}
