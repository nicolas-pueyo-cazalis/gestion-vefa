// Réponse d'erreur 500 centralisée (21/07/2026, audit sécurité/RGPD) —
// avant, chaque route renvoyait `erreur.message` brut au client, y compris
// en production : plus de détail interne qu'un client ne devrait en
// recevoir (un message Mongoose peut révéler un nom de champ ou de
// collection). Le détail complet est maintenant toujours loggué côté
// serveur (seul moyen de diagnostiquer un incident, vu qu'aucun autre
// logging n'existe encore dans l'appli), mais n'est renvoyé au client
// qu'en dehors de la production.
//
// `logSansValeur()` (21/07/2026, remarque de Nicolas : montants, noms,
// coordonnées, téléphones, emails = données sensibles à protéger partout,
// logs compris) : les erreurs de validation/cast de Mongoose intègrent la
// VALEUR saisie directement dans leur message par défaut (ex: "email is
// invalid (nicolas@exemple.com)") — si un email ou un nom mal formé
// remonte jusqu'ici, il finirait sinon en clair dans les logs serveur.
// Pour ces deux types d'erreurs précisément, seuls les noms des champs en
// cause sont loggués, jamais la valeur. Les autres erreurs (bugs réels,
// pannes) gardent leur message complet — nécessaire pour les diagnostiquer,
// et ces messages-là ne contiennent jamais de donnée saisie par un
// utilisateur.
function logSansValeur(erreur) {
  if (erreur.name === 'ValidationError') {
    console.error('ValidationError sur les champs :', Object.keys(erreur.errors ?? {}).join(', '))
    return
  }
  if (erreur.name === 'CastError') {
    console.error('CastError sur le champ :', erreur.path)
    return
  }
  console.error(erreur)
}

export function repondreErreurServeur(res, erreur) {
  logSansValeur(erreur)
  res.status(500).json({
    message: 'Erreur serveur',
    erreur: process.env.NODE_ENV === 'production' ? undefined : erreur.message,
  })
}
