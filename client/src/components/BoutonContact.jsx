import { useState } from 'react'
import FenetreContact from './FenetreContact.jsx'

// Affiche le nom d'un contact (banque, courtier, notaire) comme un lien
// cliquable qui ouvre ses coordonnées complètes dans une fenêtre — remarque
// du 13/07/2026, réutilisé sur "Suivi de prêt" et "Signature acte".
function BoutonContact({ titre, contact }) {
  const [ouvert, setOuvert] = useState(false)

  if (!contact?.nom) return <span>—</span>

  return (
    <>
      <button type="button" className="lien-contact" onClick={() => setOuvert(true)}>
        {contact.nom}
      </button>
      {ouvert && <FenetreContact titre={titre} contact={contact} onFermer={() => setOuvert(false)} />}
    </>
  )
}

export default BoutonContact
