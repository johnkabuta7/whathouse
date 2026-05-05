import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ========== ADMIN ==========
export function useIsAppAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is_app_admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      return data?.role === 'admin';
    },
    enabled: !!user,
    refetchInterval: 10_000,
  });
}

// ========== SLIDER BANNERS ==========
export function useSliderBanners() {
  return useQuery({
    queryKey: ['slider_banners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('slider_banners').select('*').eq('active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useAllSliderBanners() {
  return useQuery({
    queryKey: ['all_slider_banners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('slider_banners').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}


export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (banner: { image_url: string; link_url?: string; sort_order?: number; caption?: string }) => {
      const { data, error } = await supabase.from('slider_banners').insert(banner as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slider_banners'] });
      qc.invalidateQueries({ queryKey: ['all_slider_banners'] });
    },
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; image_url?: string; caption?: string; link_url?: string; sort_order?: number; active?: boolean }) => {
      const { data, error } = await supabase.from('slider_banners').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slider_banners'] });
      qc.invalidateQueries({ queryKey: ['all_slider_banners'] });
    },
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('slider_banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slider_banners'] });
      qc.invalidateQueries({ queryKey: ['all_slider_banners'] });
    },
  });
}

// ========== APP CONTENT (Tutos, Avantages, Termes) ==========
export function useAppContent(key: string) {
  return useQuery({
    queryKey: ['app_content', key],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_content' as any).select('*').eq('key', key).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!key,
  });
}

export function useUpsertAppContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, content }: { key: string; content: string }) => {
      const { data, error } = await supabase
        .from('app_content' as any)
        .upsert({ key, content, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['app_content', v.key] }),
  });
}

// ========== GROUPS ==========
export function useMyGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships, error: mErr } = await supabase.from('group_members').select('group_id').eq('user_id', user.id);
      if (mErr) throw mErr;
      if (!memberships?.length) return [];
      const groupIds = memberships.map(m => m.group_id);
      const { data, error } = await supabase.from('groups').select('*').in('id', groupIds).order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAllGroups() {
  return useQuery({
    queryKey: ['all_groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Normalize text for fuzzy search: strip accents, lowercase, remove punctuation
export function normalizeSearch(s: string): string {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function useSearchGroups(search: string) {
  return useQuery({
    queryKey: ['search_groups', search],
    queryFn: async () => {
      if (!search.trim()) return [];
      // Fetch all groups then filter client-side using normalized strings (accent/punct tolerant)
      const { data, error } = await supabase.from('groups').select('*').limit(500);
      if (error) throw error;
      const q = normalizeSearch(search);
      return (data || []).filter(g =>
        normalizeSearch(g.name).includes(q) ||
        normalizeSearch(g.description || '').includes(q)
      ).slice(0, 30);
    },
    enabled: search.trim().length >= 2,
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (group: { name: string; description?: string; image_url?: string; created_by: string }) => {
      const { data, error } = await supabase.from('groups').insert(group).select().single();
      if (error) throw error;
      await supabase.from('group_members').insert({ group_id: data.id, user_id: group.created_by });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my_groups'] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; image_url?: string; description?: string }) => {
      const { data, error } = await supabase.from('groups').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['group', data.id] });
      qc.invalidateQueries({ queryKey: ['my_groups'] });
      qc.invalidateQueries({ queryKey: ['all_groups'] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my_groups'] }),
  });
}

// ========== GROUP MEMBERS ==========
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ['group_members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from('group_members').select('*').eq('group_id', groupId);
      if (error) throw error;
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      return data.map(m => ({ ...m, profiles: profiles?.find(p => p.user_id === m.user_id) || null }));
    },
    enabled: !!groupId,
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['group_members', v.groupId] });
      qc.invalidateQueries({ queryKey: ['is_member', v.groupId] });
      qc.invalidateQueries({ queryKey: ['my_groups'] });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['group_members', v.groupId] });
      qc.invalidateQueries({ queryKey: ['is_member', v.groupId] });
      qc.invalidateQueries({ queryKey: ['my_groups'] });
    },
  });
}

export function useIsMember(groupId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is_member', groupId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', user.id).maybeSingle();
      return !!data;
    },
    enabled: !!groupId && !!user,
  });
}

