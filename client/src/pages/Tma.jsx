import { Fragment, useEffect, useState } from 'react'
import {
  STATUTS_TMA,
  STATUTS_EN_COURS,
  STATUTS_VALIDE,
  TRANSITIONS_AUTORISEES,
  STATUTS_NON_RECALCULABLES,
} from '../data/tma.js'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import { formatMontant } from '../utils/formatMontant.js'
import { estEntrepriseEnRetard, formatDate } from '../utils/statuts.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import FormulaireDatesTma from '../components/FormulaireDatesTma.jsx'
import DetailEntreprisesTma from '../components/DetailEntreprisesTma.jsx'
import FormulaireCreationTma from '../components/FormulaireCreationTma.jsx'
import FormulaireInfosTma from '../components/FormulaireInfosTma.jsx'
import BarreRecherche from '../components/BarreRecherche.jsx'
import { correspondRecherche } from '../utils/recherche.js'
import FenetreExport from '../components/FenetreExport.jsx'
import { exporterPDF } from '../utils/export.js'

const NB_COLONNES = 14

// Filtre en liste déroulante (13/07/2026, point 130) : regroupe les 8
// statuts détaillés en 4 grandes étapes, plutôt qu'une rangée de boutons
// par statut (trop nombreux pour rester lisibles) — remplace l'ancien
// FiltreStatuts (boutons) utilisé ailleurs dans l'appli.
const GROUPES_FILTRE = {
  en_cours: STATUTS_EN_COURS,
  valide: STATUTS_VALIDE,
  refuse: ['refuse'],
  annule: ['annule'],
}

const LIBELLES_GROUPES_FILTRE = {
  tous: 'Tous',
  en_cours: 'En cours',
  valide: 'Validé',
  refuse: 'Refusé',
  annule: 'Annulé',
}

// Garde contre un acquéreur manquant (13/07/2026) : `tma.acquereur` est une
// référence, pas une copie — si la fiche client venait à disparaître, le
// populate() renvoie `null` plutôt que de planter la page.
function nomAcquereur(acquereur) {
  if (!acquereur) return '—'
  return [acquereur.civilite, acquereur.prenom, acquereur.nom].filter(Boolean).join(' ')
}

// TMA obsolète (13/07/2026, point 133) : son client d'origine (figé au
// moment de la création, voir server/routes/tma.js) ne correspond plus à
// l'acquéreur ACTUEL du lot — soit le lot est repassé "Libre" (vente
// annulée, lot.acquereur absent), soit il a été revendu à quelqu'un
// d'autre sans que la TMA n'ait encore été réattribuée.
function tmaObsolete(tma) {
  return (tma.lot?.acquereur?._id ?? null) !== (tma.acquereur?._id ?? null)
}

// Texte de recherche (20/07/2026, point 187) : tout ce qui s'affiche dans
// la ligne, mêmes fonctions de formatage que le rendu du tableau.
function texteRechercheTma(tma) {
  return [
    tma.lot?.reference,
    tmaObsolete(tma) ? null : nomAcquereur(tma.acquereur),
    formatDate(tma.dateDemande),
    tma.localisation,
    tma.description,
    formatDate(tma.dateEnvoiEntreprises),
    tma.montantEntreprises == null ? null : formatMontant(tma.montantEntreprises),
    formatMontant(tma.montantClient ?? 0),
    formatDate(tma.dateEnvoiFactureClient),
    formatDate(tma.dateRetourClient),
    STATUTS_TMA[tma.statut],
    tma.commentaire,
  ].filter(Boolean).join(' ')
}

