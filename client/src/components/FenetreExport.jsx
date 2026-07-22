import { useState } from 'react'
import { exporterExcel, exporterPDF } from '../utils/export.js'

// Fenêtre d'export unique (20/07/2026, chantier des exports) : un seul
// bouton "Exporter" par page ouvre cette fenêtre, qui propose la liste
// des exports possibles pour cette page.
// `options` : tableau `{ valeur, libelle, ... }`, deux formes possibles :
//
// 1) Export "classique" (tableau/document) :
//    `{ donnees, formats?, sousOptions?, sousOptionsLibelle? }`
//    - `donnees(sousChoix)` construit les données à exporter — une
//      fonction, pas un objet déjà calculé, pour ne construire que
//      l'export vraiment demandé.
//    - `formats`, optionnel (ex: `['pdf']` pour un document en forme de
//      lettre, sans équivalent tableur utile) — les deux par défaut.
//    - `sousOptions`, optionnel : liste déroulante pour choisir UN
//      élément précis en plus (ex: quel appel de fonds).
//
// 2) Génération avec action personnalisée (20/07/2026, "Générer un appel
//    de fonds", point 171) : `{ type: 'generation', phases, lotsPourPhase,
//    generer }` — un choix en deux temps (phase, PUIS lots concernés à
//    cocher/décocher) suivi d'une action métier (pas juste un
//    téléchargement) fournie par la page, pas les boutons Excel/PDF.
function FenetreExport({ options, onFermer }) {
  const [typeChoisi, setTypeChoisi] = useState(options[0]?.valeur ?? '')
  const option = options.find((o) => o.valeur === typeChoisi)
  const estGeneration = option?.type === 'generation'

  const [sousChoix, setSousChoix] = useState(option?.sousOptions?.[0]?.valeur ?? '')
  const [phaseChoisie, setPhaseChoisie] = useState(option?.phases?.[0]?.valeur ?? '')
  const [lotsChoisis, setLotsChoisis] = useState(new Set())
  const [enCours, setEnCours] = useState(false)

  const lotsDisponibles = estGeneration && phaseChoisie ? option.lotsPourPhase(phaseChoisie) : []

  function choisirType(valeur) {
    setTypeChoisi(valeur)
    const nouvelleOption = options.find((o) => o.valeur === valeur)
    setSousChoix(nouvelleOption?.sousOptions?.[0]?.valeur ?? '')
    choisirPhase(nouvelleOption, nouvelleOption?.phases?.[0]?.valeur ?? '')
  }

  function choisirPhase(optionCiblee, phase) {
    setPhaseChoisie(phase)
    // Tous les lots cochés par défaut à chaque changement de phase — la
    // liste elle-même dépend de la phase choisie (voir lotsPourPhase).
    const lots = optionCiblee?.type === 'generation' && phase ? optionCiblee.lotsPourPhase(phase) : []
    setLotsChoisis(new Set(lots.map((l) => l.valeur)))
  }

  function basculerLot(idLot) {
    setLotsChoisis((precedent) => {
      const suivant = new Set(precedent)
      if (suivant.has(idLot)) suivant.delete(idLot)
      else suivant.add(idLot)
      return suivant
    })
  }

  // `exporterExcel` est asynchrone (exceljs construit le fichier en
  // mémoire avant de le proposer au téléchargement) — `await` avant de
  // fermer la fenêtre, pour ne pas fermer avant que le fichier soit prêt.
  // `option.donnees` peut lui-même être asynchrone (21/07/2026, "Générer
  // devis client" : réserve le numéro de devis auprès du serveur avant de
  // construire le document) — `await` ne change rien pour les exports
  // classiques, dont `donnees()` reste synchrone.
  async function exporter(format) {
    if (!option) return
    const donnees = await option.donnees(sousChoix)
    if (format === 'excel') await exporterExcel(donnees)
    else exporterPDF(donnees)
    onFermer()
  }

  async function generer() {
    if (!option || lotsChoisis.size === 0) return
    setEnCours(true)
    await option.generer(phaseChoisie, [...lotsChoisis])
    setEnCours(false)
    onFermer()
  }

  const formatsProposes = option?.formats ?? ['excel', 'pdf']

  return (
    <div className="fenetre-fond" onClick={onFermer}>
      <div className="fenetre-contenu" onClick={(e) => e.stopPropagation()}>
        <h3>Exporter</h3>

        <fieldset className="choix-export">
          <legend>Quel export ?</legend>
          {options.map((o) => (
            <label key={o.valeur}>
              <input
                type="radio"
                name="type-export"
                value={o.valeur}
                checked={typeChoisi === o.valeur}
                onChange={() => choisirType(o.valeur)}
              />
              {o.libelle}
            </label>
          ))}
        </fieldset>

        {!estGeneration && option?.sousOptions && (
          <label className="sous-choix-export">
            {option.sousOptionsLibelle ?? 'Lequel ?'}
            <select value={sousChoix} onChange={(e) => setSousChoix(e.target.value)}>
              {option.sousOptions.map((so) => (
                <option key={so.valeur} value={so.valeur}>{so.libelle}</option>
              ))}
            </select>
          </label>
        )}

        {estGeneration && (
          <>
            <label className="sous-choix-export">
              {/* Libellés personnalisables (21/07/2026, "Générer devis
                  client", TMA) : ce mode à deux niveaux (choix N°1 → liste à
                  cocher du choix N°2) sert maintenant aussi à choisir un
                  logement puis ses demandes, pas seulement une phase puis
                  ses lots — valeurs par défaut inchangées pour "Générer un
                  appel de fonds". */}
              {option.libelleChoix1 ?? 'Quelle phase ?'}
              <select value={phaseChoisie} onChange={(e) => choisirPhase(option, e.target.value)}>
                {option.phases.map((p) => (
                  <option key={p.valeur} value={p.valeur}>{p.libelle}</option>
                ))}
              </select>
            </label>

            <fieldset className="choix-export choix-lots-generation">
              <legend>{option.libelleChoix2 ?? 'Logements concernés'}</legend>
              {lotsDisponibles.length === 0 && (
                <p className="avertissement-cellule">
                  {option.messageChoix2Vide ?? 'Aucun logement prêt pour cette phase (attestation MOE manquante, ou déjà émis).'}
                </p>
              )}
              {lotsDisponibles.map((lot) => (
                <label key={lot.valeur} className="champ-case-a-cocher">
                  <input
                    type="checkbox"
                    checked={lotsChoisis.has(lot.valeur)}
                    onChange={() => basculerLot(lot.valeur)}
                  />
                  {lot.libelle}
                </label>
              ))}
            </fieldset>
          </>
        )}

        <div className="boutons-export">
          {estGeneration ? (
            <button
              type="button"
              className="bouton-export-pdf"
              disabled={lotsChoisis.size === 0 || enCours}
              onClick={generer}
            >
              {enCours ? 'Génération...' : 'Générer'}
            </button>
          ) : (
            <>
              {/* Classes explicites, pas de style basé sur l'ordre
                  (20/07/2026, courrier appel de fonds) : quand un export
                  n'a que le PDF (`formats: ['pdf']`), le bouton PDF
                  devient le 1er enfant — un style "au rang" (nth-child)
                  lui donnerait par erreur la couleur prévue pour Excel. */}
              {formatsProposes.includes('excel') && (
                <button type="button" className="bouton-export-excel" onClick={() => exporter('excel')}>Exporter en Excel</button>
              )}
              {formatsProposes.includes('pdf') && (
                <button type="button" className="bouton-export-pdf" onClick={() => exporter('pdf')}>Exporter en PDF</button>
              )}
            </>
          )}
          <button type="button" className="bouton-export-annuler" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

export default FenetreExport
