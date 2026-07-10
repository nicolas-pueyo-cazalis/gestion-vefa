function Badge({ statut, texte }) {
  return <span className={`badge ${statut}`}>{texte}</span>
}

export default Badge
