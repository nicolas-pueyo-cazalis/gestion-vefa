// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { ProgrammeProvider, useProgramme } from './ProgrammeContext.jsx'

const mockUseAuth = vi.fn()
vi.mock('./AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

function stubLocalStorage(valeurs = {}) {
  const magasin = { ...valeurs }
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((cle) => magasin[cle] ?? null),
    setItem: vi.fn((cle, valeur) => {
      magasin[cle] = valeur
    }),
    removeItem: vi.fn((cle) => {
      delete magasin[cle]
    }),
  })
  return magasin
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ProgrammeProvider / useProgramme', () => {
  it("ne décide rien tant qu'AuthContext n'a pas fini sa propre vérification (garde-fou du bug historique, point 143)", async () => {
    mockUseAuth.mockReturnValue({ utilisateur: null, chargement: true })
    stubLocalStorage({ programmeId: 'prog1' })
    const fetchSimule = vi.fn()
    vi.stubGlobal('fetch', fetchSimule)

    const { result } = renderHook(() => useProgramme(), { wrapper: ProgrammeProvider })

    // Laisse le temps à un éventuel effet de s'exécuter à tort
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(result.current.chargement).toBe(true)
    expect(fetchSimule).not.toHaveBeenCalled()
  })

  it("n'a pas de programme actif si personne n'est connecté", async () => {
    mockUseAuth.mockReturnValue({ utilisateur: null, chargement: false })
    stubLocalStorage()
    vi.stubGlobal('fetch', vi.fn())

    const { result } = renderHook(() => useProgramme(), { wrapper: ProgrammeProvider })

    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(result.current.programmeActif).toBeNull()
  })

  it("n'appelle pas l'API si aucun programme n'est stocké, même connecté", async () => {
    mockUseAuth.mockReturnValue({ utilisateur: { id: '1', role: 'admin' }, chargement: false })
    stubLocalStorage()
    const fetchSimule = vi.fn()
    vi.stubGlobal('fetch', fetchSimule)

    const { result } = renderHook(() => useProgramme(), { wrapper: ProgrammeProvider })

    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(result.current.programmeActif).toBeNull()
    expect(fetchSimule).not.toHaveBeenCalled()
  })

  it('restaure le programme actif si le programme stocké existe toujours', async () => {
    mockUseAuth.mockReturnValue({ utilisateur: { id: '1', role: 'admin' }, chargement: false })
    stubLocalStorage({ programmeId: 'prog1', jeton: 'abc' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ _id: 'prog1', nom: 'Les Jardins' }),
      }),
    )

    const { result } = renderHook(() => useProgramme(), { wrapper: ProgrammeProvider })

    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(result.current.programmeActif).toEqual({ _id: 'prog1', nom: 'Les Jardins' })
  })

  it('nettoie le programmeId stocké si le programme a été supprimé entre-temps', async () => {
    const magasin = stubLocalStorage({ programmeId: 'prog-supprime' })
    mockUseAuth.mockReturnValue({ utilisateur: { id: '1', role: 'admin' }, chargement: false })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    const { result } = renderHook(() => useProgramme(), { wrapper: ProgrammeProvider })

    await waitFor(() => expect(result.current.chargement).toBe(false))
    expect(result.current.programmeActif).toBeNull()
    expect(magasin.programmeId).toBeUndefined()
  })

  it('choisirProgramme() stocke le programme et met à jour le contexte', async () => {
    mockUseAuth.mockReturnValue({ utilisateur: { id: '1', role: 'admin' }, chargement: false })
    const magasin = stubLocalStorage()
    vi.stubGlobal('fetch', vi.fn())

    const { result } = renderHook(() => useProgramme(), { wrapper: ProgrammeProvider })
    await waitFor(() => expect(result.current.chargement).toBe(false))

    result.current.choisirProgramme({ _id: 'prog2', nom: 'Le Clos Fleuri' })

    await waitFor(() =>
      expect(result.current.programmeActif).toEqual({ _id: 'prog2', nom: 'Le Clos Fleuri' }),
    )
    expect(magasin.programmeId).toBe('prog2')
  })

  it('changerDeProgramme() retire le programme stocké et vide le contexte', async () => {
    mockUseAuth.mockReturnValue({ utilisateur: { id: '1', role: 'admin' }, chargement: false })
    const magasin = stubLocalStorage({ programmeId: 'prog1' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ _id: 'prog1', nom: 'Les Jardins' }),
      }),
    )

    const { result } = renderHook(() => useProgramme(), { wrapper: ProgrammeProvider })
    await waitFor(() => expect(result.current.programmeActif).not.toBeNull())

    result.current.changerDeProgramme()

    await waitFor(() => expect(result.current.programmeActif).toBeNull())
    expect(magasin.programmeId).toBeUndefined()
  })
})
