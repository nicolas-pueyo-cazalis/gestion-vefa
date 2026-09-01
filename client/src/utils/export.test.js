import { describe, it, expect } from 'vitest'
import { nettoyerPourPdf } from './export.js'

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

  it('remplace un espace fine insécable (U+202F, séparateur de milliers d\'Intl.NumberFormat) par un espace normal', () => {
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
