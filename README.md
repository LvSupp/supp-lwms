# Palettes Scan

Je souhaite créer une application web responsive (desktop + smartphone) permettant de gérer un stock simple de palettes dans un entrepôt.

Objectif :

Pouvoir identifier et localiser chaque palette grâce à un QR code ou un code-barres.

L'application doit être simple et adaptée à un usage opérationnel terrain.

Contexte :

- Pas d'API externe.

- Toutes les opérations sont manuelles.

- Utilisation principalement sur smartphone.

- Plusieurs sites logistiques possibles à terme.

- Interface en français.

---------------------------------------

MODÈLE DE DONNÉES

---------------------------------------

Créer les entités suivantes :

SITE

- id

- nom

EMPLACEMENT

- id

- code emplacement

- site

ARTICLE

- id

- référence

- désignation

PALETTE

- id

- numéro palette unique

- article

- quantité

- lot

- emplacement actuel

- date création

- statut

MOUVEMENT

- id

- date heure

- type mouvement

- palette

- emplacement source

- emplacement destination

- utilisateur

---------------------------------------

RÈGLES MÉTIER

---------------------------------------

Une palette ne peut être présente que sur un seul emplacement à la fois.

Chaque déplacement doit créer automatiquement une ligne dans l'historique des mouvements.

Chaque palette possède un identifiant unique.

Un emplacement peut contenir plusieurs palettes.

L'utilisateur doit pouvoir retrouver instantanément l'emplacement actuel d'une palette.

---------------------------------------

ÉCRANS

---------------------------------------

1. Connexion

2. Tableau de bord

Afficher :

- nombre de palettes

- nombre d'emplacements

- nombre de mouvements du jour

3. Recherche palette

Recherche par :

- scan QR code

- scan code-barres

- saisie manuelle

Afficher :

- numéro palette

- article

- quantité

- lot

- emplacement actuel

4. Création palette

Saisir :

- article

- quantité

- lot

- emplacement

Générer automatiquement un identifiant palette unique.

5. Déplacement palette

Workflow :

Étape 1 :

scanner une palette

Étape 2 :

scanner un emplacement destination

Étape 3 :

afficher confirmation

Étape 4 :

mettre à jour l'emplacement

Étape 5 :

créer automatiquement un mouvement

6. Historique

Afficher tous les mouvements avec :

- date

- palette

- source

- destination

- utilisateur

---------------------------------------

EXPÉRIENCE MOBILE

---------------------------------------

Prévoir un bouton "Scanner" utilisant directement la caméra du téléphone.

Le scan doit remplir automatiquement les champs.

L'interface doit être utilisable d'une seule main sur smartphone.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/044cd43b-89e2-4f13-b5fe-644e355e04a2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
