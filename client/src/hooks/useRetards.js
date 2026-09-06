import { useEffect, useState } from 'react'
import { API_URL } from '../config.js'
import { apiFetch } from '../utils/api.js'
import { useProgramme } from '../context/ProgrammeContext.jsx'
import {
  statutPret,
  statutSignature,
  statutAppel,
  estEntrepriseEnRetard,
  estFactureTmaEnRetard,
  formatDate,
} from '../utils/statuts.js'

function nomComplet(acquereur) {
  return [acquereur?.civilite, acquereur?.prenom, acquereur?.nom].filter(Boolean).join(' ') || '—'
}

// Calcul des 5 catégories de retard — extrait de AlerteRetards.jsx
// (05/09/2026, point 277/3) pour être partagé avec le tableau de bord,
// qui a besoin exactement des mêmes règles pour rester cohérent avec ce
// que montrait déjà la fenêtre d'alertes au lancement. Retourne aussi les
// listes brutes (lots/appels/tmaList/tmaEntreprises) : le tableau de bord
// s'en sert pour ses compteurs globaux, sans refaire les 4 mêmes requêtes.
export function useRetards() {
  const { programmeActif: programme } = useProgramme()
  const [donnees, setDonnees] = useState(null)

  useEffect(() => {
    async function charger() {
      const [lots, appels, tmaList, tmaEntreprises] = await Promise.all([
        apiFetch(`${API_URL}/api/lots?programme=${programme._id}`).then((r) => r.json()),
        apiFetch(`${API_URL}/api/appels-de-fonds?programme=${programme._id}`).then((r) => r.json()),
        apiFetch(`${API_URL}/api/tma?programme=${programme._id}`).then((r) => r.json()),
        apiFetch(`${API_URL}/api/tma-entreprises?programme=${programme._id}`).then((r) => r.json()),
      ])
      setDonnees({ lots, appels, tmaList, tmaEntreprises })
    }
    charger()
  }, [programme._id])

  if (!donnees) {
    return {
      chargement: true,
      categories: [],
      total: 0,
      lots: [],
      appels: [],
      tmaList: [],
      tmaEntreprises: [],
    }
  }

  const { lots, appels, tmaList, tmaEntreprises } = donnees
  const {
    delaiObtentionPretJours,
    delaiSignatureNotaireMois,
    delaiRetourEntrepriseTmaJours,
    delaiReponseFactureTmaJours,
  } = programme.parametres

  const categories = []

  // Désactivable depuis Paramètres (17/07/2026, point 137) : globalement,
  // ou type de retard par type de retard.
  if (programme.parametres.alertesActivees) {
    const actif = programme.parametres.alertesActivesParType ?? {}

    if (actif.pret !== false) {
      const elements = lots
        .filter((l) => statutPret(l, delaiObtentionPretJours) === 'retard')
        .map((lot) => ({ cle: lot._id, texte: `${lot.reference} — ${nomComplet(lot.acquereur)}` }))
      if (elements.length > 0) {
        categories.push({
          cle: 'pret',
          libelle: 'Prêt non reçu à temps',
          lien: '/suivi-pret',
          elements,
        })
      }
    }

    if (actif.signature !== false) {
      const elements = lots
        .filter((l) => statutSignature(l, delaiSignatureNotaireMois) === 'retard')
        .map((lot) => ({ cle: lot._id, texte: `${lot.reference} — ${nomComplet(lot.acquereur)}` }))
      if (elements.length > 0) {
        categories.push({
          cle: 'signature',
          libelle: "Signature d'acte en retard",
          lien: '/signature-acte',
          elements,
        })
      }
    }

    if (actif.appelsDeFonds !== false) {
      const elements = appels
        .filter((a) => statutAppel(a) === 'retard')
        .map((appel) => ({
          cle: appel._id,
          texte: `${appel.lot?.reference} — ${appel.phase.nom} (limite ${formatDate(appel.dateLimiteReglement)})`,
        }))
      if (elements.length > 0) {
        categories.push({
          cle: 'appelsDeFonds',
          libelle: 'Appels de fonds non réglés à temps',
          lien: '/appels-de-fonds',
          elements,
        })
      }
    }

    if (actif.entreprisesTma !== false) {
      const elements = tmaEntreprises
        .filter((l) => estEntrepriseEnRetard(l, delaiRetourEntrepriseTmaJours))
        .map((ligne) => ({
          cle: ligne._id,
          texte: `${ligne.tma?.lot?.reference} — ${ligne.entreprise?.nom} (${ligne.corpsDeTravaux})`,
        }))
      if (elements.length > 0) {
        categories.push({
          cle: 'entreprisesTma',
          libelle: "Entreprises TMA n'ayant pas chiffré à temps",
          lien: '/tma',
          elements,
        })
      }
    }

    if (actif.facturesTma !== false) {
      const elements = tmaList
        .filter((t) => estFactureTmaEnRetard(t, delaiReponseFactureTmaJours))
        .map((tma) => ({
          cle: tma._id,
          texte: `${tma.lot?.reference} — ${nomComplet(tma.acquereur)}`,
        }))
      if (elements.length > 0) {
        categories.push({
          cle: 'facturesTma',
          libelle: 'Factures TMA sans réponse client à temps',
          lien: '/tma',
          elements,
        })
      }
    }
  }

  const total = categories.reduce((somme, cat) => somme + cat.elements.length, 0)

  return { chargement: false, categories, total, lots, appels, tmaList, tmaEntreprises }
}
