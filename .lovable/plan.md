# Suppl'WMS — Réception, capacité des emplacements, documentation

## Ce qui existe aujourd'hui
- Création de palette : formulaire article / quantité / lot / **emplacement obligatoire**, via la fonction base `creer_palette` qui crée aussi le mouvement `ENTREE`.
- Déplacement : `deplacer_palette` met à jour l'emplacement et crée le mouvement `DEPLACEMENT`, sans aucun contrôle de capacité.
- Emplacements : code + site + actif. Aucune notion de capacité, aucun emplacement Réception.
- Données actuelles : 7 emplacements, dont 4 contiennent déjà 2 ou 3 palettes (A-01-02, A-02-01, S-01-01, S-01-02).
- Aucun dossier `docs`, aucun test automatisé. README = brief produit initial.

## 1. Emplacement Réception
- Nouvelle colonne de typage sur les emplacements : `STOCK` (par défaut) ou `RECEPTION`. La Réception est retrouvée par ce type, jamais par son libellé.
- Création idempotente d'un emplacement `RECEPTION` (site principal existant), actif, capacité illimitée, si aucun n'existe.
- Suppression bloquée tant que des palettes y sont affectées (et l'emplacement Réception reste repérable dans les paramètres par un badge « Réception »).

## 2. Capacité
- Nouvelle colonne `capacite_max` : un entier > 0 = capacité limitée, vide = capacité illimitée.
- Reprise des données existantes : capacité 1 par défaut, sauf les emplacements déjà multi-palettes qui reçoivent une capacité égale à leur occupation actuelle (aucune donnée rendue incohérente). Réception = illimitée.
- Occupation toujours calculée (nombre de palettes affectées / capacité), jamais un booléen occupé/libre.

## 3. Contrôles côté base (non contournables)
- `creer_palette` ne prend plus d'emplacement : elle affecte la palette à la Réception et crée le mouvement `ENTREE` comme aujourd'hui.
- `deplacer_palette` verrouille l'emplacement de destination, compte les palettes présentes et refuse le déplacement si la capacité est atteinte : « Impossible de déplacer la palette : l'emplacement A-01-01 a atteint sa capacité maximale. » Tout est fait dans une seule transaction (vérification, déplacement, historique) : aucun état partiel.
- Un garde-fou en base empêche aussi toute affectation directe au-delà de la capacité, et empêche de baisser une capacité en dessous de l'occupation actuelle.

## 4. Écrans (évolutions minimales, rien n'est recréé)
- **Créer** : suppression du choix et du scan d'emplacement ; bloc en lecture seule « Emplacement initial — RÉCEPTION ». Le reste (article, scan EAN, quantité, lot, étiquette QR) inchangé.
- **Paramètres › Emplacements** : choix « Limitée / Illimitée » avec nombre maximal (défaut : limitée, 1) ; chaque ligne affiche l'occupation (`1 / 1 palette` — Complet, `0 / 1` — Disponible, `12 palettes` — Capacité illimitée) et le badge Réception.
- **Déplacer** : affichage du message de refus renvoyé par la base ; la palette reste sur son emplacement.
- **Stock** : la fiche emplacement affiche l'occupation et la capacité.

## 5. Documentation (même livraison)
- `README.md` réécrit : présentation, fonctionnalités réellement disponibles, règles métier (9 règles demandées), architecture avec les versions réelles de `package.json`, installation (`bun install`, `bun run dev`, variables d'environnement sans valeurs), fonctionnalités non disponibles, règle de maintenance documentaire.
- Nouveaux `docs/PRODUCT_VISION.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, sans duplication du README, avec distinction règles validées / hypothèses / sujets à confirmer.

## 6. Recette
Scénarios joués sur l'application en fonctionnement : création en Réception, déplacement autorisé vers un emplacement libre de capacité 1, refus sur emplacement complet, déplacements multiples vers Réception, emplacement de capacité 3 (3 acceptées / 4e refusée), passage en illimité, refus de réduction de capacité sous l'occupation. Puis `bun run build` et `bun run lint`.

## Points signalés
Les 4 emplacements contenant déjà plusieurs palettes seront configurés avec une capacité égale à leur occupation : à revoir manuellement pour fixer la vraie capacité physique.
