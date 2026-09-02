import { Router } from 'express'
import Acquereur from '../models/Acquereur.js'
import { autoriserRoles } from '../middleware/auth.js'
import { getIdsLotsDuProgramme } from '../utils/programme.js'
import { repondreErreurServeur } from '../utils/erreurs.js'

const router = Router()

// GET /api/acquereurs — liste triée par nom (page Clients, listes
// déroulantes de liaison sur la page Lots). `?programme=<id>` (17/07/2026,
// point 138, affiné suite à la remarque de Nicolas) : Acquereur n'a pas de
// champ `programme` direct — ne garder QUE ceux ayant un lot dans ce
// programme, c'est-à-dire les clients "actifs" (visibles dans le tableau
// des Lots). Un acquéreur créé uniquement depuis la page Lots (jamais
// autrement, voir POST ci-dessous), il n'y a donc aucune raison légitime
// d'en lister un sans lot — s'il en existe, c'est un résidu (ex: vente
// annulée) qu'on ne veut plus voir ici, même s'il reste gardé en base pour
// ne pas casser une TMA qui le référence encore (voir routes/lots.js).
router.get('/', async (req, res) => {
  try {
    const { programme } = req.query
    let filtre = {}
    if (programme) {
      filtre = { lots: { $in: await getIdsLotsDuProgramme(programme) } }
    }
    const acquereurs = await Acquereur.find(filtre)
      .sort({ nom: 1, prenom: 1 })
      .populate('lots', 'reference')
    res.json(acquereurs)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// POST /api/acquereurs — crée un acquéreur. Utilisé aussi bien depuis la
// future page Clients (coordonnées complètes) que depuis la page Lots
// (création rapide civilité + nom lors de la saisie du "Nom client").
router.post('/', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const {
      civilite,
      nom,
      prenom,
      adresse,
      commune,
      codePostal,
      telephone,
      email,
      banque,
      courtier,
      dateOffrePretRecue,
    } = req.body
    const acquereur = await Acquereur.create({
      civilite,
      nom,
      prenom,
      adresse,
      commune,
      codePostal,
      telephone,
      email,
      banque,
      courtier,
      dateOffrePretRecue,
    })
    res.status(201).json(acquereur)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// PATCH /api/acquereurs/:id — modification partielle (édition des
// coordonnées depuis la page Clients)
router.patch('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const acquereur = await Acquereur.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    if (!acquereur) {
      return res.status(404).json({ message: 'Acquéreur introuvable' })
    }
    res.json(acquereur)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

export default router
