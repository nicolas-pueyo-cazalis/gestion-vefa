import { useState } from 'react'
import TelephoneInput from './TelephoneInput.jsx'
import { chercherCodePostal } from '../utils/codePostal.js'

// Mêmes règles que le formulaire Entreprises (Paramètres) : validées en
// JS plutôt qu'en attribut HTML "pattern", pour un message d'erreur
// clair et un contrôle total (voir docs/bugs.md, bug du code postal).
const REGEX_COMMUNE = /^(?!\d+$).+/
const REGEX_CODE_POSTAL = /^\d{5}$/
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function FormulaireEditionClient({ acquereur, colonnes, onEnregistrer, onFermer }) {
  const [civilite, setCivilite] = useState(acquereur.civilite ?? '')
  const [nom, setNom] = useState(acquereur.nom)
  const [prenom, setPrenom] = useState(acquereur.prenom ?? '')
  const [adresse, setAdresse] = useState(acquereur.adresse ?? '')
  const [commune, setCommune] = useState(acquereur.commune ?? '')
  const [codePostal, setCodePostal] = useState(acquereur.codePostal ?? '')
  const [telephone, setTelephone] = useState(acquereur.telephone ?? '')
  const [telephoneValide, setTelephoneValide] = useState(true)
  const [email, setEmail] = useState(acquereur.email ?? '')
  const [erreurs, setErreurs] = useState({})

  function gererTelephone(valeur, estValide) {
    setTelephone(valeur)
    setTelephoneValide(estValide)
  }

  // Code postal automatique depuis la commune (17/07/2026, point 140) :
  // uniquement si le code postal est encore vide — reste modifiable à la
  // main ensuite (ex: un CEDEX différent), sans jamais être réécrasé.
  async function completerCodePostal() {
    if (codePostal) return
    const trouve = await chercherCodePostal(commune)
    if (trouve) setCodePostal(trouve)
  }

  function soumettre(evenement) {
    evenement.preventDefault()

    const nouvellesErreurs = {}
    if (!telephoneValide) {
      nouvellesErreurs.telephone = 'Le numéro de téléphone est incomplet.'
    }
    if (commune && !REGEX_COMMUNE.test(commune)) {
      nouvellesErreurs.commune = 'La commune doit contenir du texte, pas seulement des chiffres.'
    }
    if (codePostal && !REGEX_CODE_POSTAL.test(codePostal)) {
      nouvellesErreurs.codePostal = 'Doit contenir exactement 5 chiffres.'
    }
    if (email && !REGEX_EMAIL.test(email)) {
      nouvellesErreurs.email = 'Format attendu : nom@domaine.extension'
    }
    setErreurs(nouvellesErreurs)
    if (Object.keys(nouvellesErreurs).length > 0) return

    onEnregistrer(acquereur._id, {
      civilite: civilite || null,
      nom,
      prenom: prenom || null,
      adresse: adresse || null,
      commune: commune || null,
      codePostal: codePostal || null,
      telephone,
      email: email || null,
    })
  }

  return (
    <tr className="formulaire-dates">
      <td colSpan={colonnes}>
        <form onSubmit={soumettre}>
          <label>
            Civilité
            <select value={civilite} onChange={(e) => setCivilite(e.target.value)}>
              <option value="">—</option>
              <option value="M.">M.</option>
              <option value="Mme">Mme</option>
              <option value="M. et Mme">M. et Mme</option>
            </select>
          </label>
          <label>
            Nom
            <input value={nom} onChange={(e) => setNom(e.target.value)} required />
          </label>
          <label>
            Prénom
            <input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
          </label>
          <label>
            Adresse
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </label>
          <label>
            Commune
            <input
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              onBlur={completerCodePostal}
              className={erreurs.commune ? 'invalide' : ''}
            />
            {erreurs.commune && <span className="erreur-champ">{erreurs.commune}</span>}
          </label>
          <label>
            Code postal
            <input
              value={codePostal}
              onChange={(e) => setCodePostal(e.target.value)}
              inputMode="numeric"
              className={erreurs.codePostal ? 'invalide' : ''}
            />
            {erreurs.codePostal && <span className="erreur-champ">{erreurs.codePostal}</span>}
          </label>
          <label>
            Téléphone
            <TelephoneInput value={telephone} onChange={gererTelephone} />
            {erreurs.telephone && <span className="erreur-champ">{erreurs.telephone}</span>}
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={erreurs.email ? 'invalide' : ''}
            />
            {erreurs.email && <span className="erreur-champ">{erreurs.email}</span>}
          </label>
          <button type="submit">Enregistrer</button>
          <button type="button" onClick={onFermer}>Annuler</button>
        </form>
      </td>
    </tr>
  )
}

export default FormulaireEditionClient
