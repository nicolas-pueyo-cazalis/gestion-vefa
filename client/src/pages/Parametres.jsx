import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import SectionInfosProgramme from '../components/parametres/SectionInfosProgramme.jsx'
import SectionDelaisEtTaux from '../components/parametres/SectionDelaisEtTaux.jsx'
import SectionEtages from '../components/parametres/SectionEtages.jsx'
import SectionEntreprises from '../components/parametres/SectionEntreprises.jsx'
import SectionBareme from '../components/parametres/SectionBareme.jsx'
import SectionLots from '../components/parametres/SectionLots.jsx'
import SectionUtilisateurs from '../components/parametres/SectionUtilisateurs.jsx'
import SectionAlertes from '../components/parametres/SectionAlertes.jsx'
import SectionAnnexes from '../components/parametres/SectionAnnexes.jsx'

// Onglets groupés par thème (04/09/2026, point 277) : les 9 sections
// n'étaient jusqu'ici qu'empilées verticalement (long scroll pénible à
// parcourir régulièrement). Regroupées en 3 catégories, chacune avec ses
// propres sous-onglets — une seule section montée à la fois. "Utilisateurs"
// (admin uniquement) filtrée à l'affichage des sous-onglets, pas ici (la
// liste ci-dessous reste statique, valable pour tous les rôles).
const CATEGORIES = [
  { cle: 'programme', nom: 'Programme', sections: ['infos', 'delais', 'alertes', 'bareme'] },
  { cle: 'catalogue', nom: 'Catalogue', sections: ['etages', 'annexes', 'lots'] },
  { cle: 'equipe', nom: 'Équipe', sections: ['entreprises', 'utilisateurs'] },
]

const LIBELLES_SECTIONS = {
  infos: 'Informations',
  delais: 'Délais et taux',
  alertes: 'Alertes',
  bareme: 'Barème',
  etages: 'Étages',
  annexes: 'Annexes',
  lots: 'Lots',
  entreprises: 'Entreprises',
  utilisateurs: 'Utilisateurs',
}

