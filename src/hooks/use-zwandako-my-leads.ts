import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type MyLead = any;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

export function useZwandakoAccess(enabled = true) {
  return useQuery({
    queryKey: ['zwandako_access'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      if (!headers) return null;
      const { data, error } = await supabase.functions.invoke('wp-proxy', {
        body: { action: 'me_access', payload: {} },
        headers,
      });
      if (error || data?.ok === false) return null;
      return data?.access || null;
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMyZwandakoLeads(enabled = true) {
  return useQuery({
    queryKey: ['zwandako_my_leads'],
    queryFn: async (): Promise<MyLead[]> => {
      const headers = await getAuthHeaders();
      if (!headers) return [];
      const { data, error } = await supabase.functions.invoke('wp-proxy', {
        body: { action: 'list_my_leads', payload: { per_page: 50 } },
        headers,
      });
      if (error || data?.ok === false) return [];
      return (data?.items || []) as MyLead[];
    },
    enabled,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
}

export function useTakeLead() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (lead_id: number) => {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error('Connexion requise.');
      const { data, error } = await supabase.functions.invoke('wp-proxy', {
        body: { action: 'take_lead', payload: { lead_id } },
        headers,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Erreur de prise');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Demande prise', description: 'Retrouvez-la dans « Mes demandes ».' });
      qc.invalidateQueries({ queryKey: ['zwandako_my_leads'] });
      qc.invalidateQueries({ queryKey: ['zwandako_access'] });
      qc.invalidateQueries({ queryKey: ['zwandako_leads'] });
    },
    onError: (e: any) => {
      toast({ title: 'Impossible de prendre', description: e?.message || 'Réessayez.', variant: 'destructive' });
    },
  });
}

export function useMarkContacted() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ lead_id, status = 'contacted', reason }: { lead_id: number; status?: string; reason?: string }) => {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error('Connexion requise.');
      const { data, error } = await supabase.functions.invoke('wp-proxy', {
        body: { action: 'mark_contacted', payload: { lead_id, status, reason } },
        headers,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Erreur');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Marquée comme contactée' });
      qc.invalidateQueries({ queryKey: ['zwandako_my_leads'] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e?.message, variant: 'destructive' }),
  });
}
