import { useFermerAvecEchap } from '../hooks/useFermerAvecEchap.js'

// Fenêtre modale simple (recouvrement + boîte centrée) affichant les
// coordonnées complètes d'un contact (banque, courtier, notaire...).
// Cliquer en dehors de la boîte ferme la fenêtre (`stopPropagation` sur le
// contenu pour que le clic à l'intérieur ne remonte pas jusqu'au fond).
function FenetreContact({ titre, contact, onFermer }) {
  useFermerAvecEchap(onFermer)
  return (
    <div className="fenetre-fond" onClick={onFermer}>
      <div className="fenetre-contenu" role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()}>
        <h3>{titre}</h3>
        {!contact?.nom && <p>Aucune coordonnée renseignée.</p>}
        {contact?.nom && (
          <dl>
            <dt>Nom</dt>
            <dd>{contact.nom}</dd>
            {contact.adresse && (
              <>
                <dt>Adresse</dt>
                <dd>{contact.adresse}</dd>
              </>
            )}
            {(contact.codePostal || contact.commune) && (
              <>
                <dt>Commune</dt>
                <dd>{[contact.codePostal, contact.commune].filter(Boolean).join(' ')}</dd>
              </>
            )}
            {contact.telephone && (
              <>
                <dt>Téléphone</dt>
                <dd>{contact.telephone}</dd>
              </>
            )}
            {contact.email && (
              <>
                <dt>Email</dt>
                <dd>{contact.email}</dd>
              </>
            )}
          </dl>
        )}
        <button type="button" onClick={onFermer}>Fermer</button>
      </div>
    </div>
  )
}

export default FenetreContact
