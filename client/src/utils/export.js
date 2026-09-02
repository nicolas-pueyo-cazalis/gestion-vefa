// Exports Excel/PDF (20/07/2026, chantier des exports, point 189) :
// génération entièrement côté navigateur, à partir des données déjà
// chargées/filtrées par la page — pas de route serveur dédiée par export
// (voir docs/decisions.md). Deux fonctions génériques réutilisables par
// n'importe quelle page.
//
// Un export a un titre général, et une ou plusieurs "sections" (ex:
// l'historique a "Ventes annulées" ET "Modifications de prix" dans le
// même fichier) — chacune avec son propre sous-titre, en-têtes, lignes,
// et totaux optionnels. `{ entetes, lignes, totaux }` fournis directement
// (sans `sections`) est un raccourci pour un export à une seule section
// sans sous-titre, le cas le plus courant.
//
// Deux formes de totaux, pour deux besoins différents :
// - `totaux` : liste `[libelle, valeur]` affichée SOUS le tableau (ex:
//   "Total TTC : 2 487 000 €"), pour un résumé rapide sans rapport avec les
//   colonnes du tableau.
// - `lignesTotal` (21/07/2026, remarque de Nicolas) : une ou plusieurs
//   lignes complètes, alignées sous chaque colonne (même nombre de
//   cellules que `entetes`), ajoutées EN BAS du tableau lui-même plutôt
//   qu'à part — pour un vrai "total par colonne" (ex: Prix TTC total,
//   Total payé total... directement sous les colonnes correspondantes).
//
// Excel via `exceljs` (remplace `xlsx`/SheetJS le jour même, à la demande
// de Nicolas) : contrairement à `xlsx` en version gratuite, `exceljs` sait
// vraiment ÉCRIRE de la mise en forme (gras, couleurs, largeurs de
// colonnes, lignes figées), pas seulement des données brutes.
import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatMontant } from './formatMontant.js'
import { formatDate } from './statuts.js'

// Couleur d'en-tête ≈ $couleur-texte (main.scss), en ARGB (format attendu
// par exceljs : 2 chiffres d'opacité + 6 chiffres de couleur).
const COULEUR_ENTETE = 'FF1F2933'

// Bug découvert le 21/07/2026 (tableau détaillé par phase, appels de
// fonds) : l'espace insécable utilisé par `Intl.NumberFormat('fr-FR')`
// entre les milliers ("245 000 €") n'existe pas dans la police "helvetica"
// intégrée à jsPDF — il s'affichait comme un "/" au lieu d'un espace.
// Remplacé par un espace normal, uniquement pour le PDF (Excel et l'écran
// n'ont pas ce problème, `formatMontant` reste inchangé partout ailleurs).
export function nettoyerPourPdf(valeur) {
  if (typeof valeur !== 'string') return valeur
  return valeur.replace(/[  ]/g, ' ')
}

// Normalise les données reçues vers un tableau de sections, pour que le
// reste du code n'ait qu'une seule forme à traiter.
function versSections({ sections, sousTitre, entetes, lignes, totaux, lignesTotal, stylesLignes }) {
  return sections ?? [{ sousTitre, entetes, lignes, totaux, lignesTotal, stylesLignes }]
}

// `exceljs` ne fournit pas de raccourci "télécharger dans le navigateur"
// (contrairement à `xlsx`) : il ne fait que construire le fichier en
// mémoire (`writeBuffer`) — le déclenchement du téléchargement se fait à
// la main, via un lien `<a download>` temporaire.
function telechargerBlob(contenu, nomFichier, type) {
  const blob = new Blob([contenu], { type })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomFichier
  lien.click()
  URL.revokeObjectURL(url)
}

