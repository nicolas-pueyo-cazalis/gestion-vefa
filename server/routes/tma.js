import { Router } from 'express'
import Tma, { TRANSITIONS_AUTORISEES, calculerStatutAutomatique } from '../models/Tma.js'

const STATUTS_NON_RECALCULABLES = ['travaux', 'termine', 'refuse']

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

// PATCH /api/tma/:id/statut — fait avancer une TMA vers un nouveau statut,
// en vérifiant que la transition est autorisée (docs/schema-donnees.md).
router.patch('/:id/statut', async (req, res) => {
  try {
    const { statut } = req.body
    const tma = await Tma.findById(req.params.id)

    if (!tma) {
      return res.status(404).json({ message: 'TMA introuvable' })
    }

    const transitionsPossibles = TRANSITIONS_AUTORISEES[tma.statut] ?? []
    if (!transitionsPossibles.includes(statut)) {
      return res.status(400).json({
        message: `Transition refusée : impossible de passer de "${tma.statut}" à "${statut}"`,
      })
    }

    // On mémorise l'étape quittée avant de passer à "refuse", pour pouvoir
    // y revenir exactement avec /annuler-refus.
    if (statut === 'refuse') {
      tma.statutAvantRefus = tma.statut
    }

    tma.statut = statut
    await tma.save()
    res.json(tma)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/tma/:id/dates — met à jour les dates d'une TMA et recalcule
// automatiquement son statut à partir de ces valeurs (comme Excel), sauf si
// elle est déjà en travaux/terminée/refusée : dans ce cas, on garde les
// dates modifiables (correction) mais sans faire reculer le statut malgré
// elles. Ne touche plus à montantEntreprises/montantClient : ces champs
// sont désormais entièrement pilotés par les lignes TmaEntreprise (voir
// recalculerTma dans routes/tmaEntreprises.js).
router.patch('/:id/dates', async (req, res) => {
  try {
    const { dateEnvoiEntreprises, dateEnvoiFactureClient, dateRetourClient } = req.body
    const tma = await Tma.findById(req.params.id)

    if (!tma) {
      return res.status(404).json({ message: 'TMA introuvable' })
    }

    if (dateEnvoiEntreprises !== undefined) tma.dateEnvoiEntreprises = dateEnvoiEntreprises
    if (dateEnvoiFactureClient !== undefined) tma.dateEnvoiFactureClient = dateEnvoiFactureClient
    if (dateRetourClient !== undefined) tma.dateRetourClient = dateRetourClient

    if (!STATUTS_NON_RECALCULABLES.includes(tma.statut)) {
      tma.statut = calculerStatutAutomatique(tma)
    }

    await tma.save()
    res.json(tma)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/tma/:id/annuler-refus — restaure le statut précédent un refus
router.patch('/:id/annuler-refus', async (req, res) => {
  try {
    const tma = await Tma.findById(req.params.id)

    if (!tma) {
      return res.status(404).json({ message: 'TMA introuvable' })
    }
    if (tma.statut !== 'refuse' || !tma.statutAvantRefus) {
      return res.status(400).json({ message: 'Cette TMA n\'a pas été refusée, rien à annuler' })
    }

    tma.statut = tma.statutAvantRefus
    tma.statutAvantRefus = undefined
    await tma.save()
    res.json(tma)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
