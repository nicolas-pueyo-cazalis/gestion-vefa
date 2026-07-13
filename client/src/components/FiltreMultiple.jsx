// Filtre à cases à cocher (sélection multiple) — contrairement à
// FiltreStatuts (un seul choix actif à la fois), plusieurs valeurs
// peuvent être cochées en même temps. Réutilisé pour filtrer par phase et
// par lot sur la page Appels de fonds. Aucune case cochée = aucun filtre
// (tout s'affiche) — la case "Tout" ne fait qu'y revenir explicitement.
function FiltreMultiple({ titre, options, valeursActives, onChange }) {
  function basculer(valeur) {
    if (valeursActives.includes(valeur)) {
      onChange(valeursActives.filter((v) => v !== valeur))
    } else {
      onChange([...valeursActives, valeur])
    }
  }

  return (
    <div className="filtres-phases">
      {titre && <span className="filtres-phases-titre">{titre}</span>}
      <label>
        <input
          type="checkbox"
          checked={valeursActives.length === 0}
          onChange={() => onChange([])}
        />
        Tout
      </label>
      {options.map((option) => (
        <label key={option}>
          <input
            type="checkbox"
            checked={valeursActives.includes(option)}
            onChange={() => basculer(option)}
          />
          {option}
        </label>
      ))}
    </div>
  )
}

export default FiltreMultiple
