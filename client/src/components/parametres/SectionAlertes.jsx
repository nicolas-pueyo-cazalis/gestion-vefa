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
      <form onSubmit={soumettre} className="formulaire-alertes">
        {/* Bannière + grille compacte (04/09/2026, point 308, maquette
            retenue par Nicolas parmi 3 propositions) : l'interrupteur
            maître devient une bannière bien visible, les 5 types passent
            en grille 2 colonnes plutôt qu'une longue liste verticale. */}
        <div className="banniere-alertes-maitre">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <div className="texte-banniere-alertes">
            <span className="titre-banniere-alertes">Fenêtre d'alertes au démarrage</span>
            <span className="sous-titre-banniere-alertes">Active les 5 réglages ci-dessous</span>
          </div>
          <label className="interrupteur">
            <input
              type="checkbox"
              checked={alertesActivees}
              onChange={(e) => setAlertesActivees(e.target.checked)}
            />
            <span className="glissiere" />
          </label>
        </div>
        <div className="grille-types-alertes">
          {TYPES_ALERTES.map(({ cle, libelle }) => (
            <label
              key={cle}
              className={`case-type-alerte${alertesActivesParType[cle] ? '' : ' desactive'}`}
            >
              <span>{libelle}</span>
              <span className="interrupteur">
                <input
                  type="checkbox"
                  checked={alertesActivesParType[cle]}
                  onChange={() => basculerType(cle)}
                  disabled={!alertesActivees}
                />
                <span className="glissiere" />
              </span>
            </label>
          ))}
        </div>
        <button type="submit">Enregistrer</button>
      </form>
    </section>
  )
}

export default SectionAlertes
