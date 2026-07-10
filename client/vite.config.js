import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Nécessaire car le projet est sur le disque Windows (/mnt/c/...) mais le
    // serveur tourne dans WSL : WSL ne reçoit pas toujours les notifications
    // de modification de fichiers venant de Windows, donc Vite doit vérifier
    // les fichiers à intervalle régulier ("polling") au lieu d'attendre d'être
    // prévenu.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
