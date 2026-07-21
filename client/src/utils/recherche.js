// Barre de recherche (20/07/2026, point 187) : "un ou des mots-clés"
// (précisé par Nicolas) — une ligne correspond si TOUS les mots tapés se
// retrouvent quelque part dans son texte, dans n'importe quel ordre (pas
// une phrase exacte). Accents ignorés : `normalize('NFD')` sépare chaque
// lettre accentuée en lettre de base + accent, `\p{Diacritic}` (regex
// Unicode) retire ensuite l'accent — pour que "Depre" trouve aussi
// "Dépré".
// Espaces retirés (corrigé le 20/07/2026, même jour) : Nicolas a signalé
// que chercher "5444" ne retrouvait pas "5 444,00 €" — un montant formaté
// contient un espace insécable comme séparateur de milliers, absent de ce
// qu'on tape au clavier. Reproduit sur le texte ET sur la requête, pour
// rester cohérent (chercher "5 444" doit aussi fonctionner).
// Point (le caractère ".") remplacé par une virgule, même raison (corrigé
// le 20/07/2026, même jour) : les surfaces s'affichent à la française
// ("5,00 m²"), mais un clavier tape plus naturellement un point
// décimal ("5.00") — les deux doivent se retrouver.
function normaliser(texte) {
  return (texte ?? '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\./g, ',')
}

export function correspondRecherche(texteLigne, requete) {
  // Découpe sur les espaces AVANT de normaliser chaque mot (pas après) :
  // normaliser() retire aussi les espaces (voir ci-dessus), donc appliqué
  // trop tôt sur toute la requête, "5 444" ne ferait plus qu'un seul "mot".
  const motsRecherches = requete.trim().split(/\s+/).filter(Boolean).map(normaliser)
  if (motsRecherches.length === 0) return true
  const texteNormalise = normaliser(texteLigne)
  return motsRecherches.every((mot) => texteNormalise.includes(mot))
}
