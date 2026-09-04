import { formatMontant } from '../utils/formatMontant.js'
import { formatDate } from '../utils/statuts.js'
import { nomAcquereur } from '../utils/acquereur.js'
import { STATUTS_LOT } from '../data/lots.js'

// Construction des données des 4 exports de la page Lots (04/09/2026,
// point 236, découpage) — extraites de Lots.jsx en fonctions pures
// (paramètres explicites plutôt que fermeture sur l'état du composant),
// aucun changement de comportement. `afficheSurface`, `afficheAnnexes`,
// `prixParM2`, `dateActuelle`, `pourcentage`, `derniereDateAnnulation`,
// `nomClient` restent définis dans Lots.jsx (testés directement par
// Lots.test.js, utilisés aussi par le rendu à l'écran) et sont transmis
// ici tels quels, en paramètre — évite un import circulaire (Lots.jsx
// importe ce fichier).

// Export #1 (20/07/2026, point 192) : tableau récapitulatif des lots,
// respecte les filtres actifs (statut + recherche, déjà appliqués à
// `lotsFiltres`), sans la colonne Action, avec les mêmes totaux qu'à
// l'écran. Mêmes fonctions d'affichage que le rendu du tableau, pour
// que l'export corresponde exactement à ce qui est lu à l'écran.
export function donneesExportTableau({
  lotsFiltres,
  afficherColonneSousPlafondBas,
  totalSurface,
  totalTTC,
  totalTVA,
  totalHT,
  moyennePrixM2,
  tauxTva,
  programme,
  afficheSurface,
  afficheAnnexes,
  prixParM2,
  dateActuelle,
}) {
  const entetes = [
    'Lot',
    'Étage',
    'Type',
    'Orientation',
    'Surface SHAB',
    ...(afficherColonneSousPlafondBas ? ['Surface < 1,80m'] : []),
    'Annexes',
    'Prix TTC',
    'Prix TTC/m² SHAB',
    'Statut',
    'Date',
    'Client',
    'Commentaire',
  ]
  const lignes = lotsFiltres.map((lot) => [
    lot.estAnnexeSeule ? '—' : lot.reference,
    lot.etage ?? '',
    lot.type ?? '',
    lot.orientation ?? '',
    afficheSurface(lot.surfaceHabitable),
    ...(afficherColonneSousPlafondBas ? [afficheSurface(lot.surfaceSousPlafondBas)] : []),
    afficheAnnexes(lot).join('\n') || '—',
    formatMontant(lot.prixTTC, 0),
    prixParM2(lot) !== null ? formatMontant(prixParM2(lot), 0) : '—',
    STATUTS_LOT[lot.statut],
    dateActuelle(lot),
    nomAcquereur(lot.acquereur),
    lot.commentaire || '—',
  ])
  const totaux = [
    ['SHAB totale', afficheSurface(totalSurface)],
    ['Total TTC', formatMontant(totalTTC)],
    [`TVA (${Math.round(tauxTva * 100)}%)`, formatMontant(totalTVA)],
    ['Total HT', formatMontant(totalHT)],
    ['Prix moyen TTC/m²', moyennePrixM2 !== null ? formatMontant(moyennePrixM2, 0) : '—'],
  ]
  return {
    nomFichier: `lots-${programme.nom}`,
    titre: `Lots — ${programme.nom}`,
    entetes,
    lignes,
    totaux,
  }
}

