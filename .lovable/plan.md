# Plan de corrections

Beaucoup de sujets — je regroupe par zone pour livrer proprement.

## 1. Header & responsive global
- Ajouter partout `padding-top: max(env(safe-area-inset-top), 44px)` sur les headers pour ne jamais passer sous la status-bar iOS (heure/batterie).
- Auditer `CreateGroup`, `GroupDetail`, `Index`, `Profil`, `Affaires`, `OffreImmo`, `Contacts` pour la même règle.
- Ajouter viewport-fit=cover dans `index.html` si absent.

## 2. Image carte de visite (image 2)
- Dans le partage carte visite (probable `Profil.tsx` ou composant dédié), afficher la photo de profil de l'utilisateur au lieu du logo orange fallback.

## 3. Import contacts (image 3)
- Le toast rouge "Le navigateur ne supporte pas l'import" apparaît en même temps que la modale — retirer le toast quand la modale reste ouverte, et faire fonctionner le bouton X.

## 4. Images des groupes (image 4)
- Dans la liste des groupes (`Contacts.tsx`), afficher `group.avatar_url` (ou équivalent) au lieu de l'icône par défaut.

## 5. Profil — restructuration
- Regrouper "Mon activité" et "Espace professionnel" en sections dépliables comme Préférences/Sécurité.
- Retirer bouton "Se déconnecter" dans Sécurité (il existe déjà en bas).
- Relire/améliorer Aide & informations.

## 6. Menu Affaires
- Supprimer onglet "Portefeuille".
- Titre "Notifications & Activité" sur une ligne, sans sous-titre "Activité récente – mes annonces".
- Sur les annonces "En cours" : remplacer "Voir dans le groupe" par "Aperçu" (ouvre `ListingPreview` avec boutons WhatsApp).
- Notifications temps réel via Supabase realtime.

## 7. Aperçu annonce accueil
- Clic sur annonce accueil → route `/listing/:id` en aperçu dans l'app (pas redirection externe).

## 8. Offre Immo — prise d'annonce
- Quand on "Prend" une demande : ne pas stocker dans `wh_taken_listings` local mais l'envoyer côté zwandako via `wp-proxy` action `take_lead`, puis l'afficher dans onglet "Mes demandes" avec quota, contact Appeler/WhatsApp/Email, bouton "Contactée" — reproduire l'UI de l'image 5.

## Ordre d'exécution
1. Header responsive (rapide, transverse)
2. Contacts : image groupe + import fix
3. Profil : sections + cleanup
4. Affaires : suppression portefeuille + aperçu + realtime
5. Accueil : preview
6. Offre Immo : take_lead + UI mes demandes
7. Carte visite photo

## Notes techniques
- `wp-proxy` : ajouter actions `take_lead`, `list_my_leads`, `mark_contacted` côté edge function (endpoints zwandako correspondants à confirmer).
- Realtime : `supabase.channel('notifications').on('postgres_changes', ...)`.
- Ne pas toucher `src/integrations/supabase/client.ts` ni `types.ts`.

Confirmez ou ajustez avant que je lance — c'est ~10 fichiers modifiés.
