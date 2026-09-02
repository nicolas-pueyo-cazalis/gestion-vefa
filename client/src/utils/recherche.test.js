import { describe, it, expect } from 'vitest'
import { correspondRecherche } from './recherche.js'

describe('correspondRecherche', () => {
  it('renvoie true pour une requête vide (aucun filtre)', () => {
    expect(correspondRecherche('Lot A01', '')).toBe(true)
    expect(correspondRecherche('Lot A01', '   ')).toBe(true)
  })

  it('trouve un mot présent quelle que soit la casse', () => {
    expect(correspondRecherche('Lot A01 — Dupont', 'dupont')).toBe(true)
    expect(correspondRecherche('Lot A01 — Dupont', 'DUPONT')).toBe(true)
  })

  it("exige que TOUS les mots de la requête soient présents, dans n'importe quel ordre", () => {
    expect(correspondRecherche('Lot A01 — Dupont', 'dupont a01')).toBe(true)
    expect(correspondRecherche('Lot A01 — Dupont', 'dupont a02')).toBe(false)
  })

  it('ignore les accents (le texte ET la requête)', () => {
    expect(correspondRecherche('Dépré', 'depre')).toBe(true)
    expect(correspondRecherche('Depre', 'dépré')).toBe(true)
  })

  it('ignore les espaces, y compris insécables, dans un montant formaté', () => {
    // espace insécable (U+00A0), comme produit par Intl.NumberFormat('fr-FR')
    expect(correspondRecherche('5 444,00 €', '5444')).toBe(true)
    expect(correspondRecherche('5 444,00 €', '5 444')).toBe(true)
  })

  it('fait correspondre un point décimal tapé au clavier à la virgule affichée', () => {
    expect(correspondRecherche('45,00 m²', '45.00')).toBe(true)
  })

  it('ne trouve rien si un des mots est absent', () => {
    expect(correspondRecherche('Lot A01 — Dupont', 'martin')).toBe(false)
  })
})
