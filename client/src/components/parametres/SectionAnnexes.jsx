import { useState } from 'react'
import { API_URL } from '../../config.js'
import { apiFetch } from '../../utils/api.js'
import { formatMontant } from '../../utils/formatMontant.js'
import { TYPES_ANNEXES } from '../../data/annexes.js'

// Catalogue d'un seul type d'annexe (17/07/2026, point 165) : chaque
// numéro a son propre prix, et se choisit ensuite depuis le formulaire
// d'un logement (SelectionAnnexes.jsx) plutôt que d'être resaisi
// librement — seules celles encore libres peuvent être retirées d'ici
// (une annexe déjà attribuée à un lot se détache depuis ce lot).
function CatalogueAnnexesType({ type, libelle, programmeId, annexes, onChangement }) {
  const [numero, setNumero] = useState('')
  const [prix, setPrix] = useState('')
  const [erreur, setErreur] = useState('')

  async function ajouter(evenement) {
    evenement.preventDefault()
    setErreur('')
    const reponse = await apiFetch(`${API_URL}/api/annexes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programme: programmeId, type, numero: Number(numero), prix: Number(prix) }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      setErreur(message)
      return
    }
    setNumero('')
    setPrix('')
    onChangement()
  }

  async function supprimer(id) {
    const reponse = await apiFetch(`${API_URL}/api/annexes/${id}`, { method: 'DELETE' })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    onChangement()
  }

  return (
    <div className="catalogue-annexes-type">
      <h3>{libelle}</h3>
      <ul>
        {annexes.length === 0 && <li>Aucune pour l'instant.</li>}
        {annexes.map((a) => (
          <li key={a._id}>
            N°{a.numero} — {formatMontant(a.prix, 0)} —{' '}
            {a.lot ? `attribuée à ${a.lot.reference}` : 'libre'}
            {!a.lot && <button type="button" onClick={() => supprimer(a._id)}>Retirer</button>}
          </li>
        ))}
      </ul>
      <form onSubmit={ajouter}>
        <label>
          N°
          <input type="number" value={numero} onChange={(e) => setNumero(e.target.value)} required />
        </label>
        <label>
          Prix (€)
          <input type="number" step="0.01" value={prix} onChange={(e) => setPrix(e.target.value)} required />
        </label>
        <button type="submit">Ajouter</button>
        {erreur && <span className="erreur-champ">{erreur}</span>}
      </form>
    </div>
  )
}

// Catalogue des annexes numérotées et prixées d'un programme (17/07/2026,
// point 165) : rempli une fois au démarrage du programme, puis choisi
// depuis une liste déroulante à chaque logement (voir SelectionAnnexes.jsx,
// utilisé dans SectionLots.jsx et LigneLot.jsx) plutôt que resaisi
// librement à chaque fois — permet en plus de connaître à tout instant
// quelles annexes restent disponibles (colonne "libre"/"attribuée à...").
function SectionAnnexes({ programme, annexes, onChangement }) {
  return (
    <section className="section-parametres">
      <h2>Annexes (parkings, caves, celliers)</h2>
      <div className="catalogues-annexes">
        {TYPES_ANNEXES.map(({ valeur, libelle }) => (
          <CatalogueAnnexesType
            key={valeur}
            type={valeur}
            libelle={libelle}
            programmeId={programme._id}
            annexes={annexes.filter((a) => a.type === valeur)}
            onChangement={onChangement}
          />
        ))}
      </div>
    </section>
  )
}

export default SectionAnnexes
