import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Real notification sounds (short sine wave beeps generated as valid WAV)
function generateTone(freq: number, duration: number, volume: number): AudioBuffer | null {
  try {
    const ctx = new AudioContext();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.min(1, (length - i) / (sampleRate * 0.05)) * Math.min(1, i / (sampleRate * 0.01));
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * volume;
    }
    return buffer;
  } catch {
    return null;
  }
}

function playNotificationSound(type: string, volume: number) {
  try {
    const ctx = new AudioContext();
    const vol = volume / 100;
    
    const frequencies: Record<string, number[]> = {
      default: [880, 1100],
      chime: [523, 659, 784],
      bell: [1200, 900],
    };
    
    const freqs = frequencies[type] || frequencies.default;
    freqs.forEach((freq, i) => {
      const buffer = generateTone(freq, 0.15, vol);
      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(ctx.currentTime + i * 0.18);
      }
    });
  } catch {}
}

export function useNotificationSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notification_settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('notification_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (!data) {
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

export function usePlayTestSound() {
  const { data: settings } = useNotificationSettings();
  return () => {
    const soundType = settings?.sound_type || 'default';
    const volume = settings?.volume ?? 80;
    playNotificationSound(soundType, volume);
  };
}

export function useRealtimeListings() {
  const { user } = useAuth();
  const { data: settings } = useNotificationSettings();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('new-listings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, (payload) => {
        const listing = payload.new as any;
        if (listing.user_id === user.id) return;

        toast({ title: '🏠 Nouvelle annonce', description: listing.title });

        if (settings?.sound_enabled !== false) {
          playNotificationSound(settings?.sound_type || 'default', settings?.volume ?? 80);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, settings]);
}

export function useRealtimeJoinRequests() {
  const { user } = useAuth();
  const { data: settings } = useNotificationSettings();
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('new-join-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_join_requests' }, (payload) => {
        const request = payload.new as any;
        // Refresh join request counts
        qc.invalidateQueries({ queryKey: ['my_join_request_counts'] });
        qc.invalidateQueries({ queryKey: ['join_requests'] });

        toast({ title: '👤 Nouvelle demande', description: "Quelqu'un veut rejoindre votre groupe" });

        if (settings?.sound_enabled !== false) {
          playNotificationSound(settings?.sound_type || 'default', settings?.volume ?? 80);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, settings]);
}
