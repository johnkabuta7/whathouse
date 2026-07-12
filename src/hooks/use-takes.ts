import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type TakeNotification = {
  id: string;
  listing_id: string;
  owner_id: string;
  taker_id: string;
  listing_title: string | null;
  listing_image: string | null;
  created_at: string;
  taker?: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
};

export async function recordListingTake(params: {
  listingId: string;
  ownerId: string;
  takerId: string;
  title?: string | null;
  image?: string | null;
}) {
  if (!params.ownerId || params.ownerId === params.takerId) return;
  try {
    await supabase.from('listing_takes').insert({
      listing_id: params.listingId,
      owner_id: params.ownerId,
      taker_id: params.takerId,
      listing_title: params.title || null,
      listing_image: params.image || null,
    });
  } catch { /* unique conflict OK */ }
}

export function useMyTakeNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['listing_takes', user?.id],
    queryFn: async (): Promise<TakeNotification[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from('listing_takes')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      const rows = (data || []) as any[];
      const takerIds = Array.from(new Set(rows.map(r => r.taker_id)));
      if (takerIds.length === 0) return rows as TakeNotification[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone, avatar_url')
        .in('user_id', takerIds);
      const byId = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return rows.map(r => ({ ...r, taker: byId.get(r.taker_id) || null })) as TakeNotification[];
    },
    enabled: !!user,
  });
}

export function useRealtimeTakeNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`takes-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'listing_takes',
        filter: `owner_id=eq.${user.id}`,
      }, (payload) => {
        qc.invalidateQueries({ queryKey: ['listing_takes', user.id] });
        const t = payload.new as any;
        toast({ title: '🤝 Annonce prise', description: t.listing_title || 'Un agent a pris votre annonce' });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc, toast]);
}
