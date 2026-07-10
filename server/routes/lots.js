import { Router } from 'express'
import Lot from '../models/Lot.js'

const router = Router()

// GET /api/lots — liste de tous les lots, triés par référence
router.get('/', async (req, res) => {
  try {
    const lots = await Lot.find().sort({ reference: 1 })
    res.json(lots)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
