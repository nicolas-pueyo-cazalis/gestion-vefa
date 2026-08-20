import { Router } from 'express'
import Entreprise from '../models/Entreprise.js'
import { autoriserRoles } from '../middleware/auth.js'
import { repondreErreurServeur } from '../utils/erreurs.js'

const router = Router()

// GET /api/entreprises — référentiel complet, pour remplir les listes
// déroulantes (ex: ajout d'une ligne TmaEntreprise)
router.get('/', async (req, res) => {
  try {
    const entreprises = await Entreprise.find().sort({ corpsDeTravaux: 1, nom: 1 })
    res.json(entreprises)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// POST /api/entreprises — ajoute une entreprise au référentiel
router.post('/', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { nom, corpsDeTravaux, numeroLot, contact } = req.body
    const entreprise = await Entreprise.create({ nom, corpsDeTravaux, numeroLot, contact })
    res.status(201).json(entreprise)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// DELETE /api/entreprises/:id — retire une entreprise du référentiel
router.delete('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const entreprise = await Entreprise.findByIdAndDelete(req.params.id)
    if (!entreprise) {
      return res.status(404).json({ message: 'Entreprise introuvable' })
    }
    res.status(204).end()
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

export default router
