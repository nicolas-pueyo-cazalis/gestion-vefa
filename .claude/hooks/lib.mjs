// Utilitaires partagés par les hooks Node (exécutés dans WSL, seul
// environnement avec Node.js sur cette machine — voir CLAUDE.md).
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const racineProjet = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export function versCheminWsl(cheminWindows) {
  const m = cheminWindows.match(/^([A-Za-z]):(.*)$/)
  if (!m) return cheminWindows
  return `/mnt/${m[1].toLowerCase()}${m[2].replace(/\\/g, '/')}`
}

export function lireEntreeHook() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return null
  }
}

export function cheminFichierEdite(entree) {
  const brut = entree?.tool_input?.file_path ?? entree?.tool_response?.filePath
  return brut ? versCheminWsl(brut) : null
}

// 'client' | 'server' | null selon le sous-dossier du chemin (déjà converti).
export function sousDossier(chemin) {
  const relatif = path.relative(racineProjet, chemin)
  if (relatif.startsWith(`client${path.sep}`)) return 'client'
  if (relatif.startsWith(`server${path.sep}`)) return 'server'
  return null
}

export function existeVraiment(chemin) {
  return existsSync(chemin)
}

// Sortie visible par Claude sans bloquer (PostToolUse) : injecte du texte
// dans son contexte via hookSpecificOutput.additionalContext.
export function signalerSansBloquer(texte) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: texte },
    }),
  )
}
