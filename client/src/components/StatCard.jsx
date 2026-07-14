// `statut` (13/07/2026, proposition B validée) : optionnel, colore le
// liseré gauche de la carte avec la couleur du statut correspondant
// (mêmes couleurs que les badges, $couleurs-statut) — sans lui, la carte
// garde un liseré neutre. N'affecte que la couleur, la hiérarchie
// libellé/valeur reste la même pour toutes les cartes de l'appli.
function StatCard({ valeur, libelle, statut }) {
  return (
    <div className={statut ? `carte carte--${statut}` : 'carte'}>
      <span className="libelle">{libelle}</span>
      <span className="valeur">{valeur}</span>
    </div>
  )
}

export default StatCard
