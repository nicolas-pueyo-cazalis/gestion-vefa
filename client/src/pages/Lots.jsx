import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { STATUTS_LOT } from '../data/lots.js'
import { STATUTS_TMA } from '../data/tma.js'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import { formatMontant } from '../utils/formatMontant.js'
import { formatDate } from '../utils/statuts.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FiltreStatuts from '../components/FiltreStatuts.jsx'
import BarreRecherche from '../components/BarreRecherche.jsx'
import { correspondRecherche } from '../utils/recherche.js'
import { nomAcquereur } from '../utils/acquereur.js'
import FenetreExport from '../components/FenetreExport.jsx'
import FormulaireEditionLot from '../components/FormulaireEditionLot.jsx'
import FormulaireVenteAnnexe from '../components/FormulaireVenteAnnexe.jsx'
import BoutonContact from '../components/BoutonContact.jsx'

// Lot, Étage, Type, Orientation, SHAB, Annexes, Prix TTC, Prix/m², Statut,
// Date, Client, Commentaire, Action (13/07/2026, point 156 : Terrasse(s),
// Balcon(s), Loggia(s), Jardin, Parkings, Caves, Celliers sont regroupés
// dans la seule colonne "Annexes" — plus besoin de colonnes dynamiques
// selon le nombre de terrasses).
const NB_COLONNES_BASE = 13

const STATUTS_FILTRE = [
  { valeur: 'tous', libelle: 'Tous' },
  ...Object.entries(STATUTS_LOT).map(([valeur, libelle]) => ({ valeur, libelle })),
]

// Texte de recherche d'un lot (20/07/2026, point 187) : TOUT ce qui
// s'affiche dans la ligne du tableau doit pouvoir être retrouvé (demande
// explicite de Nicolas, ex: chercher "5444" doit retrouver un lot dont le
// "Prix TTC/m² SHAB" affiche "5 444 €") — mêmes fonctions d'affichage que
// le rendu du tableau (afficheSurface, formatMontant...), pas les valeurs
// brutes, pour que la recherche corresponde exactement à ce qui est lu à
// l'écran.
export function texteRechercheLot(lot) {
  return [
    lot.reference,
    lot.etage,
    lot.type,
    lot.orientation,
    afficheSurface(lot.surfaceHabitable),
    afficheSurface(lot.surfaceSousPlafondBas),
    ...afficheAnnexes(lot),
    formatMontant(lot.prixTTC, 0),
    prixParM2(lot) !== null ? formatMontant(prixParM2(lot), 0) : null,
    STATUTS_LOT[lot.statut],
    dateActuelle(lot),
    nomAcquereur(lot.acquereur),
    lot.commentaire,
  ].filter(Boolean).join(' ')
}

export function prixParM2(lot) {
  if (!lot.surfaceHabitable) return null
  return lot.prixTTC / lot.surfaceHabitable
}

// Remarque du 13/07/2026 : contrairement aux montants (plus de décimales),
// les surfaces gardent toujours 2 décimales, même quand la valeur est un
// nombre rond (45 m² s'affiche "45,00 m²").
export function formatteDecimales(valeur) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valeur)
}

export function afficheSurface(valeur) {
  return valeur == null ? '—' : `${formatteDecimales(valeur)} m²`
}

// Colonne "Annexes" (13/07/2026, point 156) : regroupe Terrasse(s)/
// Balcon(s)/Loggia(s)/Jardin/Parkings/Caves/Celliers dans une seule
// cellule, une ligne par catégorie présente (les catégories vides sont
// omises plutôt que d'afficher des "—" qui alourdiraient la cellule).
// `pluraliser` (01/09/2026, trouvé en écrivant les tests, chantier 13) :
// accorde CHAQUE mot du libellé, pas seulement la fin de la phrase — sans
// ça, "Parking extérieur" + "s" donnait "Parking extérieurs" (faute
// d'accord), pas "Parkings extérieurs".
export function pluraliser(mot, pluriel) {
  if (!pluriel) return mot
  return mot.split(' ').map((mot) => `${mot}s`).join(' ')
}

export function ligneSurfaces(mot, valeurs) {
  if (!valeurs?.length) return null
  return `${pluraliser(mot, valeurs.length > 1)} : ${valeurs.map((v) => `${formatteDecimales(v)} m²`).join(', ')}`
}

// Annexes du catalogue attribuées à ce lot (17/07/2026, point 165) —
// `lot.annexes` vient du populate de la relation virtuelle côté serveur
// (server/models/Lot.js), plus les simples tableaux de numéros d'avant.
export function ligneAnnexesType(mot, annexesDuLot, type) {
  const numeros = (annexesDuLot ?? []).filter((a) => a.type === type).map((a) => a.numero)
  if (numeros.length === 0) return null
  return `${pluraliser(mot, numeros.length > 1)} n° ${numeros.join(', ')}`
}

