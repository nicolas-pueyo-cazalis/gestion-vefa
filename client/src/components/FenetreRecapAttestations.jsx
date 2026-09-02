import { formatDate } from '../utils/statuts.js'
import { useFermerAvecEchap } from '../hooks/useFermerAvecEchap.js'

// Récapitulatif des attestations MOE (13/07/2026, point 124) — une par
// phase (pas par lot) : une attestation MOE constate l'avancement du
// chantier dans son ensemble, saisie une seule fois pour tous les lots
// concernés (voir la route PATCH /api/appels-de-fonds/phase, "attestation
// en masse"), donc partagée par tous les appels d'une même phase.
function FenetreRecapAttestations({ phasesTriees, appels, onFermer }) {
  useFermerAvecEchap(onFermer)
  function dateAttestation(nomPhase) {
    const appel = appels.find((a) => a.phase.nom === nomPhase && a.dateAttestationMOE)
    return appel ? formatDate(appel.dateAttestationMOE) : 'Non attestée'
  }

  return (
    <div className="fenetre-fond" onClick={onFermer}>
      <div
        className="fenetre-contenu"
        role="dialog"
        aria-modal="true"
        aria-label="Récapitulatif des attestations MOE"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Récapitulatif des attestations MOE</h3>
        <table className="tableau-recap-attestations">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Attestée le</th>
            </tr>
          </thead>
          <tbody>
            {phasesTriees.map((phase) => (
              <tr key={phase.nom}>
                <td>{phase.nom}</td>
                <td>{dateAttestation(phase.nom)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={onFermer}>
          Fermer
        </button>
      </div>
    </div>
  )
}

export default FenetreRecapAttestations
