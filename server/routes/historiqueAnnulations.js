import { Router } from 'express'
import HistoriqueAnnulation from '../models/HistoriqueAnnulation.js'
import { repondreErreurServeur } from '../utils/erreurs.js'

const router = Router()

// GET /api/historique-annulations — page dédiée "Annulés" (13/07/2026),
// distincte du tableau des lots : lecture seule, aucune action d'écriture
// ici (l'entrée est créée uniquement par POST /api/lots/:id/annuler).
router.get('/', async (req, res) => {
  try {
    // `?programme=<id>` (17/07/2026, point 138) : champ direct, déjà
    // dénormalisé sur chaque entrée au moment de l'annulation.
    const { programme } = req.query
    const filtre = programme ? { programme } : {}
    const historique = await HistoriqueAnnulation.find(filtre).sort({ dateAnnulation: -1 })
    res.json(historique)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

export default router
