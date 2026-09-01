import { describe, it, expect } from 'vitest'
import { calculerStatutAutomatique, calculerMontantClient } from './Tma.js'

describe('calculerStatutAutomatique', () => {
  it('renvoie "demande" sans aucune date renseignée', () => {
    expect(calculerStatutAutomatique({})).toBe('demande')
  })

  it('renvoie "etude" dès que dateEnvoiEntreprises est renseignée', () => {
    expect(calculerStatutAutomatique({ dateEnvoiEntreprises: new Date() })).toBe('etude')
  })

  it('renvoie "chiffre" dès que montantEntreprises est renseigné (positif)', () => {
    expect(calculerStatutAutomatique({
      dateEnvoiEntreprises: new Date(),
      montantEntreprises: 5000,
    })).toBe('chiffre')
  })

  it('renvoie "chiffre" avec montantEntreprises à 0 — pas "pas encore chiffré" (bug historique du point 142, comparaison naïve sur une valeur "falsy")', () => {
    expect(calculerStatutAutomatique({
      dateEnvoiEntreprises: new Date(),
      montantEntreprises: 0,
    })).toBe('chiffre')
  })

  it('reste à "etude" tant que montantEntreprises est null (devis pas encore tous reçus)', () => {
    expect(calculerStatutAutomatique({
      dateEnvoiEntreprises: new Date(),
      montantEntreprises: null,
    })).toBe('etude')
  })

  it('renvoie "facture" dès que dateEnvoiFactureClient est renseignée', () => {
    expect(calculerStatutAutomatique({
      dateEnvoiEntreprises: new Date(),
      montantEntreprises: 5000,
      dateEnvoiFactureClient: new Date(),
    })).toBe('facture')
  })

  it('renvoie "valide" dès que dateRetourClient est renseignée, priorité sur tout le reste', () => {
    expect(calculerStatutAutomatique({
      dateEnvoiEntreprises: new Date(),
      montantEntreprises: 5000,
      dateEnvoiFactureClient: new Date(),
      dateRetourClient: new Date(),
    })).toBe('valide')
  })
})

describe('calculerMontantClient', () => {
  it('applique le taux de marge par défaut (1.3) sur un montant positif', () => {
    expect(calculerMontantClient(1000, {})).toBe(1300)
  })

  it('applique un taux de marge personnalisé du programme', () => {
    expect(calculerMontantClient(1000, { tauxMargeTma: 1.5 })).toBe(1500)
  })

  it('renvoie 0€ sur un avoir (montant négatif) avec la règle par défaut', () => {
    expect(calculerMontantClient(-500, {})).toBe(0)
  })

  it('renvoie le montant tel quel sur un avoir avec la règle "avoir_sans_marge"', () => {
    expect(calculerMontantClient(-500, { regleMontantNegatifTma: 'avoir_sans_marge' })).toBe(-500)
  })

  it('renvoie null si montantEntreprises est null et qu\'aucun frais n\'est activé', () => {
    expect(calculerMontantClient(null, {})).toBeNull()
  })

  it('renvoie le frais d\'ouverture de dossier seul si montantEntreprises est null mais que le frais est activé (dossier ouvert dès la création)', () => {
    expect(calculerMontantClient(null, {
      appliquerFraisOuvertureDossierTma: true,
      fraisOuvertureDossierTma: 150,
    })).toBe(150)
  })

  it('ajoute le frais d\'ouverture de dossier même sur un avoir', () => {
    expect(calculerMontantClient(-500, {
      appliquerFraisOuvertureDossierTma: true,
      fraisOuvertureDossierTma: 150,
    })).toBe(150)
  })

  it('ajoute le frais d\'ouverture de dossier au-dessus du montant avec marge', () => {
    expect(calculerMontantClient(1000, {
      appliquerFraisOuvertureDossierTma: true,
      fraisOuvertureDossierTma: 150,
    })).toBe(1450)
  })

  it('ignore le frais d\'ouverture de dossier si la case "À appliquer" n\'est pas cochée, même si un montant de frais est renseigné', () => {
    expect(calculerMontantClient(1000, {
      appliquerFraisOuvertureDossierTma: false,
      fraisOuvertureDossierTma: 150,
    })).toBe(1300)
  })
})
