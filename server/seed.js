import 'dotenv/config'
import mongoose from 'mongoose'
import Programme from './models/Programme.js'
import Lot from './models/Lot.js'
import Acquereur from './models/Acquereur.js'
import Tma, { calculerMontantClient } from './models/Tma.js'

// Données fictives (aucune donnée réelle) — reprises de client/src/data/.
// Une fois les routes de lecture en place, client/src/data/ sera supprimé :
// le front ira chercher ces données via l'API plutôt que de les coder en dur.

const PROGRAMME_DATA = {
  nom: 'Résidence Les Tilleuls',
  maitreOuvrage: 'Atlantide Promotion',
  adresse: '8 rue des Tilleuls',
  commune: 'Bayonne (64100)',
  codePostal: '64100',
  nombreLogements: 8,
  dateLivraison: new Date('2027-06-30'),
}

const LOTS_DATA = [
  { reference: 'A01', etage: 'RDC', type: 'T2', orientation: 'Sud', surfaceHabitable: 45, prixTTC: 210000, statut: 'acte' },
  { reference: 'A02', etage: 'RDC', type: 'T1', orientation: 'Nord', surfaceHabitable: 32, prixTTC: 150000, statut: 'libre' },
  { reference: 'B01', etage: 'R+1', type: 'T3', orientation: 'Sud-Est', surfaceHabitable: 68, prixTTC: 265000, statut: 'reserve' },
  { reference: 'B02', etage: 'R+1', type: 'T2', orientation: 'Est', surfaceHabitable: 48, prixTTC: 198000, statut: 'option' },
  { reference: 'C01', etage: 'R+2', type: 'T4', orientation: 'Sud-Ouest', surfaceHabitable: 92, prixTTC: 320000, statut: 'acte' },
  { reference: 'C02', etage: 'R+2', type: 'T1bis', orientation: 'Ouest', surfaceHabitable: 34, prixTTC: 158000, statut: 'libre' },
  { reference: 'D01', etage: 'R+3', type: 'T3bis', orientation: 'Sud', surfaceHabitable: 72, prixTTC: 275000, statut: 'reserve' },
  { reference: 'D02', etage: 'R+3', type: 'T2bis', orientation: 'Nord-Est', surfaceHabitable: 50, prixTTC: 205000, statut: 'option' },
]

// Chaque acquéreur a une "clé" technique (utilisée pour le lier aux TMA
// ci-dessous), séparée de sa civilité/prénom/nom — ce sont des champs
// distincts dans le schéma Acquereur, pas une seule chaîne à découper.
const ACQUEREURS_DATA = [
  { cle: 'duprat', civilite: 'M. et Mme', prenom: 'Jean et Marie', nom: 'Duprat', lots: ['A01'] },
  { cle: 'lopez', civilite: 'Mme', prenom: 'Isabelle', nom: 'Lopez', lots: ['B01'] },
  { cle: 'ferreira', civilite: 'M.', prenom: 'Carlos', nom: 'Ferreira', lots: ['C01'] },
  { cle: 'aldana', civilite: 'M. et Mme', prenom: 'Pierre et Sophie', nom: 'Aldana', lots: ['D01'] },
  { cle: 'etchegoin', civilite: 'Mme', prenom: 'Anne', nom: 'Etchegoin', lots: ['B02'] },
]

const TMA_DATA = [
  { lot: 'A01', acquereur: 'duprat', localisation: 'Cuisine', description: "Ajout d'une prise électrique", montantEntreprises: 85, statut: 'valide' },
  { lot: 'A01', acquereur: 'duprat', localisation: 'Séjour', description: 'Suppression du parquet (remplacé par du carrelage)', montantEntreprises: -320, statut: 'facture' },
  { lot: 'B01', acquereur: 'lopez', localisation: 'Salle de bain', description: 'Remplacement de la baignoire par une douche', montantEntreprises: 650, statut: 'chiffre' },
  { lot: 'C01', acquereur: 'ferreira', localisation: 'Chambre 1', description: 'Ouverture entre chambre et dressing', montantEntreprises: null, statut: 'etude' },
  { lot: 'D01', acquereur: 'aldana', localisation: 'Garage', description: "Ajout d'une motorisation de portail", montantEntreprises: null, statut: 'demande' },
  { lot: 'B02', acquereur: 'etchegoin', localisation: 'Séjour', description: 'Suppression de la cheminée', montantEntreprises: 400, statut: 'refuse' },
  { lot: 'A01', acquereur: 'duprat', localisation: 'Terrasse', description: 'Pose de stores extérieurs', montantEntreprises: 900, statut: 'travaux' },
  { lot: 'C01', acquereur: 'ferreira', localisation: 'Cuisine', description: "Ajout d'un îlot central", montantEntreprises: 2100, statut: 'termine' },
]

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connecté à MongoDB')

  await Promise.all([
    Programme.deleteMany({}),
    Lot.deleteMany({}),
    Acquereur.deleteMany({}),
    Tma.deleteMany({}),
  ])
  console.log('Anciennes données supprimées')

  const programme = await Programme.create(PROGRAMME_DATA)
  console.log(`Programme créé : ${programme.nom}`)

  const lots = await Lot.insertMany(
    LOTS_DATA.map((lot) => ({ ...lot, programme: programme._id })),
  )
  console.log(`${lots.length} lots créés`)
  const lotParReference = Object.fromEntries(lots.map((lot) => [lot.reference, lot]))

  const acquereurs = await Acquereur.insertMany(
    ACQUEREURS_DATA.map((a) => ({
      civilite: a.civilite,
      prenom: a.prenom,
      nom: a.nom,
      lots: a.lots.map((reference) => lotParReference[reference]._id),
    })),
  )
  console.log(`${acquereurs.length} acquéreurs créés`)
  const acquereurParCle = Object.fromEntries(
    ACQUEREURS_DATA.map((a, index) => [a.cle, acquereurs[index]]),
  )

  const tmas = await Tma.insertMany(
    TMA_DATA.map((tma) => ({
      lot: lotParReference[tma.lot]._id,
      acquereur: acquereurParCle[tma.acquereur]._id,
      localisation: tma.localisation,
      description: tma.description,
      montantEntreprises: tma.montantEntreprises,
      montantClient: calculerMontantClient(tma.montantEntreprises),
      statut: tma.statut,
    })),
  )
  console.log(`${tmas.length} TMA créées`)

  await mongoose.disconnect()
  console.log('Terminé, connexion fermée.')
}

seed().catch((erreur) => {
  console.error('Erreur pendant le seed :', erreur)
  process.exit(1)
})
