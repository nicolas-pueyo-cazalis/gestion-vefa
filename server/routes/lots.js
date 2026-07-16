import { Router } from 'express'
import Lot from '../models/Lot.js'
import Acquereur from '../models/Acquereur.js'
import Programme from '../models/Programme.js'
import Tma from '../models/Tma.js'
import AppelDeFonds from '../models/AppelDeFonds.js'
import HistoriqueAnnulation from '../models/HistoriqueAnnulation.js'
import { calculerEmissionAppel } from '../utils/appelsDeFonds.js'
import { autoriserRoles } from '../middleware/auth.js'

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
        document.regleAutomatiquement = true
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
router.post('/', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const {
      programme, reference, etage, type, orientation,
      surfaceHabitable, surfacesTerrasses, surfacesBalcons, surfacesLoggias, surfaceJardin,
      parkings, caves, celliers, prixTTC,
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
    const erreurCelliers = await validerNumerosUniques(programme, null, 'celliers', celliers)
    if (erreurCelliers) {
      return res.status(400).json({ champ: 'celliers', message: erreurCelliers })
    }

    const lot = await Lot.create({
      programme, reference, etage, type, orientation,
      surfaceHabitable, surfacesTerrasses, surfacesBalcons, surfacesLoggias, surfaceJardin,
      parkings, caves, celliers, prixTTC,
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
router.patch('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
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
    if (champs.celliers) {
      const erreurCelliers = await validerNumerosUniques(lot.programme, lot._id, 'celliers', champs.celliers)
      if (erreurCelliers) {
        return res.status(400).json({ champ: 'celliers', message: erreurCelliers })
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

    // Capturés avant modification (13/07/2026, point 125) : pour ne réagir
    // qu'à une vraie CORRECTION d'un lot déjà Acté, jamais à sa toute
    // première génération d'appels de fonds (qui, elle, inclut forcément
    // "dateActe" dans la requête aussi — voir plus bas).
    const ancienStatut = lot.statut
    const ancienneDateActe = lot.dateActe?.getTime()

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

    // Bug corrigé le 13/07/2026 (point 125), deux cas distincts — tous deux
    // conditionnés à "ancienStatut === 'acte'" : ne jamais réagir à la toute
    // première génération d'appels de fonds d'un lot qui vient de passer
    // Acté pour la première fois (elle inclut forcément "dateActe" dans la
    // requête elle aussi, et vient tout juste de calculer les bonnes
    // valeurs via genererAppelsDeFonds ci-dessus — les écraser serait le
    // bug inverse).
    if (ancienStatut === 'acte' && lot.statut !== 'acte') {
      // 1) Le lot n'est plus "Acté" (ex: statut passé à tort à "Acté",
      // corrigé en arrière) : les appels de fonds n'ont alors plus aucun
      // sens du tout, pas seulement leur règlement — mêmes règles que
      // "Annuler la vente" (voir POST /:id/annuler ci-dessous), sinon un
      // futur retour à "Acté" ne regénérerait jamais rien (sécurité
      // anti-doublon de genererAppelsDeFonds).
      await AppelDeFonds.deleteMany({ lot: lot._id })
    } else if (ancienStatut === 'acte' && lot.statut === 'acte'
      && 'dateActe' in champs && lot.dateActe?.getTime() !== ancienneDateActe) {
      // 2) Le lot reste "Acté" mais sa date d'acte est corrigée (valeur
      // réellement différente de l'ancienne) : les règlements déduits
      // automatiquement de cette même date (voir calculerEmissionAppel)
      // deviennent caducs, ils repassent "non réglé". Un vrai règlement
      // saisi à la main (regleAutomatiquement à `false`, voir
      // routes/appelsDeFonds.js) n'est lui jamais touché — le client a
      // vraiment payé, peu importe la correction.
      await AppelDeFonds.updateMany(
        { lot: lot._id, regleAutomatiquement: true },
        { dateReglement: null, regleAutomatiquement: false },
      )
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

// POST /api/lots/:id/annuler — bouton client "Annuler la vente" (points
// 117+118, 2e refonte du 13/07/2026 : un premier essai gardait un statut
// "annule" sur le lot lui-même, mais Nicolas a précisé vouloir que le lot
// reparte à zéro sur l'interface principale — "de nouveau à la vente" —
// et que l'historique de la vente annulée vive sur une page à part,
// jamais mélangé aux pages actives). Copie tout ce qui était rattaché à
// cette vente (statut/dates, client, prêt, acte, appels de fonds) dans
// HistoriqueAnnulation, PUIS vide/supprime ces informations des pages
// concernées — sauf les TMA (point 133), volontairement laissées telles
// quelles (avec un avertissement, voir routes/tma.js et Tma.jsx) plutôt
// que déplacées ou supprimées : Nicolas veut pouvoir décider lui-même de
// les garder (le prochain acquéreur reprend la demande) ou de les
// supprimer (bouton à venir, point 128).
router.post('/:id/annuler', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const lot = await Lot.findById(req.params.id).populate('acquereur')
    if (!lot) {
      return res.status(404).json({ message: 'Lot introuvable' })
    }
    if (lot.statut === 'libre') {
      return res.status(400).json({ message: 'Ce logement est déjà libre, il n\'y a pas de vente à annuler.' })
    }

    const appels = await AppelDeFonds.find({ lot: lot._id })
    const acquereur = lot.acquereur

    await HistoriqueAnnulation.create({
      lot: lot._id,
      programme: lot.programme,
      referenceLot: lot.reference,
      statutAvantAnnulation: lot.statut,
      dateOption: lot.dateOption,
      dateReservation: lot.dateReservation,
      dateActe: lot.dateActe,
      commentaire: lot.commentaire,
      civiliteClient: acquereur?.civilite,
      nomClient: acquereur?.nom,
      prenomClient: acquereur?.prenom,
      banque: acquereur?.banque,
      courtier: acquereur?.courtier,
      dateOffrePretRecue: acquereur?.dateOffrePretRecue,
      sansPret: acquereur?.sansPret,
      notaire: acquereur?.notaire,
      appelsDeFonds: appels.map((appel) => ({
        phase: appel.phase,
        montant: appel.montant,
        dateEmission: appel.dateEmission,
        dateAttestationMOE: appel.dateAttestationMOE,
        dateLimiteReglement: appel.dateLimiteReglement,
        dateReglement: appel.dateReglement,
      })),
    })

    // Les appels de fonds n'ont plus lieu d'être sur un lot redevenu
    // "Libre" — et il faut les supprimer pour qu'une revente future de ce
    // même lot puisse en regénérer (genererAppelsDeFonds ci-dessus est une
    // sécurité anti-doublon qui, sinon, ne créerait plus jamais rien).
    await AppelDeFonds.deleteMany({ lot: lot._id })

    if (acquereur) {
      acquereur.lots = acquereur.lots.filter((idLot) => idLot.toString() !== lot._id.toString())
      // Cet acquéreur n'existait que pour cette vente (aucun autre lot
      // après retrait de celui-ci) : sa fiche est supprimée, plutôt que de
      // laisser une entrée fantôme sur la page Clients (13/07/2026, point
      // 3) — ses informations restent de toute façon dans l'historique
      // ci-dessus. S'il a d'autres lots, c'est un vrai client par ailleurs :
      // sa fiche reste. Exception : une TMA vivante qui le référence encore
      // (`Tma.acquereur` est obligatoire, jamais vidé — voir point 133) a
      // besoin que cette fiche continue d'exister, sans quoi la référence
      // devient invalide et la TMA ne peut plus jamais être réattribuée
      // correctement (le comparatif tmaObsolete() de Tma.jsx s'appuie dessus).
      const nombreTmaLiees = await Tma.countDocuments({ acquereur: acquereur._id })
      if (acquereur.lots.length === 0 && nombreTmaLiees === 0) {
        await Acquereur.findByIdAndDelete(acquereur._id)
      } else {
        await acquereur.save()
      }
    }

    lot.statut = 'libre'
    lot.dateOption = null
    lot.dateReservation = null
    lot.dateActe = null
    lot.acquereur = null
    lot.commentaire = null
    await lot.save()

    res.json(lot)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// DELETE /api/lots/:id — supprime un lot (page Paramètres > Lots). Refuse
// si des TMA ou appels de fonds y font encore référence (sinon ces
// documents se retrouvent avec une référence cassée, ex: `tma.lot` qui
// devient `null` après `.populate()` et fait planter la page TMA). Nettoie
// aussi la relation inverse si un acquéreur y était lié.
router.delete('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
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
