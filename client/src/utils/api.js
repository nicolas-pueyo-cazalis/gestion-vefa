// Remplace `fetch` partout dans l'appli (13/07/2026, authentification
// JWT) — même signature que fetch(url, options), pour rester un
// remplacement direct des appels existants. Deux différences :
// 1. Ajoute automatiquement le jeton stocké (voir AuthContext.jsx) dans
//    l'en-tête HTTP "Authorization: Bearer <jeton>", exigé par toutes les
//    routes de l'API sauf /api/auth/connexion.
// 2. Si le serveur répond 401 (jeton absent/expiré/invalide), la session
//    est effacée et l'utilisateur renvoyé vers /connexion — évite qu'une
//    page reste affichée avec des données qu'on n'a plus le droit de voir.
export async function apiFetch(url, options = {}) {
  const jeton = localStorage.getItem('jeton')

  const reponse = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(jeton && { Authorization: `Bearer ${jeton}` }),
    },
  })

  if (reponse.status === 401) {
    localStorage.removeItem('jeton')
    localStorage.removeItem('utilisateur')
    window.location.href = '/connexion'
  }

  return reponse
}
