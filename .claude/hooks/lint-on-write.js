// Hook PostToolUse (Write|Edit) — lance oxlint sur le fichier client
// modifié, signale les erreurs/avertissements à Claude sans rien bloquer
// (l'écriture a déjà eu lieu).
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import {
  racineProjet,
  lireEntreeHook,
  cheminFichierEdite,
  sousDossier,
  existeVraiment,
  signalerSansBloquer,
} from './lib.mjs'

const entree = lireEntreeHook()
const chemin = entree ? cheminFichierEdite(entree) : null
if (!chemin) process.exit(0)
if (!/\.(js|jsx)$/.test(chemin)) process.exit(0)
if (!existeVraiment(chemin)) process.exit(0)
// oxlint n'existe que côté client (CLAUDE.md : "oxlint (lint front seulement)").
if (sousDossier(chemin) !== 'client') process.exit(0)

const oxlintBin = path.join(racineProjet, 'client', 'node_modules', '.bin', 'oxlint')
if (!existeVraiment(oxlintBin)) process.exit(0)

const relatif = path.relative(path.join(racineProjet, 'client'), chemin)
const resultat = spawnSync(oxlintBin, [relatif], {
  cwd: path.join(racineProjet, 'client'),
  encoding: 'utf8',
})

if (resultat.status !== 0) {
  signalerSansBloquer(`oxlint a trouvé un problème dans ${relatif} :\n${resultat.stdout}`)
}
