import { Router } from 'express'
import Lot from '../models/Lot.js'
import Annexe from '../models/Annexe.js'
import Acquereur from '../models/Acquereur.js'
import Programme from '../models/Programme.js'
import Tma from '../models/Tma.js'
import AppelDeFonds from '../models/AppelDeFonds.js'
import HistoriqueAnnulation from '../models/HistoriqueAnnulation.js'
import HistoriqueModificationPrix from '../models/HistoriqueModificationPrix.js'
import { calculerEmissionAppel } from '../utils/appelsDeFonds.js'
import { getIdsLotsDuProgramme } from '../utils/programme.js'
import { autoriserRoles } from '../middleware/auth.js'
import { repondreErreurServeur } from '../utils/erreurs.js'

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

// Attribue/retire les annexes choisies pour ce lot (17/07/2026, point 165)
// et recalcule `prixTTC` en conséquence — appelé à la création ET à
// chaque modification, que les annexes changent ou non, pour que prixTTC
// reste toujours cohérent avec prixLogementSeul + les annexes réellement
// attribuées (ex: si seul prixLogementSeul change). `annexeIds`
// `undefined` = le formulaire ne gère pas les annexes pour cet appel
// (ex: FormulaireEditionLot, qui ne modifie que statut/dates/client) :
// dans ce cas on ne touche à aucune attribution, seulement au recalcul.
// Ne recalcule QUE si `prixLogementSeul` est renseigné : les lots créés
// avant ce point n'ont pas encore ce champ, et un simple PATCH (ex:
// changer le commentaire) ne doit pas leur écraser silencieusement leur
// prixTTC existant, saisi à la main à l'époque — tant que ce champ n'est
// pas rempli via le formulaire, l'ancien prixTTC reste intouché.
async function synchroniserAnnexesEtPrix(lot, annexeIds) {
  if (annexeIds !== undefined) {
    await Annexe.updateMany({ lot: lot._id, _id: { $nin: annexeIds } }, { lot: null })
    if (annexeIds.length > 0) {
      await Annexe.updateMany(
        { _id: { $in: annexeIds }, programme: lot.programme, $or: [{ lot: null }, { lot: lot._id }] },
        { lot: lot._id },
      )
    }
  }
  if (lot.prixLogementSeul != null) {
    const annexesAttribuees = await Annexe.find({ lot: lot._id })
    lot.prixTTC = lot.prixLogementSeul + annexesAttribuees.reduce((somme, a) => somme + a.prix, 0)
  }
}

