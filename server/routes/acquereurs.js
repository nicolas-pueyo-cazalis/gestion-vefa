import { Router } from 'express'
import Acquereur from '../models/Acquereur.js'

const router = Router()

// GET /api/acquereurs — liste complète, triée par nom (page Clients,
// listes déroulantes de liaison sur la page Lots)
router.get('/', async (req, res) => {
  try {
    const acquereurs = await Acquereur.find().sort({ nom: 1, prenom: 1 }).populate('lots', 'reference')
    res.json(acquereurs)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// POST /api/acquereurs — crée un acquéreur. Utilisé aussi bien depuis la
// future page Clients (coordonnées complètes) que depuis la page Lots
// (création rapide civilité + nom lors de la saisie du "Nom client").
router.post('/', async (req, res) => {
  try {
    const {
      civilite, nom, prenom, adresse, commune, codePostal,
      telephone, email, banque, courtier, offrePretRecue,
    } = req.body
    const acquereur = await Acquereur.create({
      civilite, nom, prenom, adresse, commune, codePostal,
      telephone, email, banque, courtier, offrePretRecue,
    })
    res.status(201).json(acquereur)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/acquereurs/:id — modification partielle (édition des
// coordonnées depuis la page Clients)
router.patch('/:id', async (req, res) => {
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
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
