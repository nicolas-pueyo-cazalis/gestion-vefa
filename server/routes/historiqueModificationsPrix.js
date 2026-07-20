import { Router } from 'express'
import HistoriqueModificationPrix from '../models/HistoriqueModificationPrix.js'

const router = Router()

// GET /api/historique-modifications-prix — lecture seule, aucune action
// d'écriture ici (une entrée est créée uniquement par PATCH /api/lots/:id/prix).
router.get('/', async (req, res) => {
  try {
    const { programme } = req.query
    const filtre = programme ? { programme } : {}
    const historique = await HistoriqueModificationPrix.find(filtre).sort({ createdAt: -1 })
    res.json(historique)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
