import { describe, it, expect } from 'vitest'
import {
  texteRechercheLot,
  pluraliser,
  prixParM2,
  formatteDecimales,
  afficheSurface,
  ligneSurfaces,
  ligneAnnexesType,
  afficheAnnexes,
  dateActuelle,
  offrePretManquante,
  nomClient,
  derniereDateAnnulation,
} from './Lots.jsx'

describe('prixParM2', () => {
  it('divise le prix TTC par la surface habitable', () => {
    expect(prixParM2({ prixTTC: 200000, surfaceHabitable: 40 })).toBe(5000)
  })

  it('renvoie null si la surface habitable est absente ou à 0 (pas de division par zéro)', () => {
    expect(prixParM2({ prixTTC: 200000, surfaceHabitable: null })).toBeNull()
    expect(prixParM2({ prixTTC: 200000, surfaceHabitable: 0 })).toBeNull()
  })
})

describe('formatteDecimales', () => {
  it('affiche toujours 2 décimales, même pour un nombre rond', () => {
    expect(formatteDecimales(45)).toBe('45,00')
  })
})

describe('afficheSurface', () => {
  it("formate une surface avec l'unité m²", () => {
    expect(afficheSurface(45)).toBe('45,00 m²')
  })

  it('renvoie un tiret cadratin si la valeur est absente', () => {
    expect(afficheSurface(null)).toBe('—')
    expect(afficheSurface(undefined)).toBe('—')
  })
})

describe('pluraliser', () => {
  it('laisse le libellé inchangé au singulier', () => {
    expect(pluraliser('Parking extérieur', false)).toBe('Parking extérieur')
  })

  it('accorde chaque mot du libellé au pluriel (pas seulement la fin de la phrase)', () => {
    expect(pluraliser('Parking extérieur', true)).toBe('Parkings extérieurs')
  })

  it("fonctionne aussi sur un libellé d'un seul mot", () => {
    expect(pluraliser('Cave', true)).toBe('Caves')
  })
})

describe('ligneSurfaces', () => {
  it('renvoie null si aucune valeur (catégorie absente, pas de ligne vide)', () => {
    expect(ligneSurfaces('Terrasse', [])).toBeNull()
    expect(ligneSurfaces('Terrasse', undefined)).toBeNull()
  })

  it('met "Terrasse" au singulier avec une seule valeur', () => {
    expect(ligneSurfaces('Terrasse', [12.5])).toBe('Terrasse : 12,50 m²')
  })

  it('met "Terrasses" au pluriel avec plusieurs valeurs', () => {
    expect(ligneSurfaces('Terrasse', [12.5, 8])).toBe('Terrasses : 12,50 m², 8,00 m²')
  })
})

describe('ligneAnnexesType', () => {
  const annexes = [
    { type: 'parking_ext', numero: 3 },
    { type: 'cave', numero: 7 },
    { type: 'parking_ext', numero: 5 },
  ]

  it('filtre les annexes par type et liste leurs numéros, avec un pluriel grammaticalement correct sur les 2 mots', () => {
    expect(ligneAnnexesType('Parking extérieur', annexes, 'parking_ext')).toBe(
      'Parkings extérieurs n° 3, 5',
    )
  })

  it('renvoie null si aucune annexe de ce type', () => {
    expect(ligneAnnexesType('Cellier', annexes, 'cellier')).toBeNull()
  })
})

describe('afficheAnnexes', () => {
  it('omet les catégories vides, ne garde que celles présentes', () => {
    const lot = {
      surfacesTerrasses: [12.5],
      surfacesBalcons: [],
      surfacesLoggias: null,
      surfaceJardin: null,
      annexes: [{ type: 'cave', numero: 2 }],
    }
    expect(afficheAnnexes(lot)).toEqual(['Terrasse : 12,50 m²', 'Cave n° 2'])
  })

  it("renvoie un tableau vide si le lot n'a aucune annexe", () => {
    expect(afficheAnnexes({})).toEqual([])
  })
})

describe('dateActuelle', () => {
  it("priorise la date d'acte sur la réservation et l'option", () => {
    const lot = { dateActe: '2026-09-01', dateReservation: '2026-06-01', dateOption: '2026-01-01' }
    expect(dateActuelle(lot)).toBe('01/09/2026')
  })

  it("utilise la date de réservation si pas d'acte", () => {
    const lot = { dateReservation: '2026-06-01', dateOption: '2026-01-01' }
    expect(dateActuelle(lot)).toBe('01/06/2026')
  })

  it('renvoie un tiret cadratin si aucune date (lot encore libre)', () => {
    expect(dateActuelle({})).toBe('—')
  })
})

describe('offrePretManquante', () => {
  it('vrai pour un lot Acté, avec acquéreur, sans offre reçue et sans "sans prêt"', () => {
    const lot = { statut: 'acte', acquereur: { sansPret: false, dateOffrePretRecue: null } }
    expect(offrePretManquante(lot)).toBe(true)
  })

  it('faux si l\'acquéreur est explicitement "sans prêt"', () => {
    const lot = { statut: 'acte', acquereur: { sansPret: true, dateOffrePretRecue: null } }
    expect(offrePretManquante(lot)).toBeFalsy()
  })

  it("faux si le lot n'est pas encore Acté", () => {
    const lot = { statut: 'reserve', acquereur: { sansPret: false, dateOffrePretRecue: null } }
    expect(offrePretManquante(lot)).toBeFalsy()
  })
})

describe('nomClient', () => {
  it("assemble civilité, prénom et nom de l'historique", () => {
    expect(nomClient({ civiliteClient: 'M.', prenomClient: 'Nicolas', nomClient: 'Cazalis' })).toBe(
      'M. Nicolas Cazalis',
    )
  })

  it("renvoie un tiret cadratin si rien n'est renseigné", () => {
    expect(nomClient({})).toBe('—')
  })
})

describe('derniereDateAnnulation', () => {
  it("priorise la date d'acte, comme dateActuelle", () => {
    expect(derniereDateAnnulation({ dateActe: '2026-09-01', dateReservation: '2026-06-01' })).toBe(
      '01/09/2026',
    )
  })
})

describe('texteRechercheLot', () => {
  it('inclut la référence, le statut et le nom du client dans le texte de recherche', () => {
    const lot = {
      reference: 'A01',
      statut: 'acte',
      prixTTC: 200000,
      surfaceHabitable: 40,
      acquereur: { civilite: 'M.', prenom: 'Nicolas', nom: 'Cazalis' },
    }
    const texte = texteRechercheLot(lot)
    expect(texte).toContain('A01')
    expect(texte).toContain('Acté')
    expect(texte).toContain('Nicolas Cazalis')
  })
})
