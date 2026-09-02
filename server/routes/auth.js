import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Utilisateur from '../models/Utilisateur.js'
import { verifierToken } from '../middleware/auth.js'
import { repondreErreurServeur } from '../utils/erreurs.js'

const router = Router()

// POST /api/auth/connexion — seule route d'authentification "publique"
// (pas de compte créé ici : les comptes sont créés par un admin, voir
// routes/utilisateurs.js). `bcrypt.compare` recalcule le hachage du mot de
// passe saisi et le compare à celui stocké — le mot de passe en clair
// n'est jamais comparé directement ni reconstitué.
router.post('/connexion', async (req, res) => {
  try {
    const { email, motDePasse } = req.body
    const utilisateur = await Utilisateur.findOne({ email })

    // Même message générique dans les deux cas (email inconnu ou mot de
    // passe faux) — ne jamais révéler si c'est l'email qui n'existe pas,
    // ça faciliterait le repérage de comptes valides.
    if (!utilisateur) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' })
    }
    const motDePasseCorrect = await bcrypt.compare(motDePasse, utilisateur.motDePasseHash)
    if (!motDePasseCorrect) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' })
    }

    // Le jeton ne contient que ce qui sert à l'autorisation (id + role) —
    // jamais le mot de passe, même haché. Durée longue (7 jours) : outil
    // interne à une petite équipe, pas une appli bancaire.
    const jeton = jwt.sign(
      { id: utilisateur._id, role: utilisateur.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.json({
      jeton,
      utilisateur: {
        id: utilisateur._id,
        email: utilisateur.email,
        nom: utilisateur.nom,
        role: utilisateur.role,
      },
    })
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// GET /api/auth/moi — renvoie l'utilisateur du jeton envoyé, pour que le
// front puisse revalider une session déjà stockée (ex: au rechargement de
// la page) sans redemander email/mot de passe.
router.get('/moi', verifierToken, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.utilisateur.id, 'email nom role')
    if (!utilisateur) {
      return res.status(401).json({ message: 'Compte introuvable' })
    }
    res.json({ utilisateur })
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

export default router