// ========== JOIN REQUESTS ==========
export function useJoinRequests(groupId: string) {
  return useQuery({
    queryKey: ['join_requests', groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from('group_join_requests').select('*').eq('group_id', groupId).eq('status', 'pending');
      if (error) throw error;
      if (!data?.length) return [];
      const userIds = data.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      return data.map(r => ({ ...r, profile: profiles?.find(p => p.user_id === r.user_id) || null }));
    },
    enabled: !!groupId,
  });
}

export function useMyGroupJoinRequestCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_join_request_counts', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, byGroup: {} as Record<string, number> };
      const { data: myGroups } = await supabase.from('groups').select('id').eq('created_by', user.id);
      if (!myGroups?.length) return { total: 0, byGroup: {} as Record<string, number> };
      const groupIds = myGroups.map(g => g.id);
      const { data: requests } = await supabase.from('group_join_requests').select('group_id').in('group_id', groupIds).eq('status', 'pending');
      const byGroup: Record<string, number> = {};
      let total = 0;
      requests?.forEach(r => {
        byGroup[r.group_id] = (byGroup[r.group_id] || 0) + 1;
        total++;
      });
      return { total, byGroup };
    },
    enabled: !!user,
  });
}

export function useRequestJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase.from('group_join_requests').insert({ group_id: groupId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['join_requests', v.groupId] }),
  });
}

export function useHasPendingRequest(groupId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending_request', groupId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from('group_join_requests').select('id').eq('group_id', groupId).eq('user_id', user.id).eq('status', 'pending').maybeSingle();
      return !!data;
    },
    enabled: !!groupId && !!user,
  });
}

export function useRespondJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, groupId, userId, accept }: { requestId: string; groupId: string; userId: string; accept: boolean }) => {
      const { error } = await supabase.from('group_join_requests').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', requestId);
      if (error) throw error;
      if (accept) {
        await supabase.from('group_members').insert({ group_id: groupId, user_id: userId });
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['join_requests', v.groupId] });
      qc.invalidateQueries({ queryKey: ['group_members', v.groupId] });
      qc.invalidateQueries({ queryKey: ['my_join_request_counts'] });
    },
  });
}

// ========== UNREAD LISTINGS ==========
export function useUnreadCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['unread_counts', user?.id],
    queryFn: async () => {
      if (!user) return {} as Record<string, number>;
      const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', user.id);
      if (!memberships?.length) return {};
      const groupIds = memberships.map(m => m.group_id);
      const { data: reads } = await supabase.from('group_reads').select('group_id, last_read_at').eq('user_id', user.id);
      const readMap: Record<string, string> = {};
      reads?.forEach(r => { readMap[r.group_id] = r.last_read_at; });
      const { data: listings } = await supabase.from('listings').select('group_id, created_at, user_id').in('group_id', groupIds);
      const counts: Record<string, number> = {};
      listings?.forEach(l => {
        if (l.user_id === user.id) return;
        const lastRead = readMap[l.group_id];
        if (!lastRead || new Date(l.created_at) > new Date(lastRead)) {
          counts[l.group_id] = (counts[l.group_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });
}

export function useMarkGroupRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) return;
      await supabase.from('group_reads').upsert(
        { user_id: user.id, group_id: groupId, last_read_at: new Date().toISOString() },
        { onConflict: 'user_id,group_id' }
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['unread_counts'] }),
  });
}

export function useAddMembersToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userIds }: { groupId: string; userIds: string[] }) => {
      const rows = userIds.map(user_id => ({ group_id: groupId, user_id }));
      const { error } = await supabase.from('group_members').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['group_members', v.groupId] });
      qc.invalidateQueries({ queryKey: ['my_groups'] });
    },
  });
}

