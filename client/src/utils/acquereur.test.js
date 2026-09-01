import { describe, it, expect } from 'vitest'
import { nomAcquereur } from './acquereur.js'

describe('nomAcquereur', () => {
  it('renvoie un tiret cadratin si l\'acquéreur est absent (null/undefined)', () => {
    expect(nomAcquereur(null)).toBe('—')
    expect(nomAcquereur(undefined)).toBe('—')
  })

  it('assemble civilité, prénom et nom séparés par un espace', () => {
    expect(nomAcquereur({ civilite: 'M.', prenom: 'Nicolas', nom: 'Cazalis' })).toBe('M. Nicolas Cazalis')
  })

  it('n\'ajoute pas de double espace si le prénom est absent', () => {
    expect(nomAcquereur({ civilite: 'M. et Mme', prenom: '', nom: 'Duprat' })).toBe('M. et Mme Duprat')
  })

  it('n\'ajoute pas de double espace si la civilité est absente', () => {
    expect(nomAcquereur({ prenom: 'Nicolas', nom: 'Cazalis' })).toBe('Nicolas Cazalis')
  })
})
