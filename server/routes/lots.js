import { Router } from 'express'
import Lot from '../models/Lot.js'
import Acquereur from '../models/Acquereur.js'
import Programme from '../models/Programme.js'
import Tma from '../models/Tma.js'
import AppelDeFonds from '../models/AppelDeFonds.js'
import { calculerEmissionAppel } from '../utils/appelsDeFonds.js'

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
  // Sens inverse (11/07/2026) : un lot Acté a nécessairement été Réservé
  // avant — sans quoi la phase "Réservation" des appels de fonds (voir
  // genererAppelsDeFonds) n'aurait aucune date à partir de laquelle
  // s'auto-émettre.
  if (lot.statut === 'acte' && !lot.dateReservation) {
    return 'La date de réservation doit être renseignée avant de passer un lot à "Acté".'
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

// Génère les appels de fonds d'un lot (un par phase du barème), au moment
// précis où il passe "Acté" — décision du 11/07/2026, voir docs/decisions.md.
// Avant "Acté", un appel de fonds n'a de toute façon aucun sens (règle
// métier n°2 de l'analyse Excel), donc rien n'est créé plus tôt. Le
// pourcentage de chaque phase est **figé** au moment de la génération
// (copié depuis `programme.parametres.baremePhases`) : si le barème du
// programme est corrigé après coup, ça ne doit pas changer rétroactivement
// un appel déjà généré — même principe que `TmaEntreprise.corpsDeTravaux`.
async function genererAppelsDeFonds(lot) {
  const dejaGeneres = await AppelDeFonds.countDocuments({ lot: lot._id })
  if (dejaGeneres > 0) return // sécurité anti-doublon (déjà générés)

  const programme = await Programme.findById(lot.programme)
  const phases = [...programme.parametres.baremePhases].sort((a, b) => a.ordre - b.ordre)
  const delai = programme.parametres.delaiReglementAppelJours

  // Remarque du 11/07/2026 (point 5) : une attestation MOE constate
  // l'avancement du chantier dans son ensemble, pas lot par lot — si une
  // phase a déjà été attestée pour d'autres lots du même programme (ex:
  // "Achèvement des fondations" déjà constaté avant que ce lot ne soit
  // vendu), ce nouveau lot "rattrape" directement cette phase, sans
  // attendre une réattestation qui n'aurait pas de sens.
  const autresLots = await Lot.find({ programme: lot.programme }, '_id')
  const appelsAttestesDuProgramme = await AppelDeFonds.find({
    lot: { $in: autresLots.map((l) => l._id) },
    dateAttestationMOE: { $ne: null },
  })
  const attestationParPhase = Object.fromEntries(
    appelsAttestesDuProgramme.map((appel) => [appel.phase.nom, appel.dateAttestationMOE]),
  )

  await AppelDeFonds.insertMany(
    phases.map((phase, index) => {
      const document = {
        lot: lot._id,
        phase: { nom: phase.nom, pourcentage: phase.pourcentage, ordre: phase.ordre },
        montant: lot.prixTTC * phase.pourcentage,
      }
      if (index === 0) {
        // 1ère phase du barème (ex: "Réservation") : ne demande jamais
        // d'attestation MOE — un lot Acté a nécessairement déjà une date
        // de réservation (voir validerDatesCoherentesAvecStatut
        // ci-dessus). Le dépôt de garantie de cette phase est réglé au
        // moment même de la réservation, factuellement, pas plus tard —
        // remarque du 13/07/2026 : `dateReglement` se déduit donc
        // automatiquement, comme `dateEmission`, pas seulement l'échéance.
        document.dateEmission = lot.dateReservation
        document.dateReglement = lot.dateReservation
        const dateLimite = new Date(lot.dateReservation)
        dateLimite.setDate(dateLimite.getDate() + delai)
        document.dateLimiteReglement = dateLimite
      } else if (attestationParPhase[phase.nom]) {
        // Remarque du 13/07/2026 : si l'acte de ce lot est postérieur (ou
        // égal) à la date à laquelle cette phase a déjà été attestée pour
        // d'autres lots du programme, l'appel est déjà dû au moment de la
        // signature — voir calculerEmissionAppel(). Reste modifiable à la
        // main ensuite (bouton "Modifier", en vidant la date de règlement)
        // si ce n'était en réalité pas le cas.
        document.dateAttestationMOE = attestationParPhase[phase.nom]
        Object.assign(document, calculerEmissionAppel(lot, attestationParPhase[phase.nom], delai))
      }
      return document
    }),
  )
}

// GET /api/lots — liste de tous les lots, triés par référence. Champs
// acquéreur étendus (13/07/2026) : banque/courtier/dateOffrePretRecue sont
// nécessaires à la page "Suivi de prêt", qui part des lots (pas des
// acquéreurs) pour avoir accès à `dateReservation` en même temps.
router.get('/', async (req, res) => {
  try {
    const lots = await Lot.find().sort({ reference: 1 })
      .populate('acquereur', 'civilite nom prenom banque courtier notaire dateOffrePretRecue sansPret')
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

    // Pas seulement "vient de passer à Acté" : un lot déjà Acté (ex: dans
    // les données de seed) mais sans appels de fonds encore générés doit
    // aussi être rattrapé — genererAppelsDeFonds() ne fait rien si des
    // appels existent déjà pour ce lot (sécurité anti-doublon).
    if (lot.statut === 'acte') {
      await genererAppelsDeFonds(lot)
    }

    if (nouvelAcquereurId !== ancienAcquereurId) {
      if (ancienAcquereurId) {
        await Acquereur.findByIdAndUpdate(ancienAcquereurId, { $pull: { lots: lot._id } })
      }
      if (nouvelAcquereurId) {
        await Acquereur.findByIdAndUpdate(nouvelAcquereurId, { $addToSet: { lots: lot._id } })
      }
    }

    const lotPeuple = await lot.populate('acquereur', 'civilite nom prenom banque courtier notaire dateOffrePretRecue sansPret')
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
