import { useState } from 'react'

// Coordonnées bancaires du promoteur (20/07/2026), affichées sur le
// courrier d'appel de fonds envoyé au client (page Appels de fonds) —
// extraites de SectionInfosProgramme.jsx (04/09/2026, point 308) dans
// leur propre section, sous la catégorie "Administration".
function SectionBanque({ programme, onEnregistrer }) {
  const [iban, setIban] = useState(programme.iban ?? '')
  const [bic, setBic] = useState(programme.bic ?? '')

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer({ iban: iban || null, bic: bic || null })
  }

  return (
    <section className="section-parametres">
      <h2>Banque</h2>
      <form onSubmit={soumettre}>
        <label>
          IBAN
          <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="FR76 ..." />
        </label>
        <label>
          BIC
          <input value={bic} onChange={(e) => setBic(e.target.value)} />
        </label>
        <button type="submit">Enregistrer</button>
      </form>
    </section>
  )
}

export default SectionBanque
