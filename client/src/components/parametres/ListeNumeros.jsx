import { useState } from 'react'

// Saisie d'une liste de numéros identifiants (parkings, caves/celliers...)
// sous forme de tags — même principe que la liste des étages
// (SectionEtages.jsx), mais avec des nombres plutôt que du texte libre.
// Le <label> enveloppant le texte + l'input reprend exactement la même
// structure que les autres champs du formulaire (voir main.scss,
// ".section-parametres label"), pour un alignement identique.
function ListeNumeros({ label, valeurs, onChange, erreur }) {
  const [saisie, setSaisie] = useState('')

  function ajouter(evenement) {
    evenement.preventDefault()
    const nombre = Number(saisie)
    if (saisie === '' || Number.isNaN(nombre)) return
    if (valeurs.includes(nombre)) {
      setSaisie('')
      return
    }
    onChange([...valeurs, nombre])
    setSaisie('')
  }

  function retirer(nombre) {
    onChange(valeurs.filter((v) => v !== nombre))
  }

  return (
    <div className="liste-numeros">
      <label>
        {label}
        <input
          type="number"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ajouter(e)}
          placeholder="N°"
          className={erreur ? 'invalide' : ''}
        />
      </label>
      <button type="button" onClick={ajouter}>Ajouter</button>
      {erreur && <span className="erreur-champ">{erreur}</span>}
      <ul className="liste-tags">
        {valeurs.map((v) => (
          <li key={v}>
            {v}
            <button type="button" onClick={() => retirer(v)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ListeNumeros
