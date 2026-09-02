import mongoose from 'mongoose'

const utilisateurSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    // Jamais le mot de passe en clair : le hachage (bcrypt) sera ajouté au
    // moment où on écrira l'inscription/connexion (authentification JWT).
    motDePasseHash: { type: String, required: true },
    nom: String,
    role: {
      type: String,
      enum: ['admin', 'gestionnaire', 'lecture'],
      default: 'lecture',
    },
  },
  { timestamps: true },
)

export default mongoose.model('Utilisateur', utilisateurSchema)
