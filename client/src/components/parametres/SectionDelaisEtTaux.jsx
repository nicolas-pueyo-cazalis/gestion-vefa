import { useState } from 'react'

// Regroupé par page (20/07/2026, point 173) : jusqu'ici tous les délais/taux
// s'affichaient à la suite, sans distinction — difficile de s'y retrouver
// pour savoir lequel joue sur quelle page de l'appli. Un seul <form>/bouton
// "Enregistrer" reste commun à tout, seul l'affichage est sous-titré.
function SectionDelaisEtTaux({ programme, onEnregistrer }) {
  const p = programme.parametres
  const [delaiObtentionPretJours, setDelaiObtentionPretJours] = useState(p.delaiObtentionPretJours)
  const [delaiSignatureNotaireMois, setDelaiSignatureNotaireMois] = useState(
    p.delaiSignatureNotaireMois,
  )
  const [delaiReglementAppelJours, setDelaiReglementAppelJours] = useState(
    p.delaiReglementAppelJours,
  )
  const [delaiRetourEntrepriseTmaJours, setDelaiRetourEntrepriseTmaJours] = useState(
    p.delaiRetourEntrepriseTmaJours,
  )
  const [delaiReponseFactureTmaJours, setDelaiReponseFactureTmaJours] = useState(
    p.delaiReponseFactureTmaJours,
  )
  const [tauxMargeTma, setTauxMargeTma] = useState(p.tauxMargeTma)
  // Nouveau (20/07/2026, point 173) : si coché, une nouvelle TMA ne
  // pré-remplit plus son montant client via le taux de marge — le
  // gestionnaire le saisit lui-même à chaque fois (voir
  // recalculerTma, server/routes/tmaEntreprises.js).
  const [montantClientSaisiManuellement, setMontantClientSaisiManuellement] = useState(
    p.montantClientSaisiManuellement,
  )
  // Nouveau (20/07/2026, point 184) : montant fixe ajouté au montant
  // client de chaque TMA, en plus du coût des modifications elles-mêmes
  // (voir calculerMontantClient, server/models/Tma.js) — sans effet tant
  // que la case "À appliquer" n'est pas cochée.
  const [fraisOuvertureDossierTma, setFraisOuvertureDossierTma] = useState(
    p.fraisOuvertureDossierTma,
  )
  const [appliquerFraisOuvertureDossierTma, setAppliquerFraisOuvertureDossierTma] = useState(
    p.appliquerFraisOuvertureDossierTma,
  )
  const [tauxTva, setTauxTva] = useState(p.tauxTva)
  const [regleMontantNegatifTma, setRegleMontantNegatifTma] = useState(p.regleMontantNegatifTma)

  function soumettre(evenement) {
    evenement.preventDefault()
    onEnregistrer({
      parametres: {
        delaiObtentionPretJours: Number(delaiObtentionPretJours),
        delaiSignatureNotaireMois: Number(delaiSignatureNotaireMois),
        delaiReglementAppelJours: Number(delaiReglementAppelJours),
        delaiRetourEntrepriseTmaJours: Number(delaiRetourEntrepriseTmaJours),
        delaiReponseFactureTmaJours: Number(delaiReponseFactureTmaJours),
        tauxMargeTma: Number(tauxMargeTma),
        montantClientSaisiManuellement,
        fraisOuvertureDossierTma: Number(fraisOuvertureDossierTma),
        appliquerFraisOuvertureDossierTma,
        tauxTva: Number(tauxTva),
        regleMontantNegatifTma,
      },
    })
  }

  return (
    <section className="section-parametres">
      <h2>Délais et taux</h2>
      <form onSubmit={soumettre} className="formulaire-delais-et-taux">
        <div className="groupe-delais-et-taux">
          <h3>Lots</h3>
          <label>
            Taux de TVA (ex: 0.2 = 20%)
            <input
              type="number"
              step="0.01"
              value={tauxTva}
              onChange={(e) => setTauxTva(e.target.value)}
            />
          </label>
        </div>

        <div className="groupe-delais-et-taux">
          <h3>Suivi de prêt</h3>
          <label>
            Délai obtention prêt (jours)
            <input
              type="number"
              value={delaiObtentionPretJours}
              onChange={(e) => setDelaiObtentionPretJours(e.target.value)}
            />
          </label>
        </div>

        <div className="groupe-delais-et-taux">
          <h3>Signature acte</h3>
          <label>
            Délai signature notaire (mois)
            <input
              type="number"
              value={delaiSignatureNotaireMois}
              onChange={(e) => setDelaiSignatureNotaireMois(e.target.value)}
            />
          </label>
        </div>

        <div className="groupe-delais-et-taux">
          <h3>Appels de fonds</h3>
          <label>
            Délai règlement appel de fonds (jours)
            <input
              type="number"
              value={delaiReglementAppelJours}
              onChange={(e) => setDelaiReglementAppelJours(e.target.value)}
            />
          </label>
        </div>

        <div className="groupe-delais-et-taux">
          <h3>TMA</h3>
          <label>
            Délai retour entreprise TMA (jours)
            <input
              type="number"
              value={delaiRetourEntrepriseTmaJours}
              onChange={(e) => setDelaiRetourEntrepriseTmaJours(e.target.value)}
            />
          </label>
          <label>
            Délai réponse facture TMA (jours)
            <input
              type="number"
              value={delaiReponseFactureTmaJours}
              onChange={(e) => setDelaiReponseFactureTmaJours(e.target.value)}
            />
          </label>
          <div className="champ-avec-case-en-dessous">
            <label>
              Taux de marge TMA (ex: 1.3 = +30%)
              <input
                type="number"
                step="0.01"
                value={tauxMargeTma}
                onChange={(e) => setTauxMargeTma(e.target.value)}
                disabled={montantClientSaisiManuellement}
              />
            </label>
            <label className="champ-case-a-cocher">
              <input
                type="checkbox"
                checked={montantClientSaisiManuellement}
                onChange={(e) => setMontantClientSaisiManuellement(e.target.checked)}
              />
              Montant devis client saisi manuellement
            </label>
          </div>
          <div className="champ-avec-case-en-dessous">
            <label>
              Frais d'ouverture de dossier (€)
              <input
                type="number"
                step="0.01"
                value={fraisOuvertureDossierTma}
                onChange={(e) => setFraisOuvertureDossierTma(e.target.value)}
              />
            </label>
            <label className="champ-case-a-cocher">
              <input
                type="checkbox"
                checked={appliquerFraisOuvertureDossierTma}
                onChange={(e) => setAppliquerFraisOuvertureDossierTma(e.target.checked)}
              />
              À appliquer
            </label>
          </div>
          <label>
            Montant TMA négatif
            <select
              value={regleMontantNegatifTma}
              onChange={(e) => setRegleMontantNegatifTma(e.target.value)}
            >
              <option value="montant_zero">Facturé 0€ au client</option>
              <option value="avoir_sans_marge">Avoir sans marge</option>
            </select>
          </label>
        </div>

        <button type="submit">Enregistrer</button>
      </form>
    </section>
  )
}

export default SectionDelaisEtTaux
