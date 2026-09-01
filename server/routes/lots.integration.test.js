import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { demarrerBaseTest, viderBaseTest, arreterBaseTest } from '../test-setup.js'
import Programme from '../models/Programme.js'
import Lot from '../models/Lot.js'
import Annexe from '../models/Annexe.js'
import AppelDeFonds from '../models/AppelDeFonds.js'
import { genererAppelsDeFonds, synchroniserAnnexesEtPrix, genererAppelsAnnexeSeule } from './lots.js'

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

describe('synchroniserAnnexesEtPrix (intégration, vraie base en mémoire)', () => {
  it('attribue les annexes choisies et recalcule prixTTC = prixLogementSeul + somme des annexes', async () => {
    const { programme, lot } = await creerProgrammeEtLot({ prixLogementSeul: 180000, prixTTC: 180000 })
    const parking = await Annexe.create({ programme: programme._id, type: 'parking_ext', numero: 1, prix: 15000 })
    const cave = await Annexe.create({ programme: programme._id, type: 'cave', numero: 1, prix: 5000 })

    await synchroniserAnnexesEtPrix(lot, [parking._id, cave._id])
    await lot.save()

    expect(lot.prixTTC).toBe(200000) // 180 000 + 15 000 + 5 000
    const annexesDuLot = await Annexe.find({ lot: lot._id })
    expect(annexesDuLot).toHaveLength(2)
  })

  it('détache une annexe retirée de la sélection', async () => {
    const { programme, lot } = await creerProgrammeEtLot({ prixLogementSeul: 180000 })
    const parking = await Annexe.create({ programme: programme._id, type: 'parking_ext', numero: 2, prix: 15000, lot: lot._id })

    await synchroniserAnnexesEtPrix(lot, [])
    await lot.save()

    const parkingApres = await Annexe.findById(parking._id)
    expect(parkingApres.lot).toBeNull()
    expect(lot.prixTTC).toBe(180000)
  })

  it('ne touche à aucune attribution d\'annexe si annexeIds est undefined, mais recalcule quand même prixTTC', async () => {
    const { programme, lot } = await creerProgrammeEtLot({ prixLogementSeul: 180000 })
    await Annexe.create({ programme: programme._id, type: 'cave', numero: 2, prix: 5000, lot: lot._id })

    await synchroniserAnnexesEtPrix(lot, undefined)
    await lot.save()

    expect(lot.prixTTC).toBe(185000) // l'annexe déjà attribuée reste comptée
  })

  it('ne modifie jamais prixTTC si prixLogementSeul n\'est pas renseigné (lot créé avant ce champ)', async () => {
    const { lot } = await creerProgrammeEtLot({ prixLogementSeul: undefined, prixTTC: 150000 })

    await synchroniserAnnexesEtPrix(lot, undefined)

    expect(lot.prixTTC).toBe(150000)
  })
})

describe('genererAppelsAnnexeSeule (intégration, vraie base en mémoire)', () => {
  it('génère uniquement la phase Réservation (5%) quand seulementReservation est demandé', async () => {
    const { lot } = await creerProgrammeEtLot({ estAnnexeSeule: true, prixTTC: 20000 })

    await genererAppelsAnnexeSeule(lot, { seulementReservation: true })

    const appels = await AppelDeFonds.find({ lot: lot._id })
    expect(appels).toHaveLength(1)
    expect(appels[0].phase.nom).toBe('Réservation')
    expect(appels[0].montant).toBe(1000) // 20 000 × 5%
    expect(appels[0].regleAutomatiquement).toBe(true)
  })

  it('génère aussi la phase Acte (95%) quand le lot est Acté', async () => {
    const { lot } = await creerProgrammeEtLot({
      estAnnexeSeule: true,
      prixTTC: 20000,
      statut: 'acte',
      dateActe: new Date('2026-09-01'),
    })

    await genererAppelsAnnexeSeule(lot)

    const appels = await AppelDeFonds.find({ lot: lot._id }).sort({ 'phase.ordre': 1 })
    expect(appels).toHaveLength(2)
    expect(appels[1].phase.nom).toBe('Acte')
    expect(appels[1].montant).toBe(19000) // 20 000 × 95%
  })

  it('ne duplique jamais une phase déjà générée en rejouant la génération', async () => {
    const { lot } = await creerProgrammeEtLot({ estAnnexeSeule: true, prixTTC: 20000 })

    await genererAppelsAnnexeSeule(lot, { seulementReservation: true })
    await genererAppelsAnnexeSeule(lot, { seulementReservation: true })

    const appels = await AppelDeFonds.find({ lot: lot._id })
    expect(appels).toHaveLength(1)
  })
})
