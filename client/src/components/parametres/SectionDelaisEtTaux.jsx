import { useState } from 'react'

function SectionDelaisEtTaux({ programme, onEnregistrer }) {
  const p = programme.parametres
  const [delaiObtentionPretJours, setDelaiObtentionPretJours] = useState(p.delaiObtentionPretJours)
  const [delaiSignatureNotaireMois, setDelaiSignatureNotaireMois] = useState(p.delaiSignatureNotaireMois)
  const [delaiReglementAppelJours, setDelaiReglementAppelJours] = useState(p.delaiReglementAppelJours)
  const [delaiRetourEntrepriseTmaJours, setDelaiRetourEntrepriseTmaJours] = useState(p.delaiRetourEntrepriseTmaJours)
  const [delaiReponseFactureTmaJours, setDelaiReponseFactureTmaJours] = useState(p.delaiReponseFactureTmaJours)
  const [tauxMargeTma, setTauxMargeTma] = useState(p.tauxMargeTma)
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
        tauxTva: Number(tauxTva),
        regleMontantNegatifTma,
      },
    })
  }

  return (
    <section className="section-parametres">
      <h2>Délais et taux</h2>
      <form onSubmit={soumettre}>
        <label>
          Délai obtention prêt (jours)
          <input type="number" value={delaiObtentionPretJours} onChange={(e) => setDelaiObtentionPretJours(e.target.value)} />
        </label>
        <label>
          Délai signature notaire (mois)
          <input type="number" value={delaiSignatureNotaireMois} onChange={(e) => setDelaiSignatureNotaireMois(e.target.value)} />
        </label>
        <label>
          Délai règlement appel de fonds (jours)
          <input type="number" value={delaiReglementAppelJours} onChange={(e) => setDelaiReglementAppelJours(e.target.value)} />
        </label>
        <label>
          Délai retour entreprise TMA (jours)
          <input type="number" value={delaiRetourEntrepriseTmaJours} onChange={(e) => setDelaiRetourEntrepriseTmaJours(e.target.value)} />
        </label>
        <label>
          Délai réponse facture TMA (jours)
          <input type="number" value={delaiReponseFactureTmaJours} onChange={(e) => setDelaiReponseFactureTmaJours(e.target.value)} />
        </label>
        <label>
          Taux de marge TMA (ex: 1.3 = +30%)
          <input type="number" step="0.01" value={tauxMargeTma} onChange={(e) => setTauxMargeTma(e.target.value)} />
        </label>
        <label>
          Taux de TVA (ex: 0.2 = 20%)
          <input type="number" step="0.01" value={tauxTva} onChange={(e) => setTauxTva(e.target.value)} />
        </label>
        <label>
          Montant TMA négatif
          <select value={regleMontantNegatifTma} onChange={(e) => setRegleMontantNegatifTma(e.target.value)}>
            <option value="montant_zero">Facturé 0€ au client</option>
            <option value="avoir_sans_marge">Avoir sans marge</option>
          </select>
        </label>
        <button type="submit">Enregistrer</button>
      </form>
    </section>
  )
}

export default SectionDelaisEtTaux