export function afficheAnnexes(lot) {
  return [
    ligneSurfaces('Terrasse', lot.surfacesTerrasses),
    ligneSurfaces('Balcon', lot.surfacesBalcons),
    ligneSurfaces('Loggia', lot.surfacesLoggias),
    lot.surfaceJardin != null ? `Jardin : ${afficheSurface(lot.surfaceJardin)}` : null,
    ligneAnnexesType('Parking extérieur', lot.annexes, 'parking_ext'),
    ligneAnnexesType('Parking intérieur', lot.annexes, 'parking_int'),
    ligneAnnexesType('Cave', lot.annexes, 'cave'),
    ligneAnnexesType('Cellier', lot.annexes, 'cellier'),
  ].filter(Boolean)
}

// Affiche la date correspondant à l'étape la plus avancée déjà atteinte
// par le lot (acte > réservation > option) — une seule date "utile" par
// ligne plutôt que trois colonnes creuses la plupart du temps vides.
// Cohérente par construction avec le statut : le serveur refuse qu'une
// date d'étape non atteinte soit renseignée (voir server/routes/lots.js).
export function dateActuelle(lot) {
  const date = lot.dateActe || lot.dateReservation || lot.dateOption
  return date ? new Date(date).toLocaleDateString('fr-FR') : '—'
}

// Remarque du 13/07/2026 : un lot Acté sans offre de prêt reçue mérite un
// rappel visuel — sauf si l'acquéreur a explicitement déclaré "sans prêt"
// (page Suivi de prêt), auquel cas la question ne se pose pas.
export function offrePretManquante(lot) {
  return lot.statut === 'acte' && lot.acquereur && !lot.acquereur.sansPret && !lot.acquereur.dateOffrePretRecue
}

// Historique fusionné dans la page Lots (17/07/2026, remarque de Nicolas —
// remplace l'ancienne page "Annulés" à part). `nomClient` distinct de
// `nomAcquereur()` (utils/acquereur.js) : une entrée d'historique stocke
// une COPIE du nom du client (civiliteClient/nomClient/prenomClient), pas
// une référence vivante — voir server/models/HistoriqueAnnulation.js.
export function nomClient(entree) {
  return [entree.civiliteClient, entree.prenomClient, entree.nomClient].filter(Boolean).join(' ') || '—'
}

// Dernière date atteinte avant l'annulation (acte > réservation > option) —
// même logique que dateActuelle() ci-dessus.
export function derniereDateAnnulation(entree) {
  return formatDate(entree.dateActe || entree.dateReservation || entree.dateOption)
}

