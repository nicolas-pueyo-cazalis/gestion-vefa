import { Router } from 'express'
import Tma, { TRANSITIONS_AUTORISEES, calculerStatutAutomatique, calculerMontantClient } from '../models/Tma.js'
import Lot from '../models/Lot.js'
import TmaEntreprise from '../models/TmaEntreprise.js'
import Compteur from '../models/Compteur.js'
import { autoriserRoles } from '../middleware/auth.js'
import { getIdsLotsDuProgramme } from '../utils/programme.js'
import { recalculerTma } from './tmaEntreprises.js'

const STATUTS_NON_RECALCULABLES = ['termine', 'refuse', 'annule']

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
    // `?programme=<id>` (17/07/2026, point 138) : Tma n'a pas de champ
    // `programme` direct — passe par les lots de ce programme (Tma n'existe
    // que rattachée à un lot).
    const { programme } = req.query
    const filtre = {}
    if (programme) {
      filtre.lot = { $in: await getIdsLotsDuProgramme(programme) }
    }
    const tmaList = await Tma.find(filtre)
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
    const { lot, localisation, description, dateDemande, nombreEntreprisesConcernees } = req.body

    const lotDoc = await Lot.findById(lot).populate('programme')
    if (!lotDoc) {
      return res.status(404).json({ message: 'Lot introuvable' })
    }
    if (!lotDoc.acquereur) {
      return res.status(400).json({ message: 'Ce lot n\'a pas encore d\'acquéreur — impossible de créer une TMA.' })
    }

    // montantEntreprises explicitement à `null` (pas juste absent) : "pas
    // encore chiffré", cohérent avec le reste de l'appli (ex: seed.js) —
    // un champ `undefined` fait planter le formatage côté React
    // (`formatMontant(undefined)` → "NaN €"). montantClient, lui, n'est
    // plus systématiquement `null` (20/07/2026, point 184) : si des frais
    // d'ouverture de dossier sont paramétrés, ils sont dus dès la création.
    const tma = await Tma.create({
      lot, acquereur: lotDoc.acquereur, localisation, description, dateDemande,
      nombreEntreprisesConcernees: nombreEntreprisesConcernees ?? undefined,
      montantEntreprises: null,
      montantClient: calculerMontantClient(null, lotDoc.programme?.parametres),
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

    // On mémorise l'étape quittée avant de passer à "refuse"/"annule", pour
    // pouvoir y revenir exactement avec /annuler-refus ou /annuler-annulation.
    if (statut === 'refuse') {
      tma.statutAvantRefus = tma.statut
    }
    if (statut === 'annule') {
      tma.statutAvantAnnulation = tma.statut
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
// elle est déjà terminée/refusée/annulée : dans ce cas, on garde les
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

    // Répercute la date d'envoi entreprises sur les lignes déjà créées
    // (17/07/2026, point 134) : sinon ce champ ne sert à rien pour les
    // entreprises déjà ajoutées, qui restent bloquées sur leur date de
    // création. Reste modifiable ensuite ligne par ligne (LigneEntreprise.jsx)
    // si une entreprise en particulier est contactée à une autre date.
    if (dateEnvoiEntreprises !== undefined) {
      tma.dateEnvoiEntreprises = dateEnvoiEntreprises
      if (dateEnvoiEntreprises) {
        await TmaEntreprise.updateMany({ tma: tma._id }, { dateEnvoi: dateEnvoiEntreprises })
      }
    }
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

// PATCH /api/tma/:id/annuler-annulation — restaure le statut précédent une
// annulation (13/07/2026, point 129) — même principe que /annuler-refus.
router.patch('/:id/annuler-annulation', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const tma = await Tma.findById(req.params.id)

    if (!tma) {
      return res.status(404).json({ message: 'TMA introuvable' })
    }
    if (tma.statut !== 'annule' || !tma.statutAvantAnnulation) {
      return res.status(400).json({ message: 'Cette TMA n\'a pas été annulée, rien à annuler' })
    }

    tma.statut = tma.statutAvantAnnulation
    tma.statutAvantAnnulation = undefined
    await tma.save()
    res.json(tma)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/tma/:id/annuler-termine — revient en arrière après un passage
// (manuel) à "Terminé" par erreur (20/07/2026, point 172). Contrairement à
// /annuler-refus et /annuler-annulation, pas besoin de mémoriser le statut
// d'origine (statutAvantX) : "termine" n'est atteignable que depuis "valide"
// (seule transition prévue, voir TRANSITIONS_AUTORISEES), donc l'origine est
// toujours la même et n'a pas besoin d'être stockée.
router.patch('/:id/annuler-termine', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const tma = await Tma.findById(req.params.id)

    if (!tma) {
      return res.status(404).json({ message: 'TMA introuvable' })
    }
    if (tma.statut !== 'termine') {
      return res.status(400).json({ message: 'Cette TMA n\'est pas terminée, rien à annuler' })
    }

    tma.statut = 'valide'
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
    const { localisation, description, commentaire, montantClient, nombreEntreprisesConcernees } = req.body
    const tma = await Tma.findById(req.params.id)
    if (!tma) {
      return res.status(404).json({ message: 'TMA introuvable' })
    }

    if (localisation !== undefined) tma.localisation = localisation
    if (description !== undefined) tma.description = description
    if (commentaire !== undefined) tma.commentaire = commentaire
    // Bug corrigé (17/07/2026) : le formulaire renvoie toujours ce champ,
    // même quand seule la localisation ou le nombre d'entreprises
    // concernées est modifié — figer montantClientManuel dans tous les cas
    // bloquait le recalcul automatique dès qu'on rouvrait ce panneau, même
    // sans toucher au montant. Ne fige que si la valeur change réellement.
    if (montantClient !== undefined && montantClient !== (tma.montantClient ?? null)) {
      // Plus de négociation possible une fois validée (20/07/2026, point
      // 182) : le montant facturé au client est acquis dès "Validé", et le
      // reste pour "Terminé" (qui en découle) — cohérent avec le prix d'un
      // lot, figé lui aussi une fois Acté.
      if (['valide', 'termine'].includes(tma.statut)) {
        return res.status(400).json({
          message: 'TMA validée : le montant TTC client n\'est plus modifiable.',
        })
      }
      tma.montantClientManuel = true
      tma.montantClient = montantClient
    }
    const nombreEntreprisesConcerneesModifie =
      nombreEntreprisesConcernees !== undefined && nombreEntreprisesConcernees !== tma.nombreEntreprisesConcernees
    if (nombreEntreprisesConcernees !== undefined) tma.nombreEntreprisesConcernees = nombreEntreprisesConcernees

    await tma.save()

    // Bug signalé le 21/07/2026 par Nicolas : corriger ce nombre APRÈS avoir
    // déjà saisi tous les devis entreprises (ex: 3 renseigné par erreur au
    // lieu de 2) ne redéclenchait jamais le calcul du montant
    // entreprises/statut — celui-ci n'a normalement lieu que lors de
    // l'ajout/modification/suppression d'une ligne TmaEntreprise (voir
    // recalculerTma, routes/tmaEntreprises.js), jamais quand c'est CE nombre
    // qui change alors que les lignes existent déjà.
    if (nombreEntreprisesConcerneesModifie) {
      await recalculerTma(tma._id)
    }

    const tmaPeuplee = await Tma.findById(tma._id).populate([
      { path: 'lot', select: 'reference statut acquereur', populate: { path: 'acquereur', select: 'civilite prenom nom' } },
      { path: 'acquereur', select: 'civilite prenom nom' },
    ])
    res.json(tmaPeuplee)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// POST /api/tma/:id/devis-numero — réserve le prochain numéro de devis
// client pour cette TMA (21/07/2026, remarque de Nicolas : "Générer devis
// client"). Une suite par programme et par année (`devis-tma-<idProgramme>-
// <année>`, ex: "TMA-2026-005") — incrémentée à CHAQUE génération, même en
// cas de double-clic ou de devis regénéré après correction : un numéro,
// une fois délivré, n'est jamais réutilisé (pratique standard de
// numérotation de devis/factures). Incrément atomique (`$inc`) pour éviter
// qu'une génération concurrente ne récupère deux fois le même numéro.
router.post('/:id/devis-numero', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const tma = await Tma.findById(req.params.id).populate({ path: 'lot', populate: { path: 'programme' } })
    if (!tma) {
      return res.status(404).json({ message: 'TMA introuvable' })
    }
    const annee = new Date().getFullYear()
    const cle = `devis-tma-${tma.lot.programme._id}-${annee}`
    const compteur = await Compteur.findOneAndUpdate(
      { cle },
      { $inc: { valeur: 1 } },
      { upsert: true, new: true },
    )
    const numeroDevis = `TMA-${annee}-${String(compteur.valeur).padStart(3, '0')}`
    res.json({ numeroDevis })
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
