import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatDate,
  calculerDateLimiteJours,
  calculerDateLimiteMois,
  statutAppel,
  statutPret,
  statutSignature,
  estEntrepriseEnRetard,
  estFactureTmaEnRetard,
} from './statuts.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('formatDate', () => {
  it('formate une date au format français jj/mm/aaaa', () => {
    expect(formatDate(new Date('2026-03-05'))).toBe('05/03/2026')
  })

  it('renvoie un tiret cadratin si la date est absente', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })
})

describe('calculerDateLimiteJours', () => {
  it('ajoute le nombre de jours donné à la date de départ', () => {
    expect(calculerDateLimiteJours(new Date('2026-01-01'), 30)).toEqual(new Date('2026-01-31'))
  })
})

describe('calculerDateLimiteMois', () => {
  // Dates construites en heure locale (année, mois, jour), pas via une
  // chaîne ISO (parsée en UTC) : setMonth() opère en heure locale, une
  // comparaison UTC vs locale peut décaler d'une heure au passage d'un
  // changement d'heure d'été/hiver entre les deux dates.
  it('ajoute le nombre de mois donné à la date de départ', () => {
    expect(calculerDateLimiteMois(new Date(2026, 0, 15), 3)).toEqual(new Date(2026, 3, 15))
  })

  it("gère seule le débordement d'année (réservation en novembre + 3 mois)", () => {
    expect(calculerDateLimiteMois(new Date(2026, 10, 10), 3)).toEqual(new Date(2027, 1, 10))
  })
})

describe('statutAppel', () => {
  it('renvoie "regle" dès que dateReglement est renseignée, prioritaire sur tout le reste', () => {
    expect(
      statutAppel({
        dateReglement: new Date('2026-06-01'),
        dateEmission: null,
        dateAttestationMOE: null,
      }),
    ).toBe('regle')
  })

  it('renvoie "a_emettre" si l\'attestation MOE est faite mais l\'appel pas encore émis', () => {
    expect(
      statutAppel({
        dateReglement: null,
        dateEmission: null,
        dateAttestationMOE: new Date('2026-05-01'),
      }),
    ).toBe('a_emettre')
  })

  it('renvoie "attente" sans attestation ni émission', () => {
    expect(statutAppel({ dateReglement: null, dateEmission: null, dateAttestationMOE: null })).toBe(
      'attente',
    )
  })

  it('renvoie "retard" si émis et la date limite de règlement est dépassée sans règlement', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01'))

    expect(
      statutAppel({
        dateReglement: null,
        dateEmission: new Date('2026-06-01'),
        dateLimiteReglement: new Date('2026-07-01'),
      }),
    ).toBe('retard')
  })

  it('renvoie "emis" si émis et dans les temps', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))

    expect(
      statutAppel({
        dateReglement: null,
        dateEmission: new Date('2026-06-01'),
        dateLimiteReglement: new Date('2026-07-01'),
      }),
    ).toBe('emis')
  })
})

describe('statutPret', () => {
  it("renvoie null tant que le lot n'est pas réservé (pas de point de départ)", () => {
    expect(statutPret({ dateReservation: null }, 45)).toBeNull()
  })

  it('renvoie "sans_pret" en priorité, même si une date d\'offre reçue existe aussi', () => {
    const lot = {
      dateReservation: new Date('2026-01-01'),
      acquereur: { sansPret: true, dateOffrePretRecue: new Date('2026-01-10') },
    }
    expect(statutPret(lot, 45)).toBe('sans_pret')
  })

  it('renvoie "recue" dès qu\'une offre de prêt a été reçue', () => {
    const lot = {
      dateReservation: new Date('2026-01-01'),
      acquereur: { sansPret: false, dateOffrePretRecue: new Date('2026-01-10') },
    }
    expect(statutPret(lot, 45)).toBe('recue')
  })

  it('renvoie "retard" si la date limite (réservation + délai) est dépassée sans offre reçue', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01'))

    const lot = { dateReservation: new Date('2026-01-01'), acquereur: {} }
    expect(statutPret(lot, 45)).toBe('retard')
  })

  it('renvoie "attente" si dans les temps sans offre reçue', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15'))

    const lot = { dateReservation: new Date('2026-01-01'), acquereur: {} }
    expect(statutPret(lot, 45)).toBe('attente')
  })
})

describe('statutSignature', () => {
  it("renvoie null tant que le lot n'est pas réservé", () => {
    expect(statutSignature({ dateReservation: null }, 3)).toBeNull()
  })

  it('renvoie "signe" dès qu\'une date d\'acte est renseignée', () => {
    const lot = { dateReservation: new Date('2026-01-01'), dateActe: new Date('2026-02-01') }
    expect(statutSignature(lot, 3)).toBe('signe')
  })

  it('renvoie "retard" si la date limite (réservation + délai en mois) est dépassée sans acte', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01'))

    const lot = { dateReservation: new Date('2026-01-01'), dateActe: null }
    expect(statutSignature(lot, 3)).toBe('retard')
  })

  it('renvoie "attente" si dans les temps sans acte', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01'))

    const lot = { dateReservation: new Date('2026-01-01'), dateActe: null }
    expect(statutSignature(lot, 3)).toBe('attente')
  })
})

describe('estEntrepriseEnRetard', () => {
  it("n'est jamais en retard si un montant de devis est déjà renseigné, même à 0 (falsy mais valide)", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01'))

    expect(estEntrepriseEnRetard({ montantDevis: 0, dateEnvoi: new Date('2026-01-01') }, 15)).toBe(
      false,
    )
  })

  it('est en retard si aucun devis reçu et le délai est dépassé', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20'))

    expect(
      estEntrepriseEnRetard({ montantDevis: null, dateEnvoi: new Date('2026-01-01') }, 15),
    ).toBe(true)
  })

  it("n'est pas en retard si aucun devis reçu mais dans les temps", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05'))

    expect(
      estEntrepriseEnRetard({ montantDevis: null, dateEnvoi: new Date('2026-01-01') }, 15),
    ).toBe(false)
  })
})

describe('estFactureTmaEnRetard', () => {
  it('n\'est jamais en retard si le statut n\'est pas "facture"', () => {
    expect(
      estFactureTmaEnRetard(
        { statut: 'valide', dateEnvoiFactureClient: new Date('2026-01-01') },
        15,
      ),
    ).toBe(false)
  })

  it('est en retard si le statut est "facture" et le délai de réponse est dépassé', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20'))

    expect(
      estFactureTmaEnRetard(
        { statut: 'facture', dateEnvoiFactureClient: new Date('2026-01-01') },
        15,
      ),
    ).toBe(true)
  })

  it('n\'est pas en retard si le statut est "facture" mais dans les temps', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05'))

    expect(
      estFactureTmaEnRetard(
        { statut: 'facture', dateEnvoiFactureClient: new Date('2026-01-01') },
        15,
      ),
    ).toBe(false)
  })
})
