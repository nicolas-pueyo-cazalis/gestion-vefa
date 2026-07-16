import { Router } from 'express'
import Programme from '../models/Programme.js'
import AppelDeFonds from '../models/AppelDeFonds.js'
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
// Barème des phases (13/07/2026, point 123) : le pourcentage de chaque
// phase est figé sur chaque AppelDeFonds au moment de sa génération
// (server/routes/lots.js, genererAppelsDeFonds) — un appel déjà émis n'est
// donc jamais recalculé rétroactivement. Le risque signalé par Nicolas
// n'est donc pas une corruption silencieuse, mais une incohérence entre
// lots (certains sur l'ancien barème, d'autres sur le nouveau) : bloqué
// explicitement, comme demandé, dès qu'au moins un appel a déjà été émis.
router.patch('/', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { parametres, ...champsProgramme } = req.body

    if (parametres?.baremePhases) {
      const nombreAppelsEmis = await AppelDeFonds.countDocuments({ dateEmission: { $ne: null } })
      if (nombreAppelsEmis > 0) {
        return res.status(400).json({
          message: `Impossible de modifier le barème : ${nombreAppelsEmis} appel(s) de fonds déjà émis pourraient être faussés.`,
        })
      }
    }

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
