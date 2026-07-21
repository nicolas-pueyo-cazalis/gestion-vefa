import { Router } from 'express'
import AppelDeFonds from '../models/AppelDeFonds.js'
import Lot from '../models/Lot.js'
import Programme from '../models/Programme.js'
import { calculerEmissionAppel } from '../utils/appelsDeFonds.js'
import { getIdsLotsDuProgramme } from '../utils/programme.js'
import { autoriserRoles } from '../middleware/auth.js'

const router = Router()

// GET /api/appels-de-fonds — tous les appels de fonds (page dédiée), avec
// le lot associé peuplé pour l'affichage. `?lot=<id>` filtre sur un seul
// lot si besoin plus tard (ex: détail dans une autre page).
router.get('/', async (req, res) => {
  try {
    const { lot, programme } = req.query
    let filtre = {}
    if (lot) {
      filtre = { lot }
    } else if (programme) {
      // 17/07/2026, point 138 : AppelDeFonds n'a pas de champ `programme`
      // direct — passe par lot.programme (un saut).
      filtre = { lot: { $in: await getIdsLotsDuProgramme(programme) } }
    }
    // `lot.acquereur` peuplé (20/07/2026, courrier appel de fonds) :
    // nécessaire pour écrire le nom du client sur le courrier généré
    // depuis cette page — jusqu'ici seuls reference/prixTTC étaient
    // demandés, suffisants pour le tableau mais pas pour ce document.
    const appels = await AppelDeFonds.find(filtre)
      .populate({
        path: 'lot',
        select: 'reference prixTTC acquereur',
        populate: { path: 'acquereur', select: 'civilite prenom nom' },
      })
      .sort({ createdAt: 1 })
    res.json(appels)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// Constate la phase — n'émet plus automatiquement l'appel dans le cas
// normal (20/07/2026, point 171, revu le jour même à la précision de
// Nicolas) : attestation MOE et "Envoyé le" sont deux actions distinctes,
// l'émission attend désormais l'action explicite "Générer un appel de
// fonds" (nouvelle fenêtre, page Appels de fonds).
// Exception conservée : si l'acte du lot a été signé APRÈS (ou le jour
// même) que cette phase ait été attestée, l'appel est effectivement déjà
// émis ET réglé au moment de la signature (le notaire encaisse les sommes
// déjà dues) — rien à "générer" ensuite dans ce cas précis. Même règle et
// même fonction (`calculerEmissionAppel`, server/utils/appelsDeFonds.js)
// que pour un nouveau lot Acté qui rattrape une phase déjà attestée
// ailleurs (server/routes/lots.js, genererAppelsDeFonds).
function emettreAttestation(appel, dateAttestationMOE) {
  appel.dateAttestationMOE = dateAttestationMOE
  if (dateAttestationMOE && !appel.dateEmission) {
    const delai = appel.lot.programme.parametres.delaiReglementAppelJours
    const { dateEmission, dateLimiteReglement, dateReglement, regleAutomatiquement } = calculerEmissionAppel(appel.lot, dateAttestationMOE, delai)
    if (regleAutomatiquement) {
      appel.dateEmission = dateEmission
      appel.dateLimiteReglement = dateLimiteReglement
      appel.dateReglement = dateReglement
      appel.regleAutomatiquement = regleAutomatiquement
    }
  }
}

// PATCH /api/appels-de-fonds/phase — saisit UNE attestation MOE pour TOUS
// les lots concernés par une même phase en une seule fois (remarque du
// 11/07/2026 : une attestation MOE constate l'avancement du chantier dans
// son ensemble, pas lot par lot — Nicolas ne devrait pas avoir à la
// ressaisir pour chaque logement). Ne touche qu'aux lignes pas encore
// attestées, pour ne jamais écraser une correction déjà faite à la main.
// Doit être déclarée AVANT "/:id" ci-dessous, sinon Express interprète
// "phase" comme une valeur de :id.
router.patch('/phase', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { phase, dateAttestationMOE, programme: programmeId } = req.body
    if (!phase || !dateAttestationMOE || !programmeId) {
      return res.status(400).json({ message: 'Les champs "phase", "dateAttestationMOE" et "programme" sont requis' })
    }

    // 17/07/2026, point 138 : une attestation par phase ne concerne que les
    // lots du programme actif — les autres programmes ont leur propre
    // barème et leur propre avancement de chantier.
    const idsLotsDuProgramme = await getIdsLotsDuProgramme(programmeId)

    // Point 126 (13/07/2026) : une phase ne peut être attestée que si celle
    // juste avant l'est déjà — sauf la toute première phase attestable
    // (juste après "Réservation", index 0, qui elle n'est jamais attestée,
    // auto-émise dès la réservation, voir genererAppelsDeFonds).
    const programme = await Programme.findById(programmeId)
    if (!programme) {
      return res.status(404).json({ message: 'Programme introuvable' })
    }
    const phasesTriees = [...programme.parametres.baremePhases].sort((a, b) => a.ordre - b.ordre)
    const index = phasesTriees.findIndex((p) => p.nom === phase)
    if (index > 1) {
      const nomPhasePrecedente = phasesTriees[index - 1].nom
      const phasePrecedenteAttestee = await AppelDeFonds.exists({
        lot: { $in: idsLotsDuProgramme },
        'phase.nom': nomPhasePrecedente,
        dateAttestationMOE: { $ne: null },
      })
      if (!phasePrecedenteAttestee) {
        return res.status(400).json({
          message: `Impossible d'attester "${phase}" : la phase précédente ("${nomPhasePrecedente}") n'est pas encore attestée.`,
        })
      }
    }

    const appels = await AppelDeFonds.find({
      lot: { $in: idsLotsDuProgramme },
      'phase.nom': phase,
      dateAttestationMOE: null,
    })
      .populate({ path: 'lot', populate: { path: 'programme' } })

    for (const appel of appels) {
      emettreAttestation(appel, dateAttestationMOE)
      await appel.save()
    }

    res.json({ nombreMisAJour: appels.length })
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/appels-de-fonds/lot/:lotId/bareme — ajuste le barème d'UN
// logement en particulier (13/07/2026, à la demande de Nicolas : une
// négociation directe avec un client peut donner un découpage différent du
// barème général du programme, verrouillé côté Paramètres dès qu'un appel
// est émis — voir point 123). `phases` : tableau `{ id, pourcentage }`, un
// par appel de fonds déjà généré pour ce lot ; le montant de chacun est
// recalculé à partir du prix TTC du lot. Doit être déclarée AVANT "/:id"
// ci-dessous, sinon Express interprète "lot" comme une valeur de :id.
router.patch('/lot/:lotId/bareme', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { phases } = req.body
    if (!Array.isArray(phases) || phases.length === 0) {
      return res.status(400).json({ message: 'Aucune phase fournie.' })
    }

    const totalPourcent = phases.reduce((somme, p) => somme + p.pourcentage, 0)
    if (Math.abs(totalPourcent - 1) > 0.001) {
      return res.status(400).json({
        message: `La somme des pourcentages doit faire 100% (actuellement ${Math.round(totalPourcent * 100)}%).`,
      })
    }

    const lot = await Lot.findById(req.params.lotId)
    if (!lot) {
      return res.status(404).json({ message: 'Lot introuvable' })
    }

    await Promise.all(phases.map(({ id, pourcentage }) =>
      AppelDeFonds.updateOne(
        { _id: id, lot: lot._id },
        { 'phase.pourcentage': pourcentage, montant: lot.prixTTC * pourcentage },
      ),
    ))

    const appelsMisAJour = await AppelDeFonds.find({ lot: lot._id })
      .populate('lot', 'reference prixTTC')
      .sort({ 'phase.ordre': 1 })
    res.json(appelsMisAJour)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// PATCH /api/appels-de-fonds/:id — saisie du règlement pour un seul appel.
// L'attestation MOE ne se saisit plus qu'en masse, par phase (route
// "/phase" ci-dessus, remarque du 11/07/2026) — volontairement absente
// d'ici. Elle y a d'ailleurs déjà causé un bug (voir docs/bugs.md) : cette
// route acceptait autrefois `dateAttestationMOE`, et un simple
// "Enregistrer" sur une ligne dont ce champ était vide à l'écran (ex: la
// phase "Réservation", jamais attestée puisqu'auto-émise) effaçait
// silencieusement l'émission déjà calculée.
router.patch('/:id', autoriserRoles('admin', 'gestionnaire'), async (req, res) => {
  try {
    const { dateEmission, dateReglement, commentaire } = req.body
    const appel = await AppelDeFonds.findById(req.params.id)
      .populate({ path: 'lot', populate: { path: 'programme' } })
    if (!appel) {
      return res.status(404).json({ message: 'Appel de fonds introuvable' })
    }

    if (commentaire !== undefined) {
      appel.commentaire = commentaire
    }

    if (dateReglement !== undefined) {
      appel.dateReglement = dateReglement
      // Saisie manuelle (13/07/2026, point 125) : même vidée (`null`), une
      // correction volontaire ici prime sur la déduction automatique — le
      // flag ne doit plus être vrai, sans quoi une future correction de
      // date/statut du lot (routes/lots.js) écraserait cette saisie.
      appel.regleAutomatiquement = false
    }

    // "Envoyé le" (13/07/2026, point 120) : corriger cette date recalcule
    // la date limite de règlement (+ délai défini dans Paramètres), pour
    // qu'elle reste cohérente avec la nouvelle date d'envoi — même calcul
    // que calculerEmissionAppel() (utils/appelsDeFonds.js), appliqué ici à
    // une correction manuelle plutôt qu'à une émission automatique.
    if (dateEmission) {
      appel.dateEmission = dateEmission
      const delai = appel.lot.programme.parametres.delaiReglementAppelJours
      const dateLimite = new Date(dateEmission)
      dateLimite.setDate(dateLimite.getDate() + delai)
      appel.dateLimiteReglement = dateLimite
    }

    await appel.save()
    const appelPeuple = await appel.populate('lot', 'reference prixTTC')
    res.json(appelPeuple)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