function Parametres() {
  const { utilisateur } = useAuth()
  // Programme actif venant du contexte (17/07/2026, point 138) — Paramètres
  // modifie toujours CE programme-là, jamais un autre.
  const { programmeActif: programme, setProgrammeActif } = useProgramme()
  const [entreprises, setEntreprises] = useState([])
  const [lots, setLots] = useState([])
  const [annexes, setAnnexes] = useState([])
  const [utilisateurs, setUtilisateurs] = useState([])
  const [chargement, setChargement] = useState(true)
  const [sectionActive, setSectionActive] = useState('infos')
  // Saisie non enregistrée (04/09/2026, point 277) : vrai dès qu'un champ
  // de la section affichée a été touché — voir le useEffect plus bas
  // (écoute générique input/change, sans rien changer dans les 9
  // composants Section*). Remis à zéro par enregistrer() sur succès
  // (un seul formulaire par section, sans ambiguïté) ; PAS remis à zéro
  // par les rechargements des 4 sections "liste" (Annexes/Lots/
  // Entreprises/Utilisateurs) — plusieurs sous-formulaires indépendants
  // y cohabitent, remettre le drapeau à zéro sur l'un aurait pu masquer
  // une saisie non liée encore en cours ailleurs dans la même section.
  const [estModifie, setEstModifie] = useState(false)
  const refPanneauActif = useRef(null)

  const categorieActive = CATEGORIES.find((cat) => cat.sections.includes(sectionActive))

  async function chargerEntreprises() {
    const reponse = await apiFetch(`${API_URL}/api/entreprises`)
    setEntreprises(await reponse.json())
  }

  async function chargerLots() {
    const reponse = await apiFetch(`${API_URL}/api/lots?programme=${programme._id}`)
    setLots(await reponse.json())
  }

  async function chargerAnnexes() {
    const reponse = await apiFetch(`${API_URL}/api/annexes?programme=${programme._id}`)
    setAnnexes(await reponse.json())
  }

  // Attribuer une annexe à un lot (formulaire de logement) modifie les
  // deux collections à la fois — les deux listes doivent donc être
  // rechargées ensemble pour rester cohérentes (17/07/2026, point 165).
  async function chargerLotsEtAnnexes() {
    await Promise.all([chargerLots(), chargerAnnexes()])
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
      await Promise.all([
        chargerEntreprises(),
        chargerLots(),
        chargerAnnexes(),
        chargerUtilisateurs(),
      ])
      setChargement(false)
    }
    chargerTout()
  }, [])

  // Détection générique de saisie (04/09/2026, point 277) : un seul
  // écouteur en délégation sur le conteneur de la section active, plutôt
  // que de faire remonter un état "modifié" depuis chacun des 9
  // formulaires — les événements DOM natifs remontent à travers les
  // composants React sans qu'aucun des 9 fichiers Section*.jsx n'ait à
  // être modifié. Réinitialisé à chaque changement de section (nouveau
  // montage = rien à perdre).
  useEffect(() => {
    setEstModifie(false)
    const conteneur = refPanneauActif.current
    if (!conteneur) return
    function marquerModifie() {
      setEstModifie(true)
    }
    conteneur.addEventListener('input', marquerModifie)
    conteneur.addEventListener('change', marquerModifie)
    return () => {
      conteneur.removeEventListener('input', marquerModifie)
      conteneur.removeEventListener('change', marquerModifie)
    }
  }, [sectionActive])

  async function enregistrer(patch) {
    const reponse = await apiFetch(`${API_URL}/api/programme/${programme._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    // Met aussi à jour le contexte partagé (bandeau, délais utilisés par
    // les autres pages...) sans attendre un rechargement de page.
    setProgrammeActif(await reponse.json())
    // Un seul formulaire dans ces 5 sections : un enregistrement réussi
    // veut dire qu'il n'y a plus rien à perdre dans la section affichée.
    setEstModifie(false)
  }

  // Avant tout changement de section (sous-onglet OU changement de
  // catégorie, qui bascule aussi la section) : prévient si une saisie
  // non enregistrée serait perdue. window.confirm() natif — cohérent
  // avec le reste de l'appli aujourd'hui (ex: "Annuler la vente") ; son
  // remplacement par une vraie modale est un autre point de la même
  // liste UX (point 277), pas encore commencé.
  function tenterAllerA(cle) {
    if (
      estModifie &&
      !window.confirm('Des modifications non enregistrées seront perdues. Continuer ?')
    ) {
      return
    }
    setSectionActive(cle)
  }

  function cliquerCategorie(categorie) {
    if (categorie.sections.includes(sectionActive)) return
    tenterAllerA(categorie.sections[0])
  }

  if (chargement) return <p>Chargement des paramètres...</p>

  const sousOnglets = categorieActive.sections.filter(
    (cle) => cle !== 'utilisateurs' || utilisateur?.role === 'admin',
  )

  function renderSectionActive() {
    switch (sectionActive) {
      case 'infos':
        return <SectionInfosProgramme programme={programme} onEnregistrer={enregistrer} />
      case 'delais':
        return <SectionDelaisEtTaux programme={programme} onEnregistrer={enregistrer} />
      case 'alertes':
        return <SectionAlertes programme={programme} onEnregistrer={enregistrer} />
      case 'bareme':
        return <SectionBareme programme={programme} onEnregistrer={enregistrer} />
      case 'etages':
        return <SectionEtages programme={programme} onEnregistrer={enregistrer} />
      case 'annexes':
        return (
          <SectionAnnexes programme={programme} annexes={annexes} onChangement={chargerAnnexes} />
        )
      case 'lots':
        return (
          <SectionLots
            programme={programme}
            lots={lots}
            annexes={annexes}
            onChangement={chargerLotsEtAnnexes}
          />
        )
      case 'entreprises':
        return <SectionEntreprises entreprises={entreprises} onChangement={chargerEntreprises} />
      case 'utilisateurs':
        return utilisateur?.role === 'admin' ? (
          <SectionUtilisateurs utilisateurs={utilisateurs} onChangement={chargerUtilisateurs} />
        ) : null
      default:
        return null
    }
  }

  return (
    <>
      <h1 className="titre-page">Paramètres</h1>

      <div className="categories-parametres">
        {CATEGORIES.map((categorie) => (
          <button
            key={categorie.cle}
            type="button"
            className={categorie.sections.includes(sectionActive) ? 'actif' : ''}
            onClick={() => cliquerCategorie(categorie)}
          >
            {categorie.nom}
          </button>
        ))}
      </div>

      <div className="sous-onglets-parametres">
        {sousOnglets.map((cle) => (
          <button
            key={cle}
            type="button"
            className={cle === sectionActive ? 'actif' : ''}
            onClick={() => tenterAllerA(cle)}
          >
            {LIBELLES_SECTIONS[cle]}
          </button>
        ))}
      </div>

      <div ref={refPanneauActif}>{renderSectionActive()}</div>
    </>
  )
}

export default Parametres
