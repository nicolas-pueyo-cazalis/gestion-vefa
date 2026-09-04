// @vitest-environment jsdom
//
// Tests état/affichage/API de Lots.jsx (chantier "sécuriser avant
// découpage", point 236, dernière des 3 pages) — distinct de
// Lots.test.js (fonctions pures). Mock par routeur d'URL, comme
// Tma.render.test.jsx (chargement en cascade : lots, acquéreurs, annexes,
// historique).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Lots from './Lots.jsx'

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
  parametres: { tauxTva: 0.2 },
}

const acquereurA = {
  _id: 'acqA',
  civilite: 'M.',
  prenom: 'Nicolas',
  nom: 'Cazalis',
  sansPret: false,
  dateOffrePretRecue: null,
}
const acquereurB = {
  _id: 'acqB',
  civilite: 'Mme',
  prenom: 'Julie',
  nom: 'Martin',
  sansPret: false,
  dateOffrePretRecue: null,
}

// A01 (réservé, pas encore acté : prix modifiable) ; B01 (acté, offre de
// prêt manquante : avertissement) ; C01 (libre, pas de client).
const lotA = {
  _id: 'lotA',
  reference: 'A01',
  statut: 'reserve',
  etage: 'R+1',
  type: 'T3',
  orientation: 'Sud',
  surfaceHabitable: 65,
  prixTTC: 250000,
  acquereur: acquereurA,
  commentaire: '',
  dateReservation: '2026-01-10',
}
const lotB = {
  _id: 'lotB',
  reference: 'B01',
  statut: 'acte',
  etage: 'R+2',
  type: 'T2',
  orientation: 'Est',
  surfaceHabitable: 45,
  prixTTC: 180000,
  acquereur: acquereurB,
  commentaire: '',
  dateActe: '2026-02-01',
}
const lotC = {
  _id: 'lotC',
  reference: 'C01',
  statut: 'libre',
  etage: 'RDC',
  type: 'T1',
  orientation: 'Nord',
  surfaceHabitable: 30,
  prixTTC: 120000,
  acquereur: null,
  commentaire: '',
}
const lots = [lotA, lotB, lotC]
const acquereurs = [acquereurA, acquereurB]
const annexes = [{ _id: 'an1', type: 'parking_ext', numero: 5, prix: 15000, lot: null }]
const historiqueAnnulations = [
  {
    _id: 'ha1',
    lot: 'lotD',
    referenceLot: 'D01',
    statutAvantAnnulation: 'reserve',
    dateReservation: '2026-01-01',
    civiliteClient: 'M.',
    prenomClient: 'Paul',
    nomClient: 'Dupont',
    commentaire: '',
    dateAnnulation: '2026-02-01',
    appelsDeFonds: [],
    sansPret: true,
    banque: null,
    courtier: null,
    notaire: null,
  },
]
const historiqueModificationsPrix = [
  {
    _id: 'hp1',
    referenceLot: 'A01',
    ancienPrix: 240000,
    nouveauPrix: 250000,
    motif: 'Négociation',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
]

function creerRouteurApi() {
  return (url, options = {}) => {
    const methode = options.method ?? 'GET'
    if (url.includes('/api/acquereurs')) return Promise.resolve(reponseJson(acquereurs))
    if (url.includes('/api/annexes')) return Promise.resolve(reponseJson(annexes))
    if (url.includes('/api/historique-annulations'))
      return Promise.resolve(reponseJson(historiqueAnnulations))
    if (url.includes('/api/historique-modifications-prix'))
      return Promise.resolve(reponseJson(historiqueModificationsPrix))
    if (url.includes('/api/tma')) return Promise.resolve(reponseJson([]))
    if (/\/api\/lots\/[^/]+\/prix$/.test(url) && methode === 'PATCH')
      return Promise.resolve(reponseJson({ ok: true }))
    if (/\/api\/lots\/[^/]+\/annuler$/.test(url) && methode === 'POST')
      return Promise.resolve(reponseJson({ ok: true }))
    if (/\/api\/lots\/[^/]+$/.test(url) && methode === 'PATCH')
      return Promise.resolve(reponseJson({ ok: true }))
    if (url.endsWith('/api/lots') && methode === 'POST')
      return Promise.resolve(reponseJson({ _id: 'nouveauLot', ...JSON.parse(options.body) }))
    if (url.includes('/api/lots')) return Promise.resolve(reponseJson(lots))
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

describe('Lots — chargement', () => {
  it('affiche un message de chargement pendant le fetch initial', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}))
    render(<Lots />)
    expect(screen.getByText('Chargement des lots...')).toBeInTheDocument()
  })

  it("affiche un message d'erreur si le fetch initial échoue", async () => {
    mockApiFetch.mockImplementation(() => Promise.reject(new Error('Serveur injoignable')))
    render(<Lots />)
    await waitFor(() =>
      expect(screen.getByText(/Erreur : Serveur injoignable/)).toBeInTheDocument(),
    )
  })
})

