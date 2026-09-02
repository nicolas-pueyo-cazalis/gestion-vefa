// Hook PreToolUse (Write|Edit) — bloque toute écriture directe dans un
// vrai fichier .env (secrets), jamais dans .env.example (sans valeur
// réelle, destiné à être modifié/commité).
import path from 'node:path'
import { lireEntreeHook, cheminFichierEdite } from './lib.mjs'

const entree = lireEntreeHook()
const chemin = entree ? cheminFichierEdite(entree) : null
if (!chemin) process.exit(0)

const base = path.basename(chemin)
if (base === '.env' || base === '.env.local') {
  process.stderr.write(
    `Écriture bloquée : "${base}" contient des secrets réels (voir .gitignore) — ` +
      'modifie ".env.example" (sans valeur réelle) si c\'est une nouvelle variable à documenter, ' +
      'ou demande à Nicolas de le faire lui-même s\'il s\'agit vraiment de changer une valeur secrète.',
  )
  process.exit(2)
}

process.exit(0)
