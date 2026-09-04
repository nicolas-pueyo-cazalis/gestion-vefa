import { Fragment } from 'react'
import { STATUTS_LOT } from '../data/lots.js'
import { formatMontant } from '../utils/formatMontant.js'
import { nomAcquereur } from '../utils/acquereur.js'
import Badge from './Badge.jsx'
import FormulaireEditionLot from './FormulaireEditionLot.jsx'

// Une ligne du tableau principal de la page Lots, extraite de Lots.jsx
// (04/09/2026, point 236, découpage) — même patron que
// LigneAppelDeFonds.jsx/LigneTma.jsx (nom délibérément différent de
// components/parametres/LigneLot.jsx, qui a une responsabilité
// différente : édition des caractéristiques d'un lot en Paramètres, pas
// la vente/le tableau de bord). `surfaceHabitableAffichee`,
// `surfaceSousPlafondBasAffichee`, `lignesAnnexes`, `prixParM2Affiche`,
// `dateAffichee`, `pretManquant` sont précalculés par le parent (comme
// `cumul`/`dernierDuLot` pour LigneAppelDeFonds.jsx) — évite d'importer
// les fonctions afficheSurface/afficheAnnexes/prixParM2/dateActuelle/
// offrePretManquante depuis Lots.jsx (qui importe déjà ce composant —
// import circulaire).
function LigneTableauLots({
  lot,
  colonnes,
  afficherColonneSousPlafondBas,
  surfaceHabitableAffichee,
  surfaceSousPlafondBasAffichee,
  lignesAnnexes,
  prixParM2Affiche,
  dateAffichee,
  pretManquant,
  acquereurs,
  enEdition,
  onModifier,
  onFermerModifier,
  onEnregistrer,
  onAnnulerVente,
  onEnregistrerPrix,
}) {
  return (
    <Fragment>
      <tr>
        {/* Annexe vendue à part (17/07/2026, remarque de Nicolas) : sa
            référence ne s'affiche pas ici, déjà présente dans la colonne
            "Annexes" ci-dessous. */}
        <td>{lot.estAnnexeSeule ? '—' : lot.reference}</td>
        <td>{lot.etage}</td>
        <td>{lot.type}</td>
        <td>{lot.orientation}</td>
        <td>{surfaceHabitableAffichee}</td>
        {afficherColonneSousPlafondBas && <td>{surfaceSousPlafondBasAffichee}</td>}
        <td>
          {lignesAnnexes.length > 0 ? (
            <div className="annexes-cellule">
              {lignesAnnexes.map((ligne, i) => (
                <div key={i}>{ligne}</div>
              ))}
            </div>
          ) : (
            '—'
          )}
        </td>
        <td className="colonne-montant">{formatMontant(lot.prixTTC, 0)}</td>
        <td className="colonne-montant">{prixParM2Affiche}</td>
        <td>
          <Badge statut={lot.statut} texte={STATUTS_LOT[lot.statut]} />
          {pretManquant && <div className="avertissement-cellule">Offre de prêt non reçue</div>}
        </td>
        <td>{dateAffichee}</td>
        <td>
          <span className="nom-client">{nomAcquereur(lot.acquereur)}</span>
        </td>
        <td>
          <span className="commentaire-cellule">{lot.commentaire || '—'}</span>
        </td>
        <td className="actions">
          <button
            type="button"
            className="bouton-icone"
            title="Modifier"
            aria-label="Modifier"
            onClick={() => onModifier(lot._id)}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        </td>
      </tr>
      {enEdition && (
        <FormulaireEditionLot
          lot={lot}
          acquereurs={acquereurs}
          colonnes={colonnes}
          onEnregistrer={onEnregistrer}
          onAnnulerVente={onAnnulerVente}
          onEnregistrerPrix={onEnregistrerPrix}
          onFermer={onFermerModifier}
        />
      )}
    </Fragment>
  )
}

export default LigneTableauLots
