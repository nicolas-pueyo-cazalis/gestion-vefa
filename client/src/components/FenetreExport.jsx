import { useState } from 'react'
import { exporterExcel, exporterPDF } from '../utils/export.js'

// Fenêtre d'export unique (20/07/2026, chantier des exports) : un seul
// bouton "Exporter" par page ouvre cette fenêtre, qui propose la liste
// des exports possibles pour cette page, puis le format (Excel ou PDF).
// `options` : tableau `{ valeur, libelle, donnees }`, où `donnees` est une
// fonction (pas un objet déjà calculé) — évite de reconstruire les 4
// exports à chaque rendu de la page alors qu'un seul sera vraiment
// demandé, voire aucun si la fenêtre ne s'ouvre jamais.
function FenetreExport({ options, onFermer }) {
  const [typeChoisi, setTypeChoisi] = useState(options[0]?.valeur ?? '')

  // `exporterExcel` est asynchrone (exceljs construit le fichier en
  // mémoire avant de le proposer au téléchargement) — `await` avant de
  // fermer la fenêtre, pour ne pas fermer avant que le fichier soit prêt.
  async function exporter(format) {
    const option = options.find((o) => o.valeur === typeChoisi)
    if (!option) return
    const donnees = option.donnees()
    if (format === 'excel') await exporterExcel(donnees)
    else exporterPDF(donnees)
    onFermer()
  }

  return (
    <div className="fenetre-fond" onClick={onFermer}>
      <div className="fenetre-contenu" onClick={(e) => e.stopPropagation()}>
        <h3>Exporter</h3>

        <fieldset className="choix-export">
          <legend>Quel export ?</legend>
          {options.map((option) => (
            <label key={option.valeur}>
              <input
                type="radio"
                name="type-export"
                value={option.valeur}
                checked={typeChoisi === option.valeur}
                onChange={() => setTypeChoisi(option.valeur)}
              />
              {option.libelle}
            </label>
          ))}
        </fieldset>

        <div className="boutons-export">
          <button type="button" onClick={() => exporter('excel')}>Exporter en Excel</button>
          <button type="button" onClick={() => exporter('pdf')}>Exporter en PDF</button>
          <button type="button" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

export default FenetreExport
