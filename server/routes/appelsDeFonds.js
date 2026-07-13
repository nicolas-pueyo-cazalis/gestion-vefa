import { Router } from 'express'
import AppelDeFonds from '../models/AppelDeFonds.js'
import { calculerEmissionAppel } from '../utils/appelsDeFonds.js'
import { autoriserRoles } from '../middleware/auth.js'

const router = Router()

// GET /api/appels-de-fonds — tous les appels de fonds (page dédiée), avec
// le lot associé peuplé pour l'affichage. `?lot=<id>` filtre sur un seul
// lot si besoin plus tard (ex: détail dans une autre page).
router.get('/', async (req, res) => {
  try {
    const { lot } = req.query
    const filtre = lot ? { lot } : {}
    const appels = await AppelDeFonds.find(filtre)
      .populate('lot', 'reference prixTTC')
      .sort({ createdAt: 1 })
    res.json(appels)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

// Calcule dateEmission/dateLimiteReglement/dateReglement dès que
// dateAttestationMOE passe de vide à renseignée — partagé entre la saisie
// ligne par ligne et la saisie en masse par phase ci-dessous.
// `appel.lot.programme` doit déjà être peuplé par l'appelant (le délai de
// règlement en dépend). Remarque du 13/07/2026 : si l'acte du lot
// (`appel.lot.dateActe`) est postérieur ou égal à cette attestation,
// l'appel est considéré réglé d'office à la date de l'acte — voir
// calculerEmissionAppel() (server/utils/appelsDeFonds.js), même règle que
// pour un nouveau lot Acté qui rattrape une phase déjà attestée ailleurs.
function emettreAttestation(appel, dateAttestationMOE) {
  appel.dateAttestationMOE = dateAttestationMOE
  if (dateAttestationMOE && !appel.dateEmission) {
    const delai = appel.lot.programme.parametres.delaiReglementAppelJours
    const { dateEmission, dateLimiteReglement, dateReglement } = calculerEmissionAppel(appel.lot, dateAttestationMOE, delai)
    appel.dateEmission = dateEmission
    appel.dateLimiteReglement = dateLimiteReglement
    if (dateReglement) appel.dateReglement = dateReglement
  }
  if (!dateAttestationMOE) {
    appel.dateEmission = null
    appel.dateLimiteReglement = null
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
    const { phase, dateAttestationMOE } = req.body
    if (!phase || !dateAttestationMOE) {
      return res.status(400).json({ message: 'Les champs "phase" et "dateAttestationMOE" sont requis' })
    }

    const appels = await AppelDeFonds.find({ 'phase.nom': phase, dateAttestationMOE: null })
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
    const { dateReglement } = req.body
    const appel = await AppelDeFonds.findById(req.params.id)
    if (!appel) {
      return res.status(404).json({ message: 'Appel de fonds introuvable' })
    }

    if (dateReglement !== undefined) {
      appel.dateReglement = dateReglement
    }

    await appel.save()
    const appelPeuple = await appel.populate('lot', 'reference prixTTC')
    res.json(appelPeuple)
  } catch (erreur) {
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message })
  }
})

export default router
