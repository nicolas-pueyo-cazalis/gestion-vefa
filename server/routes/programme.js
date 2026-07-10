import { Router } from 'express'
import Programme from '../models/Programme.js'

const router = Router()

// GET /api/programme — un seul programme pour l'instant (v1 mono-programme)
router.get('/', async (req, res) => {
  try {
    const programme = await Programme.findOne()
    res.json(programme)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
