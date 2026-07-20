import { Router } from 'express'
import Tma, { calculerMontantClient, calculerStatutAutomatique } from '../models/Tma.js'
import TmaEntreprise from '../models/TmaEntreprise.js'
import Entreprise from '../models/Entreprise.js'
import { autoriserRoles } from '../middleware/auth.js'
import { getIdsLotsDuProgramme } from '../utils/programme.js'

const STATUTS_NON_RECALCULABLES = ['termine', 'refuse', 'annule']

const router = Router()

// Recalcule montantEntreprises/montantClient d'une TMA à partir de ses
// lignes TmaEntreprise, et met à jour son statut si la situation le permet
// encore. Règle demandée par Nicolas : le montant (et donc le passage à
// "chiffre") n'est considéré définitif que si TOUTES les entreprises
// sollicitées ont répondu — une seule entreprise encore en attente doit
// garder la TMA en "étude", même si les autres ont déjà répondu.
async function recalculerTma(tmaId) {
  const lignes = await TmaEntreprise.find({ tma: tmaId })
  // Peuple lot.programme (17/07/2026) : calculerMontantClient a besoin de
  // tauxMargeTma/regleMontantNegatifTma, propres à CE programme — un bug
  // trouvé lors de la revue générale (point 142) les avait jusqu'ici en
  // dur (1.3, "montant_zero"), rendant ces deux réglages de Paramètres
  // inopérants.
  const tma = await Tma.findById(tmaId).populate({ path: 'lot', populate: { path: 'programme' } })
  // Comparé à tma.nombreEntreprisesConcernees (17/07/2026, point 136), pas
  // seulement au nombre de lignes déjà ajoutées : sinon, ajouter 2
  // entreprises sur 3 prévues et obtenir leurs 2 devis faisait basculer la
  // TMA en "chiffré" à tort, avant même que la troisième soit consultée.
  const toutesRepondu =
    lignes.length > 0 &&
    lignes.length === tma.nombreEntreprisesConcernees &&
    lignes.every((ligne) => ligne.montantDevis !== null && ligne.montantDevis !== undefined)
  const montantEntreprises = toutesRepondu
    ? lignes.reduce((somme, ligne) => somme + ligne.montantDevis, 0)
    : null

  tma.montantEntreprises = montantEntreprises
  // Montant client figé à la main (13/07/2026) : ne plus jamais l'écraser
  // automatiquement, même si les devis entreprises changent ensuite.
  // `montantClientSaisiManuellement` (20/07/2026, point 173) : réglage par
  // programme, désactive complètement le calcul automatique par défaut
  // (le taux de marge devient alors juste indicatif, jamais appliqué tout
  // seul) — le gestionnaire saisit chaque montant lui-même via le panneau
  // "Infos" (PATCH /api/tma/:id/infos), qui fige déjà montantClientManuel.
  if (!tma.montantClientManuel && !tma.lot?.programme?.parametres?.montantClientSaisiManuellement) {
    tma.montantClient = calculerMontantClient(montantEntreprises, tma.lot?.programme?.parametres)
  }

  if (!STATUTS_NON_RECALCULABLES.includes(tma.statut)) {
    tma.statut = calculerStatutAutomatique(tma)
  }

  await tma.save()
  return tma
}

// GET /api/tma-entreprises?tma=<id> — lignes entreprise d'une TMA donnée,
// ou GET /api/tma-entreprises (sans filtre) — toutes les lignes, avec le
// lot concerné peuplé (via `tma`), pour la fenêtre d'alertes au démarrage
// (AlerteRetards.jsx, 13/07/2026) qui doit repérer les entreprises en
// retard sur l'ensemble du programme, pas une TMA à la fois.
router.get('/', async (req, res) => {
  try {
    const { tma, programme } = req.query
    let filtre = {}
    if (tma) {
      filtre = { tma }
    } else if (programme) {
      // 17/07/2026, point 138 : TmaEntreprise n'a pas de champ `programme`
      // direct — passe par tma.lot.programme (deux sauts).
      const idsLotsDuProgramme = await getIdsLotsDuProgramme(programme)
      const tmaDuProgramme = await Tma.find({ lot: { $in: idsLotsDuProgramme } }, '_id')
      filtre = { tma: { $in: tmaDuProgramme.map((t) => t._id) } }
    }
    const lignes = await TmaEntreprise.find(filtre)
      .populate('entreprise', 'nom corpsDeTravaux')
      .populate({ path: 'tma', select: 'lot statut', populate: { path: 'lot', select: 'reference' } })
      .sort({ createdAt: 1 })
    res.json(lignes)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// POST /api/tma-entreprises — ajoute une ligne, recalcule la TMA parente.
// `dateEnvoi` (13/07/2026, point 134) : bug corrigé — ce champ n'était
// jamais transmis par le formulaire, il retombait donc toujours sur le
// défaut du schéma (`Date.now`, l'instant de la création). Résultat :
// aucune ligne ne pouvait jamais être considérée "en retard" avec une
// vraie date passée, l'alerte de retard entreprise (estEntrepriseEnRetard,
// utils/statuts.js) ne se déclenchait donc jamais correctement.
router.post('/', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { tma, entreprise, montantDevis, dateEnvoi, dateRetour } = req.body
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
      dateEnvoi: dateEnvoi || undefined, // undefined déclenche le défaut du schéma (aujourd'hui) si vraiment omis
      dateRetour: dateRetour || null,
      statut,
    })
    await recalculerTma(tma)
    res.status(201).json(ligne)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/tma-entreprises/:id — modifie la date d'envoi, le devis et/ou
// la date de retour d'une ligne existante (ex: une entreprise en attente
// qui répond enfin, ou une correction de la date d'envoi — 13/07/2026,
// point 134), recalcule la TMA parente. Aucun champ n'est déduit
// automatiquement : chacun se renseigne explicitement, comme les autres
// dates de l'appli.
router.patch('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { dateEnvoi, montantDevis, dateRetour } = req.body
    const ligne = await TmaEntreprise.findById(req.params.id)

    if (!ligne) {
      return res.status(404).json({ message: 'Ligne introuvable' })
    }

    if (dateEnvoi !== undefined) {
      ligne.dateEnvoi = dateEnvoi
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
router.delete('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
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
