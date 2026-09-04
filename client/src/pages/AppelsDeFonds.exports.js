import { formatMontant } from '../utils/formatMontant.js'
import { formatDate } from '../utils/statuts.js'
import { nomAcquereur } from '../utils/acquereur.js'

// Construction des données des 4 exports de la page Appels de fonds
// (03/09/2026, point 236, découpage) — extraites de AppelsDeFonds.jsx en
// fonctions pures (paramètres explicites plutôt que fermeture sur l'état
// du composant), aucun changement de comportement. Toujours couvertes
// via AppelsDeFonds.render.test.jsx (rendu complet), pas de test unitaire
// dédié pour l'instant.

// Courrier d'appel de fonds (20/07/2026, remarque de Nicolas, modèle
// fourni) : un document par appel précis (un lot + une phase), choisi
// dans la fenêtre d'export — PDF uniquement (exception au principe
// "Excel + PDF partout", une lettre n'a pas d'équivalent tableur utile).
export function donneesExportCourrier({ idAppel, appels, appelsTries, programme }) {
  const appel = appels.find((a) => a._id === idAppel)
  if (!appel) return null
  const phasesDuLotJusquIci = appelsTries
    .filter((a) => a.lot?._id === appel.lot?._id && a.phase.ordre <= appel.phase.ordre)
    .sort((a, b) => a.phase.ordre - b.phase.ordre)
  return {
    typeCourrier: true,
    nomFichier: `appel-de-fonds-${appel.lot?.reference}-${appel.phase.nom}`,
    promoteur: programme.maitreOuvrage || programme.nom,
    numeroAppel: appel.phase.ordre,
    phaseNom: appel.phase.nom,
    programmeNom: programme.nom,
    lotReference: appel.lot?.reference ?? '—',
    acquereurNom: nomAcquereur(appel.lot?.acquereur),
    prixVente: appel.lot?.prixTTC,
    dateAttestation: appel.dateAttestationMOE,
    lignesPhases: phasesDuLotJusquIci.map((a) => [
      a.phase.nom,
      Math.round(a.phase.pourcentage * 100),
      a.dateReglement ? 'Réglé' : formatMontant(a.montant, 0),
    ]),
    montantARegler: appel.montant,
    dateLimite: appel.dateLimiteReglement,
    iban: programme.iban,
    bic: programme.bic,
  }
}

// Export "Statistiques" (21/07/2026, remarque de Nicolas) : les deux
// lignes de cartes de stats affichées en haut de page, réunies en
// tableau à deux colonnes (même principe que Lots/Suivi de prêt/
// Signature acte).
export function donneesExportStatistiques({
  appels,
  emisAuTotal,
  enAttente,
  aEmettre,
  enRetard,
  regles,
  totalEmis,
  totalPaye,
  soldeRestant,
  programme,
}) {
  return {
    nomFichier: `appels-de-fonds-statistiques-${programme.nom}`,
    titre: `Statistiques des appels de fonds — ${programme.nom}`,
    entetes: ['Indicateur', 'Valeur'],
    lignes: [
      ['Appels au total', String(appels.length)],
      ['Émis (au total)', String(emisAuTotal)],
      ['En attente', String(enAttente)],
      ['À émettre', String(aEmettre)],
      ['En retard', String(enRetard)],
      ['Réglés', String(regles)],
      ['Total émis', formatMontant(totalEmis)],
      ['Total payé', formatMontant(totalPaye)],
      ['Solde restant dû', formatMontant(soldeRestant)],
    ],
  }
}

// Export "Récapitulatif par lot" (21/07/2026, remarque de Nicolas) : le
// tableau tel qu'affiché à l'écran (bouton "Voir le récapitulatif par
// lot"), avec une ligne de total sous chaque colonne — absente jusqu'ici
// aussi bien à l'écran que dans l'export (ajoutée aux deux en même
// temps, voir RecapitulatifAppelsParLot.jsx).
export function donneesExportRecapParLot({
  recapParLot,
  totalPrixTTCRecap,
  totalEmis,
  totalPaye,
  soldeRestant,
  programme,
}) {
  return {
    nomFichier: `appels-de-fonds-recap-par-lot-${programme.nom}`,
    titre: `Récapitulatif par lot — ${programme.nom}`,
    entetes: ['Lot', 'Prix TTC', 'Total émis', 'Total payé', 'Reste à payer'],
    lignes: recapParLot.map(({ lot, totalEmis: emisLot, totalPaye: payeLot }) => [
      lot.reference,
      formatMontant(lot.prixTTC),
      formatMontant(emisLot),
      formatMontant(payeLot),
      formatMontant(lot.prixTTC - payeLot),
    ]),
    lignesTotal: [
      [
        'Total',
        formatMontant(totalPrixTTCRecap),
        formatMontant(totalEmis),
        formatMontant(totalPaye),
        formatMontant(soldeRestant),
      ],
    ],
  }
}

