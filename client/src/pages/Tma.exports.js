import { formatMontant } from '../utils/formatMontant.js'
import { formatDate, estEntrepriseEnRetard } from '../utils/statuts.js'
import { nomAcquereur } from '../utils/acquereur.js'
import { STATUTS_TMA } from '../data/tma.js'

// Construction des données des 3 exports de la page TMA (04/09/2026,
// point 236, découpage) — extraites de Tma.jsx en fonctions pures
// (paramètres explicites plutôt que fermeture sur l'état du composant),
// aucun changement de comportement. `numeroDemandePourTma` et
// `tmaObsolete` restent définis dans Tma.jsx (utilisés aussi par le
// rendu à l'écran) et sont transmis ici tels quels, en paramètre — évite
// un import circulaire (Tma.jsx importe ce fichier).

// "N° demande" ajoutée (21/07/2026, remarque de Nicolas) : juste après
// "Lot", partagée avec le tableau à l'écran.
const ENTETES_TABLEAU = [
  'Lot',
  'N° demande',
  'Client',
  'Date de la demande',
  'Localisation',
  'Description',
  'Date envoi entreprise',
  'Montant TTC entreprises',
  'Montant TTC client',
  'Facture envoyée le',
  'Facture validée le',
  'Statut',
  'Commentaire',
]

// Mêmes valeurs que les cellules affichées à l'écran (colonne Action
// exclue, point 190) — utilisé à la fois par l'export et l'export
// détaillé avec les entreprises.
function ligneTableau(tma, { numeroDemandePourTma, tmaObsolete }) {
  return [
    tma.lot?.reference ?? '—',
    String(numeroDemandePourTma(tma)),
    tmaObsolete(tma) ? '—' : nomAcquereur(tma.acquereur),
    formatDate(tma.dateDemande),
    tma.localisation,
    tma.description,
    formatDate(tma.dateEnvoiEntreprises),
    tma.montantEntreprises == null ? '—' : formatMontant(tma.montantEntreprises),
    formatMontant(tma.montantClient ?? 0),
    formatDate(tma.dateEnvoiFactureClient),
    formatDate(tma.dateRetourClient),
    STATUTS_TMA[tma.statut],
    tma.commentaire || '—',
  ]
}

// Export "Statistiques" (21/07/2026) : les deux lignes de cartes du haut.
export function donneesExportStatistiques({
  tmaList,
  validees,
  enCours,
  refusees,
  montantValideEntreprises,
  montantValideClient,
  marge,
  programme,
}) {
  return {
    nomFichier: `tma-statistiques-${programme.nom}`,
    titre: `Statistiques des TMA — ${programme.nom}`,
    entetes: ['Indicateur', 'Valeur'],
    lignes: [
      ['TMA au total', String(tmaList.length)],
      ['Validées', String(validees)],
      ['En cours', String(enCours)],
      ['Refusées', String(refusees)],
      ['Montant TTC validé (entreprises)', formatMontant(montantValideEntreprises)],
      ['Montant TTC validé (clients)', formatMontant(montantValideClient)],
      ['Marge', formatMontant(marge)],
    ],
  }
}

// Export "Demandes clients" (21/07/2026) : le tableau tel qu'affiché à
// l'écran (respecte statut + recherche, comme les autres exports),
// colonne Action exclue, avec les 3 lignes de total (déjà construites par
// Tma.jsx, réutilisées telles quelles ici puisqu'aussi affichées dans le
// tfoot du tableau à l'écran).
export function donneesExportDemandesClients({
  tmaFiltrees,
  numeroDemandePourTma,
  tmaObsolete,
  ligneTotalTTC,
  ligneTotalTVA,
  ligneTotalHT,
  programme,
}) {
  return {
    nomFichier: `tma-demandes-clients-${programme.nom}`,
    titre: `Demandes clients (TMA) — ${programme.nom}`,
    entetes: ENTETES_TABLEAU,
    lignes: tmaFiltrees.map((tma) => ligneTableau(tma, { numeroDemandePourTma, tmaObsolete })),
    lignesTotal: [ligneTotalTTC, ligneTotalTVA, ligneTotalHT],
    // Tient sur une seule page PDF (21/07/2026, même remarque que le
    // récap détaillé par phase des appels de fonds) : Client (2),
    // Description (5) et Commentaire (12) peuvent revenir à la ligne
    // (plafonnées), le reste est figé à sa largeur exacte.
    pageUnique: true,
    largeursMax: { 2: 40, 5: 45, 12: 40 },
  }
}

