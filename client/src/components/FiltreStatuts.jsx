function FiltreStatuts({ statuts, actif, onChange }) {
  return (
    <div className="filtres">
      {statuts.map(({ valeur, libelle }) => (
        <button
          key={valeur}
          className={`filtre--${valeur}${valeur === actif ? ' actif' : ''}`}
          onClick={() => onChange(valeur)}
        >
          {libelle}
        </button>
      ))}
    </div>
  )
}

export default FiltreStatuts
