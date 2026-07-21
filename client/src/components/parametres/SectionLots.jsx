import { useEffect, useState } from 'react'
import { API_URL } from '../../config.js'
import { apiFetch } from '../../utils/api.js'
import { formatMontant } from '../../utils/formatMontant.js'
import { ORIENTATIONS } from '../../data/lots.js'
import { TYPES_ANNEXES } from '../../data/annexes.js'
import LigneLot from './LigneLot.jsx'
import SelectionAnnexes from './SelectionAnnexes.jsx'
import ListeSurfaces from './ListeSurfaces.jsx'

function SectionLots({ programme, lots, annexes, onChangement }) {
  const etagesDisponibles = programme.parametres.listeEtages

  const [reference, setReference] = useState('')
  const [etage, setEtage] = useState('')
  const [type, setType] = useState('')
  const [orientation, setOrientation] = useState('')
  const [surfaceHabitable, setSurfaceHabitable] = useState('')
  const [surfaceSousPlafondBas, setSurfaceSousPlafondBas] = useState('')
  const [surfacesTerrasses, setSurfacesTerrasses] = useState([])
  const [surfacesBalcons, setSurfacesBalcons] = useState([])
  const [surfacesLoggias, setSurfacesLoggias] = useState([])
  const [surfaceJardin, setSurfaceJardin] = useState('')
  const [annexeIds, setAnnexeIds] = useState([])
  const [prixLogementSeul, setPrixLogementSeul] = useState('')
  const [erreur, setErreur] = useState('')

  // Une annexe vendue à part (17/07/2026, "Vendre une annexe", page Lots)
  // n'est pas un vrai logement : exclue du quota (comme côté serveur), et
  // de cette liste — aucune de ses caractéristiques techniques (étage,
  // surfaces...) n'a de sens ici. Se gère depuis la page Lots (statut/
  // dates/client), pas depuis Paramètres.
  const lotsAffiches = lots.filter((lot) => !lot.estAnnexeSeule)
  const nombreLogements = lotsAffiches.length
  const maximumAtteint = programme.nombreLogements != null && nombreLogements >= programme.nombreLogements
  const logementsManquants = programme.nombreLogements != null && nombreLogements < programme.nombreLogements
    ? programme.nombreLogements - nombreLogements
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

  // Aperçu du prix total (17/07/2026, point 165), même principe que
  // FormulaireBaremeLot.jsx : logement seul + somme des annexes cochées,
  // recalculé en direct pendant la saisie.
  const totalAnnexesChoisies = annexes
    .filter((a) => annexeIds.includes(a._id))
    .reduce((somme, a) => somme + a.prix, 0)
  const apercuPrixTotal = (Number(prixLogementSeul) || 0) + totalAnnexesChoisies

  async function ajouter(evenement) {
    evenement.preventDefault()
    setErreur('')
    const reponse = await apiFetch(`${API_URL}/api/lots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programme: programme._id,
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
        prixLogementSeul: versNombreOuNull(prixLogementSeul),
      }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      setErreur(message)
      return
    }
    setReference('')
    setEtage('')
    setType('')
    setOrientation('')
    setSurfaceHabitable('')
    setSurfaceSousPlafondBas('')
    setSurfacesTerrasses([])
    setSurfacesBalcons([])
    setSurfacesLoggias([])
    setSurfaceJardin('')
    setAnnexeIds([])
    setPrixLogementSeul('')
    onChangement()
  }

  // Renvoie l'erreur ({ champ, message }) à LigneLot si le PATCH échoue,
  // pour qu'elle s'affiche au bon endroit dans le formulaire d'édition —
  // plutôt qu'un alert() générique.
  async function modifier(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/lots/${id}`, {
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
    const reponse = await apiFetch(`${API_URL}/api/lots/${id}`, { method: 'DELETE' })
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
        {lotsAffiches.length === 0 && <li>Aucun lot pour l'instant.</li>}
        {lotsAffiches.map((lot) => (
          <LigneLot
            key={lot._id}
            lot={lot}
            etagesDisponibles={etagesDisponibles}
            annexes={annexes}
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
      {/* Séparation visuelle (20/07/2026, point 185) : sans elle, le
          formulaire d'ajout d'un lot enchaînait directement sur la liste
          des lots existants (chacun avec les mêmes champs une fois
          déplié), au point de confondre modifier un lot déjà là et en
          ajouter un nouveau. */}
      <hr className="separateur-ajout" />
      <h3>Ajouter un lot</h3>
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
          Surface &lt; 1,80m (m²)
          <input
            type="number"
            step="0.01"
            value={surfaceSousPlafondBas}
            onChange={(e) => setSurfaceSousPlafondBas(e.target.value)}
          />
        </label>
        <ListeSurfaces label="Terrasses (m²)" valeurs={surfacesTerrasses} onChange={setSurfacesTerrasses} />
        <ListeSurfaces label="Balcons (m²)" valeurs={surfacesBalcons} onChange={setSurfacesBalcons} />
        <ListeSurfaces label="Loggias (m²)" valeurs={surfacesLoggias} onChange={setSurfacesLoggias} />
        <label>
          Jardin (m²)
          <input type="number" step="0.01" value={surfaceJardin} onChange={(e) => setSurfaceJardin(e.target.value)} />
        </label>
        <div className="groupe-annexes">
          {TYPES_ANNEXES.map(({ valeur, libelle }) => (
            <SelectionAnnexes
              key={valeur}
              type={valeur}
              libelle={libelle}
              annexesDuType={annexes.filter((a) => a.type === valeur)}
              selectionnees={annexeIds}
              onChange={setAnnexeIds}
            />
          ))}
        </div>
        <label>
          Prix logement seul (€)
          <input
            type="number"
            step="0.01"
            value={prixLogementSeul}
            onChange={(e) => setPrixLogementSeul(e.target.value)}
          />
        </label>
        <p className="apercu-montant">Prix total (avec annexes) : {formatMontant(apercuPrixTotal, 0)}</p>
        <button type="submit" disabled={maximumAtteint}>Ajouter</button>
      </form>
    </section>
  )
}

export default SectionLots
