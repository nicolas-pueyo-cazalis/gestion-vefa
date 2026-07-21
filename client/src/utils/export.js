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
// Excel via `exceljs` (remplace `xlsx`/SheetJS le jour même, à la demande
// de Nicolas) : contrairement à `xlsx` en version gratuite, `exceljs` sait
// vraiment ÉCRIRE de la mise en forme (gras, couleurs, largeurs de
// colonnes, lignes figées), pas seulement des données brutes.
import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Couleur d'en-tête ≈ $couleur-texte (main.scss), en ARGB (format attendu
// par exceljs : 2 chiffres d'opacité + 6 chiffres de couleur).
const COULEUR_ENTETE = 'FF1F2933'

// Normalise les données reçues vers un tableau de sections, pour que le
// reste du code n'ait qu'une seule forme à traiter.
function versSections({ sections, sousTitre, entetes, lignes, totaux }) {
  return sections ?? [{ sousTitre, entetes, lignes, totaux }]
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

  sections.forEach(({ sousTitre, entetes, lignes, totaux }, indexSection) => {
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

    lignes.forEach((ligne) => {
      const nouvelleLigne = feuille.addRow(ligne)
      // Alignement en haut (pas centré verticalement) : une cellule
      // "Annexes" peut contenir plusieurs lignes de texte (\n), affichées
      // proprement seulement avec `wrapText`.
      nouvelleLigne.alignment = { vertical: 'top', wrapText: true }
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
      for (const ligne of lignes) {
        const texte = String(ligne[i] ?? '')
        for (const sousLigne of texte.split('\n')) {
          plusLongue = Math.max(plusLongue, sousLigne.length)
        }
      }
      colonne.width = Math.min(plusLongue + 2, 40)
    })
  })

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

export function exporterPDF(donnees) {
  const { nomFichier, titre } = donnees
  const sections = versSections(donnees)

  // Paysage : la plupart des tableaux de l'appli ont beaucoup de colonnes
  // (ex: Lots), une page portrait les aurait rendues illisibles.
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(titre, 14, 15)

  let y = 20

  sections.forEach(({ sousTitre, entetes, lignes, totaux }) => {
    if (sousTitre) {
      doc.setFontSize(12)
      doc.text(sousTitre, 14, y)
      y += 6
    }

    autoTable(doc, {
      head: [entetes],
      body: lignes,
      startY: y,
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      // `textColor`/`fontStyle` explicites (pas seulement `fillColor`) :
      // sans ça, l'en-tête ne se distinguait pas visuellement du corps du
      // tableau, malgré le fond sombre demandé.
      headStyles: { fillColor: [31, 41, 51], textColor: [255, 255, 255], fontStyle: 'bold' },
      // Un tableau à beaucoup de colonnes (13 sur Lots) dépasse la largeur
      // d'une page — plutôt que de laisser le texte déborder/se faire
      // couper, ce réglage répartit les colonnes en trop sur des pages
      // supplémentaires, avec la 1ère colonne répétée sur chacune pour
      // garder le repère "quel lot".
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
    })
    y = doc.lastAutoTable.finalY + 8

    if (totaux?.length > 0) {
      doc.setFontSize(10)
      for (const [libelle, valeur] of totaux) {
        doc.text(`${libelle} : ${valeur}`, 14, y)
        y += 6
      }
      y += 4
    }
  })

  doc.save(`${nomFichier}.pdf`)
}
