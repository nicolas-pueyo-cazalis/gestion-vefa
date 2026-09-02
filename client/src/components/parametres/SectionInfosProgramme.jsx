import { useState } from 'react'
import { chercherCodePostal } from '../../utils/codePostal.js'

function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

function SectionInfosProgramme({ programme, onEnregistrer }) {
  const [nom, setNom] = useState(programme.nom ?? '')
  const [maitreOuvrage, setMaitreOuvrage] = useState(programme.maitreOuvrage ?? '')
  const [adresse, setAdresse] = useState(programme.adresse ?? '')
  const [commune, setCommune] = useState(programme.commune ?? '')
  const [codePostal, setCodePostal] = useState(programme.codePostal ?? '')
  const [nombreLogements, setNombreLogements] = useState(programme.nombreLogements ?? '')
  const [dateLivraison, setDateLivraison] = useState(versDateInput(programme.dateLivraison))
  // 20/07/2026 : coordonnées bancaires du promoteur, affichées sur le
  // courrier d'appel de fonds envoyé au client (page Appels de fonds).
  const [iban, setIban] = useState(programme.iban ?? '')
  const [bic, setBic] = useState(programme.bic ?? '')

  // Code postal automatique depuis la commune (17/07/2026, point 140) :
  // uniquement si le code postal est encore vide — reste modifiable à la
  // main ensuite (ex: un CEDEX différent), sans jamais être réécrasé.
  async function completerCodePostal() {
    if (codePostal) return
    const trouve = await chercherCodePostal(commune)
    if (trouve) setCodePostal(trouve)
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer({
      nom,
      maitreOuvrage,
      adresse,
      commune,
      codePostal,
      nombreLogements: nombreLogements === '' ? null : Number(nombreLogements),
      dateLivraison: dateLivraison || null,
      iban: iban || null,
      bic: bic || null,
    })
  }

  return (
    <section className="section-parametres">
      <h2>Informations du programme</h2>
      <form onSubmit={soumettre}>
        <label>
          Nom du programme
          <input value={nom} onChange={(e) => setNom(e.target.value)} required />
        </label>
        <label>
          Maître d'ouvrage
          <input value={maitreOuvrage} onChange={(e) => setMaitreOuvrage(e.target.value)} />
        </label>
        <label>
          Adresse
          <input value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </label>
        <label>
          Commune
          <input
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            onBlur={completerCodePostal}
          />
        </label>
        <label>
          Code postal
          <input value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
        </label>
        <label>
          Nombre de logements
          <input
            type="number"
            value={nombreLogements}
            onChange={(e) => setNombreLogements(e.target.value)}
          />
        </label>
        <label>
          Date de livraison
          <input
            type="date"
            value={dateLivraison}
            onChange={(e) => setDateLivraison(e.target.value)}
          />
        </label>
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

export default SectionInfosProgramme
