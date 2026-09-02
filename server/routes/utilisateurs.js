import { Router } from 'express'
import bcrypt from 'bcryptjs'
import Utilisateur from '../models/Utilisateur.js'
import { autoriserRoles } from '../middleware/auth.js'
import { repondreErreurServeur } from '../utils/erreurs.js'

const router = Router()

// Toute la route est réservée aux admins (pas de gestionnaire/lecture ici)
// — la gestion des comptes n'a rien à voir avec la gestion commerciale du
// programme. `verifierToken` est déjà appliqué globalement dans index.js
// avant que cette route ne soit atteinte.
router.use(autoriserRoles('admin'))

// GET /api/utilisateurs — jamais motDePasseHash dans la réponse
router.get('/', async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.find({}, 'email nom role createdAt').sort({ nom: 1 })
    res.json(utilisateurs)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// POST /api/utilisateurs — crée un compte. Le mot de passe en clair
// n'existe qu'entre la saisie et ce hachage : jamais stocké ni journalisé.
router.post('/', async (req, res) => {
  try {
    const { email, motDePasse, nom, role } = req.body
    if (!motDePasse || motDePasse.length < 8) {
      return res.status(400).json({ message: 'Le mot de passe doit faire au moins 8 caractères' })
    }
    const motDePasseHash = await bcrypt.hash(motDePasse, 10)
    const utilisateur = await Utilisateur.create({ email, motDePasseHash, nom, role })
    res
      .status(201)
      .json({
        id: utilisateur._id,
        email: utilisateur.email,
        nom: utilisateur.nom,
        role: utilisateur.role,
      })
  } catch (erreur) {
    if (erreur.code === 11000) {
      return res.status(400).json({ message: 'Un compte existe déjà avec cet email' })
    }
    repondreErreurServeur(res, erreur)
  }
})

// PATCH /api/utilisateurs/:id — modifie nom/role, et le mot de passe si
// fourni (sinon inchangé — pas besoin de le ressaisir pour juste changer
// le rôle de quelqu'un).
router.patch('/:id', async (req, res) => {
  try {
    const { nom, role, motDePasse } = req.body
    const utilisateur = await Utilisateur.findById(req.params.id)
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur introuvable' })
    }

    if (nom !== undefined) utilisateur.nom = nom
    if (role !== undefined) utilisateur.role = role
    if (motDePasse) {
      if (motDePasse.length < 8) {
        return res.status(400).json({ message: 'Le mot de passe doit faire au moins 8 caractères' })
      }
      utilisateur.motDePasseHash = await bcrypt.hash(motDePasse, 10)
    }

    await utilisateur.save()
    res.json({
      id: utilisateur._id,
      email: utilisateur.email,
      nom: utilisateur.nom,
      role: utilisateur.role,
    })
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// DELETE /api/utilisateurs/:id — un admin ne peut pas se supprimer
// lui-même (éviterait de se retrouver sans accès admin par erreur de clic).
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.utilisateur.id) {
      return res.status(400).json({ message: 'Impossible de supprimer votre propre compte' })
    }
    const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id)
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur introuvable' })
    }
    res.status(204).end()
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

export default router
