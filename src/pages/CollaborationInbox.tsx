import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Loader2, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export function useIncomingCollabRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['incoming_collab_reqs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: reqs } = await supabase
        .from('collaboration_requests')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      const ids = (reqs || []).map((r: any) => r.from_user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase.from('profiles').select('user_id, first_name, last_name, avatar_url').in('user_id', ids);
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (reqs || []).map((r: any) => ({ ...r, profile: map.get(r.from_user_id) }));
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });
}

export default function CollaborationInbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useIncomingCollabRequests();

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('collab_inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collaboration_requests', filter: `to_user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['incoming_collab_reqs'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const accept = async (id: string) => {
    const { error } = await supabase.rpc('accept_collaboration_request', { _request_id: id });
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Demande acceptée — contact ajouté' });
      qc.invalidateQueries({ queryKey: ['incoming_collab_reqs'] });
      qc.invalidateQueries({ queryKey: ['repertoire'] });
    }
  };
  const reject = async (id: string) => {
    const { error } = await supabase.from('collaboration_requests').update({ status: 'rejected' }).eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Demande refusée' }); qc.invalidateQueries({ queryKey: ['incoming_collab_reqs'] }); }
  };

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto min-h-full animate-fade-in">
      <header className="sticky top-0 z-50 bg-card border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold flex-1 text-foreground">Demandes de collaboration</h1>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-16 px-6">
          <Users className="h-14 w-14 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Aucune demande</p>
          <p className="text-xs text-muted-foreground mt-1">Les nouvelles demandes apparaîtront ici.</p>
        </div>
      ) : (
        <div className="py-2">
          {data.map((r: any) => {
            const p = r.profile || {};
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilisateur';
            const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="h-11 w-11 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center overflow-hidden shrink-0">
                  {p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                  <p className="text-[11px] text-muted-foreground">souhaite collaborer</p>
                </div>
                <Button size="sm" onClick={() => accept(r.id)} className="h-8 rounded-full bg-primary text-primary-foreground text-xs">
                  <Check className="h-3.5 w-3.5" />Accepter
                </Button>
                <Button size="sm" variant="outline" onClick={() => reject(r.id)} className="h-8 rounded-full text-xs">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
