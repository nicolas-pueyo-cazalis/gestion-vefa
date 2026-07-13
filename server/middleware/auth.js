import jwt from 'jsonwebtoken'

// Vérifie le jeton JWT envoyé dans l'en-tête HTTP "Authorization: Bearer
// <jeton>" (convention standard, pas une invention du projet). Le jeton
// est signé au moment de la connexion (routes/auth.js) avec les seules
// informations utiles à l'autorisation (id, role) — jamais le mot de
// passe. `req.utilisateur` est ensuite disponible dans toutes les routes
// suivantes, sans requête supplémentaire à la base.
export function verifierToken(req, res, next) {
  const enTete = req.headers.authorization
  const jeton = enTete?.startsWith('Bearer ') ? enTete.slice(7) : null

  if (!jeton) {
    return res.status(401).json({ message: 'Connexion requise' })
  }

  try {
    req.utilisateur = jwt.verify(jeton, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ message: 'Session expirée ou invalide, reconnectez-vous' })
  }
}

// Restreint une route à certains rôles (ex: autoriserRoles('admin')) — à
// utiliser après verifierToken, qui a déjà posé req.utilisateur.role.
// Rôle "lecture" : jamais passé ici, donc jamais autorisé sur une route
// d'écriture (création/modification/suppression).
export function autoriserRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.utilisateur.role)) {
      return res.status(403).json({ message: 'Action réservée à un rôle supérieur' })
    }
    next()
  }
}
