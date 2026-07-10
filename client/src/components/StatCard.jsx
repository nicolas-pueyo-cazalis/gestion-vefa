function StatCard({ valeur, libelle }) {
  return (
    <div className="carte">
      <span className="valeur">{valeur}</span>
      <span className="libelle">{libelle}</span>
    </div>
  )
}

export default StatCard
