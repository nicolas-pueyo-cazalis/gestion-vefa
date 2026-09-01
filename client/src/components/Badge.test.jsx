// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Badge from './Badge.jsx'

describe('Badge', () => {
  it('affiche le texte fourni', () => {
    render(<Badge statut="emis" texte="Émis" />)
    expect(screen.getByText('Émis')).toBeInTheDocument()
  })

  it('applique la classe CSS correspondant au statut', () => {
    render(<Badge statut="refuse" texte="Refusé" />)
    expect(screen.getByText('Refusé')).toHaveClass('badge', 'refuse')
  })

  it('change de classe si le statut change', () => {
    render(<Badge statut="valide" texte="Validé" />)
    expect(screen.getByText('Validé')).toHaveClass('badge', 'valide')
  })
})
