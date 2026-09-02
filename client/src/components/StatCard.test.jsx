// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import StatCard from './StatCard.jsx'

describe('StatCard', () => {
  it('affiche le libellé et la valeur', () => {
    render(<StatCard libelle="Lots au total" valeur={42} />)
    expect(screen.getByText('Lots au total')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it("n'affiche aucun bloc pourcentage si non fourni", () => {
    const { container } = render(<StatCard libelle="Lots" valeur={42} />)
    expect(container.querySelector('.pourcentage')).toBeNull()
  })

  it('affiche le bloc pourcentage même à 0 (falsy mais une vraie valeur)', () => {
    render(<StatCard libelle="Lots" valeur={0} pourcentage={0} libellePourcentage="du programme" />)
    expect(screen.getByText('0% du programme')).toBeInTheDocument()
  })

  it('affiche le bloc pourcentage avec sa valeur et son libellé', () => {
    render(
      <StatCard libelle="Actés" valeur={12} pourcentage={30} libellePourcentage="du programme" />,
    )
    expect(screen.getByText('30% du programme')).toBeInTheDocument()
  })

  it('applique la classe de couleur du statut si fourni', () => {
    const { container } = render(<StatCard libelle="Actés" valeur={12} statut="acte" />)
    expect(container.querySelector('.carte')).toHaveClass('carte--acte')
  })

  it("n'applique aucune classe de statut si non fourni (carte neutre)", () => {
    const { container } = render(<StatCard libelle="Lots" valeur={42} />)
    const carte = container.querySelector('.carte')
    expect(carte).toHaveClass('carte')
    expect(carte.className).toBe('carte')
  })
})