export async function exporterExcel(donnees) {
  const { nomFichier, titre } = donnees
  const sections = versSections(donnees)

  const classeur = new ExcelJS.Workbook()
  const feuille = classeur.addWorksheet('Export')

  const largeurMax = Math.max(...sections.map((s) => s.entetes.length))
  const ligneTitre = feuille.addRow([titre])
  ligneTitre.font = { bold: true, size: 14 }
  feuille.mergeCells(1, 1, 1, largeurMax)
  feuille.addRow([])

  let ligneFigeApres = null // ySplit calculé une seule fois, sur la 1ère section

  sections.forEach(
    ({ sousTitre, entetes, lignes, totaux, lignesTotal, stylesLignes }, indexSection) => {
      if (sousTitre) {
        const ligneSousTitre = feuille.addRow([sousTitre])
        ligneSousTitre.font = { bold: true, size: 12 }
        feuille.mergeCells(feuille.rowCount, 1, feuille.rowCount, largeurMax)
      }

      const ligneEntetes = feuille.addRow(entetes)
      ligneEntetes.eachCell((cellule) => {
        cellule.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cellule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COULEUR_ENTETE } }
      })
      if (indexSection === 0) ligneFigeApres = feuille.rowCount

      lignes.forEach((ligne, i) => {
        const nouvelleLigne = feuille.addRow(ligne)
        // Alignement en haut (pas centré verticalement) : une cellule
        // "Annexes" peut contenir plusieurs lignes de texte (\n), affichées
        // proprement seulement avec `wrapText`.
        nouvelleLigne.alignment = { vertical: 'top', wrapText: true }
        // `stylesLignes` (21/07/2026, export détail entreprises des TMA) :
        // certaines lignes doivent ressortir visuellement du lot (la ligne
        // "demande" en gras scelle la demande, les lignes "entreprise" en
        // italique les distinguent) — tableau parallèle à `lignes`, un style
        // optionnel par ligne ('gras' | 'italique').
        const style = stylesLignes?.[i]
        const policeLigne =
          style === 'gras' ? { bold: true } : style === 'italique' ? { italic: true } : null
        if (policeLigne) nouvelleLigne.font = policeLigne
        // "En retard" toujours en rouge (21/07/2026, remarque de Nicolas),
        // quelle que soit la ligne — combiné au style de la ligne (gras ou
        // italique) plutôt que de l'écraser.
        ligne.forEach((valeur, colIndex) => {
          if (valeur === 'En retard') {
            nouvelleLigne.getCell(colIndex + 1).font = {
              ...policeLigne,
              color: { argb: 'FFDC2626' },
            }
          }
        })
      })

      lignesTotal?.forEach((ligne) => {
        const nouvelleLigne = feuille.addRow(ligne)
        nouvelleLigne.font = { bold: true }
        nouvelleLigne.eachCell((cellule) => {
          cellule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F6' } }
        })
      })

      if (totaux?.length > 0) {
        feuille.addRow([])
        totaux.forEach(([libelle, valeur]) => {
          feuille.addRow([libelle, valeur]).font = { bold: true }
        })
      }

      // Ligne vide entre deux sections.
      if (indexSection < sections.length - 1) feuille.addRow([])

      // Largeur de chaque colonne ≈ le texte le plus long qu'elle contient
      // (en-tête compris), plafonnée pour ne pas produire une colonne
      // démesurée à cause d'un commentaire très long. Prend le plus grand
      // besoin toutes sections confondues (une seule feuille, mêmes colonnes).
      entetes.forEach((entete, i) => {
        const colonne = feuille.getColumn(i + 1)
        let plusLongue = Math.max(entete.length, colonne.width ?? 0)
        for (const ligne of [...lignes, ...(lignesTotal ?? [])]) {
          const texte = String(ligne[i] ?? '')
          for (const sousLigne of texte.split('\n')) {
            plusLongue = Math.max(plusLongue, sousLigne.length)
          }
        }
        colonne.width = Math.min(plusLongue + 2, 40)
      })
    },
  )

  // Fige titre + ligne vide + en-têtes de la 1ère section : elles restent
  // visibles en défilant dans un tableau long, comme un en-tête HTML.
  feuille.views = [{ state: 'frozen', ySplit: ligneFigeApres }]

  const contenu = await classeur.xlsx.writeBuffer()
  telechargerBlob(
    contenu,
    `${nomFichier}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
}

// `pageUnique` (21/07/2026, remarque de Nicolas : le récap détaillé par
// phase doit tenir sur une seule page PDF, sans retour à la ligne dans les
// cellules de données) : calcule pour chaque colonne une largeur qui colle
// exactement à son contenu le plus long (mesuré avec la vraie police de
// jsPDF, pas une estimation) — assez pour ne jamais avoir besoin de
// revenir à la ligne. Sans ce calcul, jspdf-autotable donne tout le reste
// de la place à la 1ère colonne sans largeur explicite (bug constaté :
// "Client" s'étirait sur toute la place libre) — `largeursMax` (ex:
// `{ 1: 40 }` pour "Client") plafonne certaines colonnes à une largeur
// raisonnable ; le texte plus long que ce plafond revient alors à la
// ligne (seul cas où c'est encore permis, comme les en-têtes).
export function calculerLargeursColonnesFigees(
  doc,
  { entetes, lignes, lignesTotal },
  { fontSize, cellPadding, largeursMax, margeHorizontale },
) {
  doc.setFontSize(fontSize)
  const largeurs = entetes.map((_, i) => {
    const cellules = [...lignes, ...(lignesTotal ?? [])].map((ligne) => String(ligne[i] ?? ''))
    const largeurMax = Math.max(
      0,
      ...cellules.map((texte) => doc.getTextWidth(nettoyerPourPdf(texte))),
    )
    // Plancher à 10mm : évite une colonne ridiculement étroite quand toutes
    // les cellules sont vides (ex: une phase jamais émise pour aucun lot).
    let largeur = Math.max(largeurMax + cellPadding * 2 + 1, 10)
    if (largeursMax?.[i]) largeur = Math.min(largeur, largeursMax[i])
    return largeur
  })

  // Le tableau doit occuper toute la largeur de la page (remarque de
  // Nicolas : pas juste tenir dedans avec du vide à droite) — la place
  // restante entre la somme des largeurs "au plus juste" ci-dessus et la
  // largeur imprimable est redistribuée à TOUTES les colonnes au prorata
  // de leur propre largeur (chacune grandit un peu, pas seulement une
  // colonne en particulier comme la 1ère tentative).
  const largeurImprimable = doc.internal.pageSize.getWidth() - margeHorizontale * 2
  const sommeLargeurs = largeurs.reduce((s, l) => s + l, 0)
  const supplement = Math.max(largeurImprimable - sommeLargeurs, 0)

  const styles = {}
  largeurs.forEach((largeur, i) => {
    styles[i] = { cellWidth: largeur + supplement * (largeur / sommeLargeurs) }
  })
  return styles
}

export function exporterPDF(donnees) {
  // Courrier d'appel de fonds (20/07/2026) / devis TMA (21/07/2026) : mise
  // en page fixe (document), pas un tableau — délégué à une fonction
  // dédiée plutôt que forcé dans le moule "en-têtes + lignes" du reste de
  // ce fichier.
  if (donnees.typeCourrier) return exporterCourrierAppelDeFonds(donnees)
  if (donnees.typeDevis) return exporterDevisTma(donnees)

  const { nomFichier, titre, pageUnique, largeursMax } = donnees
  const sections = versSections(donnees)

  // Paysage : la plupart des tableaux de l'appli ont beaucoup de colonnes
  // (ex: Lots), une page portrait les aurait rendues illisibles.
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(nettoyerPourPdf(titre), 14, 15)

  let y = 20

  sections.forEach(({ sousTitre, entetes, lignes, totaux, lignesTotal, stylesLignes }) => {
    if (sousTitre) {
      doc.setFontSize(12)
      doc.text(nettoyerPourPdf(sousTitre), 14, y)
      y += 6
    }

    autoTable(doc, {
      head: [entetes.map(nettoyerPourPdf)],
      body: lignes.map((ligne) => ligne.map(nettoyerPourPdf)),
      // `lignesTotal` (21/07/2026) : lignes de total alignées sous chaque
      // colonne, distinguées visuellement du corps par `footStyles`
      // (même couleur claire que la classe CSS `tfoot td` à l'écran).
      foot: lignesTotal?.map((ligne) => ligne.map(nettoyerPourPdf)),
      startY: y,
      // `stylesLignes` (21/07/2026, export détail entreprises des TMA) :
      // même principe que côté Excel — une ligne "demande" en gras, une
      // ligne "entreprise" en italique, pour les distinguer visuellement
      // sans colonne supplémentaire.
      didParseCell(data) {
        if (data.section !== 'body') return
        const style = stylesLignes?.[data.row.index]
        if (style === 'gras') data.cell.styles.fontStyle = 'bold'
        if (style === 'italique') data.cell.styles.fontStyle = 'italic'
        // "En retard" toujours en rouge (21/07/2026, remarque de Nicolas),
        // combiné au style de la ligne ci-dessus plutôt que de l'écraser.
        if (data.cell.raw === 'En retard') data.cell.styles.textColor = [220, 38, 38]
      },
      // Marge explicite (21/07/2026) : pour que le tableau occupe bien
      // toute la largeur imprimable calculée ci-dessous (`largeurImprimable`
      // dans `calculerLargeursColonnesFigees`), la marge réellement
      // utilisée par autoTable doit être la même que celle du calcul —
      // sinon l'un des deux déborde ou laisse du vide.
      margin: { left: 14, right: 14 },
      // `pageUnique` (21/07/2026, remarque de Nicolas sur le récap détaillé
      // par phase) : police et marges réduites pour aider à tenir sur une
      // seule page — voir aussi `horizontalPageBreak` et `columnStyles`
      // plus bas.
      styles: pageUnique
        ? { fontSize: 5.5, cellPadding: 0.75, overflow: 'linebreak' }
        : { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: pageUnique
        ? calculerLargeursColonnesFigees(
            doc,
            { entetes, lignes, lignesTotal },
            { fontSize: 5.5, cellPadding: 0.75, largeursMax, margeHorizontale: 14 },
          )
        : undefined,
      // `textColor`/`fontStyle` explicites (pas seulement `fillColor`) :
      // sans ça, l'en-tête ne se distinguait pas visuellement du corps du
      // tableau, malgré le fond sombre demandé.
      headStyles: { fillColor: [31, 41, 51], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [238, 242, 246], textColor: [31, 41, 51], fontStyle: 'bold' },
      // Un tableau à beaucoup de colonnes (13 sur Lots) dépasse la largeur
      // d'une page — plutôt que de laisser le texte déborder/se faire
      // couper, ce réglage répartit les colonnes en trop sur des pages
      // supplémentaires, avec la 1ère colonne répétée sur chacune pour
      // garder le repère "quel lot". Désactivé pour `pageUnique` : dans ce
      // cas on veut au contraire forcer une seule page — jspdf-autotable
      // compresse alors automatiquement la largeur des colonnes pour tenir
      // dans la page, plutôt que d'en créer d'autres à côté.
      horizontalPageBreak: !pageUnique,
      horizontalPageBreakRepeat: 0,
    })
    y = doc.lastAutoTable.finalY + 8

    if (totaux?.length > 0) {
      doc.setFontSize(10)
      for (const [libelle, valeur] of totaux) {
        doc.text(nettoyerPourPdf(`${libelle} : ${valeur}`), 14, y)
        y += 6
      }
      y += 4
    }
  })

  doc.save(`${nomFichier}.pdf`)
}

// Date en toutes lettres ("12 août 2026"), pas "12/08/2026" — attendu sur
// un courrier adressé au client (20/07/2026, courrier appel de fonds),
// contrairement au reste de l'appli qui utilise formatDate partout
// (utils/statuts.js), plus adapté à un tableau qu'à une lettre.
function formatDateLongue(date) {
  if (!date) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

// Courrier d'appel de fonds (20/07/2026, remarque de Nicolas — modèle
// fourni) : PDF uniquement (pas d'équivalent Excel utile pour une lettre,
// exception au principe "Excel + PDF partout", voir docs/decisions.md).
// Une lettre a une mise en page fixe, pas un tableau — construite ligne
// par ligne avec jsPDF directement, plutôt que via autoTable comme les
// autres exports.
function exporterCourrierAppelDeFonds({
  nomFichier,
  promoteur,
  numeroAppel,
  phaseNom,
  programmeNom,
  lotReference,
  acquereurNom,
  prixVente,
  dateAttestation,
  lignesPhases,
  montantARegler,
  dateLimite,
  iban,
  bic,
}) {
  const doc = new jsPDF() // portrait
  const marge = 20
  const largeurPage = doc.internal.pageSize.getWidth()
  const largeurUtile = largeurPage - marge * 2
  let y = 20

  function ligneHorizontale() {
    y += 4
    doc.setDrawColor(200)
    doc.line(marge, y, largeurPage - marge, y)
    y += 10
  }

  function champ(libelle, valeur, { gras = false, taille = 11 } = {}) {
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(libelle, marge, y)
    y += 5
    doc.setFontSize(taille)
    doc.setTextColor(0)
    doc.setFont('helvetica', gras ? 'bold' : 'normal')
    doc.text(nettoyerPourPdf(valeur) || '—', marge, y)
    doc.setFont('helvetica', 'normal')
    y += 8
  }

  // En-tête : nom du promoteur, centré.
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(promoteur || '—', largeurPage / 2, y, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  y += 6
  ligneHorizontale()

  champ('Objet :', `Appel de fonds n°${numeroAppel}`, { gras: true, taille: 13 })
  y -= 4 // rapproche la ligne "phase" du titre "Appel de fonds n°X"
  doc.setFontSize(11)
  doc.text(phaseNom, marge, y)
  y += 10

  champ('Programme :', programmeNom)
  champ('Lot :', lotReference)
  champ('Acquéreur :', acquereurNom)
  champ('Prix de vente TTC', formatMontant(prixVente, 0), { gras: true })

  ligneHorizontale()

  doc.setFontSize(11)
  const paragraphe = doc.splitTextToSize(
    `Conformément à l'attestation du Maître d'Œuvre du ${formatDateLongue(dateAttestation)}, ` +
      "nous vous prions de trouver ci-dessous l'appel de fonds correspondant.",
    largeurUtile,
  )
  doc.text(paragraphe, marge, y)
  y += paragraphe.length * 6 + 6

  // Tableau des phases (Phase / % / Montant), sans le fond sombre des
  // autres exports : ce document est une lettre, pas un tableau de
  // données à parcourir — un simple alignement en colonnes suffit.
  doc.setFont('helvetica', 'bold')
  doc.text('Phase', marge, y)
  doc.text('%', marge + 90, y)
  doc.text('Montant', largeurPage - marge, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  y += 3
  doc.line(marge, y, largeurPage - marge, y)
  y += 7
  for (const [nomPhase, pourcentage, montantOuRegle] of lignesPhases) {
    doc.text(nomPhase, marge, y)
    doc.text(`${pourcentage} %`, marge + 90, y)
    doc.text(nettoyerPourPdf(montantOuRegle), largeurPage - marge, y, { align: 'right' })
    y += 7
  }

  ligneHorizontale()

  champ('Montant à régler', formatMontant(montantARegler, 0), { gras: true, taille: 16 })
  champ('Avant le :', formatDateLongue(dateLimite), { gras: true })

  ligneHorizontale()

  champ('IBAN', iban)
  champ('BIC', bic)
  champ('Référence virement', '')

  doc.save(`${nomFichier}.pdf`)
}

// Devis client TMA (21/07/2026, remarque de Nicolas — modèle fourni) : PDF
// uniquement (comme le courrier d'appel de fonds, pas d'équivalent Excel
// utile pour un document à faire signer). `numeroDevis` est réservé côté
// serveur AVANT l'appel à cette fonction (POST /api/tma/:id/devis-numero,
// compteur par programme et par année) — jamais recalculé ici. Un même
// devis peut regrouper PLUSIEURS demandes d'un même logement (choisies à
// cocher dans la fenêtre de génération) — `lignesDemandes`, un tableau
// même s'il n'y en a qu'une.
function exporterDevisTma({
  nomFichier,
  numeroDevis,
  dateGeneration,
  clientNom,
  maitreOuvrageNom,
  programmeNom,
  lotReference,
  lignesDemandes,
  tauxTva,
}) {
  const doc = new jsPDF() // portrait
  const marge = 20
  const largeurPage = doc.internal.pageSize.getWidth()
  const largeurUtile = largeurPage - marge * 2
  let y = 20

  function barreTitreSection(texte) {
    doc.setFillColor(230, 233, 237)
    doc.rect(marge, y - 4.5, largeurUtile, 7, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(texte, marge + 2, y)
    doc.setFont('helvetica', 'normal')
    y += 12
  }

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('DEVIS - TRAVAUX MODIFICATIFS ACQUÉREURS (TMA)', largeurPage / 2, y, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  y += 12

  doc.setFontSize(10)
  doc.text(`Devis n° : ${numeroDevis}`, marge, y)
  doc.text(`Date : ${formatDateLongue(dateGeneration)}`, largeurPage - marge, y, { align: 'right' })
  y += 12

  barreTitreSection('1. INFORMATIONS GÉNÉRALES')

  const colonneDroite = marge + largeurUtile / 2
  doc.setFontSize(10)
  doc.text('Client (acquéreur)', marge, y)
  doc.text("Maître d'ouvrage", colonneDroite, y)
  y += 6
  doc.text(`Nom : ${nettoyerPourPdf(clientNom) || '—'}`, marge, y)
  doc.text(`Nom : ${nettoyerPourPdf(maitreOuvrageNom) || '—'}`, colonneDroite, y)
  y += 10

  doc.text(`Programme : ${nettoyerPourPdf(programmeNom) || '—'}`, marge, y)
  y += 6
  doc.text(`Lot : ${lotReference || '—'}`, marge, y)
  y += 12

  barreTitreSection('2. OBJET DU DEVIS')

  doc.setFontSize(9)
  const paragraphe = doc.splitTextToSize(
    "Travaux modificatifs demandés par l'acquéreur dans le cadre de l'opération en VEFA, " +
      'conformément aux plans et descriptifs initiaux.',
    largeurUtile,
  )
  doc.text(paragraphe, marge, y)
  y += paragraphe.length * 5 + 6

  const montantTotalTTC = lignesDemandes.reduce((s, l) => s + l.montantTTC, 0)
  const montantHT = montantTotalTTC / (1 + tauxTva)
  const montantTVA = montantTotalTTC - montantHT

  autoTable(doc, {
    head: [['N°TMA', 'Date de la demande', 'Désignation', 'Montant TTC (€)']],
    body: lignesDemandes.map((l) => [
      String(l.numeroDemande),
      formatDate(l.dateDemande),
      nettoyerPourPdf(l.designation) || '—',
      nettoyerPourPdf(formatMontant(l.montantTTC)),
    ]),
    startY: y,
    margin: { left: marge, right: marge },
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [31, 41, 51], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 3: { halign: 'right' } },
  })
  y = doc.lastAutoTable.finalY + 10

  doc.setFontSize(10)
  for (const [libelle, valeur] of [
    ['Total HT', formatMontant(montantHT)],
    [`TVA (${Math.round(tauxTva * 100)}%)`, formatMontant(montantTVA)],
    ['Total TTC', formatMontant(montantTotalTTC)],
  ]) {
    doc.setFont('helvetica', 'bold')
    doc.text(nettoyerPourPdf(`${libelle} : ${valeur}`), largeurPage - marge, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 6
  }
  y += 10

  doc.setFontSize(10)
  doc.text('Validation du devis', marge, y)
  y += 12
  doc.text('Date :', marge, y)
  y += 12
  doc.text('Signature :', marge, y)

  doc.save(`${nomFichier}.pdf`)
}
