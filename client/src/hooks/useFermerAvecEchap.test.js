// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFermerAvecEchap } from './useFermerAvecEchap.js'

function appuyerTouche(touche) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: touche }))
}

describe('useFermerAvecEchap', () => {
  it('appelle le callback quand la touche Échap est pressée', () => {
    const onFermer = vi.fn()
    renderHook(() => useFermerAvecEchap(onFermer))

    appuyerTouche('Escape')

    expect(onFermer).toHaveBeenCalledOnce()
  })

  it('n\'appelle pas le callback pour une autre touche', () => {
    const onFermer = vi.fn()
    renderHook(() => useFermerAvecEchap(onFermer))

    appuyerTouche('Enter')

    expect(onFermer).not.toHaveBeenCalled()
  })

  it('retire l\'écouteur au démontage (pas d\'appel après unmount)', () => {
    const onFermer = vi.fn()
    const { unmount } = renderHook(() => useFermerAvecEchap(onFermer))

    unmount()
    appuyerTouche('Escape')

    expect(onFermer).not.toHaveBeenCalled()
  })
})
