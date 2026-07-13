import { useState } from 'react'

// Saisit une seule attestation MOE pour tous les lots d'une même phase en
// une fois (remarque du 11/07/2026) — plutôt que de rouvrir chaque ligne
// une par une.
function FormulaireAttestationMasse({ phases, onAppliquer }) {
  const [phase, setPhase] = useState('')
  const [dateAttestationMOE, setDateAttestationMOE] = useState('')

  async function soumettre(evenement) {
    evenement.preventDefault()
    await onAppliquer({ phase, dateAttestationMOE })
    setPhase('')
    setDateAttestationMOE('')
  }

  return (
    <section className="section-parametres">
      <h2>Attestation MOE par phase</h2>
      <form onSubmit={soumettre}>
        <label>
          Phase
          <select value={phase} onChange={(e) => setPhase(e.target.value)} required>
            <option value="" disabled>Choisir une phase...</option>
            {phases.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>
          Date attestation MOE
          <input
            type="date"
            value={dateAttestationMOE}
            onChange={(e) => setDateAttestationMOE(e.target.value)}
            required
          />
        </label>
        <div className="boutons-alignes-champs">
          <button type="submit">Appliquer à tous les lots de cette phase</button>
        </div>
      </form>
    </section>
  )
}

export default FormulaireAttestationMasse
