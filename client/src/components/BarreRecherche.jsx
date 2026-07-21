// Barre de recherche réutilisable (20/07/2026, point 187) : composant
// contrôlé, comme FiltreStatuts — la page garde l'état et fait le filtrage
// (voir utils/recherche.js), ce composant ne fait qu'afficher le champ.
function BarreRecherche({ valeur, onChange, placeholder = 'Rechercher...' }) {
  return (
    <input
      type="search"
      className="barre-recherche"
      placeholder={placeholder}
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export default BarreRecherche
