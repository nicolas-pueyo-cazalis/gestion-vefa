// @vitest-environment jsdom
//
// Tests état/affichage/API de AppelsDeFonds.jsx (chantier "sécuriser avant
// découpage", point 236) — distinct de AppelsDeFonds.test.js (fonctions
// pures). Mêmes patterns de mock que ChoixProgramme.test.jsx (chantier 12).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import AppelsDeFonds from './AppelsDeFonds.jsx'

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
  maitreOuvrage: 'Maître Ouvrage Test',
  iban: 'FR7612345',
  bic: 'ABCDEFGH',
  parametres: {
    baremePhases: [
      { nom: 'Réservation', pourcentage: 0.1, ordre: 1 },
      { nom: 'Fondations', pourcentage: 0.3, ordre: 2 },
      { nom: 'Hors eau', pourcentage: 0.6, ordre: 3 },
    ],
    tauxTva: 0.2,
  },
}

const lotA = {
  _id: 'lotA',
  reference: 'A01',
  prixTTC: 200000,
  acquereur: { civilite: 'M.', prenom: 'Nicolas', nom: 'Cazalis' },
}
const lotB = { _id: 'lotB', reference: 'B01', prixTTC: 150000, acquereur: null }

function appel(id, lot, phase, extra = {}) {
  return {
    _id: id,
    lot,
    phase,
    montant: Math.round(lot.prixTTC * phase.pourcentage),
    commentaire: '',
    ...extra,
  }
}

// A01 : Réservation réglée, Fondations émise (pas en retard), Hors eau en attente.
// B01 : Réservation en retard, Fondations à émettre, Hors eau en attente.
const appels = [
  appel('a1', lotA, programme.parametres.baremePhases[0], {
    dateEmission: '2026-01-01',
    dateReglement: '2026-01-05',
  }),
  appel('a2', lotA, programme.parametres.baremePhases[1], {
    dateAttestationMOE: '2026-02-01',
    dateEmission: '2026-02-05',
    dateLimiteReglement: '2099-01-01',
  }),
  appel('a3', lotA, programme.parametres.baremePhases[2], {}),
  appel('b1', lotB, programme.parametres.baremePhases[0], {
    dateEmission: '2026-01-01',
    dateLimiteReglement: '2020-01-01',
  }),
  appel('b2', lotB, programme.parametres.baremePhases[1], {
    dateAttestationMOE: '2026-02-01',
  }),
  appel('b3', lotB, programme.parametres.baremePhases[2], {}),
]

beforeEach(() => {
  // mockReset() (pas juste clearAllMocks() du test-setup.js global, qui ne
  // vide pas la file de mockResolvedValueOnce) : sans ça, une réponse
  // "once" non consommée par un test fuit sur le test suivant.
  mockApiFetch.mockReset()
  mockUseProgramme.mockReturnValue({ programmeActif: programme })
  vi.stubGlobal('alert', vi.fn())
})

describe('AppelsDeFonds — chargement', () => {
  it('affiche un message de chargement pendant le fetch initial', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}))
    render(<AppelsDeFonds />)
    expect(screen.getByText('Chargement des appels de fonds...')).toBeInTheDocument()
  })

  it("affiche un message d'erreur si le fetch initial échoue", async () => {
    mockApiFetch.mockRejectedValue(new Error('Serveur injoignable'))
    render(<AppelsDeFonds />)
    await waitFor(() =>
      expect(screen.getByText(/Erreur : Serveur injoignable/)).toBeInTheDocument(),
    )
  })
})

describe('AppelsDeFonds — rendu principal', () => {
  it('affiche les cartes de statistiques et le tableau à partir des données chargées', async () => {
    mockApiFetch.mockResolvedValue(reponseJson(appels))
    render(<AppelsDeFonds />)
    const tableau = await screen.findByRole('table')

    expect(screen.getByText('Appels au total').nextSibling).toHaveTextContent('6')
    expect(screen.getByText('Réglés').nextSibling).toHaveTextContent('1')
    expect(within(tableau).getAllByText('A01')).toHaveLength(3)
    expect(within(tableau).getAllByText('B01')).toHaveLength(3)
  })
})