// ========== LISTINGS ==========
export function useListings(groupId: string) {
  return useQuery({
    queryKey: ['listings', groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from('listings').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

export function useMyListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_listings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('listings').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      // Dedupe: when an annonce was published in N groups, keep ONE row (the canonical one)
      // canonical = wp_post_id if present, else the title+description+created_at(minute) signature
      const seen = new Map<string, any>();
      const groupCounts = new Map<string, number>();
      for (const l of data) {
        const key = l.wp_post_id ? `wp_${l.wp_post_id}` : `sig_${l.title}_${(l.description || '').slice(0, 80)}_${new Date(l.created_at).toISOString().slice(0, 16)}`;
        groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
        if (!seen.has(key)) seen.set(key, l);
      }
      const unique = Array.from(seen.values());
      const listingIds = unique.map(l => l.id);
      let likes: any[] = [];
      if (listingIds.length) {
        const { data: l2 } = await supabase.from('listing_likes').select('listing_id').in('listing_id', listingIds);
        likes = l2 || [];
      }
      return unique.map(l => {
        const key = l.wp_post_id ? `wp_${l.wp_post_id}` : `sig_${l.title}_${(l.description || '').slice(0, 80)}_${new Date(l.created_at).toISOString().slice(0, 16)}`;
        return {
          ...l,
          like_count: likes.filter(lk => lk.listing_id === l.id).length || 0,
          shared_in_groups: groupCounts.get(key) || 1,
        };
      });
    },
    enabled: !!user,
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listing: { group_id: string; user_id: string; title: string; description: string; images: string[]; zwandako_url?: string }) => {
      if (!listing.description.trim()) throw new Error('La description est obligatoire pour publier sur Zwandako.');
      if (!listing.images?.length) throw new Error('Ajoutez au moins une image pour publier sur Zwandako.');
      let wpPostId: number | null = null;
      let wpMediaIds: number[] | null = null;
      let zwandakoUrl = listing.zwandako_url || null;
      const { data: publishData, error: publishError } = await supabase.functions.invoke('wp-proxy', {
        body: {
          action: 'publish_listing',
          payload: {
            title: listing.title,
            content: listing.description,
            image_urls: listing.images || [],
          },
        },
      });
      if (publishError || !publishData?.ok || publishData?.wp_sync_failed || !publishData?.wp_post_id) {
        throw new Error(publishData?.error || publishError?.message || 'Publication Zwandako impossible. Réessayez.');
      }
      if (publishData?.link) zwandakoUrl = publishData.link;
      wpPostId = publishData?.wp_post_id || null;
      wpMediaIds = publishData?.media_ids || [];
      const { data, error } = await supabase.from('listings').insert({ ...listing, zwandako_url: zwandakoUrl, wp_post_id: wpPostId, wp_media_ids: wpMediaIds } as any).select().single();
      if (error) throw error;
      return { ...data, zwandako_url: zwandakoUrl, wp_post_id: wpPostId, wp_media_ids: wpMediaIds, wp_sync_failed: !wpPostId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['listings', data.group_id] });
      qc.invalidateQueries({ queryKey: ['my_listings'] });
    },
  });
}

// Publishes ONCE on Zwandako, then duplicates the listing locally in every selected group.
export function useCreateMultiGroupListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      group_ids: string[];
      user_id: string;
      title: string;
      description: string;
      images: string[];
      zwandako_url?: string;
    }) => {
      if (!input.description.trim()) throw new Error('La description est obligatoire.');
      if (!input.images?.length) throw new Error('Ajoutez au moins une image.');
      if (!input.group_ids.length) throw new Error('Sélectionnez au moins un groupe.');

      const { data: publishData, error: publishError } = await supabase.functions.invoke('wp-proxy', {
        body: { action: 'publish_listing', payload: { title: input.title, content: input.description, image_urls: input.images } },
      });
      if (publishError || !publishData?.ok || publishData?.wp_sync_failed || !publishData?.wp_post_id) {
        throw new Error(publishData?.error || publishError?.message || 'Publication Zwandako impossible. Vos textes et photos restent ici.');
      }
      const wpPostId = publishData.wp_post_id || null;
      const wpMediaIds = publishData.media_ids || [];
      const zwandakoUrl = publishData.link || null;

      const rows = input.group_ids.map(gid => ({
        group_id: gid,
        user_id: input.user_id,
        title: input.title,
        description: input.description,
        images: input.images,
        zwandako_url: zwandakoUrl,
        wp_post_id: wpPostId,
        wp_media_ids: wpMediaIds,
      }));
      const { error: insertErr } = await supabase.from('listings').insert(rows as any);
      if (insertErr) throw insertErr;

      return {
        zwandako_url: zwandakoUrl as string | null,
        wp_post_id: wpPostId as number | null,
        groups_count: input.group_ids.length,
        wp_sync_failed: false,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_listings'] });
      qc.invalidateQueries({ queryKey: ['listings'] });
      qc.invalidateQueries({ queryKey: ['my_groups'] });
    },
  });
}

