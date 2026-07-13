import { createContext, useContext, useEffect, useState } from 'react'
import { API_URL } from '../config.js'

// Premier "contexte" React du projet (13/07/2026) — jusqu'ici chaque page
// allait chercher ses propres données. L'utilisateur connecté est
// différent : presque tout (bandeau, garde de route, apiFetch) a besoin de
// savoir "qui est connecté", d'où un état partagé plutôt que de le refaire
// remonter page par page. `localStorage` reste la source de vérité entre
// deux rechargements de page ; ce contexte n'en est qu'une vue réactive
// (pour que React re-rende quand elle change).
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(true)

  // Au chargement de l'appli, si un jeton existe déjà (session précédente),
  // on le revérifie auprès du serveur plutôt que de faire confiance
  // aveuglément à ce qui est stocké — un compte supprimé entre-temps par un
  // admin, par exemple, ne doit pas laisser croire qu'on est encore connecté.
  useEffect(() => {
    async function verifierSession() {
      const jeton = localStorage.getItem('jeton')
      if (!jeton) {
        setChargement(false)
        return
      }
      const reponse = await fetch(`${API_URL}/api/auth/moi`, {
        headers: { Authorization: `Bearer ${jeton}` },
      })
      if (reponse.ok) {
        const { utilisateur: utilisateurConnecte } = await reponse.json()
        setUtilisateur(utilisateurConnecte)
      } else {
        localStorage.removeItem('jeton')
        localStorage.removeItem('utilisateur')
      }
      setChargement(false)
    }
    verifierSession()
  }, [])

  async function connecter(email, motDePasse) {
    const reponse = await fetch(`${API_URL}/api/auth/connexion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, motDePasse }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      throw new Error(message)
    }
    const { jeton, utilisateur: utilisateurConnecte } = await reponse.json()
    localStorage.setItem('jeton', jeton)
    localStorage.setItem('utilisateur', JSON.stringify(utilisateurConnecte))
    setUtilisateur(utilisateurConnecte)
  }

  function deconnecter() {
    localStorage.removeItem('jeton')
    localStorage.removeItem('utilisateur')
    setUtilisateur(null)
  }

  return (
    <AuthContext.Provider value={{ utilisateur, chargement, connecter, deconnecter }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
