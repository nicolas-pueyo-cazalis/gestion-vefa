import { Fragment } from 'react'
import { formatMontant } from '../utils/formatMontant.js'
import { statutAppel, formatDate } from '../utils/statuts.js'
import Badge from './Badge.jsx'
import FormulaireAppelDeFonds from './FormulaireAppelDeFonds.jsx'
import FormulaireBaremeLot from './FormulaireBaremeLot.jsx'

const LIBELLES_STATUT = {
  attente: 'En attente',
  a_emettre: 'À émettre',
  emis: 'Émis',
  retard: 'En retard',
  regle: 'Réglé',
}

// Une ligne du tableau principal de la page Appels de fonds, extraite de
// AppelsDeFonds.jsx (03/09/2026, point 236, découpage) — même patron que
// components/parametres/LigneLot.jsx et components/LigneEntreprise.jsx :
// rend directement un <tr> (dans un Fragment ici, pour les 2 panneaux
// conditionnels qui suivent), pas de wrapper superflu.
function LigneAppelDeFonds({
  appel,
  cumul,
  dernierDuLot,
  appelsDuLot,
  colonnes,
  idEnEdition,
  idLotBaremeOuvert,
  onModifier,
  onFermerModifier,
  onEnregistrer,
  onOuvrirBareme,
  onFermerBareme,
  onEnregistrerBaremeLot,
}) {
  return (
    <Fragment>
      <tr>
        <td>{appel.lot?.reference ?? '—'}</td>
        <td>{appel.phase.nom}</td>
        <td>{Math.round(cumul * 100)}%</td>
        <td>{Math.round(appel.phase.pourcentage * 100)}%</td>
        <td className="colonne-montant">{formatMontant(appel.montant)}</td>
        <td>{formatDate(appel.dateAttestationMOE)}</td>
        <td>{formatDate(appel.dateEmission)}</td>
        <td>{formatDate(appel.dateLimiteReglement)}</td>
        <td>{formatDate(appel.dateReglement)}</td>
        <td>
          <Badge statut={statutAppel(appel)} texte={LIBELLES_STATUT[statutAppel(appel)]} />
        </td>
        <td>
          <span className="commentaire-cellule">{appel.commentaire || '—'}</span>
        </td>
        <td className="actions">
          <button
            type="button"
            className="bouton-icone"
            title="Modifier"
            aria-label="Modifier"
            onClick={() => onModifier(appel._id)}
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
      {idEnEdition === appel._id && (
        <FormulaireAppelDeFonds
          appel={appel}
          colonnes={colonnes}
          onEnregistrer={onEnregistrer}
          onFermer={onFermerModifier}
          onOuvrirBaremeLot={
            dernierDuLot && appel.lot ? () => onOuvrirBareme(appel.lot._id) : undefined
          }
        />
      )}
      {dernierDuLot && idLotBaremeOuvert === appel.lot?._id && (
        <FormulaireBaremeLot
          lotId={appel.lot._id}
          prixTTC={appel.lot.prixTTC}
          appels={appelsDuLot}
          colonnes={colonnes}
          onEnregistrer={onEnregistrerBaremeLot}
          onFermer={onFermerBareme}
        />
      )}
    </Fragment>
  )
}

export default LigneAppelDeFonds