// Génère les appels de fonds d'un lot, phase par phase — décision du
// 11/07/2026, voir docs/decisions.md, complétée le 17/07/2026 (remarque de
// Nicolas) : la 1ère phase du barème (ex: "Réservation") est désormais
// générée dès que le lot passe "Réservé" (`seulementReservation: true`),
// pas seulement à "Acté" comme avant — un dépôt de réservation est
// factuellement dû à la réservation, pas à la signature de l'acte. Les
// autres phases restent générées uniquement à "Acté" (règle métier n°2 de
// l'analyse Excel : avant, un appel de fonds n'a pas de sens). Anti-doublon
// PAR PHASE (pas par lot) : `genererAppelsDeFonds(lot)` à l'Acté ne
// regénère jamais la phase "Réservation" si elle existe déjà depuis la
// réservation, mais la crée quand même en rattrapage si elle manquait
// (ex: lot passé directement à "Acté" en une seule modification, ou
// données de seed). Le pourcentage de chaque phase est **figé** au moment
// de sa génération (copié depuis `programme.parametres.baremePhases`) :
// si le barème du programme est corrigé après coup, ça ne doit pas
// changer rétroactivement un appel déjà généré — même principe que
// `TmaEntreprise.corpsDeTravaux`.
async function genererAppelsDeFonds(lot, { seulementReservation = false } = {}) {
  const programme = await Programme.findById(lot.programme)
  const phases = [...programme.parametres.baremePhases].sort((a, b) => a.ordre - b.ordre)
  const delai = programme.parametres.delaiReglementAppelJours

  const appelsExistants = await AppelDeFonds.find({ lot: lot._id }, 'phase.nom')
  const nomsExistants = new Set(appelsExistants.map((appel) => appel.phase.nom))
  const phasesACreer = phases
    .map((phase, index) => ({ phase, index }))
    .filter(({ phase, index }) => !nomsExistants.has(phase.nom) && (!seulementReservation || index === 0))
  if (phasesACreer.length === 0) return

  // Remarque du 11/07/2026 (point 5) : une attestation MOE constate
  // l'avancement du chantier dans son ensemble, pas lot par lot — si une
  // phase a déjà été attestée pour d'autres lots du même programme (ex:
  // "Achèvement des fondations" déjà constaté avant que ce lot ne soit
  // vendu), ce nouveau lot "rattrape" directement cette phase, sans
  // attendre une réattestation qui n'aurait pas de sens.
  const idsLotsDuProgramme = await getIdsLotsDuProgramme(lot.programme)
  const appelsAttestesDuProgramme = await AppelDeFonds.find({
    lot: { $in: idsLotsDuProgramme },
    dateAttestationMOE: { $ne: null },
  })
  const attestationParPhase = Object.fromEntries(
    appelsAttestesDuProgramme.map((appel) => [appel.phase.nom, appel.dateAttestationMOE]),
  )

  await AppelDeFonds.insertMany(
    phasesACreer.map(({ phase, index }) => {
      const document = {
        lot: lot._id,
        phase: { nom: phase.nom, pourcentage: phase.pourcentage, ordre: phase.ordre },
        montant: lot.prixTTC * phase.pourcentage,
      }
      if (index === 0) {
        // 1ère phase du barème (ex: "Réservation") : ne demande jamais
        // d'attestation MOE. Le dépôt de garantie de cette phase est
        // réglé au moment même de la réservation, factuellement, pas
        // plus tard — remarque du 13/07/2026 : `dateReglement` se déduit
        // donc automatiquement, comme `dateEmission`, pas seulement
        // l'échéance.
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

// Barème simplifié pour une annexe vendue seule (17/07/2026, remarque de
// Nicolas, "Vendre une annexe") : seulement 2 échéances (Réservation 5% /
// Acte 95%), pas les phases de construction du barème normal — une
// annexe (parking, cave, cellier) n'a pas de chantier propre à suivre.
// Pourcentages fixes pour l'instant (pas encore configurables). Anti-
// doublon par phase, même principe que genererAppelsDeFonds() ci-dessus.
const POURCENTAGE_RESERVATION_ANNEXE_SEULE = 0.05

async function genererAppelsAnnexeSeule(lot, { seulementReservation = false } = {}) {
  const programme = await Programme.findById(lot.programme)
  const pourcentageReservation = POURCENTAGE_RESERVATION_ANNEXE_SEULE
  const delai = programme.parametres.delaiReglementAppelJours

  const appelsExistants = await AppelDeFonds.find({ lot: lot._id }, 'phase.nom')
  const nomsExistants = new Set(appelsExistants.map((appel) => appel.phase.nom))

  function dateLimite(depuis) {
    const date = new Date(depuis)
    date.setDate(date.getDate() + delai)
    return date
  }

  const documents = []
  // Réglée au moment même de sa propre échéance (comme la phase
  // "Réservation" d'une vente classique) : une annexe vendue à part n'a
  // pas d'attestation de chantier à attendre, le montant est dû
  // factuellement dès la réservation, puis dès l'acte.
  if (!nomsExistants.has('Réservation')) {
    documents.push({
      lot: lot._id,
      phase: { nom: 'Réservation', pourcentage: pourcentageReservation, ordre: 1 },
      montant: lot.prixTTC * pourcentageReservation,
      dateEmission: lot.dateReservation,
      dateReglement: lot.dateReservation,
      regleAutomatiquement: true,
      dateLimiteReglement: dateLimite(lot.dateReservation),
    })
  }
  if (!seulementReservation && !nomsExistants.has('Acte')) {
    const pourcentageActe = 1 - pourcentageReservation
    documents.push({
      lot: lot._id,
      phase: { nom: 'Acte', pourcentage: pourcentageActe, ordre: 2 },
      montant: lot.prixTTC * pourcentageActe,
      dateEmission: lot.dateActe,
      dateReglement: lot.dateActe,
      regleAutomatiquement: true,
      dateLimiteReglement: dateLimite(lot.dateActe),
    })
  }
  if (documents.length > 0) {
    await AppelDeFonds.insertMany(documents)
  }
}

// Tant que le logement n'est pas Acté, une négociation peut encore changer
// son prix (17/07/2026, remarque de Nicolas) — l'appel "Réservation" déjà
// généré (voir ci-dessus) doit alors suivre ce nouveau prix. Une fois
// Acté, plus aucune négociation n'est possible : l'appel reste figé,
// comme les autres (même logique que le barème, point 123).
async function resynchroniserMontantReservation(lot) {
  if (lot.statut === 'acte') return
  const appelReservation = await AppelDeFonds.findOne({ lot: lot._id }).sort({ 'phase.ordre': 1 })
  if (!appelReservation) return
  const nouveauMontant = lot.prixTTC * appelReservation.phase.pourcentage
  if (nouveauMontant !== appelReservation.montant) {
    appelReservation.montant = nouveauMontant
    await appelReservation.save()
  }
}

// GET /api/lots — liste de tous les lots, triés par référence. Champs
// acquéreur étendus (13/07/2026) : banque/courtier/dateOffrePretRecue sont
// nécessaires à la page "Suivi de prêt", qui part des lots (pas des
// acquéreurs) pour avoir accès à `dateReservation` en même temps.
router.get('/', async (req, res) => {
  try {
    // `?programme=<id>` (17/07/2026, point 138) : filtre sur le programme
    // actif — sans ce paramètre, tous les lots de tous les programmes
    // seraient mélangés dans une même liste.
    const { programme } = req.query
    const filtre = programme ? { programme } : {}
    const lots = await Lot.find(filtre).sort({ reference: 1 })
      .populate('acquereur', 'civilite nom prenom banque courtier notaire dateOffrePretRecue sansPret')
      .populate('annexes')
    res.json(lots)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// POST /api/lots — crée un lot (caractéristiques techniques, saisies depuis
// la page Paramètres > Lots). Un lot créé démarre toujours "libre", sans
// acquéreur : ça se renseigne ensuite via PATCH, au fil de la vente.
// `estAnnexeSeule` (17/07/2026, remarque de Nicolas, bouton "Vendre une
// annexe" de la page Lots) : un "lot" qui ne représente qu'une annexe
// vendue à part (parking vendu après coup, ou à quelqu'un qui n'a pas
// acheté de logement dans le programme) — suit exactement le même cycle
// de vente qu'un logement normal, mais ne compte pas dans le quota
// `nombreLogements`.
router.post('/', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const {
      programme, reference, etage, type, orientation,
      surfaceHabitable, surfaceSousPlafondBas, surfacesTerrasses, surfacesBalcons, surfacesLoggias, surfaceJardin,
      prixLogementSeul, annexeIds, estAnnexeSeule,
    } = req.body

    // Vérification côté serveur (pas seulement dans le formulaire React) :
    // on ne dépasse jamais le nombre de logements annoncé pour le
    // programme, quand ce nombre est renseigné — sauf pour une annexe
    // vendue à part, qui n'est pas un logement.
    const programmeDoc = await Programme.findById(programme)
    if (!estAnnexeSeule && programmeDoc?.nombreLogements != null) {
      const nombreLotsExistants = await Lot.countDocuments({ programme, estAnnexeSeule: { $ne: true } })
      if (nombreLotsExistants >= programmeDoc.nombreLogements) {
        return res.status(400).json({
          message: `Nombre maximum de logements déjà atteint (${programmeDoc.nombreLogements}).`,
        })
      }
    }

    const lot = await Lot.create({
      programme, reference, etage, type, orientation,
      surfaceHabitable, surfaceSousPlafondBas, surfacesTerrasses, surfacesBalcons, surfacesLoggias, surfaceJardin,
      prixLogementSeul, prixTTC: prixLogementSeul, estAnnexeSeule,
    })
    await synchroniserAnnexesEtPrix(lot, annexeIds)
    await lot.save()
    const lotPeuple = await lot.populate('annexes')
    res.status(201).json(lotPeuple)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
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

    const { acquereurNouveau, acquereurMiseAJour, annexeIds, ...champs } = req.body

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

    // Plus de négociation possible une fois Acté (17/07/2026, remarque de
    // Nicolas) : le prix du logement et ses annexes sont figés — une
    // annexe vendue après coup passe par "Vendre une annexe" (nouveau
    // lot séparé), pas par une modification de celui-ci.
    if (ancienStatut === 'acte') {
      const prixChange = champs.prixLogementSeul !== undefined && champs.prixLogementSeul !== lot.prixLogementSeul
      let annexesChange = false
      if (annexeIds !== undefined) {
        const idsActuels = (await Annexe.find({ lot: lot._id }, '_id')).map((a) => a._id.toString())
        const idsDemandes = annexeIds.map(String)
        annexesChange = idsActuels.length !== idsDemandes.length
          || !idsActuels.every((id) => idsDemandes.includes(id))
      }
      if (prixChange || annexesChange) {
        return res.status(400).json({
          message: 'Logement Acté : le prix et les annexes ne sont plus modifiables. '
            + 'Utilisez "Vendre une annexe" (page Lots) pour une annexe vendue après coup.',
        })
      }
    }

    Object.assign(lot, champs)

    const erreurDates = validerDatesCoherentesAvecStatut(lot)
    if (erreurDates) {
      return res.status(400).json({ message: erreurDates })
    }

    await synchroniserAnnexesEtPrix(lot, annexeIds)
    await lot.save()

    // Pas seulement "vient de passer à Réservé/Acté" : un lot déjà dans
    // cet état (ex: dans les données de seed) mais sans appel(s) encore
    // générés doit aussi être rattrapé — genererAppelsDeFonds() ne
    // regénère jamais une phase déjà créée (sécurité anti-doublon par
    // phase). 17/07/2026 : "Réservation" se génère dès "Réservé", pas
    // seulement à "Acté". Barème à 2 phases pour une annexe vendue seule
    // (remarque de Nicolas) — voir genererAppelsAnnexeSeule.
    const genererAppels = lot.estAnnexeSeule ? genererAppelsAnnexeSeule : genererAppelsDeFonds
    if (lot.statut === 'reserve') {
      await genererAppels(lot, { seulementReservation: true })
    } else if (lot.statut === 'acte') {
      await genererAppels(lot)
    }
    // Négociation avant l'Acté (17/07/2026, remarque de Nicolas) : suit le
    // prix du lot tant qu'il n'est pas signé, gelé ensuite — voir la
    // fonction pour le détail.
    await resynchroniserMontantReservation(lot)

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

    const lotPeuple = await lot
      .populate('acquereur', 'civilite nom prenom banque courtier notaire dateOffrePretRecue sansPret')
    await lotPeuple.populate('annexes')
    res.json(lotPeuple)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

// PATCH /api/lots/:id/prix — modifie le prix d'un logement (ou de l'annexe
// pour une vente d'annexe seule) depuis la page Lots (17/07/2026, remarque
// de Nicolas — Paramètres ne sert plus qu'au paramétrage initial du
// programme). Toujours motivée, toujours tracée dans
// HistoriqueModificationPrix — jamais un simple écrasement silencieux.
// Bloquée une fois Acté, comme le reste de la négociation (point 165).
router.patch('/:id/prix', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { nouveauPrix, motif } = req.body
    if (!motif) {
      return res.status(400).json({ message: 'Le motif de la modification est requis.' })
    }
    if (nouveauPrix == null || Number.isNaN(Number(nouveauPrix))) {
      return res.status(400).json({ message: 'Le nouveau prix est requis.' })
    }

    const lot = await Lot.findById(req.params.id)
    if (!lot) {
      return res.status(404).json({ message: 'Lot introuvable' })
    }
    if (lot.statut === 'acte') {
      return res.status(400).json({ message: 'Logement Acté : le prix n\'est plus modifiable.' })
    }

    const ancienPrix = lot.prixTTC

    if (lot.estAnnexeSeule) {
      // Le prix d'une vente d'annexe seule, c'est le prix de SON annexe
      // (prixLogementSeul reste à 0) — modifié ici, pas dans le catalogue
      // (Paramètres > Annexes, qui refuse de toute façon de modifier une
      // annexe déjà attribuée).
      const annexe = await Annexe.findOne({ lot: lot._id })
      if (annexe) {
        annexe.prix = Number(nouveauPrix)
        await annexe.save()
      }
    } else {
      lot.prixLogementSeul = Number(nouveauPrix)
    }
    await synchroniserAnnexesEtPrix(lot, undefined)
    await lot.save()

    await HistoriqueModificationPrix.create({
      lot: lot._id,
      programme: lot.programme,
      referenceLot: lot.reference,
      ancienPrix,
      nouveauPrix: lot.prixTTC,
      motif,
    })

    const lotPeuple = await lot.populate('annexes')
    res.json(lotPeuple)
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
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

    // Une annexe vendue à part (17/07/2026, remarque de Nicolas) n'est pas
    // un logement réel à remettre "Libre" pour une revente future — sa
    // vente se gère uniquement depuis "Vendre une annexe" (page Lots), qui
    // crée un nouveau lot à chaque tentative. Après annulation, ce lot
    // disparaît donc entièrement (plutôt que de traîner "Libre" dans le
    // tableau) et l'annexe redevient disponible dans le catalogue. Sauf si
    // une TMA le référence encore (cas normalement impossible en pratique,
    // gardé par sécurité) : dans ce cas on ne supprime pas, comme pour un
    // logement normal.
    const nombreTmaLiees = lot.estAnnexeSeule ? await Tma.countDocuments({ lot: lot._id }) : 0
    if (lot.estAnnexeSeule && nombreTmaLiees === 0) {
      await Annexe.updateMany({ lot: lot._id }, { lot: null })
      await Lot.findByIdAndDelete(lot._id)
      return res.json({ supprime: true })
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
    repondreErreurServeur(res, erreur)
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
    // Les annexes qui lui étaient attribuées redeviennent disponibles
    // (17/07/2026, point 165) — un lot supprimé ne doit pas garder des
    // annexes bloquées pour toujours.
    await Annexe.updateMany({ lot: lot._id }, { lot: null })
    res.status(204).end()
  } catch (erreur) {
    repondreErreurServeur(res, erreur)
  }
})

export default router
