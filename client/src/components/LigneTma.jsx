import { Fragment } from 'react'
import { STATUTS_TMA, TRANSITIONS_AUTORISEES, STATUTS_NON_RECALCULABLES } from '../data/tma.js'
import { formatMontant } from '../utils/formatMontant.js'
import { formatDate } from '../utils/statuts.js'
import { nomAcquereur } from '../utils/acquereur.js'
import Badge from './Badge.jsx'
import FormulaireDatesTma from './FormulaireDatesTma.jsx'
import DetailEntreprisesTma from './DetailEntreprisesTma.jsx'
import FormulaireInfosTma from './FormulaireInfosTma.jsx'

// Une ligne du tableau principal de la page TMA, extraite de Tma.jsx
// (04/09/2026, point 236, découpage) — même patron que
// LigneAppelDeFonds.jsx/components/parametres/LigneLot.jsx. `numeroDemande`,
// `estObsolete` et `entrepriseEnRetard` sont précalculés par le parent
// (comme `cumul`/`dernierDuLot` pour LigneAppelDeFonds), pour éviter
// d'importer ici `tmaObsolete`/`numeroDemandePourTma` depuis Tma.jsx (qui
// importe déjà ce composant — import circulaire).
function LigneTma({
  tma,
  numeroDemande,
  estObsolete,
  entrepriseEnRetard,
  colonnes,
  montantClientSaisiManuellement,
  delaiRetourEntrepriseTmaJours,
  panneauOuvert,
  onBasculerPanneau,
  onFermerPanneau,
  onReattribuer,
  onEnregistrerInfos,
  onEnregistrerDates,
  onChangementEntreprises,
  onChangerStatut,
  onAnnulerRefus,
  onAnnulerAnnulation,
  onAnnulerTermine,
}) {
  return (
    <Fragment>
      <tr>
        <td>{tma.lot?.reference ?? '—'}</td>
        <td>{numeroDemande}</td>
        <td>
          {/* Client d'origine obsolète (13/07/2026, point 133) : la vente
            qui a donné lieu à cette TMA a été annulée (et éventuellement
            remplacée par une nouvelle) depuis — le client d'origine n'a
            plus rien à voir avec le logement, donc son nom ne s'affiche
            plus. La TMA elle-même reste (à garder si le nouveau client la
            reprend — bouton ci-dessous — ou à supprimer soi-même, voir
            point 128), simplement signalée tant qu'elle n'a pas été
            réattribuée. */}
          <span className="nom-client">{estObsolete ? '—' : nomAcquereur(tma.acquereur)}</span>
          {estObsolete && (
            <>
              <div className="avertissement-cellule">Attention, ce logement a été annulé</div>
              {tma.lot?.acquereur && (
                <button type="button" onClick={() => onReattribuer(tma)}>
                  Réattribuer à {nomAcquereur(tma.lot.acquereur)}
                </button>
              )}
            </>
          )}
          {/* 13/07/2026, point 127 : une TMA peut être créée dès
            Option/Réservé, pas seulement Acté (voir
            FormulaireCreationTma.jsx) — simple rappel visuel tant que la
            vente n'est pas encore signée. */}
          {!estObsolete && tma.lot?.statut && tma.lot.statut !== 'acte' && (
            <div className="avertissement-cellule">Ce logement n'est pas encore acté</div>
          )}
        </td>
        <td>{formatDate(tma.dateDemande)}</td>
        <td>{tma.localisation}</td>
        <td>
          <span className="description-cellule">{tma.description}</span>
        </td>
        <td>{formatDate(tma.dateEnvoiEntreprises)}</td>
        {/* "==" (pas "===") : capture aussi bien `null` que `undefined` —
          un montant absent du document (jamais renseigné) n'est pas
          forcément `null` à la lettre, et formatMontant(undefined)
          affiche "NaN €". */}
        <td className="colonne-montant">
          {tma.montantEntreprises == null ? '—' : formatMontant(tma.montantEntreprises)}
        </td>
        <td className="colonne-montant">{formatMontant(tma.montantClient ?? 0)}</td>
        <td>{formatDate(tma.dateEnvoiFactureClient)}</td>
        <td>{formatDate(tma.dateRetourClient)}</td>
        <td>
          <Badge statut={tma.statut} texte={STATUTS_TMA[tma.statut]} />
          {tma.statut === 'etude' && entrepriseEnRetard && (
            <div className="avertissement-cellule">Retard entreprise</div>
          )}
        </td>
        <td>
          <span className="commentaire-cellule">{tma.commentaire || '—'}</span>
        </td>
        <td className="actions">
          <button
            type="button"
            className="bouton-icone"
            title="Modifier"
            aria-label="Modifier"
            onClick={onBasculerPanneau}
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
      {panneauOuvert && (
        <>
          <FormulaireInfosTma
            tma={tma}
            colonnes={colonnes}
            montantClientSaisiManuellement={montantClientSaisiManuellement}
            onEnregistrer={onEnregistrerInfos}
            onFermer={onFermerPanneau}
          />
          {/* "valide" exclu en plus de STATUTS_NON_RECALCULABLES (21/07/2026,
            audit "fidélité code/doc") : sans ça, ce panneau restait
            modifiable même une fois la TMA validée — effacer "Date de
            retour client" après coup faisait redescendre le statut vers
            "facture", à l'encontre de la règle "pas de retour en arrière
            une fois validé" (déjà respectée pour le bouton "Refuser").
            Même principe que le montant client, déjà verrouillé une fois
            "Validé" (point 182). */}
          {!STATUTS_NON_RECALCULABLES.includes(tma.statut) && tma.statut !== 'valide' && (
            <FormulaireDatesTma
              tma={tma}
              colonnes={colonnes}
              onEnregistrer={onEnregistrerDates}
              onFermer={onFermerPanneau}
            />
          )}
          <DetailEntreprisesTma
            tma={tma}
            colonnes={colonnes}
            delaiRetourEntrepriseTmaJours={delaiRetourEntrepriseTmaJours}
            onChangement={onChangementEntreprises}
            onFermer={onFermerPanneau}
          />
          <tr className="formulaire-dates">
            <td colSpan={colonnes}>
              <div className="boutons-panneau-tma">
                {TRANSITIONS_AUTORISEES[tma.statut].includes('termine') && (
                  <button
                    type="button"
                    className="bouton-fonce"
                    onClick={() => onChangerStatut(tma._id, 'termine')}
                  >
                    Marquer les travaux comme terminés
                  </button>
                )}
                {tma.statut === 'termine' && (
                  <button
                    type="button"
                    className="bouton-fonce"
                    onClick={() => onAnnulerTermine(tma._id)}
                  >
                    Annuler la fin des travaux
                  </button>
                )}
                {TRANSITIONS_AUTORISEES[tma.statut].includes('refuse') && (
                  <button type="button" onClick={() => onChangerStatut(tma._id, 'refuse')}>
                    Refuser la TMA
                  </button>
                )}
                {tma.statut === 'refuse' && (
                  <button type="button" onClick={() => onAnnulerRefus(tma._id)}>
                    Annuler le refus
                  </button>
                )}
                {TRANSITIONS_AUTORISEES[tma.statut].includes('annule') && (
                  <button
                    type="button"
                    className="bouton-danger"
                    onClick={() => onChangerStatut(tma._id, 'annule')}
                  >
                    Annuler la TMA
                  </button>
                )}
                {tma.statut === 'annule' && (
                  <button type="button" onClick={() => onAnnulerAnnulation(tma._id)}>
                    Annuler l'annulation
                  </button>
                )}
              </div>
            </td>
          </tr>
        </>
      )}
    </Fragment>
  )
}

export default LigneTma
