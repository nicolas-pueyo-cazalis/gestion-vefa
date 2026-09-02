// Hook PostToolUse (Write|Edit) — formate automatiquement avec Prettier le
// fichier qui vient d'être modifié.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { racineProjet, lireEntreeHook, cheminFichierEdite, sousDossier, existeVraiment } from './lib.mjs'

const entree = lireEntreeHook()
const chemin = entree ? cheminFichierEdite(entree) : null
if (!chemin) process.exit(0)
if (!/\.(js|jsx|json)$/.test(chemin)) process.exit(0)
if (!existeVraiment(chemin)) process.exit(0)

const dossier = sousDossier(chemin)
if (!dossier) process.exit(0)

const prettierBin = path.join(racineProjet, dossier, 'node_modules', '.bin', 'prettier')
if (!existeVraiment(prettierBin)) process.exit(0)

spawnSync(prettierBin, ['--write', chemin], { stdio: 'ignore' })
