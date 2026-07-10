// Convention retenue dans docs/schema-donnees.md : les montants sont stockés
// en Number pur, et formatés avec "€" uniquement à l'affichage.
export function formatMontant(nombre) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(nombre);
}
