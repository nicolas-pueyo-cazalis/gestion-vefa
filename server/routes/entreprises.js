import { Router } from 'express'
import Entreprise from '../models/Entreprise.js'

const router = Router()

// GET /api/entreprises — référentiel complet, pour remplir les listes
// déroulantes (ex: ajout d'une ligne TmaEntreprise)
router.get('/', async (req, res) => {
  try {
    const entreprises = await Entreprise.find().sort({ corpsDeTravaux: 1, nom: 1 })
    res.json(entreprises)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// POST /api/entreprises — ajoute une entreprise au référentiel
router.post('/', async (req, res) => {
  try {
    const { nom, corpsDeTravaux, contact } = req.body
    const entreprise = await Entreprise.create({ nom, corpsDeTravaux, contact })
    res.status(201).json(entreprise)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
