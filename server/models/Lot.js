import mongoose from 'mongoose'

const lotSchema = new mongoose.Schema(
  {
    // `index: true` (21/07/2026, audit performance) : ce champ est filtré à
    // CHAQUE requête multi-programme (`getIdsLotsDuProgramme`, server/utils/
    // programme.js, appelé par la quasi-totalité des routes) — sans index,
    // MongoDB doit parcourir toute la collection `Lot` à chaque appel.
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programme',
      required: true,
      index: true,
    },
    reference: { type: String, required: true },
    etage: String,
    type: String,
    orientation: {
      type: String,
      enum: ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'],
    },
    surfaceHabitable: Number,
    // Surface sous plafond bas (17/07/2026, point 164) : partie du logement
    // avec une hauteur sous plafond < 1,80m (mansarde/comble), exclue du
    // calcul de la surface habitable (loi Carrez) — distincte de
    // `surfaceHabitable`, pas une correction dessus. Un seul total par lot
    // (contrairement aux terrasses/balcons, une seule zone de ce type par
    // logement en pratique).
    surfaceSousPlafondBas: Number,
    // Terrasse/Balcon/Loggia séparés en catégories distinctes (remarque du
    // 13/07/2026, point 156 — auparavant fusionnés "Terrasses/Balcons").
    // Plusieurs valeurs possibles par catégorie et par lot — une liste de
    // surfaces plutôt qu'un seul nombre, contrairement à parkings/caves
    // ci-dessous : ce sont des m², pas des numéros identifiants, donc pas
    // de contrainte d'unicité (deux terrasses de même surface sont possibles).
    surfacesTerrasses: [Number],
    surfacesBalcons: [Number],
    surfacesLoggias: [Number],
    surfaceJardin: Number,
    // Remplacé le 17/07/2026 (point 165) par le catalogue Annexe.js : les
    // parkings/caves/celliers ne sont plus de simples numéros saisis
    // librement sur le lot, mais des annexes du catalogue du programme
    // (avec leur propre prix), attribuées à un lot via `Annexe.lot`. Voir la
    // propriété virtuelle `annexes` ci-dessous.
    // Prix du logement seul, sans les annexes (17/07/2026, point 165) —
    // saisi à la main. `prixTTC` (le prix total, utilisé partout ailleurs :
    // appels de fonds, CA, prix/m²...) est recalculé côté serveur à chaque
    // attribution/retrait d'annexe ou modification de ce champ (voir
    // routes/lots.js) : prixTTC = prixLogementSeul + somme des annexes
    // attribuées à ce lot.
    prixLogementSeul: Number,
    prixTTC: Number,
    // Vente d'une annexe seule (17/07/2026, remarque de Nicolas) : un
    // "lot" créé depuis le bouton "Vendre une annexe" (page Lots), sans
    // logement réel derrière — juste une annexe (ex: un parking vendu à
    // part, à un acquéreur qui n'a pas forcément de logement dans le
    // programme). Suit exactement le même cycle de vente (statut/dates/
    // client/appels de fonds) qu'un logement normal, ne compte simplement
    // pas dans le quota `Programme.nombreLogements`.
    estAnnexeSeule: { type: Boolean, default: false },
    // Pas de statut "annulé" ici (13/07/2026, points 117+118, 2e refonte) :
    // "Annuler la vente" (voir routes/lots.js) fait repartir ce lot à zéro
    // ("Libre", comme neuf) et déplace l'ancien statut/dates/client/
    // commentaire vers HistoriqueAnnulation.js — une page à part, pas un
    // statut de plus ici, pour que le tableau des lots ne montre à tout
    // instant que des logements réellement à vendre ou vendus.
    statut: {
      type: String,
      enum: ['libre', 'option', 'reserve', 'acte'],
      default: 'libre',
    },
    dateOption: Date,
    dateReservation: Date,
    dateActe: Date,
    acquereur: { type: mongoose.Schema.Types.ObjectId, ref: 'Acquereur' },
    commentaire: String,
  },
  { timestamps: true, toJSON: { virtuals: true } },
)

// Relation virtuelle (17/07/2026, point 165) : les annexes attribuées à ce
// lot ne sont pas stockées ici, seulement référencées depuis Annexe.lot —
// cette propriété permet de les récupérer via `.populate('annexes')` sans
// dupliquer la donnée des deux côtés.
lotSchema.virtual('annexes', {
  ref: 'Annexe',
  localField: '_id',
  foreignField: 'lot',
})

export default mongoose.model('Lot', lotSchema)