describe('AppelsDeFonds — filtres', () => {
  beforeEach(() => {
    mockApiFetch.mockResolvedValue(reponseJson(appels))
  })

  it('filtre par statut', async () => {
    render(<AppelsDeFonds />)
    const tableau = await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: 'Réglé' }))
    // Seul a1 (A01/Réservation) est "réglé" — les autres lignes disparaissent.
    expect(within(tableau).queryByText('Hors eau')).not.toBeInTheDocument()
    expect(within(tableau).getAllByText('A01')).toHaveLength(1)
  })

  it('filtre par phase (multi)', async () => {
    render(<AppelsDeFonds />)
    const tableau = await screen.findByRole('table')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Réservation' }))
    // Seules les lignes "Réservation" (a1, b1) restent.
    expect(within(tableau).getAllByText('Réservation')).toHaveLength(2)
    expect(within(tableau).queryByText('Fondations')).not.toBeInTheDocument()
  })

  it('filtre par lot (multi)', async () => {
    render(<AppelsDeFonds />)
    const tableau = await screen.findByRole('table')

    fireEvent.click(screen.getByRole('checkbox', { name: 'A01' }))
    expect(within(tableau).queryByText('B01')).not.toBeInTheDocument()
    expect(within(tableau).getAllByText('A01')).toHaveLength(3)
  })

  it('la barre de recherche retire les lignes ne correspondant pas', async () => {
    render(<AppelsDeFonds />)
    const tableau = await screen.findByRole('table')

    fireEvent.change(screen.getByPlaceholderText('Rechercher un appel de fonds...'), {
      target: { value: 'B01' },
    })
    expect(within(tableau).queryByText('A01')).not.toBeInTheDocument()
    expect(within(tableau).getAllByText('B01')).toHaveLength(3)
  })
})

describe('AppelsDeFonds — récapitulatif par lot', () => {
  it('masqué par défaut, affiché au clic avec les bonnes lignes et totaux', async () => {
    mockApiFetch.mockResolvedValue(reponseJson(appels))
    render(<AppelsDeFonds />)
    await screen.findByRole('table')

    expect(screen.queryByText('Reste à payer')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Voir le récapitulatif par lot'))

    const enteteRecap = screen.getByText('Reste à payer')
    const tableauRecap = enteteRecap.closest('table')
    // Solde restant dû A01 = prixTTC - payé = 200000 - 20000 (seul a1 réglé).
    const ligneA01 = within(tableauRecap).getByText('A01').closest('tr')
    expect(within(ligneA01).getByText(/180 000,00/)).toBeInTheDocument()
  })

  it("affiche un message si aucun appel de fonds n'existe", async () => {
    mockApiFetch.mockResolvedValue(reponseJson([]))
    render(<AppelsDeFonds />)
    await waitFor(() => screen.getByText('Aucun appel de fonds ne correspond à ce filtre.'))
    fireEvent.click(screen.getByText('Voir le récapitulatif par lot'))
    expect(screen.getByText("Aucun appel de fonds pour l'instant.")).toBeInTheDocument()
  })
})

describe('AppelsDeFonds — panneau "Modifier"', () => {
  it('un clic sur le crayon ouvre le panneau, un second en ferme un autre', async () => {
    mockApiFetch.mockResolvedValue(reponseJson(appels))
    render(<AppelsDeFonds />)
    await screen.findByRole('table')

    const boutons = screen.getAllByLabelText('Modifier')
    fireEvent.click(boutons[0])
    expect(screen.getByText('Enregistrer')).toBeInTheDocument()

    fireEvent.click(boutons[1])
    // Toujours un seul formulaire ouvert (un seul bouton "Enregistrer").
    expect(screen.getAllByText('Enregistrer')).toHaveLength(1)
  })

  it('soumission réussie : recharge et ferme le panneau', async () => {
    mockApiFetch
      .mockResolvedValueOnce(reponseJson(appels)) // chargement initial
      .mockResolvedValueOnce(reponseJson({ ...appels[0], commentaire: 'màj' })) // PATCH
      .mockResolvedValueOnce(reponseJson(appels)) // rechargement

    render(<AppelsDeFonds />)
    await screen.findByRole('table')
    fireEvent.click(screen.getAllByLabelText('Modifier')[0])
    fireEvent.click(screen.getByText('Enregistrer'))

    await waitFor(() => expect(screen.queryByText('Annuler')).not.toBeInTheDocument())
    expect(mockApiFetch).toHaveBeenCalledTimes(3)
  })

  it('soumission en échec : alerte le message serveur, panneau reste ouvert', async () => {
    mockApiFetch
      .mockResolvedValueOnce(reponseJson(appels))
      .mockResolvedValueOnce(reponseJson({ message: 'Erreur serveur' }, false))

    render(<AppelsDeFonds />)
    await screen.findByRole('table')
    fireEvent.click(screen.getAllByLabelText('Modifier')[0])
    fireEvent.click(screen.getByText('Enregistrer'))

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith('Erreur serveur'))
    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })
})

