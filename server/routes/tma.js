import { Router } from 'express'
import Tma from '../models/Tma.js'

const router = Router()

// GET /api/tma — liste de toutes les TMA, avec le lot et l'acquéreur liés
router.get('/', async (req, res) => {
  try {
    const tmaList = await Tma.find()
      .populate('lot', 'reference')
      .populate('acquereur', 'civilite prenom nom')
      .sort({ createdAt: 1 })
    res.json(tmaList)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
