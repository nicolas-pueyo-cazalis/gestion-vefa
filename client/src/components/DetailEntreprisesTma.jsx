import { useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { formatMontant } from '../utils/formatMontant.js'

function DetailEntreprisesTma({ tma, colonnes, onChangement, onFermer }) {
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [corpsDeTravaux, setCorpsDeTravaux] = useState('')
  const [entreprise, setEntreprise] = useState('')
  const [montantDevis, setMontantDevis] = useState('')

  useEffect(() => {
    async function chargerLignes() {
      const reponse = await fetch(`${API_URL}/api/tma-entreprises?tma=${tma._id}`)
      const donnees = await reponse.json()
      setLignes(donnees)
      setChargement(false)
    }
    chargerLignes()
  }, [tma._id])

  async function ajouterLigne(evenement) {
    evenement.preventDefault()
    const reponse = await fetch(`${API_URL}/api/tma-entreprises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tma: tma._id,
        corpsDeTravaux,
        entreprise,
        montantDevis: montantDevis === '' ? null : Number(montantDevis),
      }),
    })
    const nouvelleLigne = await reponse.json()
    setLignes((liste) => [...liste, nouvelleLigne])
    setCorpsDeTravaux('')
    setEntreprise('')
    setMontantDevis('')
    onChangement()
  }

  async function supprimerLigne(id) {
    await fetch(`${API_URL}/api/tma-entreprises/${id}`, { method: 'DELETE' })
    setLignes((liste) => liste.filter((ligne) => ligne._id !== id))
    onChangement()
  }

  return (
    <tr className="detail-entreprises">
      <td colSpan={colonnes}>
        {chargement ? (
          <p>Chargement...</p>
        ) : (
          <ul>
            {lignes.length === 0 && <li>Aucune entreprise pour l'instant.</li>}
            {lignes.map((ligne) => (
              <li key={ligne._id}>
                {ligne.corpsDeTravaux} — {ligne.entreprise} — {formatMontant(ligne.montantDevis)}
                <button type="button" onClick={() => supprimerLigne(ligne._id)}>Retirer</button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={ajouterLigne}>
          <label>
            Corps de travaux
            <input value={corpsDeTravaux} onChange={(e) => setCorpsDeTravaux(e.target.value)} />
          </label>
          <label>
            Entreprise
            <input value={entreprise} onChange={(e) => setEntreprise(e.target.value)} />
          </label>
          <label>
            Montant devis (€)
            <input
              type="number"
              step="0.01"
              value={montantDevis}
              onChange={(e) => setMontantDevis(e.target.value)}
            />
          </label>
          <button type="submit">Ajouter</button>
          <button type="button" onClick={onFermer}>Fermer</button>
        </form>
      </td>
    </tr>
  )
}

export default DetailEntreprisesTma
