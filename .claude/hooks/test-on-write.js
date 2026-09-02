// Hook PostToolUse asynchrone (Write|Edit) — relance uniquement le
// fichier de test modifié (pas toute la suite), en tâche de fond. Ne
// réveille Claude (exit 2) qu'en cas d'échec — succès silencieux.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { racineProjet, lireEntreeHook, cheminFichierEdite, sousDossier, existeVraiment } from './lib.mjs'

const entree = lireEntreeHook()
const chemin = entree ? cheminFichierEdite(entree) : null
if (!chemin) process.exit(0)
if (!/\.test\.(js|jsx)$/.test(chemin)) process.exit(0)
if (!existeVraiment(chemin)) process.exit(0)

const dossier = sousDossier(chemin)
if (!dossier) process.exit(0)

const vitestBin = path.join(racineProjet, dossier, 'node_modules', '.bin', 'vitest')
if (!existeVraiment(vitestBin)) process.exit(0)

const relatif = path.relative(path.join(racineProjet, dossier), chemin)
const resultat = spawnSync(vitestBin, ['run', relatif], {
  cwd: path.join(racineProjet, dossier),
  encoding: 'utf8',
})

if (resultat.status !== 0) {
  process.stderr.write(
    `Les tests de ${dossier}/${relatif} échouent après cette modification :\n\n` +
      (resultat.stdout || '') +
      (resultat.stderr || ''),
  )
  process.exit(2)
}