describe('Lots — rendu principal', () => {
  it('affiche les cartes et le tableau, signale une offre de prêt manquante', async () => {
    render(<Lots />)
    const tableau = await screen.findByRole('table')

    expect(screen.getByText('Lots au total').nextSibling).toHaveTextContent('3')
    expect(within(tableau).getByText('A01')).toBeInTheDocument()
    expect(within(tableau).getByText('B01')).toBeInTheDocument()
    // B01 est Acté sans offre de prêt reçue (et pas "sans prêt").
    expect(within(tableau).getByText('Offre de prêt non reçue')).toBeInTheDocument()
  })
})

describe('Lots — filtres', () => {
  it('filtre par statut', async () => {
    render(<Lots />)
    const tableau = await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: 'Acté' }))
    expect(within(tableau).queryByText('A01')).not.toBeInTheDocument()
    expect(within(tableau).getByText('B01')).toBeInTheDocument()
  })

  it('la barre de recherche retire les lignes ne correspondant pas', async () => {
    render(<Lots />)
    const tableau = await screen.findByRole('table')

    fireEvent.change(screen.getByPlaceholderText('Rechercher un lot...'), {
      target: { value: 'C01' },
    })
    expect(within(tableau).queryByText('A01')).not.toBeInTheDocument()
    expect(within(tableau).getByText('C01')).toBeInTheDocument()
  })
})

