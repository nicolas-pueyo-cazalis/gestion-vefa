import { describe, it, expect, vi, afterEach } from 'vitest'
import { calculerEmissionAppel } from './appelsDeFonds.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('calculerEmissionAppel', () => {
  it('émet ET règle à la date de l\'acte si l\'acte est signé après l\'attestation (règle "réglé à l\'acte")', () => {
    const lot = { dateActe: new Date('2026-06-15') }
    const resultat = calculerEmissionAppel(lot, new Date('2026-05-01'), 30)

    expect(resultat.regleAutomatiquement).toBe(true)
    expect(resultat.dateEmission).toEqual(new Date('2026-06-15'))
    expect(resultat.dateReglement).toEqual(new Date('2026-06-15'))
    expect(resultat.dateLimiteReglement).toEqual(new Date('2026-07-15'))
  })

  it('considère "déjà dû" un acte signé le jour même de l\'attestation (règle >=, pas > strict)', () => {
    const lot = { dateActe: new Date('2026-05-01') }
    const resultat = calculerEmissionAppel(lot, new Date('2026-05-01'), 30)

    expect(resultat.regleAutomatiquement).toBe(true)
    expect(resultat.dateReglement).toEqual(new Date('2026-05-01'))
  })

  it('suit le circuit normal (émis maintenant, en attente de règlement) si l\'acte est antérieur à l\'attestation', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01'))

    const lot = { dateActe: new Date('2026-05-01') }
    const resultat = calculerEmissionAppel(lot, new Date('2026-06-15'), 30)

    expect(resultat.regleAutomatiquement).toBe(false)
    expect(resultat.dateReglement).toBeNull()
    expect(resultat.dateEmission).toEqual(new Date('2026-07-01'))
    expect(resultat.dateLimiteReglement).toEqual(new Date('2026-07-31'))
  })

  it('suit le circuit normal si le lot n\'a pas encore de date d\'acte (lot Réservé, pas encore Acté)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01'))

    const lot = { dateActe: null }
    const resultat = calculerEmissionAppel(lot, new Date('2026-06-15'), 30)

    expect(resultat.regleAutomatiquement).toBe(false)
    expect(resultat.dateReglement).toBeNull()
    expect(resultat.dateEmission).toEqual(new Date('2026-07-01'))
  })
})
