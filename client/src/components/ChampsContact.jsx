import { useEffect, useState } from 'react'
import TelephoneInput from './TelephoneInput.jsx'

// Mêmes règles que le formulaire Entreprises/Client — voir docs/bugs.md,
// "Numéro de téléphone incomplet silencieusement effacé à la soumission" :
// un premier essai de ce composant (13/07/2026) avait réintroduit
// exactement ce bug en oubliant cette validation.
const REGEX_COMMUNE = /^(?!\d+$).+/
const REGEX_CODE_POSTAL = /^\d{5}$/
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Bloc de champs réutilisable pour un contact "secondaire" (banque,
// courtier, notaire). Composant contrôlé par le parent (`valeur` +
// `onChange`) qui remonte aussi sa validité (`onValiditeChange`) pour que
// le formulaire englobant puisse bloquer la soumission — sans ça, une
// saisie invalide (ex: téléphone incomplet) serait silencieusement vidée
// sans aucun message.
function ChampsContact({ titre, valeur, onChange, onValiditeChange }) {
  const [telephoneValide, setTelephoneValide] = useState(true)

  function definir(champ, v) {
    onChange({ ...valeur, [champ]: v })
  }

  const erreurCommune = valeur.commune && !REGEX_COMMUNE.test(valeur.commune)
    ? 'La commune doit contenir du texte, pas seulement des chiffres.'
    : null
  const erreurCodePostal = valeur.codePostal && !REGEX_CODE_POSTAL.test(valeur.codePostal)
    ? 'Doit contenir exactement 5 chiffres.'
    : null
  const erreurEmail = valeur.email && !REGEX_EMAIL.test(valeur.email)
    ? 'Format attendu : nom@domaine.extension'
    : null
  const erreurTelephone = telephoneValide ? null : 'Le numéro de téléphone est incomplet.'

  useEffect(() => {
    onValiditeChange?.(!erreurCommune && !erreurCodePostal && !erreurEmail && !erreurTelephone)
  }, [erreurCommune, erreurCodePostal, erreurEmail, erreurTelephone])

  return (
    <fieldset className="fieldset-contact">
      <legend>{titre}</legend>
      <label>
        Nom
        <input value={valeur.nom ?? ''} onChange={(e) => definir('nom', e.target.value)} />
      </label>
      <label>
        Adresse
        <input value={valeur.adresse ?? ''} onChange={(e) => definir('adresse', e.target.value)} />
      </label>
      <label>
        Commune
        <input
          value={valeur.commune ?? ''}
          onChange={(e) => definir('commune', e.target.value)}
          className={erreurCommune ? 'invalide' : ''}
        />
        {erreurCommune && <span className="erreur-champ">{erreurCommune}</span>}
      </label>
      <label>
        Code postal
        <input
          value={valeur.codePostal ?? ''}
          onChange={(e) => definir('codePostal', e.target.value)}
          inputMode="numeric"
          className={erreurCodePostal ? 'invalide' : ''}
        />
        {erreurCodePostal && <span className="erreur-champ">{erreurCodePostal}</span>}
      </label>
      <label>
        Téléphone
        <TelephoneInput
          value={valeur.telephone ?? ''}
          onChange={(v, estValide) => {
            definir('telephone', v)
            setTelephoneValide(estValide)
          }}
        />
        {erreurTelephone && <span className="erreur-champ">{erreurTelephone}</span>}
      </label>
      <label>
        Email
        <input
          type="email"
          value={valeur.email ?? ''}
          onChange={(e) => definir('email', e.target.value)}
          className={erreurEmail ? 'invalide' : ''}
        />
        {erreurEmail && <span className="erreur-champ">{erreurEmail}</span>}
      </label>
    </fieldset>
  )
}

export default ChampsContact
