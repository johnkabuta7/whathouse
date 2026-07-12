# Refonte UI mobile (mockups Android)

## 1. Bottom Nav — 5 onglets
Remplacer les 4 onglets actuels par 5, ordre exact:
1. **Accueil** (icône maison) → `/`
2. **Affaires** (icône mallette) → `/affaires` *(nouvelle page)*
3. **Répertoire** (icône groupe) → `/contacts` *(page renommée)*
4. **Offre Immo** (icône immeuble) → `/offre-immo`
5. **Profil** (icône user) → `/profil`

Onglet actif = pilule orange remplie avec libellé sous l'icône (comme sur les mockups). Style s'applique aux 3 thèmes (classic/mocha/nature).

## 2. Page "Répertoire" (ex-Contacts)
- Titre `Groupes` en haut à gauche (gras, grand).
- Deux sous-onglets sous le titre: **Groupe** | **Contacts**, soulignés en orange (l'actif).
- **Onglet Groupe**:
  - Barre d'actions à droite: bouton rond orange **loupe** (toggle recherche) + bouton rond orange **créer groupe** (icône users+).
  - Cliquer loupe → transforme la barre en input "Rechercher un groupe" plein largeur + bouton créer groupe à côté (image 3).
  - Liste des groupes de l'utilisateur (déjà dispo via `useGroups`) avec avatar rond, nom, `X annonce(s) · Y membre(s)`, `Dernière activité ...`, date à droite.
- **Onglet Contacts**:
  - Barre d'actions à droite: 3 boutons ronds orange = **loupe**, **importer répertoire**, **ajouter contact**.
  - Liste des contacts confirmés (logique existante conservée). Si vide: texte "Aucun contact avec compte WhatHouse détecté…".

## 3. Page "Offre Immo"
Remplacer les 3 liens actuels par:
- Header: icône immeuble + titre "Offre Immo" + sous-titre "Demandes clients natives". Icônes loupe & refresh à droite.
- Deux sous-onglets: **Toutes les demandes** | **Mes demandes**.
- Rangée horizontale de filtres pills scrollable (Gombe, Appartement, Disponible, Achat…).
- Liste de cartes de demandes avec: chips (Location/Disponible), date à droite, titre gras, prix orange, description, boutons **Voir détail** (outline) + **Prendre** (orange plein), puis **Contacter le client** (outline avec icône téléphone).
- Les données seront lues depuis Zwandako via `wp-proxy` (endpoint existant à ré-utiliser) OU depuis une nouvelle table locale si dispo — je réutilise ce qui existe déjà; si aucune source dispo, j'affiche l'état vide propre.

## 4. Page "Affaires" (nouvelle)
Nouvelle route `/affaires` avec 4 sous-onglets:
- **Tableau**: 2 cards violet pâle (Annonces prises: 0 · Activités: 0), section Notifications (bandeau orange pâle), section Mon portefeuille (bandeau orange pâle).
- **Demandes**: card "Avis de recherche" avec formulaire (Nom client, Téléphone client, textarea description, bouton "+ Ajouter un match"), puis liste "Aucune demande enregistrée".
- **Matches**: titre "Résultats WhatHouse et Zwandako" + bandeau orange pâle "Activez une demande pour lancer la recherche automatique."
- **Carte**: placeholder (vide propre).

Stockage local (localStorage) pour les "avis de recherche" — pas de nouvelle table backend dans ce lot, l'objectif est purement UI/UX. Si tu veux persister côté Cloud, je le ferai en 2e passe.

## 5. Fichiers touchés
- `src/components/BottomNav.tsx` — 5 items + libellés + pilule active.
- `src/pages/Contacts.tsx` — sous-onglets + nouvelle barre d'actions ronds.
- `src/pages/OffreImmo.tsx` — refonte complète en onglets/cards.
- `src/pages/Affaires.tsx` — nouveau fichier.
- `src/App.tsx` — ajouter route `/affaires`.
- `src/components/Layout.tsx` — étendre `SWIPE_ROUTES`/`PAGES` à 5 pages (swipe carousel).

## Questions
- **Persistance des "Avis de recherche"**: localStorage suffit pour ce lot, ou tu veux une table `search_requests` dès maintenant?
- **Source des "demandes" Offre Immo**: je réutilise `wp-proxy` (Zwandako) — OK?