// Export "Récapitulatif détaillé par phase" (21/07/2026, remarque de
// Nicolas, modèle PDF fourni en référence) : une colonne "Montant" +
// "Réglé le" par phase du barème (Réservation comprise, contrairement
// aux exports/génération ci-dessus qui l'excluent puisqu'elle ne
// s'atteste jamais à la main — ici c'est un simple récapitulatif, pas
// une action). Cellule vide tant que la phase n'est pas émise pour ce
// lot. Ne reprend QUE les lots ayant déjà au moins un appel de fonds
// (question posée à Nicolas, choix explicite : pas les logements encore
// Libres sans aucun appel — contrairement au modèle PDF d'origine).
// Colonnes "ID Client" et "Solde livraison" du modèle PDF volontairement
// absentes (retirées à la demande de Nicolas : la 1ère n'a pas
// d'équivalent dans les données de l'appli, la 2ème était un doublon de
// "Reste à payer").
export function donneesExportDetailParPhase({
  programme,
  phasesTriees,
  recapParLot,
  appels,
  totalPrixTTCRecap,
  totalPaye,
  soldeRestant,
}) {
  const tauxTva = programme.parametres.tauxTva
  const entetes = [
    'Lot',
    'Client',
    'Prix TTC',
    ...phasesTriees.flatMap((phase) => [
      `${phase.nom} (${Math.round(phase.pourcentage * 100)}%)`,
      'Réglé le',
    ]),
    'Total payé',
    'Reste à payer',
  ]
  const lignes = recapParLot.map(({ lot, totalPaye: payeLot }) => {
    const appelsDuLot = appels.filter((a) => a.lot?._id === lot._id)
    return [
      lot.reference,
      nomAcquereur(lot.acquereur),
      formatMontant(lot.prixTTC),
      ...phasesTriees.flatMap((phase) => {
        const appel = appelsDuLot.find((a) => a.phase.nom === phase.nom)
        return [
          appel?.dateEmission ? formatMontant(appel.montant) : '',
          appel?.dateReglement ? formatDate(appel.dateReglement) : '',
        ]
      }),
      formatMontant(payeLot),
      formatMontant(lot.prixTTC - payeLot),
    ]
  })

  // Trois lignes de total (même principe que le pied de tableau "Lots") :
  // TTC (montants réellement émis), TVA, puis HT = TTC / (1 + taux) —
  // calculées en nombres bruts, formatées seulement à la fin (jamais en
  // reparsant un texte déjà formaté, plus fiable).
  const totauxTTCParPhase = phasesTriees.map((phase) =>
    appels
      .filter((a) => a.phase.nom === phase.nom && a.dateEmission)
      .reduce((s, a) => s + a.montant, 0),
  )
  function construireLigneTotal(
    libelle,
    montantPrixTTC,
    montantsParPhase,
    montantPaye,
    montantReste,
  ) {
    return [
      libelle,
      '',
      formatMontant(montantPrixTTC),
      ...montantsParPhase.flatMap((montant) => [formatMontant(montant), '']),
      formatMontant(montantPaye),
      formatMontant(montantReste),
    ]
  }
  const ligneTTC = construireLigneTotal(
    'Montant total TTC',
    totalPrixTTCRecap,
    totauxTTCParPhase,
    totalPaye,
    soldeRestant,
  )
  const ligneHT = construireLigneTotal(
    'Montant total HT',
    totalPrixTTCRecap / (1 + tauxTva),
    totauxTTCParPhase.map((m) => m / (1 + tauxTva)),
    totalPaye / (1 + tauxTva),
    soldeRestant / (1 + tauxTva),
  )
  const ligneTVA = construireLigneTotal(
    `TVA (${Math.round(tauxTva * 100)}%)`,
    totalPrixTTCRecap - totalPrixTTCRecap / (1 + tauxTva),
    totauxTTCParPhase.map((m) => m - m / (1 + tauxTva)),
    totalPaye - totalPaye / (1 + tauxTva),
    soldeRestant - soldeRestant / (1 + tauxTva),
  )

  return {
    nomFichier: `appels-de-fonds-detail-par-phase-${programme.nom}`,
    titre: `Récapitulatif détaillé par phase — ${programme.nom}`,
    entetes,
    lignes,
    lignesTotal: [ligneTTC, ligneTVA, ligneHT],
    // Beaucoup de colonnes (2 par phase du barème) : sur ce modèle précis
    // (voir PDF fourni par Nicolas), tout doit tenir sur une seule page
    // PDF plutôt que se répartir sur plusieurs pages côte à côte comme
    // les autres exports (ex: Lots) — voir `pageUnique` dans export.js.
    pageUnique: true,
    // Colonne "Client" (index 1) plafonnée à 40mm — sans ça elle recevait
    // toute la place restante de la page (remarque de Nicolas : "très
    // large"). Un nom plus long que ce plafond revient alors à la ligne,
    // seul cas encore permis avec les en-têtes.
    largeursMax: { 1: 40 },
  }
}
