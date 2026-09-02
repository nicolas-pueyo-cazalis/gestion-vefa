import { useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import LigneEntreprise from './LigneEntreprise.jsx'

// Même conversion que les autres formulaires de dates de l'appli.
function versDateInput(valeur) {
  return valeur ? valeur.slice(0, 10) : ''
}

function DetailEntreprisesTma({
  tma,
  colonnes,
  delaiRetourEntrepriseTmaJours,
  onChangement,
  onFermer,
}) {
  const [lignes, setLignes] = useState([])
  const [entreprisesDisponibles, setEntreprisesDisponibles] = useState([])
  const [chargement, setChargement] = useState(true)
  const [entrepriseChoisie, setEntrepriseChoisie] = useState('')
  // Bug corrigé le 13/07/2026 (point 134) : ce champ n'existait pas du
  // tout ici — dateEnvoi retombait donc toujours sur le défaut du schéma
  // (l'instant de la création), jamais une vraie date choisie, et l'alerte
  // de retard entreprise ne pouvait donc jamais se déclencher correctement.
  // Pré-rempli avec la date d'envoi entreprises de la TMA (généralement
  // toutes les entreprises sont sollicitées en même temps), reste modifiable
  // au cas où une entreprise en particulier est contactée plus tard.
  const [dateEnvoi, setDateEnvoi] = useState(
    versDateInput(tma.dateEnvoiEntreprises) || new Date().toISOString().slice(0, 10),
  )
  const [montantDevis, setMontantDevis] = useState('')
  const [dateRetour, setDateRetour] = useState('')
  // Description (21/07/2026, remarque de Nicolas) : ce qui est demandé à
  // CETTE entreprise précisément, distinct de la description globale de la
  // TMA (une même TMA peut nécessiter des interventions différentes selon
  // l'entreprise sollicitée).
  const [description, setDescription] = useState('')

  useEffect(() => {
    async function chargerDonnees() {
      const [reponseLignes, reponseEntreprises] = await Promise.all([
        apiFetch(`${API_URL}/api/tma-entreprises?tma=${tma._id}`),
        apiFetch(`${API_URL}/api/entreprises`),
      ])
      setLignes(await reponseLignes.json())
      setEntreprisesDisponibles(await reponseEntreprises.json())
      setChargement(false)
    }
    chargerDonnees()
    // tma.dateEnvoiEntreprises (17/07/2026, point 134) : la date d'envoi
    // entreprises se répercute côté serveur sur les lignes déjà créées
    // (routes/tma.js), mais `lignes` est un état local chargé une seule
    // fois au montage — sans cette dépendance, l'affichage restait figé sur
    // l'ancienne date tant que la page n'était pas rechargée. Le champ par
    // défaut du formulaire d'ajout (`dateEnvoi`) a le même problème : son
    // état initial n'est lu qu'au montage, il faut donc aussi le resynchroniser
    // ici pour qu'il propose la bonne date à la prochaine entreprise ajoutée.
    setDateEnvoi(versDateInput(tma.dateEnvoiEntreprises) || new Date().toISOString().slice(0, 10))
  }, [tma._id, tma.dateEnvoiEntreprises])

  async function ajouterLigne(evenement) {
    evenement.preventDefault()
    const reponse = await apiFetch(`${API_URL}/api/tma-entreprises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tma: tma._id,
        entreprise: entrepriseChoisie,
        dateEnvoi,
        montantDevis: montantDevis === '' ? null : Number(montantDevis),
        dateRetour: dateRetour || null,
        description: description || null,
      }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    const nouvelleLigne = await reponse.json()
    const entrepriseDetail = entreprisesDisponibles.find((e) => e._id === entrepriseChoisie)
    setLignes((liste) => [...liste, { ...nouvelleLigne, entreprise: entrepriseDetail }])
    setEntrepriseChoisie('')
    setDateEnvoi(versDateInput(tma.dateEnvoiEntreprises) || new Date().toISOString().slice(0, 10))
    setMontantDevis('')
    setDateRetour('')
    setDescription('')
    onChangement()
  }

  async function supprimerLigne(id) {
    const reponse = await apiFetch(`${API_URL}/api/tma-entreprises/${id}`, { method: 'DELETE' })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    setLignes((liste) => liste.filter((ligne) => ligne._id !== id))
    onChangement()
  }

  async function modifierLigne(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/tma-entreprises/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    const ligneMiseAJour = await reponse.json()
    setLignes((liste) =>
      liste.map((ligne) =>
        ligne._id === id
          ? {
              ...ligne,
              montantDevis: ligneMiseAJour.montantDevis,
              dateRetour: ligneMiseAJour.dateRetour,
              statut: ligneMiseAJour.statut,
              description: ligneMiseAJour.description,
            }
          : ligne,
      ),
    )
    onChangement()
  }

  return (
    <tr className="detail-entreprises">
      <td colSpan={colonnes}>
        {/* Titre ajouté (20/07/2026, point 183), même raison que
            FormulaireDatesTma.jsx. */}
        <h3 className="titre-sous-partie-crayon">Entreprises concernées</h3>
        {chargement ? (
          <p>Chargement...</p>
        ) : (
          <ul>
            {lignes.length === 0 && <li>Aucune entreprise pour l'instant.</li>}
            {lignes.map((ligne) => (
              <LigneEntreprise
                key={ligne._id}
                ligne={ligne}
                delaiRetourEntrepriseTmaJours={delaiRetourEntrepriseTmaJours}
                onEnregistrer={modifierLigne}
                onSupprimer={supprimerLigne}
              />
            ))}
          </ul>
        )}

        {/* Séparateur + titre (21/07/2026, remarque de Nicolas, même
            principe que "Ajouter un lot" — point 185, SectionLots.jsx) :
            sans ça, ce formulaire enchaînait directement sur la liste des
            entreprises déjà ajoutées, au point de les confondre. */}
        <hr className="separateur-ajout" />
        <h3>Ajouter une entreprise</h3>
        <form onSubmit={ajouterLigne}>
          <label>
            Entreprise
            <select
              value={entrepriseChoisie}
              onChange={(e) => setEntrepriseChoisie(e.target.value)}
              disabled={!tma.dateEnvoiEntreprises || !tma.nombreEntreprisesConcernees}
              required
            >
              <option value="" disabled>
                Choisir...
              </option>
              {entreprisesDisponibles.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.corpsDeTravaux} — Lot {e.numeroLot ?? '—'} — {e.nom}
                </option>
              ))}
            </select>
          </label>
          {/* Bloque l'ajout d'une entreprise tant que ces deux champs de la
              TMA ne sont pas remplis (17/07/2026, points 135 et 136) : le
              champ "Date d'envoi" de ce formulaire se pré-remplit toujours,
              il ne suffit donc pas à lui seul à empêcher un ajout. */}
          {!tma.dateEnvoiEntreprises && (
            <p className="avertissement-cellule">
              Complétez la "Date envoi entreprises" ci-dessus avant d'ajouter une entreprise.
            </p>
          )}
          {tma.dateEnvoiEntreprises && !tma.nombreEntreprisesConcernees && (
            <p className="avertissement-cellule">
              Complétez le "Nombre d'entreprises concernées" avant d'ajouter une entreprise.
            </p>
          )}
          <label>
            Description
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ce qui est demandé à cette entreprise"
            />
          </label>
          <label>
            Date d'envoi
            <input
              type="date"
              value={dateEnvoi}
              onChange={(e) => setDateEnvoi(e.target.value)}
              required
            />
          </label>
          <label>
            Montant TTC devis (€)
            <input
              type="number"
              step="0.01"
              value={montantDevis}
              onChange={(e) => setMontantDevis(e.target.value)}
            />
          </label>
          <label>
            Date de réception
            <input type="date" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)} />
          </label>
          <button type="submit">Ajouter</button>
          <button type="button" onClick={onFermer}>
            Fermer
          </button>
        </form>
      </td>
    </tr>
  )
}

export default DetailEntreprisesTma
