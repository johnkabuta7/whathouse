import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type MyLead = any;

export function useZwandakoAccess() {
  return useQuery({
    queryKey: ['zwandako_access'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('wp-proxy', { body: { action: 'me_access' } });
      return data?.access || null;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMyZwandakoLeads() {
  return useQuery({
    queryKey: ['zwandako_my_leads'],
    queryFn: async (): Promise<MyLead[]> => {
      const { data } = await supabase.functions.invoke('wp-proxy', { body: { action: 'list_my_leads', per_page: 50 } });
      return (data?.items || []) as MyLead[];
    },
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
}

export function useTakeLead() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (lead_id: number) => {
      const { data, error } = await supabase.functions.invoke('wp-proxy', { body: { action: 'take_lead', lead_id } });
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
      const { data, error } = await supabase.functions.invoke('wp-proxy', { body: { action: 'mark_contacted', lead_id, status, reason } });
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
