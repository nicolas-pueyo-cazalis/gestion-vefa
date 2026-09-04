// @vitest-environment jsdom
//
// Tests état/affichage/API de Tma.jsx (chantier "sécuriser avant
// découpage", point 236, suite d'AppelsDeFonds.render.test.jsx) — distinct
// de Tma.test.js (fonctions pures). Mock par routage d'URL (pas de chaîne
// mockResolvedValueOnce positionnelle) : Tma.jsx déclenche déjà 3 GET au
// chargement (lots, tma, tma-entreprises), et ouvrir un panneau déclenche
// 2 GET supplémentaires via DetailEntreprisesTma — trop de combinaisons
// pour suivre un ordre fixe de façon fiable.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Tma from './Tma.jsx'

const mockApiFetch = vi.fn()
vi.mock('../utils/api.js', () => ({
  apiFetch: (...args) => mockApiFetch(...args),
}))

const mockUseProgramme = vi.fn()
vi.mock('../context/ProgrammeContext.jsx', () => ({
  useProgramme: () => mockUseProgramme(),
}))

const mockExporterPDF = vi.fn()
const mockExporterExcel = vi.fn()
vi.mock('../utils/export.js', () => ({
  exporterPDF: (...a) => mockExporterPDF(...a),
  exporterExcel: (...a) => mockExporterExcel(...a),
}))

function reponseJson(corps, ok = true) {
  return { ok, json: () => Promise.resolve(corps) }
}

const programme = {
  _id: 'prog1',
  nom: 'Résidence Test',
  parametres: {
    delaiRetourEntrepriseTmaJours: 15,
    montantClientSaisiManuellement: false,
    tauxTva: 0.2,
  },
}

const lotA = {
  _id: 'lotA',
  reference: 'A01',
  acquereur: { _id: 'acqA', civilite: 'M.', prenom: 'Nicolas', nom: 'Cazalis' },
}
const lotB = {
  _id: 'lotB',
  reference: 'B01',
  acquereur: { _id: 'acqB', civilite: 'Mme', prenom: 'Julie', nom: 'Martin' },
}
const lots = [lotA, lotB]

function tmaFixture(id, lot, statut, extra = {}) {
  return {
    _id: id,
    lot,
    acquereur: lot.acquereur,
    statut,
    dateDemande: '2026-01-10',
    createdAt: '2026-01-10T00:00:00.000Z',
    localisation: 'Cuisine',
    description: 'Ajout prise',
    commentaire: '',
    montantEntreprises: null,
    montantClient: 0,
    dateEnvoiEntreprises: null,
    dateEnvoiFactureClient: null,
    dateRetourClient: null,
    ...extra,
  }
}

const t1 = tmaFixture('t1', lotA, 'demande')
const t2 = tmaFixture('t2', lotA, 'etude', { dateEnvoiEntreprises: '2026-01-15' })
const t3 = tmaFixture('t3', lotB, 'valide', {
  montantEntreprises: 1000,
  montantClient: 1300,
  dateEnvoiFactureClient: '2026-02-01',
  dateRetourClient: '2026-02-05',
})
const t4 = tmaFixture('t4', lotA, 'refuse')
// Obsolète : l'acquéreur ACTUEL du lot B01 (acqB) diffère de l'acquéreur
// d'origine de cette demande (acqAncien) — vente annulée puis relouée.
const t5 = tmaFixture('t5', lotB, 'demande', {
  acquereur: { _id: 'acqAncien', civilite: 'M.', prenom: 'Ancien', nom: 'Client' },
})

const tmaList = [t1, t2, t3, t4, t5]

// En retard pour t2 (délai 15 jours dépassé, aucun devis reçu).
const tmaEntreprisesPage = [
  { _id: 'te1', tma: { _id: 't2' }, montantDevis: null, dateEnvoi: '2020-01-01' },
]