function Lots() {
  const { programmeActif: programme } = useProgramme()
  const [lots, setLots] = useState([])
  const [acquereurs, setAcquereurs] = useState([])
  const [annexes, setAnnexes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [recherche, setRecherche] = useState('')
  const [idEnEdition, setIdEnEdition] = useState(null)
  const [venteAnnexeOuverte, setVenteAnnexeOuverte] = useState(false)
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false)
  const [exportOuvert, setExportOuvert] = useState(false)
  const [historiqueAnnulations, setHistoriqueAnnulations] = useState([])
  const [historiqueModificationsPrix, setHistoriqueModificationsPrix] = useState([])
  const [tmaList, setTmaList] = useState([])
  const [idAnnulationOuverte, setIdAnnulationOuverte] = useState(null)

  // Position réelle (en pixels, mesurée dans le DOM) des colonnes SHAB et
  // Prix TTC — remarque du 13/07/2026 : un calcul par index de colonne ne
  // correspond pas aux largeurs réelles (très inégales : "Commentaire" et
  // "Client" bien plus larges que "SHAB" ou "Statut"), donc on mesure les
  // vraies positions des <th> plutôt que de les deviner.
  const refPiedTotaux = useRef(null)
  const refTheadShab = useRef(null)
  const refTheadPrixTTC = useRef(null)
  const [positionShab, setPositionShab] = useState(null)
  const [positionPrixTTC, setPositionPrixTTC] = useState(null)

  async function chargerLots() {
    const reponse = await apiFetch(`${API_URL}/api/lots?programme=${programme._id}`)
    setLots(await reponse.json())
  }

  async function chargerAcquereurs() {
    const reponse = await apiFetch(`${API_URL}/api/acquereurs?programme=${programme._id}`)
    setAcquereurs(await reponse.json())
  }

  async function chargerAnnexes() {
    const reponse = await apiFetch(`${API_URL}/api/annexes?programme=${programme._id}`)
    setAnnexes(await reponse.json())
  }

  // Historique fusionné dans la page Lots (17/07/2026, remarque de
  // Nicolas — remplace l'ancienne page "Annulés" à part) : annulations de
  // ventes ET modifications de prix, plus les TMA pour le détail d'une
  // annulation (voir plus bas, même logique que l'ancienne
  // HistoriqueAnnulations.jsx).
  async function chargerHistorique() {
    const [reponseAnnulations, reponsePrix, reponseTma] = await Promise.all([
      apiFetch(`${API_URL}/api/historique-annulations?programme=${programme._id}`),
      apiFetch(`${API_URL}/api/historique-modifications-prix?programme=${programme._id}`),
      apiFetch(`${API_URL}/api/tma?programme=${programme._id}`),
    ])
    setHistoriqueAnnulations(await reponseAnnulations.json())
    setHistoriqueModificationsPrix(await reponsePrix.json())
    setTmaList(await reponseTma.json())
  }

  useEffect(() => {
    async function chargerTout() {
      try {
        await Promise.all([chargerAcquereurs(), chargerLots(), chargerAnnexes(), chargerHistorique()])
      } catch (e) {
        setErreur(e.message)
      } finally {
        setChargement(false)
      }
    }
    chargerTout()
  }, [])

  // Mesure après chaque rendu du tableau (nombre de lignes/colonnes
  // pouvant changer le rendu, donc les positions) et au redimensionnement
  // de la fenêtre — pas de dépendances "données" précises ici, ce hook
  // s'exécute après CHAQUE rendu, ce qui reste bon marché (deux lectures
  // de position, pas de recalcul lourd).
  useLayoutEffect(() => {
    function mesurer() {
      if (!refPiedTotaux.current || !refTheadShab.current || !refTheadPrixTTC.current) return
      const base = refPiedTotaux.current.getBoundingClientRect().left
      const shab = refTheadShab.current.getBoundingClientRect()
      const prixTTC = refTheadPrixTTC.current.getBoundingClientRect()
      setPositionShab(shab.left + shab.width / 2 - base)
      // Ancré au bord gauche (pas centré) : le groupe TTC/TVA/HT part de
      // "Total TTC" (premier élément) puis s'étend vers la droite avec TVA
      // et Total HT, donc c'est ce bord gauche qui doit tomber sous "Prix TTC".
      setPositionPrixTTC(prixTTC.left - base)
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  })

  async function enregistrerLot(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/lots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    // La modification peut avoir créé ou renommé un acquéreur (voir
    // FormulaireEditionLot) — sans ce rafraîchissement, la liste
    // déroulante "Client" resterait affichée avec les anciennes valeurs
    // jusqu'au prochain rechargement complet de la page.
    await Promise.all([chargerLots(), chargerAcquereurs()])
    setIdEnEdition(null)
  }

  async function annulerVenteLot(id) {
    const reponse = await apiFetch(`${API_URL}/api/lots/${id}/annuler`, { method: 'POST' })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    // L'annulation d'une vente d'annexe seule libère l'annexe (voir
    // routes/lots.js) — sans ce rechargement, "Vendre une annexe" la
    // proposerait de nouveau seulement après un rechargement de page.
    // chargerHistorique() : l'annulation vient de créer une nouvelle
    // entrée dans l'historique fusionné (voir plus bas).
    await Promise.all([chargerLots(), chargerAcquereurs(), chargerAnnexes(), chargerHistorique()])
    setIdEnEdition(null)
  }

  // Modification du prix d'un logement (ou d'une annexe vendue à part),
  // 17/07/2026, remarque de Nicolas — motif obligatoire, tracée dans
  // l'historique. Renvoie le message d'erreur au formulaire (FormulairePrixLot)
  // plutôt qu'un alert() générique, pour qu'il s'affiche au bon endroit.
  async function enregistrerPrixLot(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/lots/${id}/prix`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      return message
    }
    await Promise.all([chargerLots(), chargerHistorique()])
    setIdPrixEnEdition(null)
    return null
  }

  // Vente d'une annexe seule (17/07/2026, remarque de Nicolas) : crée un
  // "lot" à part (voir server/models/Lot.js, `estAnnexeSeule`), qui suit
  // ensuite le même cycle de vente que n'importe quel logement (crayon
  // "Modifier" sur sa ligne, comme pour un lot normal).
  async function creerVenteAnnexe({ annexeId, reference, infosVente }) {
    const reponseCreation = await apiFetch(`${API_URL}/api/lots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programme: programme._id,
        reference,
        prixLogementSeul: 0,
        annexeIds: [annexeId],
        estAnnexeSeule: true,
      }),
    })
    if (!reponseCreation.ok) {
      const { message } = await reponseCreation.json()
      alert(message)
      return
    }
    const lotCree = await reponseCreation.json()
    // Statut/client/dates renseignés directement dans l'encart "Vendre une
    // annexe" (17/07/2026, remarque de Nicolas) : un 2ème appel réutilise
    // la même route PATCH qu'un logement classique (genération des appels
    // de fonds, création du client, etc. déjà gérées là-bas).
    const reponseInfos = await apiFetch(`${API_URL}/api/lots/${lotCree._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(infosVente),
    })
    if (!reponseInfos.ok) {
      const { message } = await reponseInfos.json()
      alert(message)
    }
    await Promise.all([chargerLots(), chargerAnnexes(), chargerAcquereurs()])
    setVenteAnnexeOuverte(false)
  }

  if (chargement) return <p>Chargement des lots...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  const lotsFiltres = lots
    .filter((lot) => statutActif === 'tous' || lot.statut === statutActif)
    .filter((lot) => correspondRecherche(texteRechercheLot(lot), recherche))

  // Colonne conditionnelle (17/07/2026, point 164) : n'existe que si au
  // moins un lot du programme a une surface sous plafond bas renseignée —
  // sur `lots` (pas `lotsFiltres`), pour que la colonne n'apparaisse/
  // disparaisse pas selon le filtre de statut sélectionné.
  const afficherColonneSousPlafondBas = lots.some((lot) => lot.surfaceSousPlafondBas != null)
  const NB_COLONNES = NB_COLONNES_BASE + (afficherColonneSousPlafondBas ? 1 : 0)

  const parStatut = Object.keys(STATUTS_LOT).reduce((compte, statut) => {
    compte[statut] = lots.filter((lot) => lot.statut === statut).length
    return compte
  }, {})

  const caParStatut = Object.keys(STATUTS_LOT).reduce((compte, statut) => {
    compte[statut] = lots
      .filter((lot) => lot.statut === statut)
      .reduce((somme, lot) => somme + lot.prixTTC, 0)
    return compte
  }, {})

  // Taux affichés sous chaque carte (17/07/2026, point 168) — la part de
  // cette carte sur le total de sa propre rangée (nombre de lots, ou CA).
  const totalCA = Object.values(caParStatut).reduce((somme, montant) => somme + montant, 0)
  function pourcentage(valeur, total) {
    return total > 0 ? Math.round((valeur / total) * 100) : 0
  }

  // Totaux TTC/TVA/HT du tableau affiché (respecte le filtre de statut
  // actif), à partir du taux de TVA paramétré sur le programme.
  const tauxTva = programme.parametres.tauxTva
  const totalTTC = lotsFiltres.reduce((somme, lot) => somme + lot.prixTTC, 0)
  const totalHT = totalTTC / (1 + tauxTva)
  const totalTVA = totalTTC - totalHT

  // Surface totale et prix moyen TTC/m² du tableau affiché — remarque du
  // 13/07/2026 : total TTC / surface totale (pas la moyenne des prix/m²
  // de chaque lot, comme calculé jusqu'ici).
  const totalSurface = lotsFiltres.reduce((somme, lot) => somme + (lot.surfaceHabitable ?? 0), 0)
  const moyennePrixM2 = totalSurface > 0 ? totalTTC / totalSurface : null

  // Export #1 (20/07/2026, point 192) : tableau récapitulatif des lots,
  // respecte les filtres actifs (statut + recherche, déjà appliqués à
  // `lotsFiltres`), sans la colonne Action, avec les mêmes totaux qu'à
  // l'écran. Mêmes fonctions d'affichage que le rendu du tableau, pour
  // que l'export corresponde exactement à ce qui est lu à l'écran.
  function donneesExportTableau() {
    const entetes = [
      'Lot', 'Étage', 'Type', 'Orientation', 'Surface SHAB',
      ...(afficherColonneSousPlafondBas ? ['Surface < 1,80m'] : []),
      'Annexes', 'Prix TTC', 'Prix TTC/m² SHAB', 'Statut', 'Date', 'Client', 'Commentaire',
    ]
    const lignes = lotsFiltres.map((lot) => [
      lot.estAnnexeSeule ? '—' : lot.reference,
      lot.etage ?? '',
      lot.type ?? '',
      lot.orientation ?? '',
      afficheSurface(lot.surfaceHabitable),
      ...(afficherColonneSousPlafondBas ? [afficheSurface(lot.surfaceSousPlafondBas)] : []),
      afficheAnnexes(lot).join('\n') || '—',
      formatMontant(lot.prixTTC, 0),
      prixParM2(lot) !== null ? formatMontant(prixParM2(lot), 0) : '—',
      STATUTS_LOT[lot.statut],
      dateActuelle(lot),
      nomAcquereur(lot.acquereur),
      lot.commentaire || '—',
    ])
    const totaux = [
      ['SHAB totale', afficheSurface(totalSurface)],
      ['Total TTC', formatMontant(totalTTC)],
      [`TVA (${Math.round(tauxTva * 100)}%)`, formatMontant(totalTVA)],
      ['Total HT', formatMontant(totalHT)],
      ['Prix moyen TTC/m²', moyennePrixM2 !== null ? formatMontant(moyennePrixM2, 0) : '—'],
    ]
    return {
      nomFichier: `lots-${programme.nom}`,
      titre: `Lots — ${programme.nom}`,
      entetes,
      lignes,
      totaux,
    }
  }

  // Export #2 (20/07/2026, point 193) : les cartes de statistiques
  // (Commercialisation, Chiffre d'affaires, Prix moyen TTC/m²) — mêmes
  // valeurs et pourcentages qu'à l'écran, réunies dans un tableau à deux
  // colonnes plutôt que sous forme de cartes (peu adapté à Excel/PDF).
  function donneesExportCartes() {
    const entetes = ['Indicateur', 'Valeur']
    const lignes = [
      ['Prix moyen TTC/m²', moyennePrixM2 !== null ? formatMontant(moyennePrixM2, 0) : '—'],
      ['Commercialisation — Lots au total', String(lots.length)],
      ['Commercialisation — Actés', `${parStatut.acte} (${pourcentage(parStatut.acte, lots.length)}% du programme)`],
      ['Commercialisation — Réservés', `${parStatut.reserve} (${pourcentage(parStatut.reserve, lots.length)}% du programme)`],
      ['Commercialisation — Options', `${parStatut.option} (${pourcentage(parStatut.option, lots.length)}% du programme)`],
      ['Commercialisation — Libres', `${parStatut.libre} (${pourcentage(parStatut.libre, lots.length)}% du programme)`],
      ["Chiffre d'affaires — CA acté", `${formatMontant(caParStatut.acte, 0)} (${pourcentage(caParStatut.acte, totalCA)}% du CA total)`],
      ["Chiffre d'affaires — CA réservé", `${formatMontant(caParStatut.reserve, 0)} (${pourcentage(caParStatut.reserve, totalCA)}% du CA total)`],
      ["Chiffre d'affaires — CA options", `${formatMontant(caParStatut.option, 0)} (${pourcentage(caParStatut.option, totalCA)}% du CA total)`],
      ["Chiffre d'affaires — CA libre", `${formatMontant(caParStatut.libre, 0)} (${pourcentage(caParStatut.libre, totalCA)}% du CA total)`],
    ]
    return {
      nomFichier: `lots-statistiques-${programme.nom}`,
      titre: `Statistiques — ${programme.nom}`,
      entetes,
      lignes,
    }
  }

  // Export #3 (20/07/2026, point 194) : l'historique — deux tableaux
  // (ventes annulées, modifications de prix) dans un même fichier, sans
  // la colonne "Détail" (équivalent d'une colonne Action ici, point 190).
  function donneesExportHistorique() {
    return {
      nomFichier: `lots-historique-${programme.nom}`,
      titre: `Historique — ${programme.nom}`,
      sections: [
        {
          sousTitre: 'Ventes annulées',
          entetes: ['Logement', 'Statut avant annulation', 'Date', 'Client', 'Commentaire', 'Annulé le'],
          lignes: historiqueAnnulations.map((entree) => [
            entree.referenceLot,
            STATUTS_LOT[entree.statutAvantAnnulation],
            derniereDateAnnulation(entree),
            nomClient(entree),
            entree.commentaire || '—',
            formatDate(entree.dateAnnulation),
          ]),
        },
        {
          sousTitre: 'Modifications de prix',
          entetes: ['Logement', 'Ancien prix', 'Nouveau prix', 'Motif', 'Date'],
          lignes: historiqueModificationsPrix.map((entree) => [
            entree.referenceLot,
            formatMontant(entree.ancienPrix),
            formatMontant(entree.nouveauPrix),
            entree.motif,
            formatDate(entree.createdAt),
          ]),
        },
      ],
    }
  }

  // Export #4 (20/07/2026, point 195) : les annexes encore disponibles à
  // la vente (pas encore attribuées à un lot) — même liste que celle
  // proposée dans le panneau "Vendre une annexe".
  function donneesExportAnnexesALaVente() {
    const libellesType = {
      parking_ext: 'Parking extérieur',
      parking_int: 'Parking intérieur',
      cave: 'Cave',
      cellier: 'Cellier',
    }
    const disponibles = annexes.filter((a) => !a.lot)
    const entetes = ['Type', 'N°', 'Prix']
    const lignes = disponibles.map((a) => [libellesType[a.type] ?? a.type, String(a.numero), formatMontant(a.prix)])
    const totaux = [['Total', formatMontant(disponibles.reduce((somme, a) => somme + a.prix, 0))]]
    return {
      nomFichier: `lots-annexes-a-la-vente-${programme.nom}`,
      titre: `Annexes à la vente — ${programme.nom}`,
      entetes,
      lignes,
      totaux,
    }
  }

  return (
    <>
      {/* Point 153 (13/07/2026, option B choisie) : "Prix moyen TTC/m²"
          isolé ici, à côté du titre — point laissé en suspens, à
          rediscuter plus tard (emplacement pas forcément définitif). */}
      <div className="entete-avec-cle">
        <h1 className="titre-page">Tableau de bord des lots</h1>
        <div className="cle-chiffre">
          <span className="label">Prix moyen TTC/m²</span>
          <span className="valeur">{moyennePrixM2 !== null ? formatMontant(moyennePrixM2, 0) : '—'}</span>
        </div>
      </div>

      <h2 className="titre-section-stats">Commercialisation</h2>
      <section className="stats">
        <StatCard valeur={lots.length} libelle="Lots au total" />
        <StatCard
          valeur={parStatut.acte}
          libelle="Actés"
          statut="acte"
          pourcentage={pourcentage(parStatut.acte, lots.length)}
          libellePourcentage="du programme"
        />
        <StatCard
          valeur={parStatut.reserve}
          libelle="Réservés"
          statut="reserve"
          pourcentage={pourcentage(parStatut.reserve, lots.length)}
          libellePourcentage="du programme"
        />
        <StatCard
          valeur={parStatut.option}
          libelle="Options"
          statut="option"
          pourcentage={pourcentage(parStatut.option, lots.length)}
          libellePourcentage="du programme"
        />
        <StatCard
          valeur={parStatut.libre}
          libelle="Libres"
          statut="libre"
          pourcentage={pourcentage(parStatut.libre, lots.length)}
          libellePourcentage="du programme"
        />
      </section>

      <h2 className="titre-section-stats">Chiffre d'affaires</h2>
      <section className="stats">
        <StatCard
          valeur={formatMontant(caParStatut.acte, 0)}
          libelle="CA acté"
          statut="acte"
          pourcentage={pourcentage(caParStatut.acte, totalCA)}
          libellePourcentage="du CA total"
        />
        <StatCard
          valeur={formatMontant(caParStatut.reserve, 0)}
          libelle="CA réservé"
          statut="reserve"
          pourcentage={pourcentage(caParStatut.reserve, totalCA)}
          libellePourcentage="du CA total"
        />
        <StatCard
          valeur={formatMontant(caParStatut.option, 0)}
          libelle="CA options"
          statut="option"
          pourcentage={pourcentage(caParStatut.option, totalCA)}
          libellePourcentage="du CA total"
        />
        <StatCard
          valeur={formatMontant(caParStatut.libre, 0)}
          libelle="CA libre"
          statut="libre"
          pourcentage={pourcentage(caParStatut.libre, totalCA)}
          libellePourcentage="du CA total"
        />
      </section>

      <div className="barre-actions">
        <FiltreStatuts statuts={STATUTS_FILTRE} actif={statutActif} onChange={setStatutActif} />
        <BarreRecherche valeur={recherche} onChange={setRecherche} placeholder="Rechercher un lot..." />
        {!venteAnnexeOuverte && (
          <button type="button" onClick={() => setVenteAnnexeOuverte(true)}>Vendre une annexe</button>
        )}
      </div>

      {venteAnnexeOuverte && (
        <FormulaireVenteAnnexe
          annexesDisponibles={annexes.filter((a) => !a.lot)}
          acquereurs={acquereurs}
          onCreer={creerVenteAnnexe}
          onFermer={() => setVenteAnnexeOuverte(false)}
        />
      )}

      <div className="tableau-scroll">
        <table className="tableau-lots">
          <thead>
            <tr>
              <th>Lot</th>
              <th>Étage</th>
              <th>Type</th>
              <th>Orientation</th>
              <th ref={refTheadShab}>Surface SHAB</th>
              {afficherColonneSousPlafondBas && <th>Surface &lt; 1,80m</th>}
              <th>Annexes</th>
              <th ref={refTheadPrixTTC}>Prix TTC</th>
              <th>Prix TTC/m² SHAB</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Client</th>
              <th>Commentaire</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lotsFiltres.map((lot) => {
              const lignesAnnexes = afficheAnnexes(lot)
              return (
                <Fragment key={lot._id}>
                  <tr>
                    {/* Annexe vendue à part (17/07/2026, remarque de
                        Nicolas) : sa référence ne s'affiche pas ici, déjà
                        présente dans la colonne "Annexes" ci-dessous. */}
                    <td>{lot.estAnnexeSeule ? '—' : lot.reference}</td>
                    <td>{lot.etage}</td>
                    <td>{lot.type}</td>
                    <td>{lot.orientation}</td>
                    <td>{afficheSurface(lot.surfaceHabitable)}</td>
                    {afficherColonneSousPlafondBas && <td>{afficheSurface(lot.surfaceSousPlafondBas)}</td>}
                    <td>
                      {lignesAnnexes.length > 0 ? (
                        <div className="annexes-cellule">
                          {lignesAnnexes.map((ligne, i) => <div key={i}>{ligne}</div>)}
                        </div>
                      ) : '—'}
                    </td>
                    <td>{formatMontant(lot.prixTTC, 0)}</td>
                    <td>{prixParM2(lot) !== null ? formatMontant(prixParM2(lot), 0) : '—'}</td>
                    <td>
                      <Badge statut={lot.statut} texte={STATUTS_LOT[lot.statut]} />
                      {offrePretManquante(lot) && (
                        <div className="avertissement-cellule">Offre de prêt non reçue</div>
                      )}
                    </td>
                    <td>{dateActuelle(lot)}</td>
                    <td><span className="nom-client">{nomAcquereur(lot.acquereur)}</span></td>
                    <td><span className="commentaire-cellule">{lot.commentaire || '—'}</span></td>
                    <td className="actions">
                      <button
                        type="button"
                        className="bouton-icone"
                        title="Modifier"
                        aria-label="Modifier"
                        onClick={() => setIdEnEdition(lot._id)}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  {idEnEdition === lot._id && (
                    <FormulaireEditionLot
                      lot={lot}
                      acquereurs={acquereurs}
                      colonnes={NB_COLONNES}
                      onEnregistrer={enregistrerLot}
                      onAnnulerVente={annulerVenteLot}
                      onEnregistrerPrix={enregistrerPrixLot}
                      onFermer={() => setIdEnEdition(null)}
                    />
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>

        {/* Totaux sortis du tableau (13/07/2026) — SHAB totale positionnée
            sous sa colonne, mesurée réellement dans le DOM (voir le
            useLayoutEffect plus haut). Total TTC/TVA/Total HT décalés à
            gauche (point 153) : le groupe part du bord gauche de la
            colonne "Prix TTC" au lieu d'être collé à droite. "Prix moyen
            TTC/m²" retiré d'ici, isolé ailleurs (voir proposition). */}
        <div className="pied-totaux" ref={refPiedTotaux}>
          <div
            className="pied-totaux-ligne pied-totaux-flottant"
            style={{ left: `${positionShab ?? 0}px`, visibility: positionShab === null ? 'hidden' : 'visible' }}
          >
            <span className="label">SHAB totale</span>
            <span className="valeur">{afficheSurface(totalSurface)}</span>
          </div>
          <div
            className="pied-totaux-groupe pied-totaux-flottant pied-totaux-flottant--gauche"
            style={{ left: `${positionPrixTTC ?? 0}px`, visibility: positionPrixTTC === null ? 'hidden' : 'visible' }}
          >
            <div className="pied-totaux-ligne pied-totaux-principal">
              <span className="label">Total TTC</span>
              <span className="valeur">{formatMontant(totalTTC)}</span>
            </div>
            <div className="pied-totaux-ligne">
              <span className="label">TVA ({Math.round(tauxTva * 100)}%)</span>
              <span className="valeur">{formatMontant(totalTVA)}</span>
            </div>
            <div className="pied-totaux-ligne">
              <span className="label">Total HT</span>
              <span className="valeur">{formatMontant(totalHT)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historique fusionné dans la page Lots (17/07/2026, remarque de
          Nicolas) : plus de page "Annulés" séparée — ventes annulées et
          modifications de prix se consultent ici, repliées par défaut.
          Bouton en accordéon + bloc encadré (20/07/2026, point 181) : un
          simple lien texte souligné se voyait à peine comme un vrai
          bouton, et les titres internes réutilisaient le même style que
          "Commercialisation"/"Chiffre d'affaires" plus haut, sans rien
          qui les distingue visuellement d'une section principale de page. */}
      {/* Bouton "Exporter" sur la même ligne que "Historique" (20/07/2026,
          chantier des exports, à la demande de Nicolas) — emplacement
          provisoire, l'ergonomie de la page sera revue à la fin du
          chantier. */}
      <div className="conteneur-bouton-accordeon conteneur-bouton-accordeon--espace">
        <button
          type="button"
          className={`bouton-accordeon${historiqueOuvert ? ' bouton-accordeon--ouvert' : ''}`}
          onClick={() => setHistoriqueOuvert((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
          Historique (ventes annulées, modifications de prix)
        </button>
        <button type="button" className="bouton-accordeon" onClick={() => setExportOuvert(true)}>
          Exporter
        </button>
      </div>

      {historiqueOuvert && (
        <div className="bloc-historique">
          <h3>Ventes annulées</h3>
          <div className="tableau-scroll tableau-scroll--marge">
            <table className="tableau-lots">
              <thead>
                <tr>
                  <th>Logement</th>
                  <th>Statut avant annulation</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Commentaire</th>
                  <th>Annulé le</th>
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody>
                {historiqueAnnulations.length === 0 && (
                  <tr>
                    <td colSpan={7}>Aucune vente annulée pour l'instant.</td>
                  </tr>
                )}
                {historiqueAnnulations.map((entree) => {
                  const tmaDuLot = tmaList.filter((tma) => tma.lot?._id === entree.lot)
                  return (
                    <Fragment key={entree._id}>
                      <tr>
                        <td>{entree.referenceLot}</td>
                        <td><Badge statut={entree.statutAvantAnnulation} texte={STATUTS_LOT[entree.statutAvantAnnulation]} /></td>
                        <td>{derniereDateAnnulation(entree)}</td>
                        <td><span className="nom-client">{nomClient(entree)}</span></td>
                        <td><span className="commentaire-cellule">{entree.commentaire || '—'}</span></td>
                        <td>{formatDate(entree.dateAnnulation)}</td>
                        <td className="actions">
                          <button
                            type="button"
                            onClick={() => setIdAnnulationOuverte(idAnnulationOuverte === entree._id ? null : entree._id)}
                          >
                            {idAnnulationOuverte === entree._id ? 'Masquer' : 'Détail'}
                          </button>
                        </td>
                      </tr>
                      {idAnnulationOuverte === entree._id && (
                        <tr className="formulaire-dates">
                          <td colSpan={7}>
                            <div className="detail-annulation">
                              <div className="detail-annulation-bloc">
                                <h3>Prêt</h3>
                                {entree.sansPret ? (
                                  <p>Acquisition avec fonds personnels.</p>
                                ) : (
                                  <ul>
                                    <li>Banque : <BoutonContact titre="Banque" contact={entree.banque} /></li>
                                    <li>Courtier : <BoutonContact titre="Courtier" contact={entree.courtier} /></li>
                                    <li>Offre reçue le : {formatDate(entree.dateOffrePretRecue)}</li>
                                  </ul>
                                )}
                              </div>
                              <div className="detail-annulation-bloc">
                                <h3>Acte</h3>
                                <ul>
                                  <li>Notaire : <BoutonContact titre="Notaire" contact={entree.notaire} /></li>
                                  <li>Date de l'acte : {formatDate(entree.dateActe)}</li>
                                </ul>
                              </div>
                              <div className="detail-annulation-bloc">
                                <h3>Appels de fonds ({entree.appelsDeFonds.length})</h3>
                                {entree.appelsDeFonds.length === 0 ? (
                                  <p>Aucun appel de fonds généré.</p>
                                ) : (
                                  <ul>
                                    {entree.appelsDeFonds.map((appel, i) => (
                                      <li key={i}>
                                        {appel.phase.nom} — {formatMontant(appel.montant)}
                                        {appel.dateReglement ? ` — réglé le ${formatDate(appel.dateReglement)}` : ' — non réglé'}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div className="detail-annulation-bloc">
                                <h3>TMA ({tmaDuLot.length})</h3>
                                {tmaDuLot.length === 0 ? (
                                  <p>Aucune TMA liée à ce logement.</p>
                                ) : (
                                  <ul>
                                    {tmaDuLot.map((tma) => (
                                      <li key={tma._id}>
                                        {tma.description} — <Badge statut={tma.statut} texte={STATUTS_TMA[tma.statut]} />
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <h3>Modifications de prix</h3>
          <div className="tableau-scroll tableau-scroll--marge">
            <table className="tableau-lots">
              <thead>
                <tr>
                  <th>Logement</th>
                  <th>Ancien prix</th>
                  <th>Nouveau prix</th>
                  <th>Motif</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {historiqueModificationsPrix.length === 0 && (
                  <tr>
                    <td colSpan={5}>Aucune modification de prix pour l'instant.</td>
                  </tr>
                )}
                {historiqueModificationsPrix.map((entree) => (
                  <tr key={entree._id}>
                    <td>{entree.referenceLot}</td>
                    <td>{formatMontant(entree.ancienPrix)}</td>
                    <td>{formatMontant(entree.nouveauPrix)}</td>
                    <td><span className="commentaire-cellule">{entree.motif}</span></td>
                    <td>{formatDate(entree.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {exportOuvert && (
        <FenetreExport
          options={[
            { valeur: 'tableau', libelle: 'Tableau récapitulatif des lots', donnees: donneesExportTableau },
            { valeur: 'cartes', libelle: 'Statistiques (cartes)', donnees: donneesExportCartes },
            { valeur: 'historique', libelle: 'Historique (annulations, modifications de prix)', donnees: donneesExportHistorique },
            { valeur: 'annexes', libelle: 'Annexes à la vente', donnees: donneesExportAnnexesALaVente },
          ]}
          onFermer={() => setExportOuvert(false)}
        />
      )}
    </>
  )
}

export default Lots