describe('Lots — panneau "Modifier"', () => {
  it('un clic sur le crayon ouvre le panneau, un second en ferme un autre', async () => {
    render(<Lots />)
    await screen.findByRole('table')

    const boutons = screen.getAllByLabelText('Modifier')
    fireEvent.click(boutons[0])
    expect(screen.getByText('Enregistrer')).toBeInTheDocument()

    fireEvent.click(boutons[1])
    expect(screen.getAllByText('Enregistrer')).toHaveLength(1)
  })

  it('soumission réussie : recharge et ferme le panneau', async () => {
    render(<Lots />)
    await screen.findByRole('table')
    fireEvent.click(screen.getAllByLabelText('Modifier')[0])
    fireEvent.click(screen.getByText('Enregistrer'))

    // "Statut" est ambigu (aussi l'en-tête de colonne du tableau) — "Date
    // option" n'existe que dans le panneau.
    await waitFor(() => expect(screen.queryByText('Date option')).not.toBeInTheDocument())
  })

  it('soumission en échec : alerte, panneau reste ouvert', async () => {
    render(<Lots />)
    await screen.findByRole('table')
    fireEvent.click(screen.getAllByLabelText('Modifier')[0])
    mockApiFetch.mockImplementationOnce(() =>
      Promise.resolve(reponseJson({ message: 'Erreur serveur' }, false)),
    )
    fireEvent.click(screen.getByText('Enregistrer'))

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith('Erreur serveur'))
    expect(screen.getByText('Date option')).toBeInTheDocument()
  })

  it('"Annuler la vente" demande confirmation puis annule', async () => {
    render(<Lots />)
    await screen.findByRole('table')
    fireEvent.click(screen.getAllByLabelText('Modifier')[0]) // A01, statut != libre

    fireEvent.click(screen.getByText('Annuler la vente'))
    expect(globalThis.confirm).toHaveBeenCalled()
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/lots/lotA/annuler'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })
})

describe('Lots — modification du prix', () => {
  it('changer le prix avec succès ferme le sous-panneau (voir docs/bugs.md)', async () => {
    render(<Lots />)
    await screen.findByRole('table')
    // A01 (réservé, pas encore Acté) : le prix reste modifiable.
    fireEvent.click(screen.getAllByLabelText('Modifier')[0])
    fireEvent.click(screen.getByText('Modifier le prix'))

    fireEvent.change(screen.getByLabelText('Nouveau prix du logement (€)'), {
      target: { value: '260000' },
    })
    fireEvent.change(screen.getByLabelText('Motif'), { target: { value: 'Négociation' } })
    fireEvent.click(screen.getByText('Enregistrer le prix'))

    await waitFor(() => expect(screen.queryByText('Prix du logement')).not.toBeInTheDocument())
  })
})

describe("Lots — vente d'annexe", () => {
  it('création réussie : recharge et ferme le panneau', async () => {
    render(<Lots />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Vendre une annexe'))

    fireEvent.change(screen.getByLabelText('Annexe'), { target: { value: 'an1' } })
    fireEvent.click(screen.getByText('Créer'))

    // Le bouton "Vendre une annexe" ne disparaît pas : c'est lui qui
    // réapparaît une fois le panneau refermé (rendu conditionnel inversé) —
    // on vérifie donc la disparition du panneau lui-même.
    await waitFor(() => expect(screen.queryByLabelText('Annexe')).not.toBeInTheDocument())
    expect(screen.getByText('Vendre une annexe')).toBeInTheDocument()
  })
})

describe('Lots — historique', () => {
  it("masqué par défaut, affiché au clic, avec le détail d'une annulation", async () => {
    render(<Lots />)
    await screen.findByRole('table')

    expect(screen.queryByText('Ventes annulées')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Historique (ventes annulées, modifications de prix)'))

    expect(screen.getByText('Ventes annulées')).toBeInTheDocument()
    expect(screen.getByText('D01')).toBeInTheDocument()
    expect(screen.getByText('Modifications de prix')).toBeInTheDocument()
    expect(screen.getByText('Négociation')).toBeInTheDocument()

    // "Détail" est ambigu (aussi l'en-tête de colonne du tableau des
    // annulations) — seul le bouton est un rôle "button".
    fireEvent.click(screen.getByRole('button', { name: 'Détail' }))
    expect(screen.getByText('Acquisition avec fonds personnels.')).toBeInTheDocument()

    // Vrai bascule (setIdAnnulationOuverte(id === entree._id ? null : id)) :
    // un 2e clic sur le même bouton (devenu "Masquer") doit refermer le
    // détail — pas seulement l'ouvrir (trou trouvé sur Tma.jsx/
    // AppelsDeFonds.jsx, corrigé ici en amont).
    fireEvent.click(screen.getByRole('button', { name: 'Masquer' }))
    expect(screen.queryByText('Acquisition avec fonds personnels.')).not.toBeInTheDocument()
  })
})

describe('Lots — export', () => {
  it('export "Tableau récapitulatif des lots" construit les bonnes lignes', async () => {
    render(<Lots />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    fireEvent.click(screen.getByLabelText('Tableau récapitulatif des lots'))
    fireEvent.click(screen.getByText('Exporter en PDF'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.lignes).toHaveLength(3)
    expect(donnees.entetes[0]).toBe('Lot')
  })

  it('export "Statistiques (cartes)" construit les bons indicateurs', async () => {
    render(<Lots />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    fireEvent.click(screen.getByLabelText('Statistiques (cartes)'))
    fireEvent.click(screen.getByText('Exporter en PDF'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.lignes).toContainEqual(['Commercialisation — Lots au total', '3'])
  })

  it('export "Historique" construit les deux sections', async () => {
    render(<Lots />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    fireEvent.click(screen.getByLabelText('Historique (annulations, modifications de prix)'))
    fireEvent.click(screen.getByText('Exporter en PDF'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.sections).toHaveLength(2)
    expect(donnees.sections[0].sousTitre).toBe('Ventes annulées')
  })

  it('export "Annexes à la vente" ne liste que les annexes disponibles', async () => {
    render(<Lots />)
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Exporter'))
    fireEvent.click(screen.getByLabelText('Annexes à la vente'))
    fireEvent.click(screen.getByText('Exporter en PDF'))

    await waitFor(() => expect(mockExporterPDF).toHaveBeenCalled())
    const donnees = mockExporterPDF.mock.calls[0][0]
    expect(donnees.lignes).toHaveLength(1)
  })
})
