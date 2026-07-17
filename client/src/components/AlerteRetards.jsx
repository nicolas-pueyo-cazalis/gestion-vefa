import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import {
  statutPret, statutSignature, statutAppel,
  estEntrepriseEnRetard, estFactureTmaEnRetard, formatDate,
} from '../utils/statuts.js'

function nomComplet(acquereur) {
  return [acquereur?.civilite, acquereur?.prenom, acquereur?.nom].filter(Boolean).join(' ') || '—'
}

// Fenêtre de notification à l'ouverture de l'application (règle métier n°5
// de docs/analyse-excel.md, complétée le 10/07/2026 pour les deux alertes
// TMA) : liste tout ce qui est en retard sur une échéance, tous suivis
// confondus. Montée une seule fois dans Layout.jsx — comme Layout n'est pas
// remonté en changeant de page, ça ne s'affiche bien qu'"à l'ouverture",
// pas à chaque navigation.
function AlerteRetards() {
  const { programmeActif: programme } = useProgramme()
  const [donnees, setDonnees] = useState(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    async function charger() {
      const [lots, appels, tmaList, tmaEntreprises] = await Promise.all([
        apiFetch(`${API_URL}/api/lots?programme=${programme._id}`).then((r) => r.json()),
        apiFetch(`${API_URL}/api/appels-de-fonds?programme=${programme._id}`).then((r) => r.json()),
        apiFetch(`${API_URL}/api/tma?programme=${programme._id}`).then((r) => r.json()),
        apiFetch(`${API_URL}/api/tma-entreprises?programme=${programme._id}`).then((r) => r.json()),
      ])
      setDonnees({ lots, appels, tmaList, tmaEntreprises })
    }
    charger()
  }, [programme._id])

  if (!donnees || !visible) return null

  const { lots, appels, tmaList, tmaEntreprises } = donnees
  const { delaiObtentionPretJours, delaiSignatureNotaireMois, delaiRetourEntrepriseTmaJours, delaiReponseFactureTmaJours } = programme.parametres

  // Désactivable depuis Paramètres (17/07/2026, point 137) : globalement,
  // ou type de retard par type de retard.
  if (!programme.parametres.alertesActivees) return null
  const actif = programme.parametres.alertesActivesParType ?? {}

  const lotsRetardPret = actif.pret === false ? [] : lots.filter((l) => statutPret(l, delaiObtentionPretJours) === 'retard')
  const lotsRetardSignature = actif.signature === false ? [] : lots.filter((l) => statutSignature(l, delaiSignatureNotaireMois) === 'retard')
  const appelsRetard = actif.appelsDeFonds === false ? [] : appels.filter((a) => statutAppel(a) === 'retard')
  const entreprisesRetard = actif.entreprisesTma === false ? [] : tmaEntreprises.filter((l) => estEntrepriseEnRetard(l, delaiRetourEntrepriseTmaJours))
  const facturesRetard = actif.facturesTma === false ? [] : tmaList.filter((t) => estFactureTmaEnRetard(t, delaiReponseFactureTmaJours))

  const total = lotsRetardPret.length + lotsRetardSignature.length + appelsRetard.length
    + entreprisesRetard.length + facturesRetard.length

  if (total === 0) return null

  return (
    <div className="fenetre-fond" onClick={() => setVisible(false)}>
      <div className="fenetre-contenu fenetre-alertes" onClick={(e) => e.stopPropagation()}>
        <h3>{total} retard{total > 1 ? 's' : ''} à traiter</h3>

        {lotsRetardPret.length > 0 && (
          <section>
            <h4>Prêt non reçu à temps</h4>
            <ul>
              {lotsRetardPret.map((lot) => (
                <li key={lot._id}>
                  <Link to="/suivi-pret">{lot.reference} — {nomComplet(lot.acquereur)}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {lotsRetardSignature.length > 0 && (
          <section>
            <h4>Signature d'acte en retard</h4>
            <ul>
              {lotsRetardSignature.map((lot) => (
                <li key={lot._id}>
                  <Link to="/signature-acte">{lot.reference} — {nomComplet(lot.acquereur)}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {appelsRetard.length > 0 && (
          <section>
            <h4>Appels de fonds non réglés à temps</h4>
            <ul>
              {appelsRetard.map((appel) => (
                <li key={appel._id}>
                  <Link to="/appels-de-fonds">
                    {appel.lot?.reference} — {appel.phase.nom} (limite {formatDate(appel.dateLimiteReglement)})
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {entreprisesRetard.length > 0 && (
          <section>
            <h4>Entreprises TMA n'ayant pas chiffré à temps</h4>
            <ul>
              {entreprisesRetard.map((ligne) => (
                <li key={ligne._id}>
                  <Link to="/tma">
                    {ligne.tma?.lot?.reference} — {ligne.entreprise?.nom} ({ligne.corpsDeTravaux})
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {facturesRetard.length > 0 && (
          <section>
            <h4>Factures TMA sans réponse client à temps</h4>
            <ul>
              {facturesRetard.map((tma) => (
                <li key={tma._id}>
                  <Link to="/tma">
                    {tma.lot?.reference} — {nomComplet(tma.acquereur)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button type="button" onClick={() => setVisible(false)}>Fermer</button>
      </div>
    </div>
  )
}

export default AlerteRetards