// Export "Détail entreprises" (21/07/2026, remarque de Nicolas — maquette
// fournie, revue une 2e fois : la 1ère version mélangeait libellé et
// valeur dans chaque cellule, ce n'était pas ça). Structure finale, sous
// chaque ligne "demande" (en gras) : UNE ligne de titres (en italique,
// une seule fois, pas par entreprise), puis UNE ligne de valeurs PAR
// entreprise (sans libellé répété) — réutilise les colonnes du tableau
// (colonne "N° demande" laissée vide sur ces lignes, elle ne concerne que
// la ligne "demande").
const LIGNE_TITRES_ENTREPRISES = [
  'Lot de travaux',
  '',
  "Corps d'état",
  "Nom de l'entreprise",
  '',
  'Description',
  'Date envoi entreprise',
  'Montant TTC devis',
  'Reçu le',
  '',
  '',
  '',
  '',
]

function ligneValeursEntreprise(ligne, delai) {
  // "En retard" (21/07/2026, précision de Nicolas) : remplace le montant
  // tant que l'entreprise n'a pas répondu et que le délai est dépassé —
  // même règle que le message affiché sur la ligne TMA elle-même
  // (estEntrepriseEnRetard, utils/statuts.js).
  const montantOuRetard = estEntrepriseEnRetard(ligne, delai)
    ? 'En retard'
    : ligne.montantDevis == null
      ? '—'
      : formatMontant(ligne.montantDevis)
  return [
    ligne.entreprise?.numeroLot ?? '—',
    '',
    ligne.corpsDeTravaux ?? '—',
    ligne.entreprise?.nom ?? '—',
    '',
    ligne.description || '—',
    formatDate(ligne.dateEnvoi),
    montantOuRetard,
    formatDate(ligne.dateRetour),
    '',
    '',
    '',
    '',
  ]
}

export function donneesExportDetailEntreprises({
  tmaFiltrees,
  tmaEntreprises,
  numeroDemandePourTma,
  tmaObsolete,
  programme,
}) {
  const delai = programme.parametres.delaiRetourEntrepriseTmaJours
  const lignes = []
  const stylesLignes = []
  for (const tma of tmaFiltrees) {
    lignes.push(ligneTableau(tma, { numeroDemandePourTma, tmaObsolete }))
    stylesLignes.push('gras')
    const lignesEntreprisesTma = tmaEntreprises.filter((l) => l.tma?._id === tma._id)
    // La ligne de titres n'a de sens que s'il y a au moins une entreprise
    // à lister en dessous — pas de ligne orpheline sinon.
    if (lignesEntreprisesTma.length > 0) {
      lignes.push(LIGNE_TITRES_ENTREPRISES)
      stylesLignes.push('italique')
      for (const ligne of lignesEntreprisesTma) {
        lignes.push(ligneValeursEntreprise(ligne, delai))
        stylesLignes.push(undefined)
      }
    }
  }
  // Titre "Montant TTC client" retiré du grand en-tête noir (21/07/2026,
  // remarque de Nicolas) : cette colonne affiche "Reçu le" sur la ligne de
  // titres entreprises, garder le titre d'origine (qui ne vaut que pour
  // la ligne demande, en gras) porterait à confusion.
  const entetes = ENTETES_TABLEAU.map((entete, i) => (i === 8 ? '' : entete))
  return {
    nomFichier: `tma-detail-entreprises-${programme.nom}`,
    titre: `Détail entreprises par TMA — ${programme.nom}`,
    entetes,
    lignes,
    stylesLignes,
  }
}