function Tma() {
  const { programmeActif: programme } = useProgramme()
  const [tmaList, setTmaList] = useState([])
  const [lots, setLots] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statutActif, setStatutActif] = useState('tous')
  const [recherche, setRecherche] = useState('')
  // Un seul panneau d'actions par TMA (13/07/2026) — regroupe "Modifier les
  // dates", "Entreprises" et "Refuser"/"Supprimer" sous un même crayon,
  // comme sur la page Lots, plutôt que des boutons épars sur la ligne.
  const [idPanneauOuvert, setIdPanneauOuvert] = useState(null)
  const [creationOuverte, setCreationOuverte] = useState(false)
  const [exportOuvert, setExportOuvert] = useState(false)
  // Retard entreprise (13/07/2026, point 134) : programme (délai) et
  // tma-entreprises (dateEnvoi/montantDevis) nécessaires pour détecter, sur
  // CETTE page, une TMA "Étude" dont une entreprise sollicitée n'a pas
  // répondu à temps — sans attendre la fenêtre d'alertes au démarrage.
  const [tmaEntreprises, setTmaEntreprises] = useState([])

  async function chargerTma() {
    const reponse = await apiFetch(`${API_URL}/api/tma?programme=${programme._id}`)
    setTmaList(await reponse.json())
  }

  async function chargerTmaEntreprises() {
    const reponse = await apiFetch(`${API_URL}/api/tma-entreprises?programme=${programme._id}`)
    setTmaEntreprises(await reponse.json())
  }

  // Rafraîchit les deux à la fois : ajouter/modifier une ligne entreprise
  // (DetailEntreprisesTma.jsx) peut changer le statut ET la date d'envoi
  // qui déterminent le message de retard ci-dessous.
  async function chargerTmaEtEntreprises() {
    await Promise.all([chargerTma(), chargerTmaEntreprises()])
  }

  useEffect(() => {
    async function chargerTout() {
      try {
        const reponseLots = await apiFetch(`${API_URL}/api/lots?programme=${programme._id}`)
        setLots(await reponseLots.json())
        await Promise.all([chargerTma(), chargerTmaEntreprises()])
      } catch (e) {
        setErreur(e.message)
      } finally {
        setChargement(false)
      }
    }
    chargerTout()
  }, [])

  async function creerTma(donnees) {
    const reponse = await apiFetch(`${API_URL}/api/tma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    await chargerTma()
    setCreationOuverte(false)
  }

  if (chargement) return <p>Chargement des TMA...</p>
  if (erreur) return <p>Erreur : {erreur}</p>

  async function changerStatut(id, nouveauStatut) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/statut`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: nouveauStatut }),
    })

    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }

    const tmaMiseAJour = await reponse.json()
    setTmaList((liste) =>
      liste.map((tma) => (tma._id === tmaMiseAJour._id ? { ...tma, statut: tmaMiseAJour.statut } : tma)),
    )
  }

  // Réattribution (13/07/2026, point 133) : le lot d'une TMA obsolète a
  // été revendu, ce nouveau client accepte de reprendre la demande — on
  // recharge toute la liste (pas juste cette TMA) puisque `tma.lot`
  // (utilisé par tmaObsolete) vient d'un populate imbriqué qu'il est plus
  // simple de refaire en entier que de reconstruire à la main.
  async function reattribuerClient(tma) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${tma._id}/acquereur`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acquereur: tma.lot.acquereur._id }),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    await chargerTma()
  }

  // Localisation/description/montant client (13/07/2026, à la demande de
  // Nicolas) — voir FormulaireInfosTma.jsx pour l'avertissement affiché
  // avant l'envoi si le montant client est modifié à la main.
  async function enregistrerInfos(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/infos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    await chargerTma()
  }

  async function annulerRefus(id) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/annuler-refus`, { method: 'PATCH' })

    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }

    const tmaMiseAJour = await reponse.json()
    setTmaList((liste) =>
      liste.map((tma) => (tma._id === tmaMiseAJour._id ? { ...tma, statut: tmaMiseAJour.statut } : tma)),
    )
  }

  async function annulerAnnulation(id) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/annuler-annulation`, { method: 'PATCH' })

    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }

    const tmaMiseAJour = await reponse.json()
    setTmaList((liste) =>
      liste.map((tma) => (tma._id === tmaMiseAJour._id ? { ...tma, statut: tmaMiseAJour.statut } : tma)),
    )
  }

  async function annulerTermine(id) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/annuler-termine`, { method: 'PATCH' })

    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }

    const tmaMiseAJour = await reponse.json()
    setTmaList((liste) =>
      liste.map((tma) => (tma._id === tmaMiseAJour._id ? { ...tma, statut: tmaMiseAJour.statut } : tma)),
    )
  }

  async function enregistrerDates(id, donnees) {
    const reponse = await apiFetch(`${API_URL}/api/tma/${id}/dates`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })

    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }

    const tmaMiseAJour = await reponse.json()
    setTmaList((liste) =>
      liste.map((tma) =>
        tma._id === tmaMiseAJour._id
          ? {
              ...tma,
              statut: tmaMiseAJour.statut,
              montantEntreprises: tmaMiseAJour.montantEntreprises,
              montantClient: tmaMiseAJour.montantClient,
              dateEnvoiEntreprises: tmaMiseAJour.dateEnvoiEntreprises,
              dateEnvoiFactureClient: tmaMiseAJour.dateEnvoiFactureClient,
              dateRetourClient: tmaMiseAJour.dateRetourClient,
            }
          : tma,
      ),
    )
  }

  // Retard entreprise (13/07/2026, point 134) : vrai s'il existe au moins
  // une ligne TmaEntreprise de cette TMA en retard (voir
  // estEntrepriseEnRetard, utils/statuts.js) — mêmes règles que la fenêtre
  // d'alertes au démarrage (AlerteRetards.jsx), affiché ici directement.
  function entrepriseEnRetardPourTma(tma) {
    const delai = programme.parametres.delaiRetourEntrepriseTmaJours
    return tmaEntreprises.some((ligne) => ligne.tma?._id === tma._id && estEntrepriseEnRetard(ligne, delai))
  }

  // Numéro de la demande PAR LOGEMENT (21/07/2026, remarque de Nicolas) : un
  // même logement peut faire plusieurs demandes TMA à des moments
  // différents — "demande n°1", "demande n°2"... Jamais stocké, déduit du
  // rang chronologique (date de la demande, création en repli) parmi les
  // TMA du même lot — même philosophie que le reste de l'appli (la logique
  // se déduit des données, rien de figé en base).
  function numeroDemandePourTma(tma) {
    const tmaDuMemeLot = tmaList
      .filter((t) => t.lot?._id === tma.lot?._id)
      .sort((a, b) => new Date(a.dateDemande || a.createdAt) - new Date(b.dateDemande || b.createdAt))
    return tmaDuMemeLot.findIndex((t) => t._id === tma._id) + 1
  }

  // Classement par lot (21/07/2026, remarque de Nicolas) : plus lisible
  // qu'un classement par ordre d'ajout — et regroupe naturellement les
  // demandes n°1/n°2/... d'un même logement les unes à la suite des autres.
  const tmaFiltrees = [...tmaList]
    .sort((a, b) => {
      const parLot = (a.lot?.reference ?? '').localeCompare(b.lot?.reference ?? '')
      return parLot !== 0 ? parLot : numeroDemandePourTma(a) - numeroDemandePourTma(b)
    })
    .filter((tma) => statutActif === 'tous' || GROUPES_FILTRE[statutActif].includes(tma.statut))
    .filter((tma) => correspondRecherche(texteRechercheTma(tma), recherche))

  const validees = tmaList.filter((t) => STATUTS_VALIDE.includes(t.statut)).length
  const enCours = tmaList.filter((t) => STATUTS_EN_COURS.includes(t.statut)).length
  const refusees = tmaList.filter((t) => t.statut === 'refuse').length
  const tmaValidees = tmaList.filter((t) => STATUTS_VALIDE.includes(t.statut))
  const montantValideEntreprises = tmaValidees.reduce((somme, t) => somme + t.montantEntreprises, 0)
  const montantValideClient = tmaValidees.reduce((somme, t) => somme + t.montantClient, 0)
  const marge = montantValideClient - montantValideEntreprises

  // Totaux TTC/TVA/HT du tableau (21/07/2026, remarque de Nicolas) : sur
  // les deux colonnes chiffrées du tableau (Montant TTC entreprises,
  // Montant TTC client), respectant le statut/la recherche actifs comme le
  // reste du tableau (même principe que Lots) — différent des totaux
  // "validées" ci-dessus, qui ne portent que sur les TMA validées quel que
  // soit le filtre affiché.
  const tauxTva = programme.parametres.tauxTva
  const totalEntreprisesTTC = tmaFiltrees.reduce((s, t) => s + (t.montantEntreprises ?? 0), 0)
  const totalClientTTC = tmaFiltrees.reduce((s, t) => s + (t.montantClient ?? 0), 0)

  // "N° demande" ajoutée (21/07/2026, remarque de Nicolas) : juste après
  // "Lot", partagée avec le tableau à l'écran.
  const ENTETES_TABLEAU = [
    'Lot', 'N° demande', 'Client', 'Date de la demande', 'Localisation', 'Description',
    'Date envoi entreprise', 'Montant TTC entreprises', 'Montant TTC client',
    'Facture envoyée le', 'Facture validée le', 'Statut', 'Commentaire',
  ]

  // Mêmes valeurs que les cellules affichées à l'écran (colonne Action
  // exclue, point 190) — utilisé à la fois par l'export et, plus bas, par
  // l'export détaillé avec les entreprises.
  function ligneTableau(tma) {
    return [
      tma.lot?.reference ?? '—',
      String(numeroDemandePourTma(tma)),
      tmaObsolete(tma) ? '—' : nomAcquereur(tma.acquereur),
      formatDate(tma.dateDemande),
      tma.localisation,
      tma.description,
      formatDate(tma.dateEnvoiEntreprises),
      tma.montantEntreprises == null ? '—' : formatMontant(tma.montantEntreprises),
      formatMontant(tma.montantClient ?? 0),
      formatDate(tma.dateEnvoiFactureClient),
      formatDate(tma.dateRetourClient),
      STATUTS_TMA[tma.statut],
      tma.commentaire || '—',
    ]
  }

  // Les 3 lignes de total (TTC/TVA/HT), réutilisées à l'écran (tfoot du
  // tableau) ET dans l'export "Demandes clients" — même principe que le
  // récapitulatif détaillé par phase des appels de fonds.
  function ligneTotalTableau(libelle, entreprisesTTC, clientTTC) {
    return [libelle, '', '', '', '', '', '', formatMontant(entreprisesTTC), formatMontant(clientTTC), '', '', '', '']
  }
  const ligneTotalTTC = ligneTotalTableau('Montant total TTC', totalEntreprisesTTC, totalClientTTC)
  const ligneTotalHT = ligneTotalTableau('Montant total HT', totalEntreprisesTTC / (1 + tauxTva), totalClientTTC / (1 + tauxTva))
  const ligneTotalTVA = ligneTotalTableau(
    `TVA (${Math.round(tauxTva * 100)}%)`,
    totalEntreprisesTTC - totalEntreprisesTTC / (1 + tauxTva),
    totalClientTTC - totalClientTTC / (1 + tauxTva),
  )

  // Export "Statistiques" (21/07/2026) : les deux lignes de cartes du haut.
  function donneesExportStatistiques() {
    return {
      nomFichier: `tma-statistiques-${programme.nom}`,
      titre: `Statistiques des TMA — ${programme.nom}`,
      entetes: ['Indicateur', 'Valeur'],
      lignes: [
        ['TMA au total', String(tmaList.length)],
        ['Validées', String(validees)],
        ['En cours', String(enCours)],
        ['Refusées', String(refusees)],
        ['Montant TTC validé (entreprises)', formatMontant(montantValideEntreprises)],
        ['Montant TTC validé (clients)', formatMontant(montantValideClient)],
        ['Marge', formatMontant(marge)],
      ],
    }
  }

  // Export "Demandes clients" (21/07/2026) : le tableau tel qu'affiché à
  // l'écran (respecte statut + recherche, comme les autres exports),
  // colonne Action exclue, avec les 3 lignes de total.
  function donneesExportDemandesClients() {
    return {
      nomFichier: `tma-demandes-clients-${programme.nom}`,
      titre: `Demandes clients (TMA) — ${programme.nom}`,
      entetes: ENTETES_TABLEAU,
      lignes: tmaFiltrees.map(ligneTableau),
      lignesTotal: [ligneTotalTTC, ligneTotalTVA, ligneTotalHT],
      // Tient sur une seule page PDF (21/07/2026, même remarque que le
      // récap détaillé par phase des appels de fonds) : Client (2),
      // Description (5) et Commentaire (12) peuvent revenir à la ligne
      // (plafonnées), le reste est figé à sa largeur exacte.
      pageUnique: true,
      largeursMax: { 2: 40, 5: 45, 12: 40 },
    }
  }

  // Export "Détail entreprises" (21/07/2026, remarque de Nicolas — maquette
  // fournie, revue une 2e fois : la 1ère version mélangeait libellé et
  // valeur dans chaque cellule, ce n'était pas ça). Structure finale, sous
  // chaque ligne "demande" (en gras) : UNE ligne de titres (en italique,
  // une seule fois, pas par entreprise), puis UNE ligne de valeurs PAR
  // entreprise (sans libellé répété) — réutilise les colonnes du tableau
  // (colonne "N° demande" laissée vide sur ces lignes, elle ne concerne que
  // la ligne "demande").
  const LIGNE_TITRES_ENTREPRISES = [
    'Lot de travaux', '', "Corps d'état", "Nom de l'entreprise", '',
    'Description', 'Date envoi entreprise', 'Montant TTC devis', 'Reçu le',
    '', '', '', '',
  ]

  function ligneValeursEntreprise(ligne) {
    const delai = programme.parametres.delaiRetourEntrepriseTmaJours
    // "En retard" (21/07/2026, précision de Nicolas) : remplace le montant
    // tant que l'entreprise n'a pas répondu et que le délai est dépassé —
    // même règle que le message affiché sur la ligne TMA elle-même
    // (estEntrepriseEnRetard, utils/statuts.js).
    const montantOuRetard = estEntrepriseEnRetard(ligne, delai)
      ? 'En retard'
      : (ligne.montantDevis == null ? '—' : formatMontant(ligne.montantDevis))
    return [
      ligne.entreprise?.numeroLot ?? '—',
      '',
      ligne.corpsDeTravaux ?? '—',
      ligne.entreprise?.nom ?? '—',
      '',
      ligne.description || '—',
      formatDate(ligne.dateEnvoi),
      montantOuRetard,
      formatDate(ligne.dateRetour),
      '', '', '', '',
    ]
  }

  function donneesExportDetailEntreprises() {
    const lignes = []
    const stylesLignes = []
    for (const tma of tmaFiltrees) {
      lignes.push(ligneTableau(tma))
      stylesLignes.push('gras')
      const lignesEntreprisesTma = tmaEntreprises.filter((l) => l.tma?._id === tma._id)
      // La ligne de titres n'a de sens que s'il y a au moins une entreprise
      // à lister en dessous — pas de ligne orpheline sinon.
      if (lignesEntreprisesTma.length > 0) {
        lignes.push(LIGNE_TITRES_ENTREPRISES)
        stylesLignes.push('italique')
        for (const ligne of lignesEntreprisesTma) {
          lignes.push(ligneValeursEntreprise(ligne))
          stylesLignes.push(undefined)
        }
      }
    }
    // Titre "Montant TTC client" retiré du grand en-tête noir (21/07/2026,
    // remarque de Nicolas) : cette colonne affiche "Reçu le" sur la ligne de
    // titres entreprises, garder le titre d'origine (qui ne vaut que pour
    // la ligne demande, en gras) porterait à confusion.
    const entetes = ENTETES_TABLEAU.map((entete, i) => (i === 8 ? '' : entete))
    return {
      nomFichier: `tma-detail-entreprises-${programme.nom}`,
      titre: `Détail entreprises par TMA — ${programme.nom}`,
      entetes,
      lignes,
      stylesLignes,
    }
  }

  // Export "Générer devis client" (21/07/2026, remarque de Nicolas, modèle
  // PDF fourni, revu le jour même) : choix en deux temps dans la fenêtre
  // d'export — d'abord le LOGEMENT, puis les DEMANDES de ce logement à
  // cocher/décocher (un même devis peut regrouper plusieurs demandes) —
  // même mécanique que "Générer un appel de fonds" (AppelsDeFonds.jsx,
  // FenetreExport.jsx, `type: 'generation'` : `phases`/`lotsPourPhase`
  // réutilisés ici pour porter logements/demandes, pas de nouveau mode à
  // ajouter au composant).
  const referencesLotsAvecTma = [...new Set(tmaList.map((t) => t.lot?.reference).filter(Boolean))].sort()

  function demandesPourLot(referenceLot) {
    return tmaList
      .filter((t) => t.lot?.reference === referenceLot)
      .sort((a, b) => numeroDemandePourTma(a) - numeroDemandePourTma(b))
      .map((t) => ({
        valeur: t._id,
        libelle: `Demande n°${numeroDemandePourTma(t)} — ${t.description || 'sans description'}`,
      }))
  }

  // Le numéro de devis (ex: "TMA-2026-005") est réservé côté SERVEUR à
  // CHAQUE génération (compteur par programme et par année, voir POST
  // /api/tma/:id/devis-numero) — jamais réutilisé, même en régénérant le
  // même devis après correction. Une seule réservation par génération,
  // même si plusieurs demandes sont cochées (un devis, un numéro).
  async function genererDevisClient(referenceLot, idsTma) {
    const tmaChoisies = idsTma
      .map((id) => tmaList.find((t) => t._id === id))
      .filter(Boolean)
      .sort((a, b) => numeroDemandePourTma(a) - numeroDemandePourTma(b))
    if (tmaChoisies.length === 0) return
    const premiere = tmaChoisies[0]

    const reponse = await apiFetch(`${API_URL}/api/tma/${premiere._id}/devis-numero`, { method: 'POST' })
    if (!reponse.ok) {
      const { message } = await reponse.json()
      alert(message)
      return
    }
    const { numeroDevis } = await reponse.json()

    exporterPDF({
      typeDevis: true,
      nomFichier: `devis-${numeroDevis}-${referenceLot}`,
      numeroDevis,
      dateGeneration: new Date(),
      clientNom: tmaObsolete(premiere) ? '—' : nomAcquereur(premiere.acquereur),
      maitreOuvrageNom: programme.maitreOuvrage,
      programmeNom: programme.nom,
      lotReference: referenceLot,
      lignesDemandes: tmaChoisies.map((tma) => ({
        numeroDemande: numeroDemandePourTma(tma),
        dateDemande: tma.dateDemande,
        designation: tma.description,
        montantTTC: tma.montantClient ?? 0,
      })),
      tauxTva,
    })
  }

  return (
    <>
      <h1 className="titre-page">Travaux Modificatifs Acquéreurs</h1>

      <section className="stats">
        <StatCard valeur={tmaList.length} libelle="TMA au total" />
        <StatCard valeur={validees} libelle="Validées" />
        <StatCard valeur={enCours} libelle="En cours" />
        <StatCard valeur={refusees} libelle="Refusées" />
      </section>

      <section className="stats">
        <StatCard valeur={formatMontant(montantValideEntreprises)} libelle="Montant TTC validé (entreprises)" />
        <StatCard valeur={formatMontant(montantValideClient)} libelle="Montant TTC validé (clients)" />
        <StatCard valeur={formatMontant(marge)} libelle="Marge" />
      </section>

      <div className="barre-actions">
        <label className="filtre-liste-deroulante">
          Statut
          <select value={statutActif} onChange={(e) => setStatutActif(e.target.value)}>
            {Object.entries(LIBELLES_GROUPES_FILTRE).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>{libelle}</option>
            ))}
          </select>
        </label>

        <BarreRecherche valeur={recherche} onChange={setRecherche} placeholder="Rechercher une TMA..." />

        <button type="button" className="bouton-accordeon" onClick={() => setExportOuvert(true)}>
          Exporter
        </button>

        {!creationOuverte && (
          <button type="button" onClick={() => setCreationOuverte(true)}>Ajouter une TMA</button>
        )}
      </div>

      {creationOuverte && (
        <FormulaireCreationTma
          lots={lots}
          onCreer={creerTma}
          onFermer={() => setCreationOuverte(false)}
        />
      )}

      {exportOuvert && (
        <FenetreExport
          options={[
            { valeur: 'statistiques', libelle: 'Statistiques (cartes)', donnees: donneesExportStatistiques },
            { valeur: 'demandes-clients', libelle: 'Demandes clients', donnees: donneesExportDemandesClients },
            { valeur: 'detail-entreprises', libelle: 'Détail entreprises', donnees: donneesExportDetailEntreprises },
            {
              valeur: 'devis-client',
              libelle: 'Générer devis client',
              type: 'generation',
              phases: referencesLotsAvecTma.map((ref) => ({ valeur: ref, libelle: ref })),
              lotsPourPhase: demandesPourLot,
              generer: genererDevisClient,
              libelleChoix1: 'Quel logement ?',
              libelleChoix2: 'Demandes concernées',
              messageChoix2Vide: 'Aucune demande TMA pour ce logement.',
            },
          ]}
          onFermer={() => setExportOuvert(false)}
        />
      )}

      <div className="tableau-scroll">
        <table className="tableau-lots tableau-tma">
          <thead>
            <tr>
              <th>Lot</th>
            <th><span className="th-etroit">N° demande</span></th>
            <th>Client</th>
            <th><span className="th-etroit">Date de la demande</span></th>
            <th>Localisation</th>
            <th>Description</th>
            <th><span className="th-etroit">Date envoi entreprise</span></th>
            <th><span className="th-etroit">Montant TTC entreprises</span></th>
            <th><span className="th-etroit">Montant TTC client</span></th>
            <th><span className="th-etroit">Facture envoyée le</span></th>
            <th><span className="th-etroit">Facture validée le</span></th>
            <th>Statut</th>
            <th>Commentaire</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tmaFiltrees.map((tma) => (
            <Fragment key={tma._id}>
              <tr>
                <td>{tma.lot?.reference ?? '—'}</td>
                <td>{numeroDemandePourTma(tma)}</td>
                <td>
                  {/* Client d'origine obsolète (13/07/2026, point 133) : la
                      vente qui a donné lieu à cette TMA a été annulée (et
                      éventuellement remplacée par une nouvelle) depuis — le
                      client d'origine n'a plus rien à voir avec le logement,
                      donc son nom ne s'affiche plus. La TMA elle-même reste
                      (à garder si le nouveau client la reprend — bouton
                      ci-dessous — ou à supprimer soi-même, voir point 128),
                      simplement signalée tant qu'elle n'a pas été réattribuée. */}
                  <span className="nom-client">{tmaObsolete(tma) ? '—' : nomAcquereur(tma.acquereur)}</span>
                  {tmaObsolete(tma) && (
                    <>
                      <div className="avertissement-cellule">Attention, ce logement a été annulé</div>
                      {tma.lot?.acquereur && (
                        <button type="button" onClick={() => reattribuerClient(tma)}>
                          Réattribuer à {nomAcquereur(tma.lot.acquereur)}
                        </button>
                      )}
                    </>
                  )}
                  {/* 13/07/2026, point 127 : une TMA peut être créée dès
                      Option/Réservé, pas seulement Acté (voir
                      FormulaireCreationTma.jsx) — simple rappel visuel tant
                      que la vente n'est pas encore signée. */}
                  {!tmaObsolete(tma) && tma.lot?.statut && tma.lot.statut !== 'acte' && (
                    <div className="avertissement-cellule">Ce logement n'est pas encore acté</div>
                  )}
                </td>
                <td>{formatDate(tma.dateDemande)}</td>
                <td>{tma.localisation}</td>
                <td><span className="description-cellule">{tma.description}</span></td>
                <td>{formatDate(tma.dateEnvoiEntreprises)}</td>
                {/* "==" (pas "===") : capture aussi bien `null` que
                    `undefined` — un montant absent du document (jamais
                    renseigné) n'est pas forcément `null` à la lettre, et
                    formatMontant(undefined) affiche "NaN €". */}
                <td>{tma.montantEntreprises == null ? '—' : formatMontant(tma.montantEntreprises)}</td>
                <td>{formatMontant(tma.montantClient ?? 0)}</td>
                <td>{formatDate(tma.dateEnvoiFactureClient)}</td>
                <td>{formatDate(tma.dateRetourClient)}</td>
                <td>
                  <Badge statut={tma.statut} texte={STATUTS_TMA[tma.statut]} />
                  {tma.statut === 'etude' && entrepriseEnRetardPourTma(tma) && (
                    <div className="avertissement-cellule">Retard entreprise</div>
                  )}
                </td>
                <td><span className="commentaire-cellule">{tma.commentaire || '—'}</span></td>
                <td className="actions">
                  <button
                    type="button"
                    className="bouton-icone"
                    title="Modifier"
                    aria-label="Modifier"
                    onClick={() => setIdPanneauOuvert(idPanneauOuvert === tma._id ? null : tma._id)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                </td>
              </tr>
              {idPanneauOuvert === tma._id && (
                <>
                  <FormulaireInfosTma
                    tma={tma}
                    colonnes={NB_COLONNES}
                    montantClientSaisiManuellement={programme.parametres.montantClientSaisiManuellement}
                    onEnregistrer={enregistrerInfos}
                    onFermer={() => setIdPanneauOuvert(null)}
                  />
                  {!STATUTS_NON_RECALCULABLES.includes(tma.statut) && (
                    <FormulaireDatesTma
                      tma={tma}
                      colonnes={NB_COLONNES}
                      onEnregistrer={enregistrerDates}
                      onFermer={() => setIdPanneauOuvert(null)}
                    />
                  )}
                  <DetailEntreprisesTma
                    tma={tma}
                    colonnes={NB_COLONNES}
                    delaiRetourEntrepriseTmaJours={programme.parametres.delaiRetourEntrepriseTmaJours}
                    onChangement={chargerTmaEtEntreprises}
                    onFermer={() => setIdPanneauOuvert(null)}
                  />
                  <tr className="formulaire-dates">
                    <td colSpan={NB_COLONNES}>
                      <div className="boutons-panneau-tma">
                        {TRANSITIONS_AUTORISEES[tma.statut].includes('termine') && (
                          <button type="button" className="bouton-fonce" onClick={() => changerStatut(tma._id, 'termine')}>Marquer les travaux comme terminés</button>
                        )}
                        {tma.statut === 'termine' && (
                          <button type="button" className="bouton-fonce" onClick={() => annulerTermine(tma._id)}>Annuler la fin des travaux</button>
                        )}
                        {TRANSITIONS_AUTORISEES[tma.statut].includes('refuse') && (
                          <button type="button" onClick={() => changerStatut(tma._id, 'refuse')}>Refuser la TMA</button>
                        )}
                        {tma.statut === 'refuse' && (
                          <button type="button" onClick={() => annulerRefus(tma._id)}>Annuler le refus</button>
                        )}
                        {TRANSITIONS_AUTORISEES[tma.statut].includes('annule') && (
                          <button type="button" className="bouton-danger" onClick={() => changerStatut(tma._id, 'annule')}>Annuler la TMA</button>
                        )}
                        {tma.statut === 'annule' && (
                          <button type="button" onClick={() => annulerAnnulation(tma._id)}>Annuler l'annulation</button>
                        )}
                      </div>
                    </td>
                  </tr>
                </>
              )}
            </Fragment>
          ))}
        </tbody>
        {tmaFiltrees.length > 0 && (
          <tfoot>
            {[ligneTotalTTC, ligneTotalTVA, ligneTotalHT].map((ligne) => (
              <tr key={ligne[0]}>
                {ligne.map((valeur, i) => <td key={i}>{valeur}</td>)}
                <td />
              </tr>
            ))}
          </tfoot>
        )}
      </table>
      </div>
    </>
  )
}

export default Tma
