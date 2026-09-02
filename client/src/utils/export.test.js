import { describe, it, expect, vi } from 'vitest'
import { nettoyerPourPdf, calculerLargeursColonnesFigees } from './export.js'

// U+00A0 (espace insécable) et U+202F (espace fine insécable, séparateur de
// milliers d'Intl.NumberFormat('fr-FR')) — construits explicitement via
// \u pour éviter toute ambiguïté de caractère invisible dans le fichier.
const ESPACE_INSECABLE = ' '
const ESPACE_FINE_INSECABLE = ' '

describe('nettoyerPourPdf', () => {
  it('remplace un espace insécable (U+00A0) par un espace normal', () => {
    const avec = `245${ESPACE_INSECABLE}000${ESPACE_INSECABLE}€`
    expect(nettoyerPourPdf(avec)).toBe('245 000 €')
  })

  it("remplace un espace fine insécable (U+202F, séparateur de milliers d'Intl.NumberFormat) par un espace normal", () => {
    const avec = `245${ESPACE_FINE_INSECABLE}000${ESPACE_FINE_INSECABLE}€`
    expect(nettoyerPourPdf(avec)).toBe('245 000 €')
  })

  it('laisse une chaîne sans espace insécable inchangée', () => {
    expect(nettoyerPourPdf('Réservation')).toBe('Réservation')
  })

  it('renvoie une valeur non-string telle quelle, sans planter (null, undefined, nombre)', () => {
    expect(nettoyerPourPdf(null)).toBeNull()
    expect(nettoyerPourPdf(undefined)).toBeUndefined()
    expect(nettoyerPourPdf(245000)).toBe(245000)
  })
})

// Simule un objet jsPDF minimal — la fonction n'a besoin que de ces 3
// points d'API, pas la peine d'une vraie instance jsPDF pour ce test.
// getTextWidth déterministe (longueur × 2) pour prédire des largeurs
// exactes dans les assertions plutôt que de dépendre du rendu réel d'une
// police.
function creerDocSimule(largeurPage = 297) {
  return {
    setFontSize: vi.fn(),
    getTextWidth: vi.fn((texte) => texte.length * 2),
    internal: { pageSize: { getWidth: () => largeurPage } },
  }
}

const OPTIONS_BASE = { fontSize: 8, cellPadding: 2, margeHorizontale: 14 }

describe('calculerLargeursColonnesFigees', () => {
  it("applique un plancher de 10mm quand toutes les cellules d'une colonne sont vides", () => {
    const doc = creerDocSimule()
    const styles = calculerLargeursColonnesFigees(
      doc,
      { entetes: ['Vide'], lignes: [[''], ['']], lignesTotal: null },
      OPTIONS_BASE,
    )
    expect(styles[0].cellWidth).toBeGreaterThanOrEqual(10)
  })

  it('mesure aussi les cellules de la ligne de total, pas seulement les lignes de données', () => {
    const doc = creerDocSimule()
    calculerLargeursColonnesFigees(
      doc,
      { entetes: ['Montant'], lignes: [['10']], lignesTotal: [['Total : 999999999']] },
      OPTIONS_BASE,
    )
    // La cellule de total est la plus longue — doit avoir été mesurée.
    expect(doc.getTextWidth).toHaveBeenCalledWith('Total : 999999999')
  })

  it('nettoie chaque cellule (espaces insécables) avant de la mesurer', () => {
    const doc = creerDocSimule()
    const avecEspaceInsecable = `1${ESPACE_INSECABLE}000`
    calculerLargeursColonnesFigees(
      doc,
      { entetes: ['Montant'], lignes: [[avecEspaceInsecable]], lignesTotal: null },
      OPTIONS_BASE,
    )
    expect(doc.getTextWidth).toHaveBeenCalledWith('1 000') // espace normal, pas insécable
  })

  it('la somme des largeurs finales occupe exactement la largeur imprimable (page − marges)', () => {
    const doc = creerDocSimule(297) // A4 paysage
    const styles = calculerLargeursColonnesFigees(
      doc,
      { entetes: ['Col1', 'Col2'], lignes: [['A', 'BBBBB']], lignesTotal: null },
      OPTIONS_BASE,
    )
    const sommeFinale = styles[0].cellWidth + styles[1].cellWidth
    expect(sommeFinale).toBeCloseTo(297 - 14 * 2, 5) // 269mm
  })

  it('largeursMax plafonne la largeur de base, mais la colonne peut quand même dépasser ce plafond après redistribution du surplus', () => {
    const doc = creerDocSimule(297)
    const styles = calculerLargeursColonnesFigees(
      doc,
      {
        entetes: ['Col1', 'Client'],
        lignes: [['A', 'Un nom de client très très long']],
        lignesTotal: null,
      },
      { ...OPTIONS_BASE, largeursMax: { 1: 12 } },
    )
    // Sans plafond, "Client" (colonne 1) aurait une largeur de base bien
    // supérieure à 12 — le plafond limite la largeur DE DÉPART, mais la
    // redistribution proportionnelle du surplus s'applique ensuite à
    // toutes les colonnes, y compris celle-ci.
    expect(styles[1].cellWidth).toBeGreaterThan(12)
    const sommeFinale = styles[0].cellWidth + styles[1].cellWidth
    expect(sommeFinale).toBeCloseTo(297 - 14 * 2, 5)
  })
})
