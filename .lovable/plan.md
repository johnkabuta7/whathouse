Ce plan couvre deux chantiers demandés. Le second est très large : je le découpe en phases livrables pour éviter de casser l'existant. Chaque phase est autonome et déployable.

---

## Partie 1 — Groupes sur la page d'accueil (règle d'affichage)

Objectif : un groupe n'apparaît sur l'accueil que dans deux cas :
1. Il est **épinglé à l'accueil** (bouton "Ajouter à l'accueil" depuis la page du groupe → `hooks/use-home-groups.ts`, déjà en place).
2. Il a **au moins un nouveau message/annonce non lu** pour l'utilisateur connecté. Dès que l'utilisateur ouvre le groupe (donc marque comme lu via `group_reads`), le groupe disparaît de l'accueil, sauf s'il est épinglé.

Changements :
- `src/pages/Index.tsx` : la liste des groupes affichés = `pinnedHomeGroupIds ∪ groupsWithUnread`. Retirer l'affichage "tous mes groupes" par défaut.
- Calcul de `groupsWithUnread` : comparer `listings.created_at` max par `group_id` avec `group_reads.last_read_at` pour l'utilisateur courant.
- Rafraîchir la liste quand un nouveau `listing` arrive (déjà via `useRealtimeListings`) et quand on revient sur la route `/`.
- Utilisateur non connecté : n'afficher que les groupes épinglés locaux (déjà stockés en localStorage).

---

## Partie 2 — Offline First (PWA + cache + file d'attente + sync)

Approche : on garde React Query comme cache lecture, on ajoute un **Service Worker** pour l'app-shell + assets + navigations (NetworkFirst pour HTML, CacheFirst pour assets hashés, StaleWhileRevalidate pour images de listings), et une **file d'attente locale IndexedDB** pour les mutations. Aucune logique métier existante n'est modifiée : on branche un wrapper autour des `mutationFn` sensibles.

### Phase A — PWA & cache lecture (base technique)
- Ajouter `vite-plugin-pwa` en mode `generateSW`, `registerType: autoUpdate`, `injectRegister: null`.
- Wrapper d'enregistrement `src/pwa/register.ts` avec toutes les gardes Lovable preview / iframe / `?sw=off` (skill PWA).
- Retirer / remplacer l'actuel `public/sw.js` manuel via la stratégie kill-switch (une release), puis laisser `vite-plugin-pwa` prendre la main.
- Runtime caching :
  - HTML/navigations → `NetworkFirst` (exclure `/~oauth`).
  - JS/CSS hashés → `CacheFirst`.
  - Images Supabase Storage (`/storage/v1/object/public/listings/*`) → `StaleWhileRevalidate`, cap 200 entrées / 60 jours.
  - Fonts, icônes → `CacheFirst`.
- Persistance React Query : `@tanstack/query-sync-storage-persister` + `persistQueryClient` sur `localStorage` (clé versionnée) pour que profils, groupes, listings restent visibles hors ligne.

### Phase B — Indicateur d'état réseau + file d'attente
- Nouveau contexte `src/contexts/OfflineContext.tsx` : `online`, `pendingCount`, `syncing`.
- Nouveau module `src/offline/queue.ts` sur IndexedDB (`idb` léger) :
  - `enqueue({ kind, payload, createdAt, retries })`
  - `list()`, `remove(id)`, `bumpRetry(id)`
  - Kinds supportés (phase B) : `listing.create`, `listing.update`, `listing.delete`, `group.create`, `comment.create`, `profile.update`, `photo.upload`.
- Barre discrète en haut (dans `Layout`) :
  - 🟢 en ligne (masquée après 2 s) / 🟠 sync / 🔴 hors ligne / 🔵 « N actions en attente ».
- Écoute `online`/`offline` + `navigator.onLine` pour déclencher la sync.

### Phase C — Branchement des mutations
- Créer `src/offline/withOffline.ts` : helper qui, dans un `mutationFn`, tente l'appel réseau ; si `!navigator.onLine` **ou** erreur réseau → `enqueue(...)` et retourne une réponse optimiste. Mise à jour optimiste dans le cache React Query pour que l'UI reflète l'action.
- Brancher sur les hooks existants sans changer leur signature :
  - `Publish.tsx` (création listing + upload photos)
  - `CreateGroup.tsx`
  - Édition / suppression annonce
  - Édition profil
  - Envoi commentaire / message
- Les photos sélectionnées hors ligne sont stockées en `Blob` dans IndexedDB (jamais en base64 en localStorage), référencées par la tâche `photo.upload`.

### Phase D — Synchronisation
- `src/offline/sync.ts` : moteur qui, au retour de connexion (ou toutes les 30 s si `pendingCount > 0`), rejoue la file **en ordre FIFO** avec backoff exponentiel (1s, 5s, 30s, 5min, plafonné). Une tâche `listing.create` qui dépend d'un `photo.upload` attend la confirmation d'upload.
- Résolution de conflits : `updated_at` serveur > local ⇒ garder serveur + toast « Version serveur plus récente conservée ». Aucune écriture silencieuse.
- Toast succès à la fin de la vidange : « Vos données ont été synchronisées ».
- Enregistrement Background Sync (`sync` tag) sur navigateurs compatibles ; fallback polling sinon.

### Phase E — Sécurité, quota, tests
- Ne rien persister de sensible : la persistance React Query filtre les clés (`profiles`, `listings`, `groups`, `messages` OK ; on exclut tout ce qui contient `token`, `session`, `auth`).
- Nettoyage : cap IndexedDB à 50 Mo, LRU sur images, purge des tâches accomplies.
- Tests manuels documentés dans `README.md` (perte réseau pendant publication, redémarrage, plusieurs jours hors ligne, etc.).

---

## Détails techniques

- Nouvelles deps : `vite-plugin-pwa`, `workbox-window`, `idb`, `@tanstack/query-sync-storage-persister`, `@tanstack/react-query-persist-client`.
- Fichiers créés : `src/pwa/register.ts`, `src/offline/{queue,sync,withOffline,db}.ts`, `src/contexts/OfflineContext.tsx`, `src/components/OfflineBar.tsx`.
- Fichiers modifiés : `vite.config.ts`, `src/main.tsx`, `src/App.tsx` (provider + persister), `src/components/Layout.tsx` (barre), `src/pages/Index.tsx` (règle groupes), `src/pages/Publish.tsx`, `src/pages/CreateGroup.tsx`, `src/pages/GroupDetail.tsx` (commentaires/messages), `src/pages/Profil.tsx`, hooks `use-data.ts` concernés.
- Aucun changement DB / RLS nécessaire pour cette itération.

---

## Ordre de livraison proposé

1. **Partie 1 (groupes accueil)** — petite, autonome, ~1 édition.
2. **Phase A** (PWA + cache lecture) — navigation hors ligne fonctionnelle.
3. **Phase B** (indicateur + file d'attente vide) — visibilité pour l'utilisateur.
4. **Phase C + D** (mutations offline + sync) — cœur de l'offline first.
5. **Phase E** (sécurité, quota, tests).

Confirme si je pars sur cet ordre, ou dis-moi si tu veux que je commence directement par la Partie 1 + Phase A dans le même tour.