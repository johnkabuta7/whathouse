import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ===== PROPERTIES =====
export function useProperties() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAddProperty() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; address: string; type: string; monthly_rent: number }) => {
      const { data, error } = await supabase
        .from('properties')
        .insert({ ...input, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}

// ===== TENANT ASSIGNMENTS =====
export function useTenantAssignments(propertyId?: string) {
  return useQuery({
    queryKey: ['tenant_assignments', propertyId],
    queryFn: async () => {
      let query = supabase.from('tenant_assignments').select('*, profiles:tenant_id(first_name, last_name, phone, user_id)');
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}

// ===== PAYMENTS =====
export function usePayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, properties:property_id(name), tenant_profile:tenant_id(first_name, last_name), owner_profile:owner_id(first_name, last_name)')
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; amount?: number; transfer_status?: string; payment_date?: string }) => {
      const { error } = await supabase.from('payments').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { property_id: string; tenant_id: string; owner_id: string; amount: number; total_amount: number; month_label: string; status?: string; due_date?: string }) => {
      const { data, error } = await supabase.from('payments').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}

// ===== DOCUMENTS =====
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, properties:property_id(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ file, name, category, propertyId }: { file: File; name: string; category: string; propertyId?: string }) => {
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

      const sizeKB = file.size / 1024;
      const fileSize = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${Math.round(sizeKB)} KB`;

      const { data, error } = await supabase.from('documents').insert({
        name,
        category,
        file_url: publicUrl,
        file_size: fileSize,
        property_id: propertyId || null,
        uploaded_by: user!.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

// ===== CONVERSATIONS & MESSAGES =====
export function useConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, p1:participant_1(first_name, last_name, user_id), p2:participant_2(first_name, last_name, user_id)')
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:sender_id(first_name, last_name)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content, senderId }: { conversationId: string; content: string; senderId: string }) => {
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        content,
        sender_id: senderId,
      });
      if (msgError) throw msgError;

      await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      }).eq('id', conversationId);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['messages', vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// ===== NOTIFICATIONS =====
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ===== PROFILES =====
export function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_roles(role)');
      if (error) throw error;
      return data;
    },
  });
}

// ===== DASHBOARD STATS =====
export function useDashboardStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard_stats', user?.id],
    queryFn: async () => {
      const { data: payments } = await supabase.from('payments').select('status, amount, total_amount, transfer_status');
      if (!payments) return { paid: 0, pending: 0, late: 0, totalRevenue: 0, totalCollected: 0, totalEncaisse: 0, enAttente: 0, transfere: 0 };

      const paid = payments.filter(p => p.status === 'paid').length;
      const pending = payments.filter(p => p.status === 'pending').length;
      const late = payments.filter(p => p.status === 'late').length;
      const totalRevenue = payments.reduce((s, p) => s + Number(p.total_amount), 0);
      const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
      const totalEncaisse = payments.reduce((s, p) => s + Number(p.amount), 0);
      const enAttente = payments.filter(p => p.transfer_status === 'en_attente').reduce((s, p) => s + Number(p.amount), 0);
      const transfere = payments.filter(p => p.transfer_status === 'transfere').reduce((s, p) => s + Number(p.amount), 0);

      return { paid, pending, late, totalRevenue, totalCollected, totalEncaisse, enAttente, transfere };
    },
    enabled: !!user,
  });
}
