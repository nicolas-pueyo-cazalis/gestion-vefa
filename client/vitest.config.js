import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

// Vitest ne reprend pas automatiquement le plugin `@vitejs/plugin-react`
// de vite.config.js (01/09/2026, chantier 6, tests de composants) — sans
// lui, le JSX compile avec le runtime "classique" (nécessite `React` en
// portée), pas le runtime automatique de React 19 qu'utilise le reste du
// projet. `mergeConfig` reprend tout vite.config.js (dont le plugin
// react()) tel quel, sans le dupliquer.
export default mergeConfig(viteConfig, defineConfig({
  esbuild: { jsx: 'automatic' },
}))