export function useUpdateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; images?: string[]; zwandako_url?: string }) => {
      const { data, error } = await supabase.from('listings').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['listings', data.group_id] });
      qc.invalidateQueries({ queryKey: ['my_listings'] });
    },
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listings'] });
      qc.invalidateQueries({ queryKey: ['my_listings'] });
    },
  });
}

// ========== LIKES ==========
export function useListingLikes(listingId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['likes', listingId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('listing_likes').select('*').eq('listing_id', listingId);
      if (error) throw error;
      const liked = user ? data.some(l => l.user_id === user.id) : false;
      return { count: data.length, liked };
    },
    enabled: !!listingId,
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, userId }: { listingId: string; userId: string }) => {
      const { data: existing } = await supabase.from('listing_likes').select('id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle();
      if (existing) {
        await supabase.from('listing_likes').delete().eq('id', existing.id);
        return { liked: false };
      } else {
        await supabase.from('listing_likes').insert({ listing_id: listingId, user_id: userId });
        return { liked: true };
      }
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['likes', v.listingId] }),
  });
}

// ========== FAVORITES ==========
export function useMyFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: favs, error } = await supabase.from('listing_favorites').select('listing_id').eq('user_id', user.id);
      if (error) throw error;
      if (!favs?.length) return [];
      const ids = favs.map(f => f.listing_id);
      const { data: listings } = await supabase.from('listings').select('*').in('id', ids).order('created_at', { ascending: false });
      return listings || [];
    },
    enabled: !!user,
  });
}

export function useIsFavorite(listingId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is_favorite', listingId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from('listing_favorites').select('id').eq('listing_id', listingId).eq('user_id', user.id).maybeSingle();
      return !!data;
    },
    enabled: !!listingId && !!user,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, userId }: { listingId: string; userId: string }) => {
      const { data: existing } = await supabase.from('listing_favorites').select('id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle();
      if (existing) {
        await supabase.from('listing_favorites').delete().eq('id', existing.id);
        return { favorited: false };
      } else {
        await supabase.from('listing_favorites').insert({ listing_id: listingId, user_id: userId });
        return { favorited: true };
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['is_favorite', v.listingId] });
      qc.invalidateQueries({ queryKey: ['my_favorites'] });
    },
  });
}

// ========== PROFILES ==========
export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...updates }: { userId: string; first_name?: string; last_name?: string; phone?: string; email?: string; avatar_url?: string; background_url?: string }) => {
      const { data, error } = await supabase.from('profiles').update(updates).eq('user_id', userId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['profile', v.userId] });
      qc.invalidateQueries({ queryKey: ['all_profiles_carousel'] });
      qc.invalidateQueries({ queryKey: ['all_profiles'] });
    },
  });
}

// ========== IMAGE UPLOAD ==========
export async function uploadListingImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const safeExt = ext && ext.length <= 8 ? ext : 'jpg';
  const unique = `${Date.now()}-${crypto.randomUUID()}`;
  const path = `${userId}/${unique}.${safeExt}`;
  const { error } = await supabase.storage.from('listings').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(path);
  return publicUrl;
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `avatars/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('listings').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(path);
  return publicUrl;
}

export async function uploadBannerImage(file: File): Promise<string> {
  const path = `banners/${Date.now()}.${file.name.split('.').pop()}`;
  const { error } = await supabase.storage.from('listings').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(path);
  return publicUrl;
}

export async function uploadGroupImage(file: File, groupId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `groups/${groupId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('listings').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(path);
  return publicUrl;
}

export async function uploadBackground(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `backgrounds/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('listings').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(path);
  return publicUrl;
}
