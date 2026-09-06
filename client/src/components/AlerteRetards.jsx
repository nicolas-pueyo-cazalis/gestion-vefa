import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRetards } from '../hooks/useRetards.js'
import { useFermerAvecEchap } from '../hooks/useFermerAvecEchap.js'

// Fenêtre de notification à l'ouverture de l'application (règle métier n°5
// de docs/analyse-excel.md, complétée le 10/07/2026 pour les deux alertes
// TMA) : liste tout ce qui est en retard sur une échéance, tous suivis
// confondus. Montée une seule fois dans Layout.jsx — comme Layout n'est pas
// remonté en changeant de page, ça ne s'affiche bien qu'"à l'ouverture",
// pas à chaque navigation. Calcul des 5 catégories de retard délégué à
// useRetards.js (05/09/2026, point 277/3) — partagé avec le tableau de
// bord, qui affiche la même liste en permanence sur la page.
function AlerteRetards() {
  const { chargement, categories, total } = useRetards()
  const [visible, setVisible] = useState(true)

  // Avant le `if` ci-dessous (21/07/2026, audit accessibilité) : un Hook ne
  // peut jamais être appelé après un retour anticipé, sous peine de casser
  // l'ordre des Hooks d'un rendu à l'autre.
  useFermerAvecEchap(() => setVisible(false))

  if (chargement || !visible || total === 0) return null

  return (
    <div className="fenetre-fond" onClick={() => setVisible(false)}>
      <div
        className="fenetre-contenu fenetre-alertes"
        role="dialog"
        aria-modal="true"
        aria-label={`${total} retard${total > 1 ? 's' : ''} à traiter`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>
          {total} retard{total > 1 ? 's' : ''} à traiter
        </h3>

        {categories.map((categorie) => (
          <section key={categorie.cle}>
            <h4>{categorie.libelle}</h4>
            <ul>
              {categorie.elements.map((element) => (
                <li key={element.cle}>
                  <Link to={categorie.lien}>{element.texte}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <button type="button" onClick={() => setVisible(false)}>
          Fermer
        </button>
      </div>
    </div>
  )
}

export default AlerteRetards