describe('AppelsDeFonds — attestation en masse', () => {
  it('soumission réussie : alerte le nombre mis à jour et recharge', async () => {
    mockApiFetch
      .mockResolvedValueOnce(reponseJson(appels))
      .mockResolvedValueOnce(reponseJson({ nombreMisAJour: 3 }))
      .mockResolvedValueOnce(reponseJson(appels))

    render(<AppelsDeFonds />)
    await screen.findByRole('table')

    fireEvent.change(screen.getByLabelText('Phase'), { target: { value: 'Fondations' } })
    fireEvent.change(screen.getByLabelText('Date attestation MOE'), {
      target: { value: '2026-03-01' },
    })
    fireEvent.click(screen.getByText('Appliquer à tous les lots de cette phase'))

    await waitFor(() =>
      expect(globalThis.alert).toHaveBeenCalledWith('3 appel(s) de fonds mis à jour.'),
    )
  })
})

describe('AppelsDeFonds — export', () => {
  beforeEach(() => {
    mockApiFetch.mockResolvedValue(reponseJson(appels))
  })

  it('export "Statistiques" construit les bons indicateurs', async () => {
    render(<AppelsDeFonds />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    fireEvent.click(screen.getByLabelText('Statistiques (cartes)'))
    fireEvent.click(screen.getByText('Exporter en PDF'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.lignes).toContainEqual(['Appels au total', '6'])
    expect(donnees.lignes).toContainEqual(['Réglés', '1'])
  })

  it('export "Récapitulatif par lot" construit les bonnes lignes et le total', async () => {
    render(<AppelsDeFonds />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    fireEvent.click(screen.getByLabelText('Récapitulatif par lot'))
    fireEvent.click(screen.getByText('Exporter en PDF'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.entetes).toEqual([
      'Lot',
      'Prix TTC',
      'Total émis',
      'Total payé',
      'Reste à payer',
    ])
    expect(donnees.lignesTotal).toHaveLength(1)
  })

  it('export "Récapitulatif détaillé par phase" construit les bonnes colonnes par phase', async () => {
    render(<AppelsDeFonds />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    fireEvent.click(screen.getByLabelText('Récapitulatif détaillé par phase'))
    fireEvent.click(screen.getByText('Exporter en PDF'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.pageUnique).toBe(true)
    expect(donnees.largeursMax).toEqual({ 1: 40 })
    expect(donnees.entetes[0]).toBe('Lot')
    expect(donnees.entetes).toContain('Réservation (10%)')
  })

  it('"Générer un appel de fonds" génère un courrier par lot coché et pose "Envoyé le"', async () => {
    mockApiFetch
      .mockResolvedValueOnce(reponseJson(appels)) // chargement initial
      .mockResolvedValueOnce(reponseJson({ ...appels[4], dateEmission: '2026-03-02' })) // PATCH b2
      .mockResolvedValueOnce(reponseJson(appels)) // rechargement

    render(<AppelsDeFonds />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    const dialogue = screen.getByRole('dialog')
    // "Générer un appel de fonds" et "Fondations" sont déjà sélectionnés par
    // défaut à l'ouverture, mais aucun lot n'est coché tant que la phase
    // n'a pas été (re)choisie — comportement actuel de FenetreExport.jsx
    // (`lotsChoisis` démarre à un Set vide, indépendamment de `phaseChoisie`).
    // Changer la phase coche alors automatiquement tous les lots
    // disponibles (ici, seul B01 a une attestation MOE sans être encore
    // émis pour "Fondations") — pas besoin de cocher la case en plus.
    fireEvent.change(within(dialogue).getByLabelText('Quelle phase ?'), {
      target: { value: 'Fondations' },
    })
    fireEvent.click(within(dialogue).getByText('Générer'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    expect(mockApiFetch).toHaveBeenCalledTimes(3)
  })
})
