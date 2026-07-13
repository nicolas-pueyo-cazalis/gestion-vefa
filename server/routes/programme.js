import { Router } from 'express'
import Programme from '../models/Programme.js'
import { autoriserRoles } from '../middleware/auth.js'

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

// PATCH /api/programme — modifie les infos du programme et/ou ses paramètres
router.patch('/', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { parametres, ...champsProgramme } = req.body
    const programme = await Programme.findOne()

    if (!programme) {
      return res.status(404).json({ message: 'Programme introuvable' })
    }

    Object.assign(programme, champsProgramme)
    if (parametres) {
      Object.assign(programme.parametres, parametres)
    }

    await programme.save()
    res.json(programme)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
