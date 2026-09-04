import { useFermerAvecEchap } from '../hooks/useFermerAvecEchap.js'

// Remplace window.confirm() par une vraie modale stylée (05/09/2026,
// point 277) — même patron que FenetreContact.jsx (recouvrement + boîte
// centrée, Échap et clic en dehors ferment sans agir). `libelleConfirmer`
// volontairement obligatoire, jamais un "Confirmer" générique — un
// contrôle doit dire exactement ce qui se passe (ex: "Annuler la vente",
// "Continuer"). `dangereux` applique le style d'action destructrice déjà
// utilisé ailleurs dans l'appli (`.bouton-danger`).
function FenetreConfirmation({
  titre,
  message,
  libelleConfirmer,
  dangereux,
  onConfirmer,
  onFermer,
}) {
  useFermerAvecEchap(onFermer)
  return (
    <div className="fenetre-fond" onClick={onFermer}>
      <div
        className="fenetre-contenu"
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{titre}</h3>
        <p>{message}</p>
        <div className="boutons-confirmation">
          <button type="button" onClick={onFermer}>
            Annuler
          </button>
          <button
            type="button"
            className={dangereux ? 'bouton-danger' : undefined}
            onClick={onConfirmer}
          >
            {libelleConfirmer}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FenetreConfirmation
