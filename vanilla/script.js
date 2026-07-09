const STATUTS = {
  libre: "Libre",
  option: "Option",
  reserve: "Réservé",
  acte: "Acté",
};

let statutActif = "tous";

function lotsFiltres() {
  if (statutActif === "tous") return LOTS;
  return LOTS.filter((lot) => lot.statut === statutActif);
}

function afficherEntete() {
  document.querySelector("#programme-nom").textContent = PROGRAMME.nom;
  document.querySelector("#programme-adresse").textContent =
    `${PROGRAMME.adresse}, ${PROGRAMME.commune}`;
}

function afficherStats() {
  const total = LOTS.length;
  const parStatut = Object.keys(STATUTS).reduce((compte, statut) => {
    compte[statut] = LOTS.filter((lot) => lot.statut === statut).length;
    return compte;
  }, {});
  const caActe = LOTS
    .filter((lot) => lot.statut === "acte")
    .reduce((somme, lot) => somme + lot.prixTTC, 0);

  document.querySelector("#stats").innerHTML = `
    <div class="carte"><span class="valeur">${total}</span><span class="libelle">Lots au total</span></div>
    <div class="carte"><span class="valeur">${parStatut.acte}</span><span class="libelle">Actés</span></div>
    <div class="carte"><span class="valeur">${parStatut.reserve}</span><span class="libelle">Réservés</span></div>
    <div class="carte"><span class="valeur">${parStatut.libre}</span><span class="libelle">Libres</span></div>
    <div class="carte"><span class="valeur">${formatMontant(caActe)}</span><span class="libelle">CA acté</span></div>
  `;
}

function afficherTableau() {
  const lignes = lotsFiltres().map((lot) => `
    <tr>
      <td>${lot.reference}</td>
      <td>${lot.etage}</td>
      <td>${lot.type}</td>
      <td>${lot.orientation}</td>
      <td>${lot.surfaceHabitable} m²</td>
      <td>${formatMontant(lot.prixTTC)}</td>
      <td><span class="badge ${lot.statut}">${STATUTS[lot.statut]}</span></td>
    </tr>
  `).join("");

  document.querySelector("#lots-corps").innerHTML = lignes;
}

function initFiltres() {
  document.querySelector("#filtres").addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-statut]");
    if (!bouton) return;

    statutActif = bouton.dataset.statut;

    document
      .querySelectorAll("#filtres button")
      .forEach((b) => b.classList.toggle("actif", b === bouton));

    afficherTableau();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  afficherEntete();
  afficherStats();
  afficherTableau();
  initFiltres();
});
