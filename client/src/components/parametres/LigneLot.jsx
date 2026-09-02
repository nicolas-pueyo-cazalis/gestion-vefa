import { useState } from 'react'
import { formatMontant } from '../../utils/formatMontant.js'
import { ORIENTATIONS } from '../../data/lots.js'
import { TYPES_ANNEXES } from '../../data/annexes.js'
import SelectionAnnexes from './SelectionAnnexes.jsx'
import ListeSurfaces from './ListeSurfaces.jsx'

// Résumé "N°X, N°Y" des annexes d'un lot par type, pour l'affichage
// replié (17/07/2026, point 165) — même esprit que les résumés
// terrasses/balcons juste au-dessus.
function resumeAnnexes(annexesDuLot, type, libelle) {
  const numeros = annexesDuLot.filter((a) => a.type === type).map((a) => a.numero)
  if (numeros.length === 0) return null
  return `${libelle} : ${numeros.join(', ')}`
}

function LigneLot({ lot, etagesDisponibles, annexes, onEnregistrer, onSupprimer }) {
  // Plus de négociation possible une fois Acté (17/07/2026, remarque de
  // Nicolas) : prix et annexes figés ici — une annexe vendue après coup
  // passe par "Vendre une annexe" (page Lots), un nouveau lot séparé.
  const estActe = lot.statut === 'acte'
  const [enEdition, setEnEdition] = useState(false)
  const [reference, setReference] = useState(lot.reference)
  const [etage, setEtage] = useState(lot.etage ?? '')
  const [type, setType] = useState(lot.type ?? '')
  const [orientation, setOrientation] = useState(lot.orientation ?? '')
  const [surfaceHabitable, setSurfaceHabitable] = useState(lot.surfaceHabitable ?? '')
  const [surfaceSousPlafondBas, setSurfaceSousPlafondBas] = useState(
    lot.surfaceSousPlafondBas ?? '',
  )
  const [surfacesTerrasses, setSurfacesTerrasses] = useState(lot.surfacesTerrasses ?? [])
  const [surfacesBalcons, setSurfacesBalcons] = useState(lot.surfacesBalcons ?? [])
  const [surfacesLoggias, setSurfacesLoggias] = useState(lot.surfacesLoggias ?? [])
  const [surfaceJardin, setSurfaceJardin] = useState(lot.surfaceJardin ?? '')
  const [annexeIds, setAnnexeIds] = useState((lot.annexes ?? []).map((a) => a._id))
  const [erreur, setErreur] = useState('')

  function versNombreOuNull(valeur) {
    return valeur === '' ? null : Number(valeur)
  }

  const totalAnnexesChoisies = annexes
    .filter((a) => annexeIds.includes(a._id))
    .reduce((somme, a) => somme + a.prix, 0)
  const apercuPrixTotal = (lot.prixLogementSeul ?? 0) + totalAnnexesChoisies

  async function soumettre(evenement) {
    evenement.preventDefault()
    setErreur('')
    // Prix non modifiable ici (17/07/2026, remarque de Nicolas) :
    // uniquement depuis la page Lots, avec motif et historique — voir
    // FormulairePrixLot.jsx. Paramètres ne sert qu'au paramétrage initial.
    const erreurRenvoyee = await onEnregistrer(lot._id, {
      reference,
      etage: etage || null,
      type: type || null,
      orientation: orientation || null,
      surfaceHabitable: versNombreOuNull(surfaceHabitable),
      surfaceSousPlafondBas: versNombreOuNull(surfaceSousPlafondBas),
      surfacesTerrasses,
      surfacesBalcons,
      surfacesLoggias,
      surfaceJardin: versNombreOuNull(surfaceJardin),
      annexeIds,
    })
    if (erreurRenvoyee) {
      setErreur(erreurRenvoyee.message)
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
              {etagesDisponibles.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
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
              {ORIENTATIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label>
            Surface habitable (m²)
            <input
              type="number"
              step="0.01"
              value={surfaceHabitable}
              onChange={(e) => setSurfaceHabitable(e.target.value)}
            />
          </label>
          <label>
            Surface &lt; 1,80m (m²)
            <input
              type="number"
              step="0.01"
              value={surfaceSousPlafondBas}
              onChange={(e) => setSurfaceSousPlafondBas(e.target.value)}
            />
          </label>
          <ListeSurfaces
            label="Terrasses (m²)"
            valeurs={surfacesTerrasses}
            onChange={setSurfacesTerrasses}
          />
          <ListeSurfaces
            label="Balcons (m²)"
            valeurs={surfacesBalcons}
            onChange={setSurfacesBalcons}
          />
          <ListeSurfaces
            label="Loggias (m²)"
            valeurs={surfacesLoggias}
            onChange={setSurfacesLoggias}
          />
          <label>
            Jardin (m²)
            <input
              type="number"
              step="0.01"
              value={surfaceJardin}
              onChange={(e) => setSurfaceJardin(e.target.value)}
            />
          </label>
          {estActe && (
            <p className="avertissement-cellule avertissement-pleine-largeur">
              Logement Acté : le prix et les annexes ne sont plus modifiables (plus de négociation
              possible après signature). Pour une annexe vendue après coup, utilisez "Vendre une
              annexe" depuis la page Lots.
            </p>
          )}
          <div className="groupe-annexes">
            {TYPES_ANNEXES.map(({ valeur, libelle }) => (
              <SelectionAnnexes
                key={valeur}
                type={valeur}
                libelle={libelle}
                annexesDuType={annexes.filter((a) => a.type === valeur)}
                lotId={lot._id}
                selectionnees={annexeIds}
                onChange={setAnnexeIds}
                disabled={estActe}
              />
            ))}
          </div>
          <p className="apercu-montant">
            Prix logement seul : {formatMontant(lot.prixLogementSeul ?? 0, 0)} — Prix total (avec
            annexes) : {formatMontant(apercuPrixTotal, 0)} — modifiable uniquement depuis la page
            Lots.
          </p>
          {erreur && <p className="erreur-champ">{erreur}</p>}
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={() => setEnEdition(false)}>
            Annuler
          </button>
        </form>
      </li>
    )
  }

  const annexesDuLot = lot.annexes ?? []

  return (
    <li>
      {lot.reference} — {lot.etage} — {lot.type}
      {lot.orientation && ` — ${lot.orientation}`}
      {lot.surfaceHabitable != null && ` — ${lot.surfaceHabitable} m² habitables`}
      {lot.surfaceSousPlafondBas != null && ` — ${lot.surfaceSousPlafondBas} m² < 1,80m`}
      {lot.surfacesTerrasses?.length > 0 &&
        ` — terrasse${lot.surfacesTerrasses.length > 1 ? 's' : ''} : ${lot.surfacesTerrasses.join(', ')} m²`}
      {lot.surfacesBalcons?.length > 0 &&
        ` — balcon${lot.surfacesBalcons.length > 1 ? 's' : ''} : ${lot.surfacesBalcons.join(', ')} m²`}
      {lot.surfacesLoggias?.length > 0 &&
        ` — loggia${lot.surfacesLoggias.length > 1 ? 's' : ''} : ${lot.surfacesLoggias.join(', ')} m²`}
      {lot.surfaceJardin != null && ` — ${lot.surfaceJardin} m² jardin`}
      {TYPES_ANNEXES.map(({ valeur, libelle }) => {
        const resume = resumeAnnexes(annexesDuLot, valeur, libelle)
        return resume && ` — ${resume}`
      })}
      {lot.prixLogementSeul != null && ` — logement seul ${formatMontant(lot.prixLogementSeul, 0)}`}
      {lot.prixTTC != null && ` — total ${formatMontant(lot.prixTTC, 0)}`}
      <button type="button" onClick={() => setEnEdition(true)}>
        Modifier
      </button>
      <button type="button" onClick={() => onSupprimer(lot._id)}>
        Retirer
      </button>
    </li>
  )
}

export default LigneLot
