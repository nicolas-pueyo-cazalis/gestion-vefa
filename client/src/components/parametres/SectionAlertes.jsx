import { useState } from 'react'

const TYPES_ALERTES = [
  { cle: 'pret', libelle: 'Prêt non reçu à temps' },
  { cle: 'signature', libelle: "Signature d'acte en retard" },
  { cle: 'appelsDeFonds', libelle: 'Appels de fonds non réglés à temps' },
  { cle: 'entreprisesTma', libelle: "Entreprises TMA n'ayant pas chiffré à temps" },
  { cle: 'facturesTma', libelle: 'Factures TMA sans réponse client à temps' },
]

// Fenêtre d'alertes au démarrage (AlerteRetards.jsx, 17/07/2026, point 137) :
// désactivable globalement, ou type de retard par type de retard — les
// cases par type restent grisées quand l'interrupteur général est coupé,
// puisqu'elles n'ont alors plus d'effet.
function SectionAlertes({ programme, onEnregistrer }) {
  const p = programme.parametres
  const [alertesActivees, setAlertesActivees] = useState(p.alertesActivees ?? true)
  const [alertesActivesParType, setAlertesActivesParType] = useState({
    pret: true,
    signature: true,
    appelsDeFonds: true,
    entreprisesTma: true,
    facturesTma: true,
    ...p.alertesActivesParType,
  })

  function basculerType(cle) {
    setAlertesActivesParType((valeurs) => ({ ...valeurs, [cle]: !valeurs[cle] }))
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer({ parametres: { alertesActivees, alertesActivesParType } })
  }

  return (
    <section className="section-parametres">
      <h2>Fenêtre d'alertes</h2>
      <form onSubmit={soumettre}>
        <label className="champ-case-a-cocher">
          <input type="checkbox" checked={alertesActivees} onChange={(e) => setAlertesActivees(e.target.checked)} />
          Afficher la fenêtre d'alertes au démarrage
        </label>
        {TYPES_ALERTES.map(({ cle, libelle }) => (
          <label className="champ-case-a-cocher" key={cle}>
            <input
              type="checkbox"
              checked={alertesActivesParType[cle]}
              onChange={() => basculerType(cle)}
              disabled={!alertesActivees}
            />
            {libelle}
          </label>
        ))}
        <button type="submit">Enregistrer</button>
      </form>
    </section>
  )
}

export default SectionAlertes
