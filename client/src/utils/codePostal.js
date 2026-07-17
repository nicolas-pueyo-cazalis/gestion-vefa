// Code postal automatique depuis la commune (17/07/2026, point 140) :
// utilise l'API officielle "geo.api.gouv.fr" (service public français,
// pas de clé requise). Ne renvoie un résultat que si la commune correspond
// EXACTEMENT (insensible à la casse/accents) à un seul résultat. Beaucoup de
// communes ont en réalité 2 codes postaux (ex: Urrugne, un hameau séparé
// avec son propre code) — plutôt que de systématiquement laisser le champ
// vide dans ce cas (bug signalé par Nicolas), le premier est retenu comme
// valeur la plus probable, toujours corrigeable à la main. Au-delà de 2,
// c'est trop souvent une grande ville à arrondissements (Paris, Lyon,
// Marseille...) où deviner serait plus gênant qu'utile — le champ reste
// alors vide.
const REGEX_DIACRITIQUES = /[̀-ͯ]/g

function normaliser(texte) {
  return texte.normalize('NFD').replace(REGEX_DIACRITIQUES, '').toLowerCase().trim()
}

export async function chercherCodePostal(commune) {
  const communeNettoyee = commune?.trim()
  if (!communeNettoyee) return null
  try {
    const reponse = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(communeNettoyee)}&fields=nom,codesPostaux&boost=population&limit=5`,
    )
    if (!reponse.ok) return null
    const resultats = await reponse.json()
    const correspondance = resultats.find((r) => normaliser(r.nom) === normaliser(communeNettoyee))
    if (correspondance?.codesPostaux?.length > 0 && correspondance.codesPostaux.length <= 2) {
      return correspondance.codesPostaux[0]
    }
    return null
  } catch {
    return null
  }
}
