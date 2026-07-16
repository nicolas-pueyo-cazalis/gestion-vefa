import { Router } from 'express'
import HistoriqueAnnulation from '../models/HistoriqueAnnulation.js'

const router = Router()

// GET /api/historique-annulations — page dédiée "Annulés" (13/07/2026),
// distincte du tableau des lots : lecture seule, aucune action d'écriture
// ici (l'entrée est créée uniquement par POST /api/lots/:id/annuler).
router.get('/', async (req, res) => {
  try {
    const historique = await HistoriqueAnnulation.find().sort({ dateAnnulation: -1 })
    res.json(historique)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
