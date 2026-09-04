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
import SectionBanque from '../components/parametres/SectionBanque.jsx'
import FenetreConfirmation from '../components/FenetreConfirmation.jsx'

// Onglets groupés par thème (04/09/2026, points 277 et 308) : les 9
// sections n'étaient jusqu'ici qu'empilées verticalement (long scroll
// pénible à parcourir régulièrement). Regroupées en 4 catégories,
// chacune avec ses propres sous-onglets — une seule section montée à la
// fois. "Entreprises" n'a volontairement qu'une seule section (clic
// direct sur le contenu, pas de barre de sous-onglets à un seul élément
// — voir le calcul de `sousOngletsVisibles` plus bas, règle générale
// plutôt qu'un cas spécial). "Utilisateurs" (admin uniquement) filtrée à
// l'affichage des sous-onglets, pas ici (la liste ci-dessous reste
// statique, valable pour tous les rôles).
const CATEGORIES = [
  {
    cle: 'programme',
    nom: 'Programme',
    sections: ['infos', 'etages', 'delais', 'bareme', 'banque'],
  },
  { cle: 'inventaire', nom: 'Inventaire', sections: ['lots', 'annexes'] },
  { cle: 'entreprises', nom: 'Entreprises', sections: ['entreprises'] },
  { cle: 'administration', nom: 'Administration', sections: ['alertes', 'utilisateurs'] },
]

const LIBELLES_SECTIONS = {
  infos: 'Informations',
  delais: 'Délais et taux',
  alertes: 'Alertes',
  bareme: 'Échéancier',
  etages: 'Étages',
  annexes: 'Annexes',
  lots: 'Lots',
  entreprises: 'Entreprises',
  utilisateurs: 'Utilisateurs',
  banque: 'Banque',
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
  // Confirmation de perte de saisie (05/09/2026, point 277) : vraie
  // modale React à la place de window.confirm() — la section cible est
  // retenue le temps de la confirmation, appliquée depuis onConfirmer.
  const [confirmationChangementOuverte, setConfirmationChangementOuverte] = useState(false)
  const [sectionEnAttente, setSectionEnAttente] = useState(null)
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
    // Molette de la souris au-dessus d'un champ number ayant le focus
    // (04/09/2026, signalé par Nicolas : la confirmation apparaissait
    // "sans avoir rien touché") : Chrome/Edge modifient la valeur d'un
    // <input type="number"> focalisé au simple passage de la molette,
    // et déclenchent un vrai `input` — perçu à tort comme une saisie
    // volontaire par la détection générique ci-dessus. `preventDefault()`
    // sur cet évènement précis neutralise ce comportement du navigateur
    // (le défilement normal de la page n'est pas affecté, seul le
    // changement de valeur au survol l'est) — écouteur volontairement
    // NON passif, `preventDefault()` serait ignoré sinon.
    function neutraliserMoletteNombre(e) {
      if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
        e.preventDefault()
      }
    }
    conteneur.addEventListener('input', marquerModifie)
    conteneur.addEventListener('change', marquerModifie)
    conteneur.addEventListener('wheel', neutraliserMoletteNombre)
    return () => {
      conteneur.removeEventListener('input', marquerModifie)
      conteneur.removeEventListener('change', marquerModifie)
      conteneur.removeEventListener('wheel', neutraliserMoletteNombre)
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
  // non enregistrée serait perdue.
  function tenterAllerA(cle) {
    if (estModifie) {
      setSectionEnAttente(cle)
      setConfirmationChangementOuverte(true)
      return
    }
    setSectionActive(cle)
  }

  function confirmerChangement() {
    setConfirmationChangementOuverte(false)
    setSectionActive(sectionEnAttente)
  }

  function cliquerCategorie(categorie) {
    if (categorie.sections.includes(sectionActive)) return
    tenterAllerA(categorie.sections[0])
  }

  if (chargement) return <p>Chargement des paramètres...</p>

  // Barre de sous-onglets masquée si la catégorie active n'a plus qu'un
  // seul élément visible (après filtrage du rôle) — s'applique
  // naturellement à "Entreprises" (toujours 1 élément) sans cas
  // spécial, et à "Administration" pour un non-admin (Alertes + Banque,
  // sous-onglets affichés quand même puisqu'il en reste 2).
  const sousOngletsVisibles = categorieActive.sections.filter(
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
      case 'banque':
        return <SectionBanque programme={programme} onEnregistrer={enregistrer} />
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

      {sousOngletsVisibles.length > 1 && (
        <div className="sous-onglets-parametres">
          {sousOngletsVisibles.map((cle) => (
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
      )}

      <div ref={refPanneauActif}>{renderSectionActive()}</div>

      {confirmationChangementOuverte && (
        <FenetreConfirmation
          titre="Modifications non enregistrées"
          message="Des modifications non enregistrées seront perdues. Continuer ?"
          libelleConfirmer="Continuer"
          onConfirmer={confirmerChangement}
          onFermer={() => setConfirmationChangementOuverte(false)}
        />
      )}
    </>
  )
}

export default Parametres
