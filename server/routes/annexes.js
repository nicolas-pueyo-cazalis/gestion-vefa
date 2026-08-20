import { Router } from 'express'
import Annexe from '../models/Annexe.js'
import { autoriserRoles } from '../middleware/auth.js'
import { repondreErreurServeur } from '../utils/erreurs.js'

const router = Router()

// GET /api/annexes?programme=<id>&type=parking — catalogue d'un programme,
// optionnellement filtré par type. Utilisé aussi bien par Paramètres
// (gestion du catalogue) que par le formulaire de logement (choix des
// annexes disponibles).
router.get('/', async (req, res) => {
  try {
    const { programme, type } = req.query
    if (!programme) {
      return res.status(400).json({ message: 'Le paramètre "programme" est requis' })
    }
    const filtre = { programme, ...(type && { type }) }
    const annexes = await Annexe.find(filtre)
      .sort({ type: 1, numero: 1 })
      .populate('lot', 'reference')
    res.json(annexes)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// POST /api/annexes — ajoute une annexe au catalogue (Paramètres), jamais
// directement attribuée à un lot à la création.
router.post('/', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { programme, type, numero, prix } = req.body
    if (!programme || !type || numero == null || prix == null) {
      return res.status(400).json({ message: 'Les champs "programme", "type", "numero" et "prix" sont requis' })
    }
    const annexe = await Annexe.create({ programme, type, numero, prix })
    res.status(201).json(annexe)
  } catch (erreur) {
    if (erreur.code === 11000) {
      return res.status(400).json({ message: `Le numéro ${req.body.numero} est déjà utilisé pour ce type d'annexe.` })
    }
    repondreErreurServeur(res, erreur)
  }
})

// PATCH /api/annexes/:id — modifie numero/prix (uniquement depuis le
// catalogue, tant qu'elle n'est pas attribuée : l'attribution à un lot se
// fait exclusivement via le formulaire de logement, voir routes/lots.js,
// pour que Lot.prixTTC reste toujours synchronisé).
router.patch('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const annexe = await Annexe.findById(req.params.id)
    if (!annexe) {
      return res.status(404).json({ message: 'Annexe introuvable' })
    }
    if (annexe.lot) {
      return res.status(400).json({ message: 'Impossible de modifier une annexe déjà attribuée à un logement.' })
    }
    const { numero, prix } = req.body
    if (numero !== undefined) annexe.numero = numero
    if (prix !== undefined) annexe.prix = prix
    await annexe.save()
    res.json(annexe)
  } catch (erreur) {
    if (erreur.code === 11000) {
      return res.status(400).json({ message: `Le numéro ${req.body.numero} est déjà utilisé pour ce type d'annexe.` })
    }
    repondreErreurServeur(res, erreur)
  }
})

// DELETE /api/annexes/:id — retire une annexe du catalogue, seulement si
// elle n'est pas déjà attribuée à un logement (sinon il faudrait aussi
// recalculer le prix de ce logement, et perdre la trace de ce qui lui a
// été vendu).
router.delete('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const annexe = await Annexe.findById(req.params.id)
    if (!annexe) {
      return res.status(404).json({ message: 'Annexe introuvable' })
    }
    if (annexe.lot) {
      return res.status(400).json({ message: 'Impossible de supprimer une annexe déjà attribuée à un logement.' })
    }
    await annexe.deleteOne()
    res.status(204).end()
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

export default router
