import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Démonte le DOM rendu par un test avant le suivant (01/09/2026, chantier
// 12) — sans ça, chaque `render()` s'ajoute au précédent dans
// `document.body` au lieu de le remplacer, et une requête `screen.getByText`
// trouve plusieurs éléments dès qu'un fichier a plusieurs tests avec du
// contenu qui se recoupe (ex: plusieurs rendus de la même page). Ce
// fichier s'applique à TOUS les fichiers de test (`setupFiles` dans
// vitest.config.js), pas seulement ceux de composants — sans effet sur
// les tests de fonctions pures, qui ne rendent jamais de DOM.
afterEach(() => {
  cleanup()
})

// Vide l'historique d'appels de tous les `vi.fn()` entre deux tests (même
// chantier) — sans ça, un mock comme `mockNavigate` (déclaré une seule
// fois en tête de fichier, réutilisé par plusieurs tests) garde le
// souvenir des appels des tests précédents, faussant une assertion du
// type "n'a pas été appelé" dans un test plus tardif du même fichier.
// N'efface pas les implémentations (`mockReturnValue`/`mockResolvedValue`),
// chaque test les repose de toute façon à son début.
afterEach(() => {
  vi.clearAllMocks()
})
