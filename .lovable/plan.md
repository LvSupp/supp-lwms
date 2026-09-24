# Palettes multi-références et Préparation (simulation)

## 1. Tables impactées
- `palettes` : aujourd'hui porte `article_id`, `quantite`, `lot` (mono-référence). Conserve `numero`, `emplacement_id`, `statut`, `created_at`, `created_by`.
- `mouvements` : inchangée (mouvement au niveau palette : ENTREE, DEPLACEMENT).
- `emplacements` : inchangée (Réception illimitée, capacité déjà gérée).
- `articles` : inchangée (la référence 8sens = `reference`).
- Nouvelle table `palette_contenus`.

## 2. Migration proposée (nouveau fichier, historiques intacts)
- `palette_contenus` : `id`, `palette_id` (FK palettes, cascade), `article_id` (FK articles), `quantite` (entier > 0), `statut` (`DISPONIBLE` par défaut, valeurs DISPONIBLE / BLOQUE / RESERVE), `created_at`, `updated_at`, contrainte **unique (palette_id, article_id)**. GRANT + RLS identiques aux autres tables (utilisateurs connectés).
- **Reprise des données** : une ligne de contenu par palette existante (article + quantité actuels), statut DISPONIBLE.
- `palettes.article_id` et `quantite` deviennent facultatifs (conservés, non supprimés, pour ne perdre aucune donnée et ne pas casser l'historique) ; les nouvelles requêtes lisent uniquement `palette_contenus`.
- Nouvelle fonction transactionnelle `creer_palette_multi(p_numero text, p_lignes jsonb)` :
  - numéro saisi (unicité contrôlée) ou généré via la numérotation existante si vide ;
  - contrôle de chaque ligne (article actif, quantité > 0, pas de doublon) ;
  - création palette en Réception + toutes les lignes + mouvement ENTREE ; toute erreur annule l'ensemble.
- Contrainte d'unicité sur `palettes.numero` (si absente).
- `deplacer_palette` : inchangée (déplace déjà uniquement la palette, contrôle capacité, Réception illimitée).
- L'ancienne `creer_palette` est conservée pour compatibilité.

## 3. Fichiers à créer / modifier
- `src/lib/stock.ts` : types et requêtes adaptés au contenu (stock par article = somme des contenus ; détail palette avec lignes, nb références, quantité totale, site / zone / emplacement ; recherche par code palette, référence, désignation, emplacement) ; `creerPaletteMulti`.
- `src/routes/creation.tsx` : formulaire multi-lignes (code saisi ou généré, sélection article ou scan EAN, quantité, ajouter / modifier / supprimer ligne, récapitulatif, « Créer la palette en réception », étiquette imprimable).
- `src/routes/recherche.tsx` (Stock) : cartes palettes multi-références et détails adaptés.
- `src/routes/deplacement.tsx` : affichage du contenu complet de la palette scannée.
- `src/lib/preparation.ts` (nouveau) : algorithme de parcours (logique pure).
- `src/routes/preparation.tsx` (nouveau) : demande, résumé, missions, exécution simulée.
- `src/components/AppShell.tsx` : entrée « Préparation » ; navigation basse à 5 entrées lisibles (Historique déplacé vers l'accueil / en-tête pour garder la lisibilité mobile).
- `src/routes/index.tsx` : seulement si des compteurs lisent `palettes.quantite`.
- `README.md` : nouvelle section modèle + préparation.
- Types backend régénérés automatiquement après migration.

## 4. Algorithme de parcours
1. Besoins restants par référence (références inconnues signalées, quantités invalides refusées).
2. Palettes candidates : contenus DISPONIBLE, quantité > 0, référence demandée.
3. Boucle : pour chaque palette restante, compter les références encore utiles ; trier par nb décroissant, puis code emplacement, puis code palette ; prendre la première, proposer min(disponible, restant) pour chaque référence utile ; recalculer ; arrêter quand tout est couvert ou plus de stock.
4. Une palette = une seule mission ; références non demandées ignorées.
5. Mention : « Première règle de priorité : ni optimisation géographique, ni FIFO. »

## 5. Écran Préparation
- Saisie de lignes (référence avec suggestions du référentiel, quantité), « Ajouter une référence », « Calculer le parcours ».
- Résumé : nb références, quantité totale, palettes à visiter, couvertes totalement / partiellement, manquants.
- Missions ordonnées avec « Préparer cette palette ».
- Exécution : palette et emplacement attendus, scan (ScannerDialog) avec contrôle de correspondance, quantité prélevée par ligne (0 à proposée), validation groupée, progression et reliquats recalculés, passage à la mission suivante.
- Bandeau : « Simulation : le stock réel n'est pas modifié. » État conservé dans l'interface uniquement.
- États : chargement, liste vide, aucune palette disponible, couverture partielle, référence inconnue, quantité invalide, mauvaise palette, erreurs backend (notifications existantes).

## 6. Risques de régression
- Écrans lisant `palettes.quantite` / `articles` directement (Stock, accueil, étiquettes) : tous basculés sur les contenus.
- Réception (attendus, stockage local) : non touchée.
- Palettes existantes : reprises à l'identique, aucune suppression.
- Déplacement : logique serveur inchangée, seul l'affichage évolue.
- Navigation mobile : ajout d'une entrée, vérifiée en largeur smartphone.

## 7. Vérifications
- Build et lint, correction des erreurs liées aux changements.
- Test navigateur : création palette 3 références, visibilité en Réception dans Stock, déplacement, calcul d'un parcours regroupé, mission simulée sans changement du stock.
- Résumé des fichiers modifiés. Aucun commit ni déploiement.