function creerRouteurApi() {
  return (url, options = {}) => {
    const methode = options.method ?? 'GET'
    if (url.includes('/api/lots')) return Promise.resolve(reponseJson(lots))
    if (url.includes('/api/tma-entreprises')) {
      if (url.includes('tma=')) return Promise.resolve(reponseJson([]))
      return Promise.resolve(reponseJson(tmaEntreprisesPage))
    }
    if (url.includes('/api/entreprises')) return Promise.resolve(reponseJson([]))
    if (url.includes('/devis-numero'))
      return Promise.resolve(reponseJson({ numeroDevis: 'TMA-2026-001' }))

    const actionTma = url.match(/\/api\/tma\/([^/]+)\/([a-z-]+)$/)
    if (actionTma && methode === 'PATCH') {
      const [, id, action] = actionTma
      if (action === 'statut') {
        const { statut } = JSON.parse(options.body)
        return Promise.resolve(reponseJson({ _id: id, statut }))
      }
      if (action === 'annuler-refus')
        return Promise.resolve(reponseJson({ _id: id, statut: 'etude' }))
      if (action === 'annuler-annulation')
        return Promise.resolve(reponseJson({ _id: id, statut: 'demande' }))
      if (action === 'annuler-termine')
        return Promise.resolve(reponseJson({ _id: id, statut: 'valide' }))
      return Promise.resolve(reponseJson({ ok: true })) // infos, acquereur, dates
    }
    if (url.endsWith('/api/tma') && methode === 'POST') {
      return Promise.resolve(reponseJson({ _id: 'nouveau', ...JSON.parse(options.body) }))
    }
    if (url.includes('/api/tma')) return Promise.resolve(reponseJson(tmaList))
    return Promise.resolve(reponseJson({}))
  }
}

beforeEach(() => {
  mockApiFetch.mockReset()
  mockApiFetch.mockImplementation(creerRouteurApi())
  mockUseProgramme.mockReturnValue({ programmeActif: programme })
  vi.stubGlobal('alert', vi.fn())
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  )
})

describe('Tma — chargement', () => {
  it('affiche un message de chargement pendant le fetch initial', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}))
    render(<Tma />)
    expect(screen.getByText('Chargement des TMA...')).toBeInTheDocument()
  })

  it("affiche un message d'erreur si le fetch initial échoue", async () => {
    mockApiFetch.mockImplementation(() => Promise.reject(new Error('Serveur injoignable')))
    render(<Tma />)
    await waitFor(() =>
      expect(screen.getByText(/Erreur : Serveur injoignable/)).toBeInTheDocument(),
    )
  })
})

describe('Tma — rendu principal', () => {
  it('affiche les cartes de statistiques et le tableau, gère les TMA obsolètes', async () => {
    render(<Tma />)
    const tableau = await screen.findByRole('table')

    expect(screen.getByText('TMA au total').nextSibling).toHaveTextContent('5')
    expect(screen.getByText('Validées').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Refusées').nextSibling).toHaveTextContent('1')

    // t5 (obsolète) : pas de nom de client, avertissement + bouton de réattribution.
    expect(within(tableau).getByText('Attention, ce logement a été annulé')).toBeInTheDocument()
    expect(within(tableau).getByText('Réattribuer à Mme Julie Martin')).toBeInTheDocument()
  })
})

describe('Tma — filtres', () => {
  it('filtre par statut (liste déroulante)', async () => {
    render(<Tma />)
    const tableau = await screen.findByRole('table')

    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'refuse' } })
    // Seule t4 (refuse) reste.
    expect(within(tableau).getAllByText('A01')).toHaveLength(1)
  })

  it('la barre de recherche retire les lignes ne correspondant pas', async () => {
    render(<Tma />)
    const tableau = await screen.findByRole('table')

    fireEvent.change(screen.getByPlaceholderText('Rechercher une TMA...'), {
      target: { value: 'Cazalis' },
    })
    // Cazalis = acquéreur de A01 (t1, t2, t4 ; t5 est sur B01 avec un autre acquéreur).
    expect(within(tableau).queryByText('Mme Julie Martin')).not.toBeInTheDocument()
  })
})

