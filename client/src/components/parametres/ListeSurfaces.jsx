import { useState } from 'react'

// Saisie d'une liste de surfaces (m²) sous forme de tags — même principe
// que ListeNumeros (parkings/caves), mais sans la contrainte d'unicité :
// deux terrasses peuvent très bien faire la même surface, contrairement à
// deux numéros de parking qui ne peuvent jamais se confondre.
function ListeSurfaces({ label, valeurs, onChange }) {
  const [saisie, setSaisie] = useState('')

  function ajouter(evenement) {
    evenement.preventDefault()
    const nombre = Number(saisie)
    if (saisie === '' || Number.isNaN(nombre)) return
    onChange([...valeurs, nombre])
    setSaisie('')
  }

  function retirer(index) {
    onChange(valeurs.filter((_, i) => i !== index))
  }

  return (
    <div className="liste-numeros">
      <label>
        {label}
        <input
          type="number"
          step="0.01"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ajouter(e)}
          placeholder="m²"
        />
      </label>
      <button type="button" onClick={ajouter}>Ajouter</button>
      <ul className="liste-tags">
        {valeurs.map((v, i) => (
          <li key={i}>
            {v} m²
            <button type="button" onClick={() => retirer(i)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ListeSurfaces
