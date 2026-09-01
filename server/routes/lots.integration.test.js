import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { demarrerBaseTest, viderBaseTest, arreterBaseTest } from '../test-setup.js'
import Programme from '../models/Programme.js'
import Lot from '../models/Lot.js'
import AppelDeFonds from '../models/AppelDeFonds.js'
import { genererAppelsDeFonds } from './lots.js'

beforeAll(async () => {
  await demarrerBaseTest()
}, 60000)

afterAll(async () => {
  await arreterBaseTest()
})

beforeEach(async () => {
  await viderBaseTest()
})

async function creerProgrammeEtLot(champsLot = {}) {
  const programme = await Programme.create({
    nom: 'Programme de test',
    parametres: {
      baremePhases: [
        { nom: 'Réservation', pourcentage: 0.05, ordre: 1 },
        { nom: 'Fondations', pourcentage: 0.30, ordre: 2 },
        { nom: 'Livraison', pourcentage: 0.65, ordre: 3 },
      ],
      delaiReglementAppelJours: 30,
    },
  })
  const lot = await Lot.create({
    programme: programme._id,
    reference: 'A01',
    prixTTC: 200000,
    statut: 'reserve',
    dateReservation: new Date('2026-06-01'),
    ...champsLot,
  })
  return { programme, lot }
}

describe('genererAppelsDeFonds (intégration, vraie base en mémoire)', () => {
  it('ne génère que la 1ʳᵉ phase du barème quand le lot vient d\'être réservé, réglée automatiquement à la date de réservation', async () => {
    const { lot } = await creerProgrammeEtLot()

    await genererAppelsDeFonds(lot, { seulementReservation: true })

    const appels = await AppelDeFonds.find({ lot: lot._id })
    expect(appels).toHaveLength(1)
    expect(appels[0].phase.nom).toBe('Réservation')
    expect(appels[0].montant).toBe(10000) // 200 000 × 5%
    expect(appels[0].dateEmission).toEqual(new Date('2026-06-01'))
    expect(appels[0].dateReglement).toEqual(new Date('2026-06-01'))
    expect(appels[0].regleAutomatiquement).toBe(true)
  })

  it('génère les phases restantes (montant correct chacune) quand le lot passe Acté', async () => {
    const { lot } = await creerProgrammeEtLot({
      statut: 'acte',
      dateActe: new Date('2026-09-01'),
    })

    await genererAppelsDeFonds(lot, { seulementReservation: true })
    await genererAppelsDeFonds(lot)

    const appels = await AppelDeFonds.find({ lot: lot._id }).sort({ 'phase.ordre': 1 })
    expect(appels).toHaveLength(3)
    expect(appels.map((a) => a.phase.nom)).toEqual(['Réservation', 'Fondations', 'Livraison'])
    expect(appels[1].montant).toBe(60000) // 200 000 × 30%
    expect(appels[2].montant).toBe(130000) // 200 000 × 65%
  })

  it('ne duplique jamais une phase déjà générée (anti-doublon) en rejouant la génération', async () => {
    const { lot } = await creerProgrammeEtLot()

    await genererAppelsDeFonds(lot, { seulementReservation: true })
    await genererAppelsDeFonds(lot, { seulementReservation: true })

    const appels = await AppelDeFonds.find({ lot: lot._id })
    expect(appels).toHaveLength(1)
  })
})
