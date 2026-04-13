import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ========== GROUPS ==========
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

// ========== GROUP MEMBERS ==========
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ['group_members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from('group_members').select('*').eq('group_id', groupId);
      if (error) throw error;
      // Fetch profiles for each member
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

// ========== LISTINGS ==========
export function useListings(groupId: string) {
  return useQuery({
    queryKey: ['listings', groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from('listings').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
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
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listing: { group_id: string; user_id: string; title: string; description: string; images: string[]; zwandako_url?: string }) => {
      const { data, error } = await supabase.from('listings').insert(listing).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['listings', data.group_id] });
      qc.invalidateQueries({ queryKey: ['my_listings'] });
    },
  });
}

export function useUpdateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; images?: string[] }) => {
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

// ========== PROFILES ==========
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...updates }: { userId: string; first_name?: string; last_name?: string; phone?: string; avatar_url?: string }) => {
      const { data, error } = await supabase.from('profiles').update(updates).eq('user_id', userId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['profile', v.userId] }),
  });
}

// ========== IMAGE UPLOAD ==========
export async function uploadListingImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('listings').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(path);
  return publicUrl;
}
