import { useEffect } from 'react'

// Ferme une fenêtre modale avec la touche Échap (21/07/2026, audit
// accessibilité) — jusqu'ici, seul un clic en dehors de la boîte fermait
// les fenêtres modales de l'appli (AlerteRetards, FenetreContact,
// FenetreExport, FenetreRecapAttestations), impossible au clavier seul.
export function useFermerAvecEchap(onFermer) {
  useEffect(() => {
    function surTouche(evenement) {
      if (evenement.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [onFermer])
}
