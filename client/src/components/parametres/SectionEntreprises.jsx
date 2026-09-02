import { useState } from 'react'
import { API_URL } from '../../config.js'
import { apiFetch } from '../../utils/api.js'
import TelephoneInput from '../TelephoneInput.jsx'
import { chercherCodePostal } from '../../utils/codePostal.js'

// Validées en JS plutôt qu'en attribut HTML "pattern" : plus lisible, plus
// facile à déboguer, et ça garde la main sur le message d'erreur affiché.
const REGEX_COMMUNE = /^(?!\d+$).+/
const REGEX_CODE_POSTAL = /^\d{5}$/
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SectionEntreprises({ entreprises, onChangement }) {
  const [nom, setNom] = useState('')
  const [corpsDeTravaux, setCorpsDeTravaux] = useState('')
  const [numeroLot, setNumeroLot] = useState('')
  const [adresse, setAdresse] = useState('')
  const [commune, setCommune] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [telephone, setTelephone] = useState('')
  const [telephoneValide, setTelephoneValide] = useState(true)
  const [email, setEmail] = useState('')
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

  async function ajouter(evenement) {
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

    const reponse = await apiFetch(`${API_URL}/api/entreprises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom,
        corpsDeTravaux,
        numeroLot,
        contact: { adresse, commune, codePostal, telephone, email },
      }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    setNom('')
    setCorpsDeTravaux('')
    setNumeroLot('')
    setAdresse('')
    setCommune('')
    setCodePostal('')
    setTelephone('')
    setTelephoneValide(true)
    setEmail('')
    setErreurs({})
    onChangement()
  }

  async function supprimer(id) {
    const reponse = await apiFetch(`${API_URL}/api/entreprises/${id}`, { method: 'DELETE' })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    onChangement()
  }

  return (
    <section className="section-parametres">
      <h2>Entreprises</h2>
      <ul>
        {entreprises.length === 0 && <li>Aucune entreprise pour l'instant.</li>}
        {entreprises.map((e) => (
          <li key={e._id}>
            {e.numeroLot && `Lot ${e.numeroLot} — `}
            {e.corpsDeTravaux} — {e.nom}
            {e.contact?.adresse && ` — ${e.contact.adresse}`}
            {e.contact?.codePostal && ` ${e.contact.codePostal}`}
            {e.contact?.commune && ` ${e.contact.commune}`}
            {e.contact?.telephone && ` — ${e.contact.telephone}`}
            {e.contact?.email && ` — ${e.contact.email}`}
            <button type="button" onClick={() => supprimer(e._id)}>
              Retirer
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={ajouter}>
        <label>
          Nom
          <input value={nom} onChange={(e) => setNom(e.target.value)} required />
        </label>
        <label>
          Corps de travaux
          <input
            value={corpsDeTravaux}
            onChange={(e) => setCorpsDeTravaux(e.target.value)}
            required
          />
        </label>
        <label>
          N° de lot
          <input
            value={numeroLot}
            onChange={(e) => setNumeroLot(e.target.value)}
            placeholder="ex: 01"
          />
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
        <button type="submit">Ajouter</button>
      </form>
    </section>
  )
}

export default SectionEntreprises
