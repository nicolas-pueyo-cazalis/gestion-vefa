import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import mongoose from 'mongoose'

// Enregistre tous les modèles Mongoose au démarrage, même ceux non
// utilisés directement dans une route — nécessaire pour que .populate(...)
// puisse résoudre n'importe quelle référence (ref: '...') sans dépendre de
// l'ordre d'import des fichiers de routes.
import './models/Programme.js'
import './models/Lot.js'
import './models/Annexe.js'
import './models/Acquereur.js'
import './models/AppelDeFonds.js'
import './models/Tma.js'
import './models/TmaEntreprise.js'
import './models/Entreprise.js'
import './models/Utilisateur.js'
import './models/HistoriqueAnnulation.js'
import './models/HistoriqueModificationPrix.js'
import './models/Compteur.js'

import programmeRouter from './routes/programme.js'
import lotsRouter from './routes/lots.js'
import annexesRouter from './routes/annexes.js'
import tmaRouter from './routes/tma.js'
import tmaEntreprisesRouter from './routes/tmaEntreprises.js'
import entreprisesRouter from './routes/entreprises.js'
import acquereursRouter from './routes/acquereurs.js'
import appelsDeFondsRouter from './routes/appelsDeFonds.js'
import authRouter from './routes/auth.js'
import utilisateursRouter from './routes/utilisateurs.js'
import historiqueAnnulationsRouter from './routes/historiqueAnnulations.js'
import historiqueModificationsPrixRouter from './routes/historiqueModificationsPrix.js'
import { verifierToken } from './middleware/auth.js'

const app = express()

// Journalisation des requêtes HTTP (21/07/2026, audit "logging/monitoring")
// — avant, aucune trace de ce qui arrivait au serveur (aucun `console.log`
// nulle part) : impossible de diagnostiquer un incident en production sans
// avoir accès à la machine et pouvoir reproduire le problème à la main.
// `morgan('dev')` : une ligne par requête (méthode, URL, code, temps de
// réponse) — minimal mais suffisant pour un projet solo, pas un vrai
// système de logs structurés/centralisés (voir docs/decisions.md).
app.use(morgan('dev'))
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'API Gestion VEFA en ligne' })
})

// /api/auth (connexion) reste public — on ne peut pas exiger un jeton pour
// en obtenir un. Tout le reste de l'API (13/07/2026, authentification JWT)
// exige désormais d'être connecté : aucune donnée (lots, clients,
// montants...) n'est accessible sans jeton valide, y compris en lecture.
app.use('/api/auth', authRouter)
app.use('/api', verifierToken)

app.use('/api/utilisateurs', utilisateursRouter)
app.use('/api/programme', programmeRouter)
app.use('/api/lots', lotsRouter)
app.use('/api/annexes', annexesRouter)
app.use('/api/tma', tmaRouter)
app.use('/api/tma-entreprises', tmaEntreprisesRouter)
app.use('/api/entreprises', entreprisesRouter)
app.use('/api/acquereurs', acquereursRouter)
app.use('/api/appels-de-fonds', appelsDeFondsRouter)
app.use('/api/historique-annulations', historiqueAnnulationsRouter)
app.use('/api/historique-modifications-prix', historiqueModificationsPrixRouter)

// Connexion + résilience (21/07/2026, audit "gestion d'erreurs") : avant,
// un échec de connexion au démarrage se contentait d'un `console.error` —
// le processus Node restait "vivant" sans jamais écouter sur le port,
// invisible pour un gestionnaire de process (PM2, Docker healthcheck...)
// qui l'aurait cru fonctionnel. `process.exit(1)` fait échouer clairement
// le démarrage. `connection.on('error'/'disconnected')` couvre le cas
// d'une coupure APRÈS le démarrage (ex: maintenance Atlas) — Mongoose
// retente de se reconnecter tout seul, mais rien n'était loggué en
// attendant, ni les requêtes qui échouaient pendant la coupure (elles
// passent par `repondreErreurServeur`, qui logge déjà chaque échec).
mongoose.connection.on('error', (erreur) => {
  console.error('Erreur de connexion MongoDB :', erreur.message)
})
mongoose.connection.on('disconnected', () => {
  console.error('Connexion MongoDB perdue — nouvelle tentative en cours...')
})
mongoose.connection.on('reconnected', () => {
  console.log('Connexion MongoDB rétablie')
})

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connecté à MongoDB')
    app.listen(process.env.PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${process.env.PORT}`)
    })
  })
  .catch((erreur) => {
    console.error('Échec de connexion à MongoDB au démarrage :', erreur.message)
    process.exit(1)
  })
