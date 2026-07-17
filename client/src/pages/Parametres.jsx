import { useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import SectionInfosProgramme from '../components/parametres/SectionInfosProgramme.jsx'
import SectionDelaisEtTaux from '../components/parametres/SectionDelaisEtTaux.jsx'
import SectionEtages from '../components/parametres/SectionEtages.jsx'
import SectionEntreprises from '../components/parametres/SectionEntreprises.jsx'
import SectionBareme from '../components/parametres/SectionBareme.jsx'
import SectionLots from '../components/parametres/SectionLots.jsx'
import SectionUtilisateurs from '../components/parametres/SectionUtilisateurs.jsx'
import SectionAlertes from '../components/parametres/SectionAlertes.jsx'

function Parametres() {
  const { utilisateur } = useAuth()
  const [programme, setProgramme] = useState(null)
  const [entreprises, setEntreprises] = useState([])
  const [lots, setLots] = useState([])
  const [utilisateurs, setUtilisateurs] = useState([])
  const [chargement, setChargement] = useState(true)

  async function chargerProgramme() {
    const reponse = await apiFetch(`${API_URL}/api/programme`)
    setProgramme(await reponse.json())
  }

  async function chargerEntreprises() {
    const reponse = await apiFetch(`${API_URL}/api/entreprises`)
    setEntreprises(await reponse.json())
  }

  async function chargerLots() {
    const reponse = await apiFetch(`${API_URL}/api/lots`)
    setLots(await reponse.json())
  }

  // Réservé aux admins (voir routes/utilisateurs.js) — inutile de demander
  // la liste si on n'a de toute façon pas le droit de la voir.
  async function chargerUtilisateurs() {
    if (utilisateur?.role !== 'admin') return
    const reponse = await apiFetch(`${API_URL}/api/utilisateurs`)
    setUtilisateurs(await reponse.json())
  }

  useEffect(() => {
    async function chargerTout() {
      await Promise.all([chargerProgramme(), chargerEntreprises(), chargerLots(), chargerUtilisateurs()])
      setChargement(false)
    }
    chargerTout()
  }, [])

  async function enregistrer(patch) {
    const reponse = await apiFetch(`${API_URL}/api/programme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    setProgramme(await reponse.json())
  }

  if (chargement) return <p>Chargement des paramètres...</p>

  return (
    <>
      <h1 className="titre-page">Paramètres</h1>

      <SectionInfosProgramme programme={programme} onEnregistrer={enregistrer} />
      <SectionDelaisEtTaux programme={programme} onEnregistrer={enregistrer} />
      <SectionAlertes programme={programme} onEnregistrer={enregistrer} />
      <SectionBareme programme={programme} onEnregistrer={enregistrer} />
      <SectionEtages programme={programme} onEnregistrer={enregistrer} />
      <SectionLots programme={programme} lots={lots} onChangement={chargerLots} />
      <SectionEntreprises entreprises={entreprises} onChangement={chargerEntreprises} />
      {utilisateur?.role === 'admin' && (
        <SectionUtilisateurs utilisateurs={utilisateurs} onChangement={chargerUtilisateurs} />
      )}
    </>
  )
}

export default Parametres
