import Lot from '../models/Lot.js'

// La plupart des collections (Tma, AppelDeFonds, TmaEntreprise, Acquereur)
// n'ont pas de champ `programme` direct — seul Lot en a un. Pour filtrer ces
// collections par programme, il faut donc d'abord résoudre les lots de ce
// programme, puis filtrer sur `lot`/`lots`/`tma.lot`. Ce motif était copié
// (avec de petites variations) dans 6-7 routes différentes lors du passage
// au multi-programme (17/07/2026) — factorisé ici suite à la revue générale
// du point 143, pour n'avoir qu'un seul endroit à corriger si la règle de
// résolution change un jour (ex: exclure des lots archivés).
export async function getIdsLotsDuProgramme(programmeId) {
  const lots = await Lot.find({ programme: programmeId }, '_id')
  return lots.map((lot) => lot._id)
}
