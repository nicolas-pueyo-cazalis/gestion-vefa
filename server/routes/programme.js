import { Router } from 'express'
import Programme from '../models/Programme.js'
import AppelDeFonds from '../models/AppelDeFonds.js'
import { autoriserRoles } from '../middleware/auth.js'
import { getIdsLotsDuProgramme } from '../utils/programme.js'
import { repondreErreurServeur } from '../utils/erreurs.js'

const router = Router()

// GET /api/programme — liste tous les programmes (17/07/2026, point 138 :
// gestion multi-programme). Utilisé par la page de sélection/création au
// démarrage — voir client/src/pages/ChoixProgramme.jsx.
router.get('/', async (req, res) => {
  try {
    const programmes = await Programme.find().sort({ nom: 1 })
    res.json(programmes)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// GET /api/programme/:id — un programme précis (le "programme actif" côté
// client, voir ProgrammeContext.jsx).
router.get('/:id', async (req, res) => {
  try {
    const programme = await Programme.findById(req.params.id)
    if (!programme) {
      return res.status(404).json({ message: 'Programme introuvable' })
    }
    res.json(programme)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// POST /api/programme — crée un nouveau programme (17/07/2026, point 138).
// Seul `nom` est requis : le reste (adresse, maître d'ouvrage...) se
// complète ensuite depuis Paramètres, comme pour un Lot créé "à vide".
router.post('/', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { nom } = req.body
    if (!nom) {
      return res.status(400).json({ message: 'Le nom du programme est requis' })
    }
    const programme = await Programme.create({ nom })
    res.status(201).json(programme)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// PATCH /api/programme/:id — modifie les infos d'UN programme et/ou ses
// paramètres (17/07/2026 : remplace l'ancien PATCH mono-programme qui
// faisait `Programme.findOne()`, plus valable maintenant qu'il peut en
// exister plusieurs).
// Barème des phases (13/07/2026, point 123) : le pourcentage de chaque
// phase est figé sur chaque AppelDeFonds au moment de sa génération
// (server/routes/lots.js, genererAppelsDeFonds) — un appel déjà émis n'est
// donc jamais recalculé rétroactivement. Le risque signalé par Nicolas
// n'est donc pas une corruption silencieuse, mais une incohérence entre
// lots (certains sur l'ancien barème, d'autres sur le nouveau) : bloqué
// explicitement, comme demandé, dès qu'au moins un appel a déjà été émis
// — uniquement pour CE programme (17/07/2026), pas tous programmes confondus.
router.patch('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { parametres, ...champsProgramme } = req.body

    if (parametres?.baremePhases) {
      const idsLots = await getIdsLotsDuProgramme(req.params.id)
      const nombreAppelsEmis = await AppelDeFonds.countDocuments({
        lot: { $in: idsLots },
        dateEmission: { $ne: null },
      })
      if (nombreAppelsEmis > 0) {
        return res.status(400).json({
          message: `Impossible de modifier le barème : ${nombreAppelsEmis} appel(s) de fonds déjà émis pourraient être faussés.`,
        })
      }
    }

    const programme = await Programme.findById(req.params.id)

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
    repondreErreurServeur(res, erreur)
  }
})

export default router
