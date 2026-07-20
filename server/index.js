import 'dotenv/config'
import express from 'express'
import cors from 'cors'
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

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connecté à MongoDB')
    app.listen(process.env.PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${process.env.PORT}`)
    })
  })
  .catch((erreur) => {
    console.error('Échec de connexion à MongoDB :', erreur.message)
  })
