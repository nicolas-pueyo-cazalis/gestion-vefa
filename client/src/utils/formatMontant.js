// Convention retenue dans docs/schema-donnees.md : les montants sont stockés
// en Number pur, et formatés avec "€" uniquement à l'affichage.
// `decimales` (13/07/2026) : optionnel, 2 par défaut (comportement
// inchangé) — passer `0` pour les endroits où Nicolas ne veut plus de
// centimes affichés (ex: cartes de stats), sans changer le reste de
// l'appli qui garde ses décimales par défaut.
export function formatMontant(nombre, decimales = 2) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(nombre)
}
