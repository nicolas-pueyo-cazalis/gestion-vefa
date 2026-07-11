import { Router } from 'express'
import Lot from '../models/Lot.js'
import Acquereur from '../models/Acquereur.js'
import Programme from '../models/Programme.js'
import Tma from '../models/Tma.js'
import AppelDeFonds from '../models/AppelDeFonds.js'

const router = Router()

// Ordre du cycle de vente : une date d'étape ne peut être renseignée que
// si le statut a atteint (ou dépassé) cette étape — remarque du
// 10/07/2026, "il faut que la date affichée corresponde au statut".
const ORDRE_STATUTS = ['libre', 'option', 'reserve', 'acte']

function validerDatesCoherentesAvecStatut(lot) {
  const index = ORDRE_STATUTS.indexOf(lot.statut)
  if (index < 1 && lot.dateOption) {
    return 'La date d\'option ne peut être renseignée que si le statut est au moins "Option".'
  }
  if (index < 2 && lot.dateReservation) {
    return 'La date de réservation ne peut être renseignée que si le statut est au moins "Réservé".'
  }
  if (index < 3 && lot.dateActe) {
    return 'La date d\'acte ne peut être renseignée que si le statut est "Acté".'
  }
  return null
}

// `parkings`/`caves` sont des numéros identifiants (ex: place n°10), pas un
// simple compte — remarque du 10/07/2026 : deux lots ne peuvent jamais
// revendiquer le même numéro. Vérifie qu'aucun doublon n'existe ni dans la
// saisie elle-même, ni chez les autres lots du même programme.
async function validerNumerosUniques(programmeId, lotIdAIgnorer, champ, valeurs) {
  if (!valeurs || valeurs.length === 0) return null

  const doublonsLocaux = [...new Set(valeurs.filter((v, i) => valeurs.indexOf(v) !== i))]
  if (doublonsLocaux.length > 0) {
    return `numéro(s) en double dans la saisie : ${doublonsLocaux.join(', ')}`
  }

  const autresLots = await Lot.find({
    programme: programmeId,
    ...(lotIdAIgnorer && { _id: { $ne: lotIdAIgnorer } }),
  })
  const dejaUtilises = new Set(autresLots.flatMap((lot) => lot[champ] ?? []))
  const conflits = valeurs.filter((v) => dejaUtilises.has(v))
  if (conflits.length > 0) {
    return `numéro(s) déjà utilisé(s) par un autre lot : ${conflits.join(', ')}`
  }
  return null
}

