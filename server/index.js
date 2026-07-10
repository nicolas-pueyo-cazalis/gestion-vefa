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
import './models/Acquereur.js'
import './models/AppelDeFonds.js'
import './models/Tma.js'
import './models/TmaEntreprise.js'
import './models/Utilisateur.js'

import programmeRouter from './routes/programme.js'
import lotsRouter from './routes/lots.js'
import tmaRouter from './routes/tma.js'
import tmaEntreprisesRouter from './routes/tmaEntreprises.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'API Gestion VEFA en ligne' })
})

app.use('/api/programme', programmeRouter)
app.use('/api/lots', lotsRouter)
app.use('/api/tma', tmaRouter)
app.use('/api/tma-entreprises', tmaEntreprisesRouter)

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
