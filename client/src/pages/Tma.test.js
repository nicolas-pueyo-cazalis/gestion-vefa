import { describe, it, expect } from 'vitest'
import { tmaObsolete, texteRechercheTma } from './Tma.jsx'

describe('tmaObsolete', () => {
  it("faux si l'acquéreur actuel du lot est le même que celui de la TMA", () => {
    const tma = { lot: { acquereur: { _id: 'a1' } }, acquereur: { _id: 'a1' } }
    expect(tmaObsolete(tma)).toBe(false)
  })

  it('vrai si le lot est repassé "Libre" (plus d\'acquéreur actuel)', () => {
    const tma = { lot: { acquereur: null }, acquereur: { _id: 'a1' } }
    expect(tmaObsolete(tma)).toBe(true)
  })

  it('vrai si le lot a été revendu à un autre acquéreur', () => {
    const tma = { lot: { acquereur: { _id: 'a2' } }, acquereur: { _id: 'a1' } }
    expect(tmaObsolete(tma)).toBe(true)
  })
})

describe('texteRechercheTma', () => {
  it('inclut la référence du lot, le client et le statut', () => {
    const tma = {
      lot: { reference: 'A01', acquereur: { _id: 'a1' } },
      acquereur: { _id: 'a1', civilite: 'M.', prenom: 'Nicolas', nom: 'Cazalis' },
      dateDemande: '2026-06-01',
      localisation: 'Cuisine',
      description: 'Ajout de prise',
      statut: 'etude',
    }
    const texte = texteRechercheTma(tma)
    expect(texte).toContain('A01')
    expect(texte).toContain('Nicolas Cazalis')
    expect(texte).toContain('Étude')
  })

  it("n'inclut pas le nom du client d'origine si la TMA est obsolète", () => {
    const tma = {
      lot: { reference: 'A01', acquereur: null },
      acquereur: { _id: 'a1', civilite: 'M.', prenom: 'Nicolas', nom: 'Cazalis' },
      statut: 'etude',
    }
    expect(texteRechercheTma(tma)).not.toContain('Nicolas Cazalis')
  })
})