// GET /api/lots — liste de tous les lots, triés par référence
router.get('/', async (req, res) => {
  try {
    const lots = await Lot.find().sort({ reference: 1 }).populate('acquereur', 'civilite nom prenom')
    res.json(lots)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// POST /api/lots — crée un lot (caractéristiques techniques, saisies depuis
// la page Paramètres > Lots). Un lot créé démarre toujours "libre", sans
// acquéreur : ça se renseigne ensuite via PATCH, au fil de la vente.
router.post('/', async (req, res) => {
  try {
    const {
      programme, reference, etage, type, orientation,
      surfaceHabitable, surfaceTerrasse, surfaceJardin,
      parkings, caves, prixTTC,
    } = req.body

    // Vérification côté serveur (pas seulement dans le formulaire React) :
    // on ne dépasse jamais le nombre de logements annoncé pour le
    // programme, quand ce nombre est renseigné.
    const programmeDoc = await Programme.findById(programme)
    if (programmeDoc?.nombreLogements != null) {
      const nombreLotsExistants = await Lot.countDocuments({ programme })
      if (nombreLotsExistants >= programmeDoc.nombreLogements) {
        return res.status(400).json({
          message: `Nombre maximum de logements déjà atteint (${programmeDoc.nombreLogements}).`,
        })
      }
    }

    const erreurParkings = await validerNumerosUniques(programme, null, 'parkings', parkings)
    if (erreurParkings) {
      return res.status(400).json({ champ: 'parkings', message: erreurParkings })
    }
    const erreurCaves = await validerNumerosUniques(programme, null, 'caves', caves)
    if (erreurCaves) {
      return res.status(400).json({ champ: 'caves', message: erreurCaves })
    }

    const lot = await Lot.create({
      programme, reference, etage, type, orientation,
      surfaceHabitable, surfaceTerrasse, surfaceJardin,
      parkings, caves, prixTTC,
    })
    res.status(201).json(lot)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/lots/:id — modification partielle : caractéristiques
// techniques, statut, dates, commentaire, et liaison avec un acquéreur.
// Deux façons de renseigner le client (page Lots, colonne "Nom client",
// décision du 10/07/2026) : `acquereur` (ObjectId d'un acquéreur déjà
// existant) ou `acquereurNouveau` (`{ civilite, nom }`, crée l'acquéreur à
// la volée). Dans les deux cas, la relation inverse `Acquereur.lots` est
// synchronisée pour rester cohérente dans les deux sens.
router.patch('/:id', async (req, res) => {
  try {
    const lot = await Lot.findById(req.params.id)
    if (!lot) {
      return res.status(404).json({ message: 'Lot introuvable' })
    }

    const { acquereurNouveau, acquereurMiseAJour, ...champs } = req.body

    if (champs.parkings) {
      const erreurParkings = await validerNumerosUniques(lot.programme, lot._id, 'parkings', champs.parkings)
      if (erreurParkings) {
        return res.status(400).json({ champ: 'parkings', message: erreurParkings })
      }
    }
    if (champs.caves) {
      const erreurCaves = await validerNumerosUniques(lot.programme, lot._id, 'caves', champs.caves)
      if (erreurCaves) {
        return res.status(400).json({ champ: 'caves', message: erreurCaves })
      }
    }

    const ancienAcquereurId = lot.acquereur?.toString() ?? null
    let nouvelAcquereurId = ancienAcquereurId

    if (acquereurNouveau) {
      const acquereurCree = await Acquereur.create({
        civilite: acquereurNouveau.civilite,
        nom: acquereurNouveau.nom,
      })
      champs.acquereur = acquereurCree._id
      nouvelAcquereurId = acquereurCree._id.toString()
    } else if ('acquereur' in champs) {
      nouvelAcquereurId = champs.acquereur || null
      // Corrige le nom/civilité de l'acquéreur déjà lié, plutôt que d'en
      // créer un nouveau — sinon renommer un client depuis la page Lots
      // laissait une fiche fantôme (sans lot) dans la page Clients. Voir
      // docs/bugs.md.
      if (acquereurMiseAJour && champs.acquereur) {
        await Acquereur.findByIdAndUpdate(champs.acquereur, {
          civilite: acquereurMiseAJour.civilite,
          nom: acquereurMiseAJour.nom,
        })
      }
    }

    Object.assign(lot, champs)

    const erreurDates = validerDatesCoherentesAvecStatut(lot)
    if (erreurDates) {
      return res.status(400).json({ message: erreurDates })
    }

    await lot.save()

    if (nouvelAcquereurId !== ancienAcquereurId) {
      if (ancienAcquereurId) {
        await Acquereur.findByIdAndUpdate(ancienAcquereurId, { $pull: { lots: lot._id } })
      }
      if (nouvelAcquereurId) {
        await Acquereur.findByIdAndUpdate(nouvelAcquereurId, { $addToSet: { lots: lot._id } })
      }
    }

    const lotPeuple = await lot.populate('acquereur', 'civilite nom prenom')
    res.json(lotPeuple)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// DELETE /api/lots/:id — supprime un lot (page Paramètres > Lots). Refuse
// si des TMA ou appels de fonds y font encore référence (sinon ces
// documents se retrouvent avec une référence cassée, ex: `tma.lot` qui
// devient `null` après `.populate()` et fait planter la page TMA). Nettoie
// aussi la relation inverse si un acquéreur y était lié.
router.delete('/:id', async (req, res) => {
  try {
    const [nombreTma, nombreAppels] = await Promise.all([
      Tma.countDocuments({ lot: req.params.id }),
      AppelDeFonds.countDocuments({ lot: req.params.id }),
    ])
    if (nombreTma > 0 || nombreAppels > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer ce lot : ${nombreTma} TMA et ${nombreAppels} appel(s) de fonds y font encore référence.`,
      })
    }

    const lot = await Lot.findByIdAndDelete(req.params.id)
    if (!lot) {
      return res.status(404).json({ message: 'Lot introuvable' })
    }
    if (lot.acquereur) {
      await Acquereur.findByIdAndUpdate(lot.acquereur, { $pull: { lots: lot._id } })
    }
    res.status(204).end()
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
