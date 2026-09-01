// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext.jsx'

function stubLocalStorage(valeurs = {}) {
  const magasin = { ...valeurs }
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((cle) => magasin[cle] ?? null),
    setItem: vi.fn((cle, valeur) => { magasin[cle] = valeur }),
    removeItem: vi.fn((cle) => { delete magasin[cle] }),
  })
  return magasin
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AuthProvider / useAuth', () => {
  it('reste sans utilisateur si aucun jeton n\'est stocké au chargement (pas d\'appel réseau)', async () => {
    stubLocalStorage()
    const fetchSimule = vi.fn()
    vi.stubGlobal('fetch', fetchSimule)

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(result.current.utilisateur).toBeNull()
    expect(fetchSimule).not.toHaveBeenCalled()
  })

  it('revérifie un jeton stocké auprès du serveur et restaure la session si valide', async () => {
    stubLocalStorage({ jeton: 'abc123' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ utilisateur: { id: '1', role: 'admin' } }),
    }))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(result.current.utilisateur).toEqual({ id: '1', role: 'admin' })
  })

  it('efface un jeton devenu invalide si le serveur refuse /api/auth/moi', async () => {
    const magasin = stubLocalStorage({ jeton: 'jeton-perime', utilisateur: '{"id":"1"}' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(result.current.utilisateur).toBeNull()
    expect(magasin.jeton).toBeUndefined()
    expect(magasin.utilisateur).toBeUndefined()
  })

  it('connecter() stocke le jeton et l\'utilisateur, met à jour le contexte', async () => {
    const magasin = stubLocalStorage()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jeton: 'nouveau-jeton', utilisateur: { id: '2', role: 'gestionnaire' } }),
    }))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.chargement).toBe(false))

    await act(async () => {
      await result.current.connecter('test@test.fr', 'motdepasse')
    })

    expect(magasin.jeton).toBe('nouveau-jeton')
    expect(result.current.utilisateur).toEqual({ id: '2', role: 'gestionnaire' })
  })

  it('connecter() relance l\'erreur du serveur sans rien stocker si les identifiants sont refusés', async () => {
    const magasin = stubLocalStorage()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Email ou mot de passe incorrect' }),
    }))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.chargement).toBe(false))

    await expect(
      act(async () => { await result.current.connecter('test@test.fr', 'mauvais') }),
    ).rejects.toThrow('Email ou mot de passe incorrect')
    expect(magasin.jeton).toBeUndefined()
  })

  it('deconnecter() vide le localStorage et le contexte', async () => {
    const magasin = stubLocalStorage({ jeton: 'abc' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ utilisateur: { id: '1', role: 'admin' } }),
    }))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.utilisateur).not.toBeNull())

    act(() => {
      result.current.deconnecter()
    })

    expect(result.current.utilisateur).toBeNull()
    expect(magasin.jeton).toBeUndefined()
  })
})
