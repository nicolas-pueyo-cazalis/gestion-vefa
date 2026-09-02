// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ChoixProgramme from './ChoixProgramme.jsx'

const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseProgramme = vi.fn()
vi.mock('../context/ProgrammeContext.jsx', () => ({
  useProgramme: () => mockUseProgramme(),
}))

const mockApiFetch = vi.fn()
vi.mock('../utils/api.js', () => ({
  apiFetch: (...args) => mockApiFetch(...args),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const reel = await importOriginal()
  return { ...reel, useNavigate: () => mockNavigate }
})

function reponseJson(corps, ok = true) {
  return { ok, json: () => Promise.resolve(corps) }
}

describe('ChoixProgramme', () => {
  it('affiche la liste des programmes une fois chargée', async () => {
    mockUseAuth.mockReturnValue({ utilisateur: { role: 'lecture' } })
    mockUseProgramme.mockReturnValue({ choisirProgramme: vi.fn() })
    mockApiFetch.mockResolvedValue(
      reponseJson([
        { _id: 'p1', nom: 'Les Jardins', commune: 'Lyon' },
        { _id: 'p2', nom: 'Le Clos Fleuri' },
      ]),
    )

    render(<ChoixProgramme />)

    expect(screen.getByText('Chargement des programmes...')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Les Jardins')).toBeInTheDocument())
    expect(screen.getByText('Le Clos Fleuri')).toBeInTheDocument()
  })

  it("affiche un message si aucun programme n'existe encore", async () => {
    mockUseAuth.mockReturnValue({ utilisateur: { role: 'admin' } })
    mockUseProgramme.mockReturnValue({ choisirProgramme: vi.fn() })
    mockApiFetch.mockResolvedValue(reponseJson([]))

    render(<ChoixProgramme />)

    await waitFor(() => expect(screen.getByText(/Aucun programme/)).toBeInTheDocument())
  })

  it("sélectionner un programme appelle choisirProgramme() et navigue vers l'accueil", async () => {
    const choisirProgramme = vi.fn()
    mockUseAuth.mockReturnValue({ utilisateur: { role: 'lecture' } })
    mockUseProgramme.mockReturnValue({ choisirProgramme })
    const programme = { _id: 'p1', nom: 'Les Jardins' }
    mockApiFetch.mockResolvedValue(reponseJson([programme]))

    render(<ChoixProgramme />)
    await waitFor(() => screen.getByText('Les Jardins'))
    fireEvent.click(screen.getByText('Les Jardins'))

    expect(choisirProgramme).toHaveBeenCalledWith(programme)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('affiche le formulaire de création pour un rôle admin/gestionnaire', async () => {
    mockUseAuth.mockReturnValue({ utilisateur: { role: 'gestionnaire' } })
    mockUseProgramme.mockReturnValue({ choisirProgramme: vi.fn() })
    mockApiFetch.mockResolvedValue(reponseJson([]))

    render(<ChoixProgramme />)

    await waitFor(() => expect(screen.getByLabelText('Nouveau programme')).toBeInTheDocument())
  })

  it("n'affiche pas le formulaire de création pour le rôle lecture", async () => {
    mockUseAuth.mockReturnValue({ utilisateur: { role: 'lecture' } })
    mockUseProgramme.mockReturnValue({ choisirProgramme: vi.fn() })
    mockApiFetch.mockResolvedValue(reponseJson([]))

    render(<ChoixProgramme />)

    await waitFor(() => expect(screen.getByText(/Aucun programme/)).toBeInTheDocument())
    expect(screen.queryByLabelText('Nouveau programme')).not.toBeInTheDocument()
  })

  it("affiche le message d'erreur du serveur si la création échoue, sans naviguer", async () => {
    const choisirProgramme = vi.fn()
    mockUseAuth.mockReturnValue({ utilisateur: { role: 'admin' } })
    mockUseProgramme.mockReturnValue({ choisirProgramme })
    mockApiFetch
      .mockResolvedValueOnce(reponseJson([])) // chargement initial
      .mockResolvedValueOnce(reponseJson({ message: 'Ce nom existe déjà' }, false)) // création

    render(<ChoixProgramme />)
    await waitFor(() => screen.getByLabelText('Nouveau programme'))
    fireEvent.change(screen.getByLabelText('Nouveau programme'), { target: { value: 'Doublon' } })
    fireEvent.click(screen.getByText('Créer'))

    await waitFor(() => expect(screen.getByText('Ce nom existe déjà')).toBeInTheDocument())
    expect(choisirProgramme).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
