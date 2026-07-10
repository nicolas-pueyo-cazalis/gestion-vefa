import { useState } from 'react'
import { AsYouType, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js'

// Liste volontairement restreinte aux pays les plus probables pour ce
// projet — libphonenumber-js connaît le format exact de chacun (nombre de
// chiffres attendu, espacement...), donc l'ajout d'un pays supplémentaire
// se ferait juste en complétant cette liste.
const PAYS_DISPONIBLES = [
  { code: 'FR', libelle: 'France' },
  { code: 'BE', libelle: 'Belgique' },
  { code: 'CH', libelle: 'Suisse' },
  { code: 'LU', libelle: 'Luxembourg' },
  { code: 'ES', libelle: 'Espagne' },
  { code: 'DE', libelle: 'Allemagne' },
  { code: 'GB', libelle: 'Royaume-Uni' },
]

// value : numéro complet au format international E.164 (ex: "+33612345678")
// ou chaîne vide. onChange(valeur, estValide) : "valeur" ne contient un
// numéro que lorsqu'il est complet et valide pour le pays choisi (sinon '').
// "estValide" distingue "rien saisi" (true, champ optionnel) de "saisie en
// cours mais incomplète" (false) — le parent peut s'en servir pour bloquer
// la soumission du formulaire plutôt que d'ignorer silencieusement la
// saisie invalide.
function TelephoneInput({ value, onChange }) {
  const numeroExistant = value ? parsePhoneNumberFromString(value) : undefined

  const [pays, setPays] = useState(numeroExistant?.country ?? 'FR')
  const [saisie, setSaisie] = useState(numeroExistant ? numeroExistant.formatNational() : '')
  const [complet, setComplet] = useState(Boolean(numeroExistant?.isValid()))

  function appliquerSaisie(texte, paysActuel) {
    const formateur = new AsYouType(paysActuel)
    const formate = formateur.input(texte)
    const numero = formateur.getNumber()
    const valide = Boolean(numero && numero.isValid())
    const estValide = valide || formate === ''

    setSaisie(formate)
    setComplet(estValide)
    onChange(valide ? numero.number : '', estValide)
  }

  function changerPays(nouveauPays) {
    setPays(nouveauPays)
    setSaisie('')
    setComplet(true)
    onChange('', true)
  }

  return (
    <div className="telephone-input">
      <select value={pays} onChange={(e) => changerPays(e.target.value)}>
        {PAYS_DISPONIBLES.map((p) => (
          <option key={p.code} value={p.code}>
            {p.libelle} (+{getCountryCallingCode(p.code)})
          </option>
        ))}
      </select>
      <input
        type="tel"
        value={saisie}
        onChange={(e) => appliquerSaisie(e.target.value, pays)}
        placeholder="Numéro"
        className={complet ? '' : 'invalide'}
      />
    </div>
  )
}

export default TelephoneInput