// Export #2 (20/07/2026, point 193) : les cartes de statistiques
// (Commercialisation, Chiffre d'affaires, Prix moyen TTC/m²) — mêmes
// valeurs et pourcentages qu'à l'écran, réunies dans un tableau à deux
// colonnes plutôt que sous forme de cartes (peu adapté à Excel/PDF).
export function donneesExportCartes({
  lots,
  parStatut,
  caParStatut,
  totalCA,
  moyennePrixM2,
  programme,
  pourcentage,
}) {
  const entetes = ['Indicateur', 'Valeur']
  const lignes = [
    ['Prix moyen TTC/m²', moyennePrixM2 !== null ? formatMontant(moyennePrixM2, 0) : '—'],
    ['Commercialisation — Lots au total', String(lots.length)],
    [
      'Commercialisation — Actés',
      `${parStatut.acte} (${pourcentage(parStatut.acte, lots.length)}% du programme)`,
    ],
    [
      'Commercialisation — Réservés',
      `${parStatut.reserve} (${pourcentage(parStatut.reserve, lots.length)}% du programme)`,
    ],
    [
      'Commercialisation — Options',
      `${parStatut.option} (${pourcentage(parStatut.option, lots.length)}% du programme)`,
    ],
    [
      'Commercialisation — Libres',
      `${parStatut.libre} (${pourcentage(parStatut.libre, lots.length)}% du programme)`,
    ],
    [
      "Chiffre d'affaires — CA acté",
      `${formatMontant(caParStatut.acte, 0)} (${pourcentage(caParStatut.acte, totalCA)}% du CA total)`,
    ],
    [
      "Chiffre d'affaires — CA réservé",
      `${formatMontant(caParStatut.reserve, 0)} (${pourcentage(caParStatut.reserve, totalCA)}% du CA total)`,
    ],
    [
      "Chiffre d'affaires — CA options",
      `${formatMontant(caParStatut.option, 0)} (${pourcentage(caParStatut.option, totalCA)}% du CA total)`,
    ],
    [
      "Chiffre d'affaires — CA libre",
      `${formatMontant(caParStatut.libre, 0)} (${pourcentage(caParStatut.libre, totalCA)}% du CA total)`,
    ],
  ]
  return {
    nomFichier: `lots-statistiques-${programme.nom}`,
    titre: `Statistiques — ${programme.nom}`,
    entetes,
    lignes,
  }
}

// Export #3 (20/07/2026, point 194) : l'historique — deux tableaux
// (ventes annulées, modifications de prix) dans un même fichier, sans
// la colonne "Détail" (équivalent d'une colonne Action ici, point 190).
export function donneesExportHistorique({
  historiqueAnnulations,
  historiqueModificationsPrix,
  programme,
  derniereDateAnnulation,
  nomClient,
}) {
  return {
    nomFichier: `lots-historique-${programme.nom}`,
    titre: `Historique — ${programme.nom}`,
    sections: [
      {
        sousTitre: 'Ventes annulées',
        entetes: [
          'Logement',
          'Statut avant annulation',
          'Date',
          'Client',
          'Commentaire',
          'Annulé le',
        ],
        lignes: historiqueAnnulations.map((entree) => [
          entree.referenceLot,
          STATUTS_LOT[entree.statutAvantAnnulation],
          derniereDateAnnulation(entree),
          nomClient(entree),
          entree.commentaire || '—',
          formatDate(entree.dateAnnulation),
        ]),
      },
      {
        sousTitre: 'Modifications de prix',
        entetes: ['Logement', 'Ancien prix', 'Nouveau prix', 'Motif', 'Date'],
        lignes: historiqueModificationsPrix.map((entree) => [
          entree.referenceLot,
          formatMontant(entree.ancienPrix),
          formatMontant(entree.nouveauPrix),
          entree.motif,
          formatDate(entree.createdAt),
        ]),
      },
    ],
  }
}

// Export #4 (20/07/2026, point 195) : les annexes encore disponibles à
// la vente (pas encore attribuées à un lot) — même liste que celle
// proposée dans le panneau "Vendre une annexe".
export function donneesExportAnnexesALaVente({ annexes, programme }) {
  const libellesType = {
    parking_ext: 'Parking extérieur',
    parking_int: 'Parking intérieur',
    cave: 'Cave',
    cellier: 'Cellier',
  }
  const disponibles = annexes.filter((a) => !a.lot)
  const entetes = ['Type', 'N°', 'Prix']
  const lignes = disponibles.map((a) => [
    libellesType[a.type] ?? a.type,
    String(a.numero),
    formatMontant(a.prix),
  ])
  const totaux = [['Total', formatMontant(disponibles.reduce((somme, a) => somme + a.prix, 0))]]
  return {
    nomFichier: `lots-annexes-a-la-vente-${programme.nom}`,
    titre: `Annexes à la vente — ${programme.nom}`,
    entetes,
    lignes,
    totaux,
  }
}
