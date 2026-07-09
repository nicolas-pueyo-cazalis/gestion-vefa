// Fonctions partagées entre les pages (index.html et tma.html).

// Convention retenue dans docs/schema-donnees.md : les montants sont stockés
// en Number pur, et formatés avec "€" uniquement à l'affichage.
const formatMontant = (nombre) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(nombre);
