// Barre de recherche réutilisable (20/07/2026, point 187) : composant
// contrôlé, comme FiltreStatuts — la page garde l'état et fait le filtrage
// (voir utils/recherche.js), ce composant ne fait qu'afficher le champ.
function BarreRecherche({ valeur, onChange, placeholder = 'Rechercher...' }) {
  // `aria-label` (21/07/2026, audit accessibilité) : un placeholder seul
  // n'est pas un label fiable pour un lecteur d'écran (et disparaît dès
  // qu'on tape) — ce champ n'avait jusqu'ici aucun nom accessible.
  return (
    <input
      type="search"
      className="barre-recherche"
      placeholder={placeholder}
      aria-label={placeholder}
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export default BarreRecherche
