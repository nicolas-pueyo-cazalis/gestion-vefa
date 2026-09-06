import { Link } from 'react-router-dom'
import { useRetards } from '../hooks/useRetards.js'
import StatCard from '../components/StatCard.jsx'
import { STATUTS_LOT } from '../data/lots.js'
import { STATUTS_EN_COURS, STATUTS_VALIDE } from '../data/tma.js'
import { formatMontant } from '../utils/formatMontant.js'

// Page d'accueil du programme (05/09/2026, point 277/3) : jusqu'ici,
// l'appli atterrissait direct sur Lots après le choix du programme, sans
// vue d'ensemble de ce qui demande attention. Réutilise le calcul de
// retards de useRetards.js (partagé avec AlerteRetards.jsx, la fenêtre
// d'alertes au lancement) pour la colonne "À traiter", et les mêmes
// listes déjà chargées par ce hook pour les compteurs — pas de requête
// supplémentaire. Maquette "B" (colonne latérale) choisie par Nicolas
// parmi 3 propositions visuelles.
function TableauDeBord() {
  const { chargement, categories, total, lots, appels, tmaList } = useRetards()

  if (chargement) return <p>Chargement du tableau de bord...</p>

  const lotsParStatut = Object.keys(STATUTS_LOT).map((cle) => ({
    cle,
    libelle: STATUTS_LOT[cle],
    nombre: lots.filter((lot) => lot.statut === cle).length,
  }))

  const totalPrixTTC = lots.reduce((somme, lot) => somme + lot.prixTTC, 0)
  const totalRegle = appels
    .filter((appel) => appel.dateReglement)
    .reduce((somme, appel) => somme + appel.montant, 0)
  const pourcentageRegle = totalPrixTTC > 0 ? Math.round((totalRegle / totalPrixTTC) * 100) : 0
  const appelsEnRetard = categories.find((cat) => cat.cle === 'appelsDeFonds')?.elements.length ?? 0

  const tmaEnCours = tmaList.filter((tma) => STATUTS_EN_COURS.includes(tma.statut)).length
  const tmaValidees = tmaList.filter((tma) => STATUTS_VALIDE.includes(tma.statut)).length
  const tmaRefusees = tmaList.filter((tma) => tma.statut === 'refuse').length

  return (
    <>
      <h1 className="titre-page">Tableau de bord</h1>

      <div className="tableau-de-bord">
        <div className="colonnes-compteurs">
          <section className="bloc-compteurs">
            <h2 className="titre-bloc">Lots</h2>
            <div className="stats">
              {lotsParStatut.map(({ cle, libelle, nombre }) => (
                <StatCard key={cle} libelle={libelle} valeur={nombre} statut={cle} />
              ))}
            </div>
          </section>

          <section className="bloc-compteurs">
            <h2 className="titre-bloc">Financier</h2>
            <div className="stats">
              <StatCard libelle="Total prix TTC" valeur={formatMontant(totalPrixTTC, 0)} />
              <StatCard
                libelle="Réglé"
                valeur={formatMontant(totalRegle, 0)}
                statut="acte"
                pourcentage={pourcentageRegle}
                libellePourcentage="du total"
              />
              <StatCard libelle="Appels en retard" valeur={appelsEnRetard} statut="retard" />
            </div>
          </section>

          <section className="bloc-compteurs">
            <h2 className="titre-bloc">TMA</h2>
            <div className="stats">
              <StatCard libelle="En cours" valeur={tmaEnCours} statut="chiffre" />
              <StatCard libelle="Validées" valeur={tmaValidees} statut="valide" />
              <StatCard libelle="Refusées" valeur={tmaRefusees} statut="refuse" />
            </div>
          </section>
        </div>

        <aside className="colonne-a-traiter">
          <h2 className="titre-bloc">À traiter{total > 0 ? ` (${total})` : ''}</h2>
          {total === 0 ? (
            <p className="rien-a-signaler">Rien à signaler pour le moment.</p>
          ) : (
            <ul className="liste-a-traiter">
              {categories.map((categorie) => (
                <li key={categorie.cle}>
                  <Link to={categorie.lien}>
                    <span className="libelle-a-traiter">{categorie.libelle}</span>
                    <span className="nombre-a-traiter">{categorie.elements.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  )
}

export default TableauDeBord
