// Extraite de Lots.jsx/Tma.jsx/AppelsDeFonds.jsx (01/09/2026, chantier 13)
// où elle était dupliquée à l'identique dans les 3 fichiers (code smell
// trouvé lors de l'audit "Jour 10", docs/demandes.md point 236) — un seul
// endroit désormais, importé par les 3 pages.
export function nomAcquereur(acquereur) {
  if (!acquereur) return '—'
  return [acquereur.civilite, acquereur.prenom, acquereur.nom].filter(Boolean).join(' ')
}