describe('Tma — création', () => {
  it('le bouton "Ajouter une TMA" ouvre le formulaire et se masque', async () => {
    render(<Tma />)
    await screen.findByRole('table')

    fireEvent.click(screen.getByText('Ajouter une TMA'))
    expect(screen.getByText('Nouvelle TMA')).toBeInTheDocument()
    expect(screen.queryByText('Ajouter une TMA')).not.toBeInTheDocument()
  })

  it('soumission réussie : recharge et ferme le formulaire', async () => {
    render(<Tma />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Ajouter une TMA'))

    fireEvent.change(screen.getByLabelText('Lot'), { target: { value: 'lotA' } })
    fireEvent.click(screen.getByText('Créer'))

    await waitFor(() => expect(screen.queryByText('Nouvelle TMA')).not.toBeInTheDocument())
  })

  it('soumission en échec : alerte le message serveur', async () => {
    render(<Tma />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Ajouter une TMA'))
    mockApiFetch.mockImplementationOnce(() =>
      Promise.resolve(reponseJson({ message: 'Lot déjà occupé' }, false)),
    )

    fireEvent.change(screen.getByLabelText('Lot'), { target: { value: 'lotA' } })
    fireEvent.click(screen.getByText('Créer'))

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith('Lot déjà occupé'))
    expect(screen.getByText('Nouvelle TMA')).toBeInTheDocument()
  })
})

describe('Tma — panneau "Modifier"', () => {
  it('un clic sur le crayon ouvre le panneau, un second en ferme un autre', async () => {
    render(<Tma />)
    await screen.findByRole('table')

    const boutons = screen.getAllByLabelText('Modifier')
    fireEvent.click(boutons[0])
    expect(screen.getByText('Description de la TMA')).toBeInTheDocument()

    fireEvent.click(boutons[1])
    expect(screen.getAllByText('Description de la TMA')).toHaveLength(1)
  })

  it("le panneau 'Modifier les dates' est masqué pour une TMA validée", async () => {
    render(<Tma />)
    await screen.findByRole('table')

    // t1 (demande, 1ère ligne — tri par lot A01 < B01) : dates visibles.
    fireEvent.click(screen.getAllByLabelText('Modifier')[0])
    expect(screen.getByText('Date envoi entreprises')).toBeInTheDocument()
    fireEvent.click(screen.getAllByLabelText('Modifier')[0]) // referme
    // Le crayon BASCULE (contrairement à AppelsDeFonds.jsx où il ouvre
    // seulement) : un 2e clic sur la même ligne doit refermer son propre
    // panneau, pas simplement laisser la place à un autre.
    expect(screen.queryByText('Date envoi entreprises')).not.toBeInTheDocument()

    // t3 (valide, sur B01, 4ᵉ ligne : t1/t2/t4 sur A01 puis t3/t5 sur B01) : dates masquées.
    fireEvent.click(screen.getAllByLabelText('Modifier')[3])
    expect(screen.queryByText('Date envoi entreprises')).not.toBeInTheDocument()
  })

  it('enregistrerInfos réussi : recharge la liste', async () => {
    render(<Tma />)
    await screen.findByRole('table')
    fireEvent.click(screen.getAllByLabelText('Modifier')[0])
    const panneauInfos = screen.getByText('Description de la TMA').closest('tr')
    const appelsAvant = mockApiFetch.mock.calls.length
    fireEvent.click(within(panneauInfos).getByText('Enregistrer'))

    // Comportement réel vérifié dans le code (Tma.jsx, enregistrerInfos) :
    // contrairement à AppelsDeFonds.jsx, le panneau ne se ferme PAS tout
    // seul après un enregistrement réussi — seule la liste est rechargée.
    await waitFor(() => expect(mockApiFetch.mock.calls.length).toBeGreaterThan(appelsAvant))
    expect(screen.getByText('Description de la TMA')).toBeInTheDocument()
  })

  it('enregistrerInfos en échec : alerte, panneau reste ouvert', async () => {
    render(<Tma />)
    await screen.findByRole('table')
    fireEvent.click(screen.getAllByLabelText('Modifier')[0])
    const panneauInfos = screen.getByText('Description de la TMA').closest('tr')
    mockApiFetch.mockImplementationOnce(() =>
      Promise.resolve(reponseJson({ message: 'Erreur serveur' }, false)),
    )
    fireEvent.click(within(panneauInfos).getByText('Enregistrer'))

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith('Erreur serveur'))
    expect(screen.getByText('Description de la TMA')).toBeInTheDocument()
  })
})

