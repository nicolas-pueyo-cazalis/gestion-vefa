const STATUTS_TMA = {
  demande: "Demande",
  etude: "Étude",
  chiffre: "Chiffré",
  valide: "Validé",
  refuse: "Refusé",
  facture: "Facturé",
  travaux: "Travaux",
  termine: "Terminé",
};

// Paramètres du programme (docs/schema-donnees.md, Programme.parametres) —
// recopiés en dur ici faute de backend pour les lire dynamiquement.
const TAUX_MARGE_TMA = 1.3;

function calculerMontantClient(montantEntreprises) {
  if (montantEntreprises === null) return null; // pas encore chiffré
  if (montantEntreprises < 0) return 0; // règle "montant_zero" (docs/schema-donnees.md)
  return montantEntreprises * TAUX_MARGE_TMA;
}

const STATUTS_EN_COURS = ["demande", "etude", "chiffre"];
const STATUTS_VALIDE = ["valide", "travaux", "termine"]; // volontairement sans "facture"

let statutActifTma = "tous";

function tmaFiltrees() {
  if (statutActifTma === "tous") return TMA_LIST;
  return TMA_LIST.filter((tma) => tma.statut === statutActifTma);
}

function afficherStatsTma() {
  const total = TMA_LIST.length;
  const validees = TMA_LIST.filter((t) => STATUTS_VALIDE.includes(t.statut)).length;
  const enCours = TMA_LIST.filter((t) => STATUTS_EN_COURS.includes(t.statut)).length;
  const refusees = TMA_LIST.filter((t) => t.statut === "refuse").length;
  const montantValide = TMA_LIST
    .filter((t) => STATUTS_VALIDE.includes(t.statut))
    .reduce((somme, t) => somme + calculerMontantClient(t.montantEntreprises), 0);

  document.querySelector("#stats").innerHTML = `
    <div class="carte"><span class="valeur">${total}</span><span class="libelle">TMA au total</span></div>
     <div class="carte"><span class="valeur">${validees}</span><span class="libelle">Validées</span></div>
    <div class="carte"><span class="valeur">${enCours}</span><span class="libelle">En cours</span></div>
    <div class="carte"><span class="valeur">${refusees}</span><span class="libelle">Refusées</span></div>
    <div class="carte"><span class="valeur">${formatMontant(montantValide)}</span><span class="libelle">Montant validé</span></div>
  `;
}

function afficherTableauTma() {
  const lignes = tmaFiltrees().map((tma) => {
    const montantClient = calculerMontantClient(tma.montantEntreprises);
    return `
      <tr>
        <td>${tma.lot}</td>
        <td>${tma.client}</td>
        <td>${tma.localisation}</td>
        <td>${tma.description}</td>
        <td>${tma.montantEntreprises === null ? "—" : formatMontant(tma.montantEntreprises)}</td>
        <td>${montantClient === null ? "—" : formatMontant(montantClient)}</td>
        <td><span class="badge ${tma.statut}">${STATUTS_TMA[tma.statut]}</span></td>
      </tr>
    `;
  }).join("");

  document.querySelector("#tma-corps").innerHTML = lignes;
}

function initFiltresTma() {
  document.querySelector("#filtres").addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-statut]");
    if (!bouton) return;

    statutActifTma = bouton.dataset.statut;

    document
      .querySelectorAll("#filtres button")
      .forEach((b) => b.classList.toggle("actif", b === bouton));

    afficherTableauTma();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  afficherStatsTma();
  afficherTableauTma();
  initFiltresTma();
});
