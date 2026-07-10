# Fiche de révision technique

Résumé court de chaque notion de code rencontrée sur le projet, dans l'ordre
où elle a été vue. À relire pour se rafraîchir la mémoire, ou pour préparer un
entretien. Le vocabulaire **métier** (VEFA, TMA...) est dans `glossaire.md` —
ici c'est uniquement du vocabulaire **technique**.

## JavaScript vanilla (étape 1)

- **`document.querySelector('#id')`** : récupère un élément HTML par son
  identifiant (ou tout sélecteur CSS). Base de toute manipulation du DOM.
- **`textContent` vs `innerHTML`** : `textContent` insère du texte brut, sans
  risque (utilisé pour des données de confiance comme les nôtres) ;
  `innerHTML` interprète le texte comme du HTML — pratique pour injecter des
  balises générées, mais dangereux avec du contenu venant d'un utilisateur
  (risque XSS), à réserver à nos propres données fictives pour l'instant.
- **Template literals** (`` `texte ${variable}` ``) : chaînes de caractères
  multi-lignes avec insertion de variables.
- **`Array.filter/map/reduce`** : `filter` garde certains éléments selon une
  condition, `map` transforme chaque élément, `reduce` accumule une valeur
  unique (somme, compteur...) à partir d'un tableau.
- **Délégation d'événements** : poser un seul `addEventListener` sur un
  conteneur parent plutôt qu'un par enfant, et retrouver l'élément cliqué avec
  `.closest(...)`. Plus économe que d'attacher un écouteur par bouton.
- **`Intl.NumberFormat`** : API native du navigateur pour formater des
  nombres/montants selon une locale (ex: `"fr-FR"` + `currency: "EUR"` →
  `"210 000,00 €"`). Attention : insère des espaces insécables, qui peuvent
  provoquer un débordement visuel si le conteneur est trop étroit.
- **Modules ES (`import`/`export`)** : chaque fichier a son propre espace de
  variables (contrairement aux `<script>` classiques qui partagent un espace
  global) ; on rend explicitement disponible ce qu'on `export`e, et on va le
  chercher avec `import` dans le fichier qui en a besoin.

## React (étape 2)

- **Composant** : une fonction JavaScript, avec un nom qui commence par une
  majuscule, qui retourne du JSX. C'est l'unité de base de React.
- **JSX** : syntaxe qui mélange HTML et JavaScript dans le code (`<p>Bonjour
  {prenom}</p>`). Ce n'est pas du HTML valide pour un navigateur — Vite le
  traduit en JavaScript classique avant exécution.
- **Props** : les "paramètres" qu'on passe à un composant
  (`<Salutation prenom="Nicolas" />`). Se déclarent en déstructurant l'objet
  reçu en paramètre de la fonction : `function Salutation({ prenom }) {...}`.
- **`useState`** : crée une donnée surveillée par React (`const [valeur,
  setValeur] = useState(valeurInitiale)`). Dès que `setValeur(...)` est
  appelé, React relance automatiquement le rendu du composant — on ne
  manipule plus jamais le DOM à la main comme en vanilla.
- **Rendu de listes avec `.map()`** : la même méthode `.map()` qu'en vanilla,
  mais qui retourne ici un tableau de JSX au lieu d'une chaîne de texte à
  injecter avec `innerHTML`.
- **`key`** : identifiant unique obligatoire sur chaque élément d'une liste
  générée par `.map()` (ex: `key={lot.reference}`). Permet à React de savoir
  quel élément a changé/été ajouté/supprimé, sans tout redessiner. Un
  avertissement dans la console signale un `key` manquant.
- **Fragment (`<>...</>`)** : balise "invisible" pour grouper plusieurs
  éléments sans ajouter de vrai `<div>` inutile — nécessaire car un composant
  ne peut retourner qu'un seul élément racine.
- **`export default`** : indique l'export "principal" d'un fichier,
  importable sans accolades (`import App from './App.jsx'`), contrairement à
  un export nommé (`export const PROGRAMME = ...` → `import { PROGRAMME }
  from ...`).

## Outillage

- **Vite** : outil qui (1) traduit JSX/modules ES en JS compréhensible par le
  navigateur, et (2) sert l'application en développement avec rechargement
  instantané (HMR) à la sauvegarde.
- **`server.watch.usePolling`** (`vite.config.js`) : nécessaire quand le
  projet est sur le disque Windows (`/mnt/c/...`) mais que le serveur tourne
  dans WSL — WSL ne reçoit pas toujours les notifications de modification de
  fichiers faites côté Windows, Vite doit donc vérifier les fichiers à
  intervalle régulier au lieu d'attendre d'être prévenu.
