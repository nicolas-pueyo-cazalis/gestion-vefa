import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch } from './api.js'

function stubLocalStorage(valeurs = {}) {
  const magasin = { ...valeurs }
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((cle) => magasin[cle] ?? null),
    setItem: vi.fn((cle, valeur) => { magasin[cle] = valeur }),
    removeItem: vi.fn((cle) => { delete magasin[cle] }),
  })
  return magasin
}

beforeEach(() => {
  vi.stubGlobal('window', { location: { href: '' } })
  vi.stubGlobal('alert', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('ajoute le jeton stocké dans l\'en-tête Authorization', async () => {
    stubLocalStorage({ jeton: 'abc123' })
    const fetchSimule = vi.fn().mockResolvedValue({ status: 200 })
    vi.stubGlobal('fetch', fetchSimule)

    await apiFetch('/api/lots')

    expect(fetchSimule).toHaveBeenCalledWith('/api/lots', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer abc123' }),
    }))
  })

  it('n\'ajoute aucun en-tête Authorization si aucun jeton n\'est stocké', async () => {
    stubLocalStorage()
    const fetchSimule = vi.fn().mockResolvedValue({ status: 200 })
    vi.stubGlobal('fetch', fetchSimule)

    await apiFetch('/api/lots')

    const [, options] = fetchSimule.mock.calls[0]
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('vide la session et redirige vers /connexion sur une réponse 401', async () => {
    const magasin = stubLocalStorage({ jeton: 'abc123', utilisateur: '{"role":"admin"}' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }))

    await apiFetch('/api/lots')

    expect(magasin.jeton).toBeUndefined()
    expect(magasin.utilisateur).toBeUndefined()
    expect(window.location.href).toBe('/connexion')
  })

  it('ne touche ni à la session ni à la redirection sur une réponse normale', async () => {
    const magasin = stubLocalStorage({ jeton: 'abc123' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }))

    await apiFetch('/api/lots')

    expect(magasin.jeton).toBe('abc123')
    expect(window.location.href).toBe('')
  })

  it('alerte l\'utilisateur ET relance l\'exception si le serveur est injoignable', async () => {
    stubLocalStorage()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

    await expect(apiFetch('/api/lots')).rejects.toThrow('Failed to fetch')
    expect(globalThis.alert).toHaveBeenCalledWith(
      'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',
    )
  })
})
