import { useState } from 'react'
import { formatMontant } from '../../utils/formatMontant.js'
import { ORIENTATIONS } from '../../data/lots.js'
import ListeNumeros from './ListeNumeros.jsx'
import ListeSurfaces from './ListeSurfaces.jsx'

function LigneLot({ lot, etagesDisponibles, onEnregistrer, onSupprimer }) {
  const [enEdition, setEnEdition] = useState(false)
  const [reference, setReference] = useState(lot.reference)
  const [etage, setEtage] = useState(lot.etage ?? '')
  const [type, setType] = useState(lot.type ?? '')
  const [orientation, setOrientation] = useState(lot.orientation ?? '')
  const [surfaceHabitable, setSurfaceHabitable] = useState(lot.surfaceHabitable ?? '')
  const [surfacesTerrasses, setSurfacesTerrasses] = useState(lot.surfacesTerrasses ?? [])
  const [surfacesBalcons, setSurfacesBalcons] = useState(lot.surfacesBalcons ?? [])
  const [surfacesLoggias, setSurfacesLoggias] = useState(lot.surfacesLoggias ?? [])
  const [surfaceJardin, setSurfaceJardin] = useState(lot.surfaceJardin ?? '')
  const [parkings, setParkings] = useState(lot.parkings ?? [])
  const [caves, setCaves] = useState(lot.caves ?? [])
  const [celliers, setCelliers] = useState(lot.celliers ?? [])
  const [prixTTC, setPrixTTC] = useState(lot.prixTTC ?? '')
  const [erreurParkings, setErreurParkings] = useState('')
  const [erreurCaves, setErreurCaves] = useState('')
  const [erreurCelliers, setErreurCelliers] = useState('')

  function versNombreOuNull(valeur) {
    return valeur === '' ? null : Number(valeur)
  }

  async function soumettre(evenement) {
    evenement.preventDefault()
    setErreurParkings('')
    setErreurCaves('')
    setErreurCelliers('')
    const erreur = await onEnregistrer(lot._id, {
      reference,
      etage: etage || null,
      type: type || null,
      orientation: orientation || null,
      surfaceHabitable: versNombreOuNull(surfaceHabitable),
      surfacesTerrasses,
      surfacesBalcons,
      surfacesLoggias,
      surfaceJardin: versNombreOuNull(surfaceJardin),
      parkings,
      caves,
      celliers,
      prixTTC: versNombreOuNull(prixTTC),
    })
    if (erreur) {
      if (erreur.champ === 'parkings') setErreurParkings(erreur.message)
      else if (erreur.champ === 'caves') setErreurCaves(erreur.message)
      else if (erreur.champ === 'celliers') setErreurCelliers(erreur.message)
      return
    }
    setEnEdition(false)
  }

  if (enEdition) {
    return (
      <li>
        <form onSubmit={soumettre} className="ligne-lot-edition">
          <label>
            N° du logement
            <input value={reference} onChange={(e) => setReference(e.target.value)} required />
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
          <ListeSurfaces label="Terrasses (m²)" valeurs={surfacesTerrasses} onChange={setSurfacesTerrasses} />
          <ListeSurfaces label="Balcons (m²)" valeurs={surfacesBalcons} onChange={setSurfacesBalcons} />
          <ListeSurfaces label="Loggias (m²)" valeurs={surfacesLoggias} onChange={setSurfacesLoggias} />
          <label>
            Jardin (m²)
            <input type="number" step="0.01" value={surfaceJardin} onChange={(e) => setSurfaceJardin(e.target.value)} />
          </label>
          <div className="groupe-numeros">
            <ListeNumeros label="N° de parking" valeurs={parkings} onChange={setParkings} erreur={erreurParkings} />
            <ListeNumeros label="N° de cave" valeurs={caves} onChange={setCaves} erreur={erreurCaves} />
            <ListeNumeros label="N° de cellier" valeurs={celliers} onChange={setCelliers} erreur={erreurCelliers} />
          </div>
          <label>
            Prix TTC (€)
            <input type="number" step="0.01" value={prixTTC} onChange={(e) => setPrixTTC(e.target.value)} />
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={() => setEnEdition(false)}>Annuler</button>
        </form>
      </li>
    )
  }

  return (
    <li>
      {lot.reference} — {lot.etage} — {lot.type}
      {lot.orientation && ` — ${lot.orientation}`}
      {lot.surfaceHabitable != null && ` — ${lot.surfaceHabitable} m² habitables`}
      {lot.surfacesTerrasses?.length > 0 && ` — terrasse${lot.surfacesTerrasses.length > 1 ? 's' : ''} : ${lot.surfacesTerrasses.join(', ')} m²`}
      {lot.surfacesBalcons?.length > 0 && ` — balcon${lot.surfacesBalcons.length > 1 ? 's' : ''} : ${lot.surfacesBalcons.join(', ')} m²`}
      {lot.surfacesLoggias?.length > 0 && ` — loggia${lot.surfacesLoggias.length > 1 ? 's' : ''} : ${lot.surfacesLoggias.join(', ')} m²`}
      {lot.surfaceJardin != null && ` — ${lot.surfaceJardin} m² jardin`}
      {lot.parkings?.length > 0 && ` — n° de parking : ${lot.parkings.join(', ')}`}
      {lot.caves?.length > 0 && ` — n° de cave : ${lot.caves.join(', ')}`}
      {lot.celliers?.length > 0 && ` — n° de cellier : ${lot.celliers.join(', ')}`}
      {lot.prixTTC != null && ` — ${formatMontant(lot.prixTTC, 0)}`}
      <button type="button" onClick={() => setEnEdition(true)}>Modifier</button>
      <button type="button" onClick={() => onSupprimer(lot._id)}>Retirer</button>
    </li>
  )
}

export default LigneLot
