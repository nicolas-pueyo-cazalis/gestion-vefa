// Hook PostToolUse (Write|Edit) — signale un `res.status(500)` écrit en
// dur dans une route serveur (doit toujours passer par
// repondreErreurServeur(), voir CLAUDE.md "Erreurs serveur toujours
// via repondreErreurServeur()").
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { racineProjet, lireEntreeHook, cheminFichierEdite, sousDossier, existeVraiment } from './lib.mjs'
import { signalerSansBloquer } from './lib.mjs'

const entree = lireEntreeHook()
const chemin = entree ? cheminFichierEdite(entree) : null
if (!chemin) process.exit(0)
if (!/\.js$/.test(chemin)) process.exit(0)
if (!existeVraiment(chemin)) process.exit(0)
if (sousDossier(chemin) !== 'server') process.exit(0)

// erreurs.js définit légitimement status(500) ; les tests ne sont pas des
// routes.
const relatif = path.relative(racineProjet, chemin)
if (relatif.endsWith(path.join('utils', 'erreurs.js'))) process.exit(0)
if (relatif.includes('.test.')) process.exit(0)

const contenu = readFileSync(chemin, 'utf8')
if (/status\(\s*500\s*\)/.test(contenu)) {
  signalerSansBloquer(
    `${relatif} contient un \`res.status(500)\` écrit en dur — la convention du ` +
      'projet est de toujours passer par `repondreErreurServeur()` ' +
      '(server/utils/erreurs.js), jamais un status(500).json(...) direct.',
  )
}
