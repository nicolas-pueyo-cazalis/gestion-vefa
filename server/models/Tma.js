import mongoose from 'mongoose'

// Machine à états de TMA.statut (docs/schema-donnees.md). Pour chaque statut
// actuel, la liste des statuts vers lesquels on a le droit de passer — un
// enum Mongoose seul ne suffit pas à empêcher de sauter une étape, cette
// règle doit être vérifiée explicitement dans les routes.
// "annule" (13/07/2026, point 129) : le client renonce à cette TMA (pas
// forcément un refus du promoteur, ex: il change d'avis) — infos toujours
// visibles, jamais effacées, même logique que "refuse". Mêmes étapes de
// départ possibles que "refuse".
// "travaux" retiré (17/07/2026, point 172) : ne servait à rien (aucun
// bouton ne permettait même d'y accéder) — le passage à "Terminé" se fait
// désormais directement depuis "Validé", par une action manuelle (le
// client va sur chantier pointer que les travaux ont bien été réalisés).
export const TRANSITIONS_AUTORISEES = {
  demande: ['etude', 'refuse', 'annule'],
  etude: ['chiffre', 'refuse', 'annule'],
  chiffre: ['facture', 'refuse', 'annule'],
  facture: ['valide', 'refuse', 'annule'],
  valide: ['termine'],
  refuse: [],
  termine: [],
  annule: [],
}

// Calcule automatiquement le statut d'une TMA à partir de ses dates et de
// son montant entreprises, sur le même principe que la formule Excel
// d'origine (docs/analyse-excel.md) — adapté au nouvel ordre
// chiffre → facture → valide. Ne couvre que la portion "date-driven" du
// cycle : au-delà de "valide" (travaux/termine) et pour "refuse", le
// statut reste une action manuelle (voir TRANSITIONS_AUTORISEES).
export function calculerStatutAutomatique(tma) {
  if (tma.dateRetourClient) return 'valide'
  if (tma.dateEnvoiFactureClient) return 'facture'
  if (tma.montantEntreprises !== null && tma.montantEntreprises !== undefined) return 'chiffre'
  if (tma.dateEnvoiEntreprises) return 'etude'
  return 'demande'
}

// Programme.parametres.tauxMargeTma / regleMontantNegatifTma
// (docs/schema-donnees.md). Bug corrigé le 17/07/2026 (point 142, revue
// générale) : ces deux réglages étaient jusqu'ici ignorés (valeurs en dur
// 1.3 / "montant_zero"), rendant les champs correspondants de Paramètres
// inopérants — modifiables sans le moindre effet. `parametres` (optionnel,
// avec les mêmes défauts que le schéma) doit être `programme.parametres`,
// résolu par l'appelant (ex: tma.lot.programme.parametres).
export function calculerMontantClient(montantEntreprises, parametres) {
  // Frais d'ouverture de dossier (20/07/2026, point 184) : montant fixe
  // ajouté en plus du coût des modifications elles-mêmes, appliqué
  // systématiquement (avoir compris, décision explicite de Nicolas) tant
  // que `appliquerFraisOuvertureDossierTma` est activé sur le programme.
  const frais = parametres?.appliquerFraisOuvertureDossierTma
    ? (parametres?.fraisOuvertureDossierTma ?? 0)
    : 0
  // Corrigé le 20/07/2026 : avant, "pas encore chiffré" (montantEntreprises
  // null, avant réponse des entreprises) renvoyait toujours `null` tel
  // quel — le frais d'ouverture de dossier, lui, est dû dès la création de
  // la TMA (le dossier est ouvert), pas seulement une fois les devis
  // entreprises connus.
  if (montantEntreprises === null || montantEntreprises === undefined) {
    return frais > 0 ? frais : null
  }
  const tauxMarge = parametres?.tauxMargeTma ?? 1.3
  const regleMontantNegatif = parametres?.regleMontantNegatifTma ?? 'montant_zero'
  if (montantEntreprises < 0) {
    return (regleMontantNegatif === 'avoir_sans_marge' ? montantEntreprises : 0) + frais
  }
  return montantEntreprises * tauxMarge + frais
}

const tmaSchema = new mongoose.Schema({
  // `index: true` (21/07/2026, audit performance) : filtré à chaque
  // requête `{ lot: { $in: idsLots } }` (une par programme).
  lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true, index: true },
  acquereur: { type: mongoose.Schema.Types.ObjectId, ref: 'Acquereur', required: true },
  localisation: String,
  description: String,
  // 13/07/2026 : libre, modifiable depuis le même panneau que localisation/
  // description/montant client.
  commentaire: String,
  dateDemande: Date,
  dateEnvoiEntreprises: Date,
  // Renseigné avant l'ajout des entreprises (17/07/2026, point 136) : sert
  // de référence objective pour savoir quand "toutes ont répondu" (voir
  // recalculerTma, routes/tmaEntreprises.js) — sans ce champ, ajouter 2
  // entreprises sur les 3 prévues et obtenir leurs 2 devis faisait
  // basculer la TMA en "chiffré" à tort, alors qu'une troisième entreprise
  // restait à consulter.
  nombreEntreprisesConcernees: Number,
  priorite: { type: String, enum: ['basse', 'moyenne', 'haute'] },
  montantEntreprises: Number,
  montantClient: Number,
  // Saisi à la main (13/07/2026) : par défaut, montantClient est recalculé
  // automatiquement à chaque changement des devis entreprises (voir
  // recalculerTma, routes/tmaEntreprises.js) — mais une négociation directe
  // avec le client peut aboutir à un montant différent. Une fois modifié à
  // la main, ce montant n'est plus jamais recalculé automatiquement.
  montantClientManuel: { type: Boolean, default: false },
  dateEnvoiFactureClient: Date,
  dateRetourClient: Date,
  statut: {
    type: String,
    enum: ['demande', 'etude', 'chiffre', 'facture', 'valide', 'refuse', 'termine', 'annule'],
    default: 'demande',
  },
  // Mémorise le statut juste avant un refus, pour pouvoir y revenir
  // exactement (ex: annuler un refus par erreur au stade "facture" doit
  // ramener à "facture", pas repartir de zéro).
  statutAvantRefus: {
    type: String,
    enum: ['demande', 'etude', 'chiffre', 'facture'],
  },
  // Même principe pour une annulation (13/07/2026, point 129).
  statutAvantAnnulation: {
    type: String,
    enum: ['demande', 'etude', 'chiffre', 'facture'],
  },
}, { timestamps: true })

export default mongoose.model('Tma', tmaSchema)
