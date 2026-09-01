// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import Bandeau from './Bandeau.jsx'

const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseProgramme = vi.fn()
vi.mock('../context/ProgrammeContext.jsx', () => ({
  useProgramme: () => mockUseProgramme(),
}))

// `useNavigate` simulé (espion), le reste de react-router-dom (NavLink,
// MemoryRouter) reste réel — mock partiel via importOriginal.
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const reel = await importOriginal()
  return { ...reel, useNavigate: () => mockNavigate }
})

function renderBandeau() {
  return render(
    <MemoryRouter>
      <Bandeau />
    </MemoryRouter>,
  )
}

describe('Bandeau', () => {
  it('affiche le nom et l\'adresse du programme actif', () => {
    mockUseAuth.mockReturnValue({ utilisateur: { nom: 'Nicolas', role: 'admin' }, deconnecter: vi.fn() })
    mockUseProgramme.mockReturnValue({
      programmeActif: { nom: 'Les Jardins', adresse: '12 rue des Fleurs', commune: 'Lyon' },
      changerDeProgramme: vi.fn(),
    })

    renderBandeau()

    expect(screen.getByText('Les Jardins')).toBeInTheDocument()
    expect(screen.getByText('12 rue des Fleurs, Lyon')).toBeInTheDocument()
  })

  it('affiche le nom de l\'utilisateur et son rôle', () => {
    mockUseAuth.mockReturnValue({ utilisateur: { nom: 'Nicolas', role: 'gestionnaire' }, deconnecter: vi.fn() })
    mockUseProgramme.mockReturnValue({ programmeActif: {}, changerDeProgramme: vi.fn() })

    renderBandeau()

    expect(screen.getByText('Nicolas')).toBeInTheDocument()
    expect(screen.getByText('(gestionnaire)')).toBeInTheDocument()
  })

  it('affiche l\'email si l\'utilisateur n\'a pas de nom renseigné', () => {
    mockUseAuth.mockReturnValue({ utilisateur: { email: 'nicolas@test.fr', role: 'admin' }, deconnecter: vi.fn() })
    mockUseProgramme.mockReturnValue({ programmeActif: {}, changerDeProgramme: vi.fn() })

    renderBandeau()

    expect(screen.getByText('nicolas@test.fr')).toBeInTheDocument()
  })

  it('affiche un tiret pour chaque repère du programme non renseigné', () => {
    mockUseAuth.mockReturnValue({ utilisateur: { nom: 'Nicolas', role: 'admin' }, deconnecter: vi.fn() })
    mockUseProgramme.mockReturnValue({ programmeActif: {}, changerDeProgramme: vi.fn() })

    renderBandeau()

    // Les 3 repères (maître d'ouvrage, logements, livraison) sont tous
    // vides dans ce scénario — les 3 tirets sont attendus, pas un seul.
    expect(screen.getAllByText('—')).toHaveLength(3)
  })

  it('"Déconnexion" appelle deconnecter() et navigue vers /connexion', () => {
    const deconnecter = vi.fn()
    mockUseAuth.mockReturnValue({ utilisateur: { nom: 'Nicolas', role: 'admin' }, deconnecter })
    mockUseProgramme.mockReturnValue({ programmeActif: {}, changerDeProgramme: vi.fn() })

    renderBandeau()
    fireEvent.click(screen.getByText('Déconnexion'))

    expect(deconnecter).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith('/connexion')
  })

  it('"Changer de programme" appelle changerDeProgramme() et navigue vers /programmes', () => {
    const changerDeProgramme = vi.fn()
    mockUseAuth.mockReturnValue({ utilisateur: { nom: 'Nicolas', role: 'admin' }, deconnecter: vi.fn() })
    mockUseProgramme.mockReturnValue({ programmeActif: {}, changerDeProgramme })

    renderBandeau()
    fireEvent.click(screen.getByText('Changer de programme'))

    expect(changerDeProgramme).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith('/programmes')
  })
})
