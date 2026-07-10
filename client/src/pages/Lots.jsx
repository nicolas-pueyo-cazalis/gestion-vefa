import { Fragment, useEffect, useState } from 'react'
import { STATUTS_LOT } from '../data/lots.js'
import { API_URL } from '../config.js'
import { formatMontant } from '../utils/formatMontant.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import FormulaireEditionLot from '../components/FormulaireEditionLot.jsx'

const NB_COLONNES = 16

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

function afficheSurface(valeur) {
  return valeur != null ? `${valeur} m²` : '—'
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

function Lots() {
  const [lots, setLots] = useState([])
  const [programme, setProgramme] = useState(null)
  const [acquereurs, setAcquereurs] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [idEnEdition, setIdEnEdition] = useState(null)

  async function chargerLots() {
    const reponse = await fetch(`${API_URL}/api/lots`)
    setLots(await reponse.json())
  }

  useEffect(() => {
    async function chargerTout() {
      try {
        const [reponseProgramme, reponseAcquereurs] = await Promise.all([
          fetch(`${API_URL}/api/programme`),
          fetch(`${API_URL}/api/acquereurs`),
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

  async function enregistrerLot(id, donnees) {
    const reponse = await fetch(`${API_URL}/api/lots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    await chargerLots()
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

  // Moyenne des prix/m² de chaque lot (pas le total TTC divisé par la
  // surface totale) — demande explicite : "la moyenne de tous les prix
  // moyen/m²".
  const prixM2Connus = lotsFiltres.map(prixParM2).filter((valeur) => valeur !== null)
  const moyennePrixM2 =
    prixM2Connus.length > 0
      ? prixM2Connus.reduce((somme, valeur) => somme + valeur, 0) / prixM2Connus.length
      : null

  return (
    <>
      <h1 className="titre-page">Tableau de bord des lots</h1>

      <section className="stats">
        <StatCard valeur={lots.length} libelle="Lots au total" />
        <StatCard valeur={parStatut.acte} libelle="Actés" />
        <StatCard valeur={parStatut.reserve} libelle="Réservés" />
        <StatCard valeur={parStatut.option} libelle="Options" />
        <StatCard valeur={parStatut.libre} libelle="Libres" />
      </section>

      <section className="stats">
        <StatCard valeur={formatMontant(caParStatut.acte)} libelle="CA acté" />
        <StatCard valeur={formatMontant(caParStatut.reserve)} libelle="CA réservé" />
        <StatCard valeur={formatMontant(caParStatut.option)} libelle="CA options" />
        <StatCard valeur={formatMontant(caParStatut.libre)} libelle="CA libre" />
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
              <th>Surface</th>
              <th>Terrasse</th>
              <th>Jardin</th>
              <th>Parkings</th>
              <th>Caves/Celliers</th>
              <th>Prix TTC</th>
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
                  <td>{afficheSurface(lot.surfaceTerrasse)}</td>
                  <td>{afficheSurface(lot.surfaceJardin)}</td>
                  <td>{afficheNumeros(lot.parkings)}</td>
                  <td>{afficheNumeros(lot.caves)}</td>
                  <td>{formatMontant(lot.prixTTC)}</td>
                  <td>{prixParM2(lot) !== null ? formatMontant(prixParM2(lot)) : '—'}</td>
                  <td><Badge statut={lot.statut} texte={STATUTS_LOT[lot.statut]} /></td>
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
                    colonnes={NB_COLONNES}
                    onEnregistrer={enregistrerLot}
                    onFermer={() => setIdEnEdition(null)}
                  />
                )}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8}></td>
              <td>Prix TTC</td>
              <td>{formatMontant(totalTTC)}</td>
              <td>{moyennePrixM2 !== null ? formatMontant(moyennePrixM2) : '—'}</td>
              <td colSpan={5}></td>
            </tr>
            <tr>
              <td colSpan={8}></td>
              <td>TVA ({Math.round(tauxTva * 100)}%)</td>
              <td>{formatMontant(totalTVA)}</td>
              <td colSpan={6}></td>
            </tr>
            <tr>
              <td colSpan={8}></td>
              <td>Prix HT</td>
              <td>{formatMontant(totalHT)}</td>
              <td colSpan={6}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

export default Lots
