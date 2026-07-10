import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'API Gestion VEFA en ligne' })
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
    console.error('Échec de connexion à MongoDB :', erreur.message)
  })
