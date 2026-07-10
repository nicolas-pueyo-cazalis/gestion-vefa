import { useEffect, useState } from 'react'
import { API_URL } from '../../config.js'
import { ORIENTATIONS } from '../../data/lots.js'
import LigneLot from './LigneLot.jsx'
import ListeNumeros from './ListeNumeros.jsx'

function SectionLots({ programme, lots, onChangement }) {
  const etagesDisponibles = programme.parametres.listeEtages

  const [reference, setReference] = useState('')
  const [etage, setEtage] = useState('')
  const [type, setType] = useState('')
  const [orientation, setOrientation] = useState('')
  const [surfaceHabitable, setSurfaceHabitable] = useState('')
  const [surfaceTerrasse, setSurfaceTerrasse] = useState('')
  const [surfaceJardin, setSurfaceJardin] = useState('')
  const [parkings, setParkings] = useState([])
  const [caves, setCaves] = useState([])
  const [prixTTC, setPrixTTC] = useState('')
  const [erreur, setErreur] = useState('')
  const [erreurParkings, setErreurParkings] = useState('')
  const [erreurCaves, setErreurCaves] = useState('')

  const maximumAtteint = programme.nombreLogements != null && lots.length >= programme.nombreLogements
  const logementsManquants = programme.nombreLogements != null && lots.length < programme.nombreLogements
    ? programme.nombreLogements - lots.length
    : 0

  // Remarque du 10/07/2026 : le message de plafond atteint (issu d'une
  // tentative d'ajout refusée) ne doit pas rester affiché si on relève
  // entre-temps le nombre de logements du programme.
  useEffect(() => {
    if (!maximumAtteint) setErreur('')
  }, [maximumAtteint])

  function versNombreOuNull(valeur) {
    return valeur === '' ? null : Number(valeur)
  }

  async function ajouter(evenement) {
    evenement.preventDefault()
    setErreur('')
    setErreurParkings('')
    setErreurCaves('')
    const reponse = await fetch(`${API_URL}/api/lots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programme: programme._id,
        reference,
        etage: etage || null,
        type: type || null,
        orientation: orientation || null,
        surfaceHabitable: versNombreOuNull(surfaceHabitable),
        surfaceTerrasse: versNombreOuNull(surfaceTerrasse),
        surfaceJardin: versNombreOuNull(surfaceJardin),
        parkings,
        caves,
        prixTTC: versNombreOuNull(prixTTC),
      }),
    })
    if (!reponse.ok) {
      const donnees = await reponse.json()
      if (donnees.champ === 'parkings') setErreurParkings(donnees.message)
      else if (donnees.champ === 'caves') setErreurCaves(donnees.message)
      else setErreur(donnees.message)
      return
    }
    setReference('')
    setEtage('')
    setType('')
    setOrientation('')
    setSurfaceHabitable('')
    setSurfaceTerrasse('')
    setSurfaceJardin('')
    setParkings([])
    setCaves([])
    setPrixTTC('')
    onChangement()
  }

  // Renvoie l'erreur ({ champ, message }) à LigneLot si le PATCH échoue,
  // pour qu'elle s'affiche au bon endroit dans le formulaire d'édition —
  // plutôt qu'un alert() générique.
  async function modifier(id, donnees) {
    const reponse = await fetch(`${API_URL}/api/lots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      return await reponse.json()
    }
    onChangement()
    return null
  }

  async function supprimer(id) {
    const reponse = await fetch(`${API_URL}/api/lots/${id}`, { method: 'DELETE' })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    onChangement()
  }

  return (
    <section className="section-parametres">
      <h2>Lots</h2>
      <ul>
        {lots.length === 0 && <li>Aucun lot pour l'instant.</li>}
        {lots.map((lot) => (
          <LigneLot
            key={lot._id}
            lot={lot}
            etagesDisponibles={etagesDisponibles}
            onEnregistrer={modifier}
            onSupprimer={supprimer}
          />
        ))}
      </ul>
      {maximumAtteint && (
        <p className="total-erreur">
          Nombre maximum de logements atteint ({programme.nombreLogements}) — modifiez ce nombre
          dans "Informations du programme" pour en ajouter davantage.
        </p>
      )}
      {!maximumAtteint && logementsManquants > 0 && (
        <p className="total-erreur">
          Il manque {logementsManquants} logement{logementsManquants > 1 ? 's' : ''} par rapport au
          nombre annoncé ({programme.nombreLogements}).
        </p>
      )}
      {erreur && <p className="total-erreur">{erreur}</p>}
      <form onSubmit={ajouter}>
        <label>
          N° du logement
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
            disabled={maximumAtteint}
          />
        </label>
        <label>
          Étage
          <select value={etage} onChange={(e) => setEtage(e.target.value)}>
            <option value="">—</option>
            {etagesDisponibles.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label>
          Type
          <input value={type} onChange={(e) => setType(e.target.value)} placeholder="ex: T2" />
        </label>
        <label>
          Orientation
          <select value={orientation} onChange={(e) => setOrientation(e.target.value)}>
            <option value="">—</option>
            {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label>
          Surface habitable (m²)
          <input type="number" step="0.01" value={surfaceHabitable} onChange={(e) => setSurfaceHabitable(e.target.value)} />
        </label>
        <label>
          Terrasse (m²)
          <input type="number" step="0.01" value={surfaceTerrasse} onChange={(e) => setSurfaceTerrasse(e.target.value)} />
        </label>
        <label>
          Jardin (m²)
          <input type="number" step="0.01" value={surfaceJardin} onChange={(e) => setSurfaceJardin(e.target.value)} />
        </label>
        <div className="groupe-numeros">
          <ListeNumeros label="N° de parking" valeurs={parkings} onChange={setParkings} erreur={erreurParkings} />
          <ListeNumeros label="N° de cave/cellier" valeurs={caves} onChange={setCaves} erreur={erreurCaves} />
        </div>
        <label>
          Prix TTC (€)
          <input type="number" step="0.01" value={prixTTC} onChange={(e) => setPrixTTC(e.target.value)} />
        </label>
        <button type="submit" disabled={maximumAtteint}>Ajouter</button>
      </form>
    </section>
  )
}

export default SectionLots
