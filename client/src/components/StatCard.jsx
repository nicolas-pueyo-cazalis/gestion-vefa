// `statut` (13/07/2026, proposition B validée) : optionnel, colore le
// liseré gauche de la carte avec la couleur du statut correspondant
// (mêmes couleurs que les badges, $couleurs-statut) — sans lui, la carte
// garde un liseré neutre. N'affecte que la couleur, la hiérarchie
// libellé/valeur reste la même pour toutes les cartes de l'appli.
// `pourcentage` (17/07/2026, point 168) : optionnel, affiché sous la
// valeur — la part que représente cette carte sur le total de sa rangée.
function StatCard({ valeur, libelle, statut, pourcentage }) {
  return (
    <div className={statut ? `carte carte--${statut}` : 'carte'}>
      <span className="libelle">{libelle}</span>
      <span className="valeur">{valeur}</span>
      {pourcentage != null && <span className="pourcentage">{pourcentage}%</span>}
    </div>
  )
}

export default StatCard
