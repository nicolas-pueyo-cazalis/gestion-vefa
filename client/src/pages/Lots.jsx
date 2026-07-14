import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { STATUTS_LOT } from '../data/lots.js'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { formatMontant } from '../utils/formatMontant.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import FormulaireEditionLot from '../components/FormulaireEditionLot.jsx'

// Nombre de colonnes fixes (hors terrasses, comptées 1 par défaut) — sert
// à calculer NB_COLONNES et les colSpan du tableau une fois le nombre
// réel de colonnes "Terrasse" connu (remarque du 13/07/2026 : plusieurs
// terrasses possibles par lot, colonnes supplémentaires seulement si
// besoin réel, sinon une seule comme avant).
const NB_COLONNES_FIXES = 15

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(STATUTS_LOT).map(([valeur, libelle]) => ({ valeur, libelle })),
]

function nomAcquereur(acquereur) {
  if (!acquereur) return '—'
  return [acquereur.civilite, acquereur.prenom, acquereur.nom].filter(Boolean).join(' ')
}

function prixParM2(lot) {
  if (!lot.surfaceHabitable) return null
  return lot.prixTTC / lot.surfaceHabitable
}

// Remarque du 13/07/2026 : contrairement aux montants (plus de décimales),
// les surfaces gardent toujours 2 décimales, même quand la valeur est un
// nombre rond (45 m² s'affiche "45,00 m²").
function afficheSurface(valeur) {
  if (valeur == null) return '—'
  return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valeur)} m²`
}

function afficheNumeros(valeurs) {
  return valeurs?.length > 0 ? valeurs.join(', ') : '—'
}

// Affiche la date correspondant à l'étape la plus avancée déjà atteinte
// par le lot (acte > réservation > option) — une seule date "utile" par
// ligne plutôt que trois colonnes creuses la plupart du temps vides.
// Cohérente par construction avec le statut : le serveur refuse qu'une
// date d'étape non atteinte soit renseignée (voir server/routes/lots.js).
function dateActuelle(lot) {
  const date = lot.dateActe || lot.dateReservation || lot.dateOption
  return date ? new Date(date).toLocaleDateString('fr-FR') : '—'
}

// Remarque du 13/07/2026 : un lot Acté sans offre de prêt reçue mérite un
// rappel visuel — sauf si l'acquéreur a explicitement déclaré "sans prêt"
// (page Suivi de prêt), auquel cas la question ne se pose pas.
function offrePretManquante(lot) {
  return lot.statut === 'acte' && lot.acquereur && !lot.acquereur.sansPret && !lot.acquereur.dateOffrePretRecue
}

function Lots() {
  const [lots, setLots] = useState([])
  const [programme, setProgramme] = useState(null)
  const [acquereurs, setAcquereurs] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [idEnEdition, setIdEnEdition] = useState(null)

  // Position réelle (en pixels, mesurée dans le DOM) des colonnes SHAB et
  // Prix TTC — remarque du 13/07/2026 : un calcul par index de colonne ne
  // correspond pas aux largeurs réelles (très inégales : "Commentaire" et
  // "Client" bien plus larges que "SHAB" ou "Statut"), donc on mesure les
  // vraies positions des <th> plutôt que de les deviner.
  const refPiedTotaux = useRef(null)
  const refTheadShab = useRef(null)
  const refTheadPrixTTC = useRef(null)
  const [positionShab, setPositionShab] = useState(null)
  const [positionPrixTTC, setPositionPrixTTC] = useState(null)

  async function chargerLots() {
    const reponse = await apiFetch(`${API_URL}/api/lots`)
    setLots(await reponse.json())
  }

  async function chargerAcquereurs() {
    const reponse = await apiFetch(`${API_URL}/api/acquereurs`)
    setAcquereurs(await reponse.json())
  }

  useEffect(() => {
    async function chargerTout() {
      try {
        const [reponseProgramme, reponseAcquereurs] = await Promise.all([
          apiFetch(`${API_URL}/api/programme`),
          apiFetch(`${API_URL}/api/acquereurs`),
        ])
        setProgramme(await reponseProgramme.json())
        setAcquereurs(await reponseAcquereurs.json())
        await chargerLots()
      } catch (e) {
        setErreur(e.message)
      } finally {
        setChargement(false)
      }
    }
    chargerTout()
  }, [])

  // Mesure après chaque rendu du tableau (nombre de lignes/colonnes
  // pouvant changer le rendu, donc les positions) et au redimensionnement
  // de la fenêtre — pas de dépendances "données" précises ici, ce hook
  // s'exécute après CHAQUE rendu, ce qui reste bon marché (deux lectures
  // de position, pas de recalcul lourd).
  useLayoutEffect(() => {
    function mesurer() {
      if (!refPiedTotaux.current || !refTheadShab.current || !refTheadPrixTTC.current) return
      const base = refPiedTotaux.current.getBoundingClientRect().left
      const shab = refTheadShab.current.getBoundingClientRect()
      const prixTTC = refTheadPrixTTC.current.getBoundingClientRect()
      setPositionShab(shab.left + shab.width / 2 - base)
      // Ancré au bord gauche (pas centré) : le groupe TTC/TVA/HT part de
      // "Total TTC" (premier élément) puis s'étend vers la droite avec TVA
      // et Total HT, donc c'est ce bord gauche qui doit tomber sous "Prix TTC".
      setPositionPrixTTC(prixTTC.left - base)
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  })

  async function enregistrerLot(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/lots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    // La modification peut avoir créé ou renommé un acquéreur (voir
    // FormulaireEditionLot) — sans ce rafraîchissement, la liste
    // déroulante "Client" resterait affichée avec les anciennes valeurs
    // jusqu'au prochain rechargement complet de la page.
    await Promise.all([chargerLots(), chargerAcquereurs()])
    setIdEnEdition(null)
  }

  if (chargement) return <p>Chargement des lots...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  const lotsFiltres =
    statutActif === 'tous' ? lots : lots.filter((lot) => lot.statut === statutActif)

  const parStatut = Object.keys(STATUTS_LOT).reduce((compte, statut) => {
    compte[statut] = lots.filter((lot) => lot.statut === statut).length
    return compte
  }, {})

  const caParStatut = Object.keys(STATUTS_LOT).reduce((compte, statut) => {
    compte[statut] = lots
      .filter((lot) => lot.statut === statut)
      .reduce((somme, lot) => somme + lot.prixTTC, 0)
    return compte
  }, {})

  // Totaux TTC/TVA/HT du tableau affiché (respecte le filtre de statut
  // actif), à partir du taux de TVA paramétré sur le programme.
  const tauxTva = programme.parametres.tauxTva
  const totalTTC = lotsFiltres.reduce((somme, lot) => somme + lot.prixTTC, 0)
  const totalHT = totalTTC / (1 + tauxTva)
  const totalTVA = totalTTC - totalHT

  // Surface totale et prix moyen TTC/m² du tableau affiché — remarque du
  // 13/07/2026 : total TTC / surface totale (pas la moyenne des prix/m²
  // de chaque lot, comme calculé jusqu'ici).
  const totalSurface = lotsFiltres.reduce((somme, lot) => somme + (lot.surfaceHabitable ?? 0), 0)
  const moyennePrixM2 = totalSurface > 0 ? totalTTC / totalSurface : null

  // Une seule colonne "Terrasse" par défaut ; plusieurs seulement si au
  // moins un lot en a réellement plusieurs (remarque du 13/07/2026) — sur
  // l'ensemble des lots, pas seulement ceux affichés par le filtre actif,
  // pour que le nombre de colonnes ne bouge pas en changeant de filtre.
  const nbTerrasses = Math.max(1, ...lots.map((lot) => lot.surfacesTerrasses?.length ?? 0))
  const nbColonnes = NB_COLONNES_FIXES + nbTerrasses

  return (
    <>
      {/* Point 153 (13/07/2026, option B choisie) : "Prix moyen TTC/m²"
          isolé ici, à côté du titre — point laissé en suspens, à
          rediscuter plus tard (emplacement pas forcément définitif). */}
      <div className="entete-avec-cle">
        <h1 className="titre-page">Tableau de bord des lots</h1>
        <div className="cle-chiffre">
          <span className="label">Prix moyen TTC/m²</span>
          <span className="valeur">{moyennePrixM2 !== null ? formatMontant(moyennePrixM2, 0) : '—'}</span>
        </div>
      </div>

      <section className="stats">
        <StatCard valeur={lots.length} libelle="Lots au total" />
        <StatCard valeur={parStatut.acte} libelle="Actés" statut="acte" />
        <StatCard valeur={parStatut.reserve} libelle="Réservés" statut="reserve" />
        <StatCard valeur={parStatut.option} libelle="Options" statut="option" />
        <StatCard valeur={parStatut.libre} libelle="Libres" statut="libre" />
      </section>

      <section className="stats">
        <StatCard valeur={formatMontant(caParStatut.acte, 0)} libelle="CA acté" statut="acte" />
        <StatCard valeur={formatMontant(caParStatut.reserve, 0)} libelle="CA réservé" statut="reserve" />
        <StatCard valeur={formatMontant(caParStatut.option, 0)} libelle="CA options" statut="option" />
        <StatCard valeur={formatMontant(caParStatut.libre, 0)} libelle="CA libre" statut="libre" />
      </section>

      <FiltreStatuts statuts={STATUTS_FILTRE} actif={statutActif} onChange={setStatutActif} />

      <div className="tableau-scroll">
        <table className="tableau-lots">
          <thead>
            <tr>
              <th>Lot</th>
              <th>Étage</th>
              <th>Type</th>
              <th>Orientation</th>
              <th ref={refTheadShab}>SHAB</th>
              {Array.from({ length: nbTerrasses }).map((_, i) => (
                <th key={i}>{nbTerrasses > 1 ? `Terrasse/Balcon ${i + 1}` : 'Terrasse/Balcon'}</th>
              ))}
              <th>Jardin</th>
              <th>Parkings</th>
              <th className="entete-repliable">Caves/Celliers</th>
              <th ref={refTheadPrixTTC}>Prix TTC</th>
              <th>Prix/m²</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Client</th>
              <th>Commentaire</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lotsFiltres.map((lot) => (
              <Fragment key={lot._id}>
                <tr>
                  <td>{lot.reference}</td>
                  <td>{lot.etage}</td>
                  <td>{lot.type}</td>
                  <td>{lot.orientation}</td>
                  <td>{afficheSurface(lot.surfaceHabitable)}</td>
                  {Array.from({ length: nbTerrasses }).map((_, i) => (
                    <td key={i}>{afficheSurface(lot.surfacesTerrasses?.[i])}</td>
                  ))}
                  <td>{afficheSurface(lot.surfaceJardin)}</td>
                  <td>{afficheNumeros(lot.parkings)}</td>
                  <td>{afficheNumeros(lot.caves)}</td>
                  <td>{formatMontant(lot.prixTTC, 0)}</td>
                  <td>{prixParM2(lot) !== null ? formatMontant(prixParM2(lot), 0) : '—'}</td>
                  <td>
                    <Badge statut={lot.statut} texte={STATUTS_LOT[lot.statut]} />
                    {offrePretManquante(lot) && (
                      <div className="avertissement-cellule">Offre de prêt non reçue</div>
                    )}
                  </td>
                  <td>{dateActuelle(lot)}</td>
                  <td><span className="nom-client">{nomAcquereur(lot.acquereur)}</span></td>
                  <td><span className="commentaire-cellule">{lot.commentaire || '—'}</span></td>
                  <td className="actions">
                    <button type="button" onClick={() => setIdEnEdition(lot._id)}>Modifier</button>
                  </td>
                </tr>
                {idEnEdition === lot._id && (
                  <FormulaireEditionLot
                    lot={lot}
                    acquereurs={acquereurs}
                    colonnes={nbColonnes}
                    onEnregistrer={enregistrerLot}
                    onFermer={() => setIdEnEdition(null)}
                  />
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Totaux sortis du tableau (13/07/2026) — SHAB totale positionnée
            sous sa colonne, mesurée réellement dans le DOM (voir le
            useLayoutEffect plus haut). Total TTC/TVA/Total HT décalés à
            gauche (point 153) : le groupe part du bord gauche de la
            colonne "Prix TTC" au lieu d'être collé à droite. "Prix moyen
            TTC/m²" retiré d'ici, isolé ailleurs (voir proposition). */}
        <div className="pied-totaux" ref={refPiedTotaux}>
          <div
            className="pied-totaux-ligne pied-totaux-flottant"
            style={{ left: `${positionShab ?? 0}px`, visibility: positionShab === null ? 'hidden' : 'visible' }}
          >
            <span className="label">SHAB totale</span>
            <span className="valeur">{afficheSurface(totalSurface)}</span>
          </div>
          <div
            className="pied-totaux-groupe pied-totaux-flottant pied-totaux-flottant--gauche"
            style={{ left: `${positionPrixTTC ?? 0}px`, visibility: positionPrixTTC === null ? 'hidden' : 'visible' }}
          >
            <div className="pied-totaux-ligne pied-totaux-principal">
              <span className="label">Total TTC</span>
              <span className="valeur">{formatMontant(totalTTC)}</span>
            </div>
            <div className="pied-totaux-ligne">
              <span className="label">TVA ({Math.round(tauxTva * 100)}%)</span>
              <span className="valeur">{formatMontant(totalTVA)}</span>
            </div>
            <div className="pied-totaux-ligne">
              <span className="label">Total HT</span>
              <span className="valeur">{formatMontant(totalHT)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Lots
