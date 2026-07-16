import { Router } from 'express'
import Tma, { TRANSITIONS_AUTORISEES, calculerStatutAutomatique } from '../models/Tma.js'
import Lot from '../models/Lot.js'
import TmaEntreprise from '../models/TmaEntreprise.js'
import { autoriserRoles } from '../middleware/auth.js'

const STATUTS_NON_RECALCULABLES = ['travaux', 'termine', 'refuse']

const router = Router()

// GET /api/tma — liste de toutes les TMA, avec le lot et l'acquéreur liés.
// `lot.acquereur` (13/07/2026, en plus de `lot.statut`) : permet au client
// de détecter une TMA devenue obsolète en comparant le client d'origine de
// la TMA à l'acquéreur ACTUEL du lot — plus fiable qu'un simple
// `statut === 'libre'` (couvre aussi le cas où le lot a été revendu à un
// nouveau client sans que la TMA n'ait encore été réattribuée, voir PATCH
// /:id/acquereur ci-dessous).
router.get('/', async (req, res) => {
  try {
    const tmaList = await Tma.find()
      .populate({
        path: 'lot',
        select: 'reference statut acquereur',
        populate: { path: 'acquereur', select: 'civilite prenom nom' },
      })
      .populate('acquereur', 'civilite prenom nom')
      .sort({ createdAt: 1 })
    res.json(tmaList)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// POST /api/tma — crée une nouvelle TMA (demande d'un acquéreur pour son
// lot). L'acquéreur n'est pas choisi séparément : il est déduit du lot
// sélectionné (lot.acquereur), snapshotté sur la TMA au moment de la
// création — même principe que les autres références "figées" du projet
// (ex: TmaEntreprise.corpsDeTravaux). Un lot sans acquéreur ne peut pas
// avoir de TMA (personne pour la demander). Statut de départ "demande" par
// défaut (voir le schéma), sans dates — elles se renseignent ensuite au
// fil de l'eau et font avancer le statut automatiquement.
router.post('/', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { lot, localisation, description, dateDemande } = req.body

    const lotDoc = await Lot.findById(lot)
    if (!lotDoc) {
      return res.status(404).json({ message: 'Lot introuvable' })
    }
    if (!lotDoc.acquereur) {
      return res.status(400).json({ message: 'Ce lot n\'a pas encore d\'acquéreur — impossible de créer une TMA.' })
    }

    // montantEntreprises/montantClient explicitement à `null` (pas juste
    // absents) : "pas encore chiffré", cohérent avec le reste de l'appli
    // (ex: seed.js) — un champ `undefined` fait planter le formatage côté
    // React (`formatMontant(undefined)` → "NaN €").
    const tma = await Tma.create({
      lot, acquereur: lotDoc.acquereur, localisation, description, dateDemande,
      montantEntreprises: null, montantClient: null,
    })
    const tmaPeuplee = await tma.populate([
      { path: 'lot', select: 'reference' },
      { path: 'acquereur', select: 'civilite prenom nom' },
    ])
    res.status(201).json(tmaPeuplee)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/tma/:id/acquereur — réattribue une TMA devenue obsolète
// (13/07/2026, suite au point 133) au client ACTUEL du lot, une fois que
// celui-ci a été revendu après une annulation : Nicolas choisit lui-même
// de la maintenir (le nouveau client la reprend) plutôt que de la vider
// automatiquement. L'avertissement "logement annulé" disparaît de lui-même
// ensuite, dès que `tma.acquereur` correspond de nouveau à `lot.acquereur`
// (voir la comparaison faite côté client, Tma.jsx).
router.patch('/:id/acquereur', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { acquereur } = req.body
    const tma = await Tma.findByIdAndUpdate(
      req.params.id,
      { acquereur },
      { new: true, runValidators: true },
    ).populate({
      path: 'lot',
      select: 'reference statut acquereur',
      populate: { path: 'acquereur', select: 'civilite prenom nom' },
    }).populate('acquereur', 'civilite prenom nom')

    if (!tma) {
      return res.status(404).json({ message: 'TMA introuvable' })
    }
    res.json(tma)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/tma/:id/statut — fait avancer une TMA vers un nouveau statut,
// en vérifiant que la transition est autorisée (docs/schema-donnees.md).
router.patch('/:id/statut', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
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
router.patch('/:id/dates', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
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
router.patch('/:id/annuler-refus', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
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

// PATCH /api/tma/:id/infos — modifie localisation/description/montant
// client (13/07/2026, à la demande de Nicolas) — une négociation directe
// avec le client peut aboutir à un montant différent du calcul automatique
// (voir calculerMontantClient/recalculerTma). `montantClient` fourni ici
// fige la valeur (montantClientManuel: true) : elle ne sera plus jamais
// recalculée automatiquement ensuite, même si les devis entreprises
// changent — l'avertissement est affiché côté client avant l'envoi.
router.patch('/:id/infos', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { localisation, description, montantClient } = req.body
    const tma = await Tma.findById(req.params.id)
    if (!tma) {
      return res.status(404).json({ message: 'TMA introuvable' })
    }

    if (localisation !== undefined) tma.localisation = localisation
    if (description !== undefined) tma.description = description
    if (montantClient !== undefined) {
      tma.montantClient = montantClient
      tma.montantClientManuel = true
    }

    await tma.save()
    const tmaPeuplee = await tma.populate([
      { path: 'lot', select: 'reference statut acquereur', populate: { path: 'acquereur', select: 'civilite prenom nom' } },
      { path: 'acquereur', select: 'civilite prenom nom' },
    ])
    res.json(tmaPeuplee)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// DELETE /api/tma/:id — supprime une TMA (13/07/2026, point 128 — ex: une
// TMA devenue obsolète après annulation d'une vente, voir point 133, que
// Nicolas décide de ne pas réattribuer). Supprime aussi les entreprises
// sollicitées qui la référencent (TmaEntreprise.tma est obligatoire, une
// référence cassée y provoquerait la même page blanche déjà corrigée pour
// l'acquéreur, voir Tma.jsx).
router.delete('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const tma = await Tma.findByIdAndDelete(req.params.id)
    if (!tma) {
      return res.status(404).json({ message: 'TMA introuvable' })
    }
    await TmaEntreprise.deleteMany({ tma: tma._id })
    res.status(204).end()
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
