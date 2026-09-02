import { describe, it, expect } from 'vitest'
import { validerDatesCoherentesAvecStatut } from './lots.js'

describe('validerDatesCoherentesAvecStatut', () => {
  it('accepte un lot "libre" sans aucune date', () => {
    expect(validerDatesCoherentesAvecStatut({ statut: 'libre' })).toBeNull()
  })

  it('refuse une dateOption sur un lot encore "libre"', () => {
    const erreur = validerDatesCoherentesAvecStatut({ statut: 'libre', dateOption: new Date() })
    expect(erreur).toMatch(/date d'option/)
  })

  it('accepte une dateOption sur un lot "option"', () => {
    expect(
      validerDatesCoherentesAvecStatut({ statut: 'option', dateOption: new Date() }),
    ).toBeNull()
  })

  it('refuse une dateReservation sur un lot seulement "option"', () => {
    const erreur = validerDatesCoherentesAvecStatut({
      statut: 'option',
      dateReservation: new Date(),
    })
    expect(erreur).toMatch(/date de réservation/)
  })

  it('accepte une dateReservation sur un lot "reserve"', () => {
    expect(
      validerDatesCoherentesAvecStatut({
        statut: 'reserve',
        dateReservation: new Date(),
      }),
    ).toBeNull()
  })

  it('refuse une dateActe sur un lot seulement "reserve"', () => {
    const erreur = validerDatesCoherentesAvecStatut({
      statut: 'reserve',
      dateReservation: new Date(),
      dateActe: new Date(),
    })
    expect(erreur).toMatch(/date d'acte/)
  })

  it('accepte un lot "acte" avec dateActe ET dateReservation renseignées', () => {
    expect(
      validerDatesCoherentesAvecStatut({
        statut: 'acte',
        dateReservation: new Date('2026-01-01'),
        dateActe: new Date('2026-03-01'),
      }),
    ).toBeNull()
  })

  it('refuse un lot "acte" sans dateReservation (un lot Acté doit forcément avoir été Réservé avant)', () => {
    const erreur = validerDatesCoherentesAvecStatut({
      statut: 'acte',
      dateActe: new Date('2026-03-01'),
    })
    expect(erreur).toMatch(/réservation.*avant.*Acté/)
  })
})
