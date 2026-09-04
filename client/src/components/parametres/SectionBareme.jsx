import { useState } from 'react'

function SectionBareme({ programme, onEnregistrer }) {
  const [phases, setPhases] = useState(programme.parametres.baremePhases)

  const totalPourcent = Math.round(phases.reduce((somme, p) => somme + p.pourcentage, 0) * 100)

  function modifierNom(index, valeur) {
    setPhases(phases.map((p, i) => (i === index ? { ...p, nom: valeur } : p)))
  }

  function modifierPourcentage(index, valeurEnPourcent) {
    setPhases(
      phases.map((p, i) =>
        i === index ? { ...p, pourcentage: Number(valeurEnPourcent) / 100 } : p,
      ),
    )
  }

  function retirer(index) {
    setPhases(phases.filter((_, i) => i !== index))
  }

  function deplacer(index, direction) {
    const cible = index + direction
    if (cible < 0 || cible >= phases.length) return
    const misAJour = [...phases]
    ;[misAJour[index], misAJour[cible]] = [misAJour[cible], misAJour[index]]
    setPhases(misAJour)
  }

  function ajouter() {
    setPhases([...phases, { nom: '', pourcentage: 0, ordre: phases.length + 1 }])
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    if (totalPourcent !== 100) {
      alert(`La somme des pourcentages doit faire 100% (actuellement ${totalPourcent}%).`)
      return
    }
    // ordre recalculé selon la position actuelle dans la liste
    const phasesOrdonnees = phases.map((p, i) => ({ ...p, ordre: i + 1 }))
    onEnregistrer({ parametres: { baremePhases: phasesOrdonnees } })
  }

  return (
    <section className="section-parametres">
      <h2>Échéancier par phase de travaux</h2>
      <form onSubmit={soumettre}>
        {phases.map((phase, index) => (
          // "index" comme clé : acceptable ici car la liste est modifiée
          // uniquement par ajout/retrait/édition dans cette même session de
          // formulaire, pas par un tri externe.
          <div className="ligne-phase" key={index}>
            <input
              value={phase.nom}
              onChange={(e) => modifierNom(index, e.target.value)}
              placeholder="Nom de la phase"
            />
            <input
              type="number"
              step="1"
              value={Math.round(phase.pourcentage * 100)}
              onChange={(e) => modifierPourcentage(index, e.target.value)}
            />
            <span>%</span>
            <button type="button" onClick={() => deplacer(index, -1)} disabled={index === 0}>
              ↑
            </button>
            <button
              type="button"
              onClick={() => deplacer(index, 1)}
              disabled={index === phases.length - 1}
            >
              ↓
            </button>
            <button type="button" onClick={() => retirer(index)}>
              Retirer
            </button>
          </div>
        ))}
        <button type="button" onClick={ajouter}>
          Ajouter une phase
        </button>
        <p className={totalPourcent === 100 ? 'total-ok' : 'total-erreur'}>
          Total : {totalPourcent}% {totalPourcent !== 100 && '— doit faire 100%'}
        </p>
        <button type="submit">Enregistrer</button>
      </form>
    </section>
  )
}

export default SectionBareme
