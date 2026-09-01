import { describe, it, expect, vi, afterEach } from 'vitest'
import { chercherCodePostal } from './codePostal.js'

function reponseJson(corps, ok = true) {
  return { ok, json: () => Promise.resolve(corps) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('chercherCodePostal', () => {
  it('renvoie null sans appeler le réseau si la commune est vide', async () => {
    const fetchSimule = vi.fn()
    vi.stubGlobal('fetch', fetchSimule)

    expect(await chercherCodePostal('')).toBeNull()
    expect(await chercherCodePostal(null)).toBeNull()
    expect(await chercherCodePostal(undefined)).toBeNull()
    expect(fetchSimule).not.toHaveBeenCalled()
  })

  it('renvoie le code postal si la commune a un seul résultat', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      reponseJson([{ nom: 'Lyon', codesPostaux: ['69001'] }]),
    ))

    expect(await chercherCodePostal('Lyon')).toBe('69001')
  })

  it('retient le premier code postal si la commune en a exactement 2', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      reponseJson([{ nom: 'Urrugne', codesPostaux: ['64122', '64700'] }]),
    ))

    expect(await chercherCodePostal('Urrugne')).toBe('64122')
  })

  it('renvoie null si la commune a plus de 2 codes postaux (grande ville à arrondissements)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      reponseJson([{ nom: 'Paris', codesPostaux: ['75001', '75002', '75003'] }]),
    ))

    expect(await chercherCodePostal('Paris')).toBeNull()
  })

  it('ignore la casse et les accents pour trouver la correspondance exacte', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      reponseJson([{ nom: 'Dépré', codesPostaux: ['12345'] }]),
    ))

    expect(await chercherCodePostal('depre')).toBe('12345')
  })

  it('renvoie null si aucun résultat ne correspond exactement à la commune saisie', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      reponseJson([{ nom: 'Lyonnais', codesPostaux: ['69001'] }]),
    ))

    expect(await chercherCodePostal('Lyon')).toBeNull()
  })

  it('renvoie null si la réponse HTTP n\'est pas ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponseJson([], false)))

    expect(await chercherCodePostal('Lyon')).toBeNull()
  })

  it('renvoie null (pas d\'exception) si le réseau est injoignable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    expect(await chercherCodePostal('Lyon')).toBeNull()
  })
})
