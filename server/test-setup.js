import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

// Base MongoDB éphémère pour les tests d'intégration (01/09/2026,
// chantier 5, point C de l'inventaire "tests au bout du bout") — un vrai
// comportement Mongoose (validations, index) sans dépendance réseau
// externe ni base Atlas de test à gérer. Réutilisable par tout futur
// fichier de test d'intégration, pas seulement celui de ce chantier.
let mongod

export async function demarrerBaseTest() {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}

export async function viderBaseTest() {
  const collections = mongoose.connection.collections
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
}

export async function arreterBaseTest() {
  await mongoose.disconnect()
  await mongod.stop()
}