describe('Tma — retard entreprise', () => {
  it('affiche "Retard entreprise" pour une TMA "Étude" avec une ligne en retard', async () => {
    render(<Tma />)
    const tableau = await screen.findByRole('table')
    expect(within(tableau).getByText('Retard entreprise')).toBeInTheDocument()
  })
})

describe('Tma — réattribution', () => {
  it('cliquer "Réattribuer" recharge la liste', async () => {
    render(<Tma />)
    await screen.findByRole('table')

    fireEvent.click(screen.getByText('Réattribuer à Mme Julie Martin'))
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tma/t5/acquereur'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
  })
})

describe('Tma — transitions de statut', () => {
  it('"Refuser la TMA" met à jour le badge de statut', async () => {
    render(<Tma />)
    const tableau = await screen.findByRole('table')
    const ligneT1 = within(tableau).getAllByRole('row')[1] // 0 = en-tête ; t1 = 1ère ligne de données

    // Les boutons de transition vivent dans le panneau déplié, pas sur la ligne.
    fireEvent.click(within(ligneT1).getByLabelText('Modifier'))
    fireEvent.click(screen.getByText('Refuser la TMA'))
    await waitFor(() => expect(within(ligneT1).getByText('Refusé')).toBeInTheDocument())
  })

  it('"Annuler le refus" restaure le statut précédent', async () => {
    render(<Tma />)
    const tableau = await screen.findByRole('table')
    // t4 (refuse) est la 3ᵉ ligne de données (index 3 avec l'en-tête).
    const ligneT4 = within(tableau).getAllByRole('row')[3]

    fireEvent.click(within(ligneT4).getByLabelText('Modifier'))
    fireEvent.click(screen.getByText('Annuler le refus'))
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tma/t4/annuler-refus'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
  })
})

describe('Tma — export', () => {
  it('export "Statistiques" construit les bons indicateurs', async () => {
    render(<Tma />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    fireEvent.click(screen.getByLabelText('Statistiques (cartes)'))
    fireEvent.click(screen.getByText('Exporter en PDF'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.lignes).toContainEqual(['TMA au total', '5'])
    expect(donnees.lignes).toContainEqual(['Validées', '1'])
  })

  it('export "Demandes clients" construit les bonnes lignes', async () => {
    render(<Tma />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    fireEvent.click(screen.getByLabelText('Demandes clients'))
    fireEvent.click(screen.getByText('Exporter en PDF'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.entetes[0]).toBe('Lot')
    expect(donnees.lignes).toHaveLength(5)
    expect(donnees.lignesTotal).toHaveLength(3)
  })

  it('export "Détail entreprises" construit une ligne par TMA en gras', async () => {
    render(<Tma />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    fireEvent.click(screen.getByLabelText('Détail entreprises'))
    fireEvent.click(screen.getByText('Exporter en PDF'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.stylesLignes.filter((s) => s === 'gras')).toHaveLength(5)
  })

  it('"Générer devis client" réserve un numéro puis génère le PDF', async () => {
    render(<Tma />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    // Transition réelle (option par défaut = "Statistiques") : déclenche
    // choisirType, qui pré-coche les demandes du premier logement (A01).
    fireEvent.click(screen.getByLabelText('Générer devis client'))
    fireEvent.click(screen.getByText('Générer'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.numeroDevis).toBe('TMA-2026-001')
    expect(donnees.lotReference).toBe('A01')
  })
})
