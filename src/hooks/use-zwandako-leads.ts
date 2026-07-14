import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ZwandakoLead = {
  lead_id: number;
  intent: string; // 'rent' | 'buy' | 'sell' | 'other'
  intent_label?: string;
  intent_other?: string | null;
  province_label?: string;
  city_label?: string;
  area_label?: string;
  neighborhood?: string | null;
  property_type_label?: string;
  budget_usd_min?: number | null;
  budget_usd_max?: number | null;
  budget_negotiable?: boolean;
  urgency?: boolean;
  discreet?: boolean;
  message?: string;
  created_at?: string;
  created_at_display?: string;
  status_label?: string;
  badges?: Array<{ key: string; label: string; tone?: string }>;
};

export function useZwandakoLeads(perPage = 40, enabled = true) {
  return useQuery({
    queryKey: ['zwandako_leads', perPage],
    queryFn: async (): Promise<ZwandakoLead[]> => {
      const { data, error } = await supabase.functions.invoke('wp-proxy', {
        body: { action: 'list_leads', payload: { per_page: perPage } },
      });
      if (error) return [];
      return (data?.items || []) as ZwandakoLead[];
    },
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function leadPrice(l: ZwandakoLead): string {
  const min = l.budget_usd_min;
  const max = l.budget_usd_max;
  if (min && max && min !== max) return `${min.toLocaleString('fr-FR')} - ${max.toLocaleString('fr-FR')} $`;
  if (max) return `${max.toLocaleString('fr-FR')} $`;
  if (min) return `${min.toLocaleString('fr-FR')} $`;
  return '—';
}

export function leadTitle(l: ZwandakoLead): string {
  const parts = [l.property_type_label, l.intent_label].filter(Boolean);
  return parts.join(' · ') || 'Demande immobilière';
}

export function leadCity(l: ZwandakoLead): string {
  return [l.area_label, l.city_label].filter(Boolean).join(', ') || l.province_label || '—';
}

export function leadTxType(l: ZwandakoLead): 'acheter' | 'louer' | 'vendre' | 'autre' {
  if (l.intent === 'buy') return 'acheter';
  if (l.intent === 'rent') return 'louer';
  if (l.intent === 'sell') return 'vendre';
  return 'autre';
}
