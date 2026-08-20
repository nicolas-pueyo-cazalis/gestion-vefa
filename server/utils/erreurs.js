// Réponse d'erreur 500 centralisée (21/07/2026, audit sécurité/RGPD) —
// avant, chaque route renvoyait `erreur.message` brut au client, y compris
// en production : plus de détail interne qu'un client ne devrait en
// recevoir (un message Mongoose peut révéler un nom de champ ou de
// collection). Le détail complet est maintenant toujours loggué côté
// serveur (seul moyen de diagnostiquer un incident, vu qu'aucun autre
// logging n'existe encore dans l'appli), mais n'est renvoyé au client
// qu'en dehors de la production.
export function repondreErreurServeur(res, erreur) {
  console.error(erreur)
  res.status(500).json({
    message: 'Erreur serveur',
    erreur: process.env.NODE_ENV === 'production' ? undefined : erreur.message,
  })
}
