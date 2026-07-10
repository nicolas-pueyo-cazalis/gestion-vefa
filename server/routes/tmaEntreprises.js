import { Router } from 'express'
import Tma, { calculerMontantClient, calculerStatutAutomatique } from '../models/Tma.js'
import TmaEntreprise from '../models/TmaEntreprise.js'
import Entreprise from '../models/Entreprise.js'

const STATUTS_NON_RECALCULABLES = ['travaux', 'termine', 'refuse']

const router = Router()

// Recalcule montantEntreprises/montantClient d'une TMA à partir de ses
// lignes TmaEntreprise, et met à jour son statut si la situation le permet
// encore. Règle demandée par Nicolas : le montant (et donc le passage à
// "chiffre") n'est considéré définitif que si TOUTES les entreprises
// sollicitées ont répondu — une seule entreprise encore en attente doit
// garder la TMA en "étude", même si les autres ont déjà répondu.
async function recalculerTma(tmaId) {
  const lignes = await TmaEntreprise.find({ tma: tmaId })
  const toutesRepondu =
    lignes.length > 0 && lignes.every((ligne) => ligne.montantDevis !== null && ligne.montantDevis !== undefined)
  const montantEntreprises = toutesRepondu
    ? lignes.reduce((somme, ligne) => somme + ligne.montantDevis, 0)
    : null

  const tma = await Tma.findById(tmaId)
  tma.montantEntreprises = montantEntreprises
  tma.montantClient = calculerMontantClient(montantEntreprises)

  if (!STATUTS_NON_RECALCULABLES.includes(tma.statut)) {
    tma.statut = calculerStatutAutomatique(tma)
  }

  await tma.save()
  return tma
}

// GET /api/tma-entreprises?tma=<id> — lignes entreprise d'une TMA donnée
router.get('/', async (req, res) => {
  try {
    const { tma } = req.query
    if (!tma) {
      return res.status(400).json({ message: 'Paramètre "tma" requis' })
    }
    const lignes = await TmaEntreprise.find({ tma })
      .populate('entreprise', 'nom corpsDeTravaux')
      .sort({ createdAt: 1 })
    res.json(lignes)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// POST /api/tma-entreprises — ajoute une ligne, recalcule la TMA parente
router.post('/', async (req, res) => {
  try {
    const { tma, entreprise, montantDevis } = req.body
    if (!tma || !entreprise) {
      return res.status(400).json({ message: 'Les champs "tma" et "entreprise" sont requis' })
    }

    const entrepriseDoc = await Entreprise.findById(entreprise)
    if (!entrepriseDoc) {
      return res.status(404).json({ message: 'Entreprise introuvable' })
    }

    const statut = montantDevis !== null && montantDevis !== undefined ? 'recu' : 'a_chiffrer'
    const ligne = await TmaEntreprise.create({
      tma,
      entreprise,
      corpsDeTravaux: entrepriseDoc.corpsDeTravaux, // figé au moment de l'ajout
      montantDevis,
      statut,
    })
    await recalculerTma(tma)
    res.status(201).json(ligne)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/tma-entreprises/:id — modifie le devis et/ou la date de retour
// d'une ligne existante (ex: une entreprise en attente qui répond enfin),
// recalcule la TMA parente. Aucun champ n'est déduit automatiquement : les
// deux se renseignent explicitement, comme les autres dates de l'appli.
router.patch('/:id', async (req, res) => {
  try {
    const { montantDevis, dateRetour } = req.body
    const ligne = await TmaEntreprise.findById(req.params.id)

    if (!ligne) {
      return res.status(404).json({ message: 'Ligne introuvable' })
    }

    if (montantDevis !== undefined) {
      ligne.montantDevis = montantDevis
      ligne.statut = montantDevis !== null ? 'recu' : 'a_chiffrer'
    }
    if (dateRetour !== undefined) {
      ligne.dateRetour = dateRetour
    }

    await ligne.save()
    await recalculerTma(ligne.tma)
    res.json(ligne)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// DELETE /api/tma-entreprises/:id — retire une ligne, recalcule la TMA parente
router.delete('/:id', async (req, res) => {
  try {
    const ligne = await TmaEntreprise.findByIdAndDelete(req.params.id)
    if (!ligne) {
      return res.status(404).json({ message: 'Ligne introuvable' })
    }
    await recalculerTma(ligne.tma)
    res.status(204).end()
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
