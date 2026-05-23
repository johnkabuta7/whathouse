## Plan d'exécution

Votre demande couvre 3 chantiers très différents. Voici comment je propose de les traiter, **dans l'ordre**, en restant prudent pour ne rien casser de ce qui fonctionne déjà.

---

### 1. Menu 3 points (page d'accueil)

**État actuel** : le menu contient déjà **« Installer l'App »** et **« Partager l'application »** (vérifié dans `src/pages/Index.tsx` lignes 267-287).

**Action** :
- Vérifier que **Partager** partage bien `https://whathouse.pro` (lien de l'app, comme vous l'avez choisi) via le partage natif iOS/Android + fallback WhatsApp.
- Vérifier que **Installer l'App** déclenche bien l'installation PWA directe (sans popup intermédiaire).
- Corriger uniquement si bug constaté.

---

### 2. Galerie photos + mode plein écran

**Investigation requise** : je vais lire `ListingPreview.tsx` et `GroupDetail.tsx` (qui contiennent l'affichage des photos) pour identifier :
- Comment les photos sont actuellement affichées dans la galerie.
- Comment le plein écran fonctionne (ou ne fonctionne pas).

**Action** :
- Corriger l'affichage des photos en galerie (proportion, qualité, scroll).
- Améliorer le plein écran : swipe gauche/droite entre photos, zoom pinch, bouton fermer visible, fond noir total.

---

### 3. Google One Tap + onboarding viral

⚠️ **Avertissement important** : votre app a déjà un système d'authentification **complet et fonctionnel** :
- Login par téléphone + mot de passe
- Login par email + mot de passe
- Mirror automatique vers zwandako.com (WP)
- Profils complets

Remplacer tout par **Google One Tap uniquement** casserait ce système. Je propose plutôt **d'ajouter Google comme méthode de connexion supplémentaire**, en gardant téléphone/email intacts.

**Action proposée** :
- Activer **Sign in with Google** via Lovable Cloud (managé, aucune config Google Cloud requise).
- Ajouter un bouton **« Continuer avec Google »** sur la page Profil/Login (au-dessus des champs téléphone/email).
- Au premier login Google : créer automatiquement le profil (first_name, last_name, email récupérés de Google).
- Popup post-signup Google : demander **téléphone** (obligatoire pour les fonctions WhatHouse) + mot de passe optionnel.
- **Pas de système de parrainage `?ref=` pour cette itération** — peut être ajouté plus tard si vous le souhaitez (nécessite une table `referrals`).
- **Pas de lien `/join/ABCD123`** spécifique — le bouton Partager partage déjà `https://whathouse.pro` qui ouvre l'app, et Google One Tap s'affichera automatiquement pour les nouveaux visiteurs.

**Hors scope** (à demander explicitement si besoin) :
- Système de parrainage avec récompenses
- Liens d'invitation personnalisés avec tracking
- Migration complète vers OAuth-only (suppression téléphone/email)

---

### Détails techniques

- **Étape 1** : édits dans `src/pages/Index.tsx` uniquement si bug.
- **Étape 2** : édits dans `src/pages/ListingPreview.tsx`, `src/pages/GroupDetail.tsx`, possiblement nouveau composant `FullscreenGallery.tsx`.
- **Étape 3** :
  - Appel `supabase--configure_social_auth` avec `providers: ["google"]` (Lovable Cloud managé, aucune clé requise).
  - Création `src/integrations/lovable/` automatique.
  - Ajout bouton + handler `lovable.auth.signInWithOAuth("google")` dans `Login.tsx` et `Profil.tsx`.
  - Trigger DB `handle_new_user` existe déjà → le profil sera créé automatiquement avec l'email Google.
  - Ajout d'une modal post-login Google qui s'affiche si `profile.phone` est vide → demande téléphone.

---

### Confirmation demandée

Validez-vous :
1. Que je **ne touche pas au système téléphone/email existant** et que j'**ajoute Google comme option supplémentaire** ?
2. Que le **système de parrainage / liens `/join/ref=`** est **reporté à plus tard** ?

Si oui, je commence par l'étape 1 (vérif menu), puis 2 (galerie), puis 3 (Google).