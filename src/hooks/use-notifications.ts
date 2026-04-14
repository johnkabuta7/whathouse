import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const SOUNDS: Record<string, string> = {
  default: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+Jk5WHc2dxa4KSjYF1a3B3hI+KgHVscnmEjYh+dW50eoOKh351bnd8goiGfnZueH2Bh4V+d294fYGFg350bnh+gYSCf3dweX+BhIJ/eHF5f4GDgX54cXl/gYOBfnhxeX+Bg4F+eHF5f4GDgX54cXl/gYOBfnhxeX+Bg4F+eHF5f4GDgX54cXl/gYOBfnhxeX+Bg4F+',
  chime: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+Jk5WHc2dxa4KSjYF1a3B3hI+Kf3VscnmEjYh+dW50eoOKh351bnd8goiGfnZueH2Bh4V+d294fYGFg350bnh+gYSCf3dweX+BhIJ/eHF5f4GDgX54cXl/gYOBfnhxeX+Bg4F+eHF5f4GDgX54cXl/gYOBfnhxeX+Bg4F+eHF5f4GDgX54cXl/gYOBfnhxeX+Bg4F+',
  bell: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+Jk5WHc2dxa4KSjYF1a3B3hI+Kf3VscnmDjYh+dW50eoOKh351bnd8goiGfnZueH2Bh4V+d294fYGFg350bnh+gYSCf3dweX+BhIJ/eHF5f4GDgX54cXl/gYOBfnhxeX+Bg4F+eHF5f4GDgX54cXl/gYOBfnhxeX+Bg4F+eHF5f4GDgX54cXl/gYOBfnhxeX+Bg4F+',
};

export function useNotificationSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notification_settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('notification_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (!data) {
        // Create default settings
        const { data: newData } = await supabase.from('notification_settings').insert({ user_id: user.id }).select().single();
        return newData;
      }
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...updates }: { userId: string; sound_enabled?: boolean; sound_type?: string; volume?: number }) => {
      const { data, error } = await supabase.from('notification_settings').update(updates).eq('user_id', userId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['notification_settings', v.userId] }),
  });
}

export function useRealtimeListings() {
  const { user } = useAuth();
  const { data: settings } = useNotificationSettings();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('new-listings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, (payload) => {
        const listing = payload.new as any;
        if (listing.user_id === user.id) return;

        toast({ title: '🏠 Nouvelle annonce', description: listing.title });

        if (settings?.sound_enabled !== false) {
          try {
            const soundKey = settings?.sound_type || 'default';
            const audio = new Audio(SOUNDS[soundKey] || SOUNDS.default);
            audio.volume = (settings?.volume ?? 80) / 100;
            audio.play().catch(() => {});
          } catch {}
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, settings]);
}
