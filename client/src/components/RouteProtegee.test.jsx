// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RouteProtegee from './RouteProtegee.jsx'

// `useAuth` simulé directement (pas un vrai AuthProvider) : teste
// RouteProtegee en isolation, sans dépendre du bon fonctionnement
// d'AuthContext en même temps — celui-ci a ses propres tests séparés
// (AuthContext.test.jsx).
const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderAvecRoutes(cheminInitial = '/lots') {
  return render(
    <MemoryRouter initialEntries={[cheminInitial]}>
      <Routes>
        <Route path="/connexion" element={<div>Page de connexion</div>} />
        <Route element={<RouteProtegee />}>
          <Route path="/lots" element={<div>Contenu protégé</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RouteProtegee', () => {
  it("n'affiche rien pendant la vérification de la session (pas de flash de redirection)", () => {
    mockUseAuth.mockReturnValue({ utilisateur: null, chargement: true })

    const { container } = renderAvecRoutes()

    expect(container).toBeEmptyDOMElement()
  })

  it("redirige vers /connexion si personne n'est connecté", () => {
    mockUseAuth.mockReturnValue({ utilisateur: null, chargement: false })

    renderAvecRoutes()

    expect(screen.getByText('Page de connexion')).toBeInTheDocument()
  })

  it('affiche le contenu protégé si un utilisateur est connecté', () => {
    mockUseAuth.mockReturnValue({ utilisateur: { id: '1', role: 'admin' }, chargement: false })

    renderAvecRoutes()

    expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
  })
})
