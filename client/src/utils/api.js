// Remplace `fetch` partout dans l'appli (13/07/2026, authentification
// JWT) — même signature que fetch(url, options), pour rester un
// remplacement direct des appels existants. Trois différences :
// 1. Ajoute automatiquement le jeton stocké (voir AuthContext.jsx) dans
//    l'en-tête HTTP "Authorization: Bearer <jeton>", exigé par toutes les
//    routes de l'API sauf /api/auth/connexion.
// 2. Si le serveur répond 401 (jeton absent/expiré/invalide), la session
//    est effacée et l'utilisateur renvoyé vers /connexion — évite qu'une
//    page reste affichée avec des données qu'on n'a plus le droit de voir.
// 3. (21/07/2026, audit "gestion d'erreurs") Si le serveur est totalement
//    injoignable (arrêté, coupure réseau), `fetch()` lève une exception
//    au lieu de renvoyer une réponse — la plupart des actions de l'appli
//    (créer/modifier/supprimer) ne l'attrapent nulle part (seul le
//    CHARGEMENT initial de chaque page a un try/catch) : sans ce filet,
//    cliquer "Enregistrer" pendant une panne serveur échouait en silence,
//    sans le moindre message. Centralisé ici plutôt que dans chaque
//    gestionnaire de l'appli (des dizaines) : un utilisateur voit toujours
//    un message, et l'exception est quand même relancée pour ne rien
//    changer au comportement des pages qui l'attrapent déjà elles-mêmes.
export async function apiFetch(url, options = {}) {
  const jeton = localStorage.getItem('jeton')

  let reponse
  try {
    reponse = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(jeton && { Authorization: `Bearer ${jeton}` }),
      },
    })
  } catch (erreur) {
    alert('Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.')
    throw erreur
  }

  if (reponse.status === 401) {
    localStorage.removeItem('jeton')
    localStorage.removeItem('utilisateur')
    window.location.href = '/connexion'
  }

  return reponse
}
