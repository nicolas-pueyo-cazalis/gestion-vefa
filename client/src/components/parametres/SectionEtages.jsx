import { useState } from 'react'

function SectionEtages({ programme, onEnregistrer }) {
  const [etages, setEtages] = useState(programme.parametres.listeEtages)
  const [nouvelEtage, setNouvelEtage] = useState('')

  function ajouter(evenement) {
    evenement.preventDefault()
    if (!nouvelEtage.trim()) return
    const misAJour = [...etages, nouvelEtage.trim()]
    setEtages(misAJour)
    setNouvelEtage('')
    onEnregistrer({ parametres: { listeEtages: misAJour } })
  }

  function retirer(etage) {
    const misAJour = etages.filter((e) => e !== etage)
    setEtages(misAJour)
    onEnregistrer({ parametres: { listeEtages: misAJour } })
  }

  return (
    <section className="section-parametres">
      <h2>Étages</h2>
      <ul className="liste-tags">
        {etages.map((etage) => (
          <li key={etage}>
            {etage}
            <button type="button" onClick={() => retirer(etage)}>×</button>
          </li>
        ))}
      </ul>
      <form onSubmit={ajouter}>
        <input
          value={nouvelEtage}
          onChange={(e) => setNouvelEtage(e.target.value)}
          placeholder="ex: R+9"
        />
        <button type="submit">Ajouter</button>
      </form>
    </section>
  )
}

export default SectionEtages
