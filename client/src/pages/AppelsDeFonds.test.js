import { describe, it, expect } from 'vitest'
import { texteRechercheAppel } from './AppelsDeFonds.jsx'

describe('texteRechercheAppel', () => {
  it('inclut la référence du lot, la phase et le statut', () => {
    const appel = {
      lot: { reference: 'A01' },
      phase: { nom: 'Fondations', pourcentage: 0.3 },
      montant: 60000,
      dateAttestationMOE: '2026-06-01',
      commentaire: 'RAS',
    }
    const texte = texteRechercheAppel(appel)
    expect(texte).toContain('A01')
    expect(texte).toContain('Fondations')
    expect(texte).toContain('30%')
    expect(texte).toContain('À émettre')
    expect(texte).toContain('RAS')
  })

  it('ne laisse pas de "null"/"undefined" littéral si le commentaire est absent', () => {
    const appel = {
      lot: { reference: 'A01' },
      phase: { nom: 'Fondations', pourcentage: 0.3 },
      montant: 60000,
    }
    const texte = texteRechercheAppel(appel)
    expect(texte).not.toContain('null')
    expect(texte).not.toContain('undefined')
  })
})
