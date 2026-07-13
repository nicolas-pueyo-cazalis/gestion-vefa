// Calculs de statut "en retard" — centralisés ici (13/07/2026) pour être
// utilisés à la fois par les pages (Appels de fonds, Suivi de prêt,
// Signature acte) et par la fenêtre d'alertes au démarrage
// (AlerteRetards.jsx), qui a besoin exactement des mêmes règles pour
// rester cohérente avec ce qu'affiche chaque page. Rien n'est jamais
// stocké : tout se recalcule à la volée à partir des dates.

export function formatDate(valeur) {
  return valeur ? new Date(valeur).toLocaleDateString('fr-FR') : '—'
}

export function calculerDateLimiteJours(date, jours) {
  const limite = new Date(date)
  limite.setDate(limite.getDate() + jours)
  return limite
}

// setMonth() gère seul le débordement d'année (ex: réservation en
// novembre + 3 mois = février de l'année suivante).
export function calculerDateLimiteMois(date, mois) {
  const limite = new Date(date)
  limite.setMonth(limite.getMonth() + mois)
  return limite
}

export function statutAppel(appel) {
  if (appel.dateReglement) return 'regle'
  if (!appel.dateEmission) return 'attente'
  const enRetard = appel.dateLimiteReglement && new Date(appel.dateLimiteReglement) < new Date()
  return enRetard ? 'retard' : 'emis'
}

// Un lot n'entre dans ce suivi qu'une fois réservé (règle métier n°4 de
// l'analyse Excel : le délai d'obtention du prêt part de la réservation).
export function statutPret(lot, delaiJours) {
  if (!lot.dateReservation) return null
  if (lot.acquereur?.sansPret) return 'sans_pret'
  if (lot.acquereur?.dateOffrePretRecue) return 'recue'
  const limite = calculerDateLimiteJours(lot.dateReservation, delaiJours)
  return limite < new Date() ? 'retard' : 'attente'
}

export function statutSignature(lot, delaiMois) {
  if (!lot.dateReservation) return null
  if (lot.dateActe) return 'signe'
  const limite = calculerDateLimiteMois(lot.dateReservation, delaiMois)
  return limite < new Date() ? 'retard' : 'attente'
}

// Deux alertes TMA (décisions du 10/07/2026, hors périmètre Excel) : une
// entreprise sollicitée qui n'a pas chiffré à temps, et un client qui n'a
// pas répondu à une facture TMA à temps — mêmes délais paramétrables que
// le reste (programme.parametres).
export function estEntrepriseEnRetard(ligne, delaiJours) {
  if (ligne.montantDevis !== null && ligne.montantDevis !== undefined) return false
  return calculerDateLimiteJours(ligne.dateEnvoi, delaiJours) < new Date()
}

export function estFactureTmaEnRetard(tma, delaiJours) {
  if (tma.statut !== 'facture' || !tma.dateEnvoiFactureClient) return false
  return calculerDateLimiteJours(tma.dateEnvoiFactureClient, delaiJours) < new Date()
}
