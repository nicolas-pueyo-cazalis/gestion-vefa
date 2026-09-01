import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { demarrerBaseTest, viderBaseTest, arreterBaseTest } from '../test-setup.js'
import Programme from '../models/Programme.js'
import Lot from '../models/Lot.js'
import Tma from '../models/Tma.js'
import TmaEntreprise from '../models/TmaEntreprise.js'
import { recalculerTma } from './tmaEntreprises.js'

beforeAll(async () => {
  await demarrerBaseTest()
}, 60000)

afterAll(async () => {
  await arreterBaseTest()
})

beforeEach(async () => {
  await viderBaseTest()
})

async function creerTma(champsTma = {}) {
  const programme = await Programme.create({ nom: 'Programme de test' })
  const lot = await Lot.create({ programme: programme._id, reference: 'A01', statut: 'acte' })
  const tma = await Tma.create({
    lot: lot._id,
    acquereur: new mongoose.Types.ObjectId(),
    statut: 'etude',
    dateEnvoiEntreprises: new Date('2026-05-01'),
    nombreEntreprisesConcernees: 2,
    ...champsTma,
  })
  return { programme, lot, tma }
}

describe('recalculerTma (intégration, vraie base en mémoire)', () => {
  it('passe la TMA à "chiffré" avec le bon montant une fois TOUTES les entreprises répondues', async () => {
    const { tma } = await creerTma()
    await TmaEntreprise.create({ tma: tma._id, entreprise: new mongoose.Types.ObjectId(), montantDevis: 3000 })
    await TmaEntreprise.create({ tma: tma._id, entreprise: new mongoose.Types.ObjectId(), montantDevis: 2000 })

    const tmaRecalculee = await recalculerTma(tma._id)

    expect(tmaRecalculee.montantEntreprises).toBe(5000)
    expect(tmaRecalculee.statut).toBe('chiffre')
    expect(tmaRecalculee.montantClient).toBe(6500) // 5 000 × 1.3 (taux par défaut)
  })

  it('reste à "étude" tant qu\'une seule entreprise sur deux a répondu (ne bascule pas prématurément)', async () => {
    const { tma } = await creerTma()
    await TmaEntreprise.create({ tma: tma._id, entreprise: new mongoose.Types.ObjectId(), montantDevis: 3000 })
    // 2ᵉ entreprise sollicitée mais pas encore de devis reçu (montantDevis vide)
    await TmaEntreprise.create({ tma: tma._id, entreprise: new mongoose.Types.ObjectId() })

    const tmaRecalculee = await recalculerTma(tma._id)

    expect(tmaRecalculee.montantEntreprises).toBeNull()
    expect(tmaRecalculee.statut).toBe('etude')
  })

  it('ne recalcule jamais montantClient si montantClientManuel est activé, même avec de nouveaux devis', async () => {
    const { tma } = await creerTma({ montantClientManuel: true, montantClient: 9999 })
    await TmaEntreprise.create({ tma: tma._id, entreprise: new mongoose.Types.ObjectId(), montantDevis: 3000 })
    await TmaEntreprise.create({ tma: tma._id, entreprise: new mongoose.Types.ObjectId(), montantDevis: 2000 })

    const tmaRecalculee = await recalculerTma(tma._id)

    expect(tmaRecalculee.montantEntreprises).toBe(5000) // toujours recalculé
    expect(tmaRecalculee.montantClient).toBe(9999) // jamais touché, saisi à la main
  })

  it('une TMA réellement validée (dates de facture ET de retour client renseignées) garde son montant client figé, même avec de nouveaux devis', async () => {
    const { tma } = await creerTma({
      statut: 'valide',
      montantClient: 6500,
      dateEnvoiFactureClient: new Date('2026-06-01'),
      dateRetourClient: new Date('2026-06-10'),
    })
    await TmaEntreprise.create({ tma: tma._id, entreprise: new mongoose.Types.ObjectId(), montantDevis: 9000 })
    await TmaEntreprise.create({ tma: tma._id, entreprise: new mongoose.Types.ObjectId(), montantDevis: 9000 })

    const tmaRecalculee = await recalculerTma(tma._id)

    expect(tmaRecalculee.statut).toBe('valide') // re-dérivé des dates, reste cohérent
    expect(tmaRecalculee.montantClient).toBe(6500) // jamais recalculé (18 000 × 1.3 ferait 23 400)
  })
})
