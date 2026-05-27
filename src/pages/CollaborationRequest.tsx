import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Send, Loader2, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { normalizeSearch } from '@/hooks/use-data';

export default function CollaborationRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['all_profiles_for_collab'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .order('created_at', { ascending: false })
        .limit(1000);
      return (data || []).filter(p => p.user_id !== user?.id);
    },
    enabled: !!user,
  });

  const { data: existingReqs } = useQuery({
    queryKey: ['my_sent_collab_reqs', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('collaboration_requests').select('to_user_id, status').eq('from_user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });
  const sentMap = useMemo(() => new Map((existingReqs || []).map((r: any) => [r.to_user_id, r.status])), [existingReqs]);

  const q = normalizeSearch(search);
  const filtered = (profiles || []).filter(p =>
    !q || normalizeSearch(`${p.first_name || ''} ${p.last_name || ''}`).includes(q)
  );

  const toggle = (id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const sendRequests = async () => {
    if (!user || selected.size === 0) return;
    setSending(true);
    try {
      const rows = Array.from(selected).map(to => ({ from_user_id: user.id, to_user_id: to, status: 'pending' }));
      const { error } = await supabase.from('collaboration_requests').upsert(rows, { onConflict: 'from_user_id,to_user_id' });
      if (error) throw error;
      toast({ title: `${rows.length} demande(s) envoyée(s)` });
      qc.invalidateQueries({ queryKey: ['my_sent_collab_reqs'] });
      navigate(-1);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setSending(false); }
  };

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto min-h-full animate-fade-in pb-24">
      <header className="sticky top-0 z-50 bg-card border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold flex-1 text-foreground">Demande de collaboration</h1>
        </div>
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..."
              className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
      ) : (
        <div className="py-2">
          <p className="px-4 py-2 text-[11px] text-muted-foreground">{filtered.length} utilisateur(s) · {selected.size} sélectionné(s)</p>
          {filtered.map(p => {
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilisateur';
            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
            const isSel = selected.has(p.user_id);
            const status = sentMap.get(p.user_id);
            return (
              <button key={p.user_id} onClick={() => !status && toggle(p.user_id)} disabled={!!status}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${isSel ? 'bg-primary/10' : 'hover:bg-muted/50'} ${status ? 'opacity-60' : ''}`}>
                <Checkbox checked={isSel} className="pointer-events-none" />
                <div className="h-11 w-11 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center overflow-hidden shrink-0">
                  {p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                </div>
                {status === 'pending' && <span className="text-[10px] text-muted-foreground">en attente</span>}
                {status === 'accepted' && <span className="text-[10px] text-success flex items-center gap-1"><Check className="h-3 w-3" />ami</span>}
              </button>
            );
          })}
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg lg:max-w-md px-4">
          <Button onClick={sendRequests} disabled={sending}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground shadow-2xl">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer la demande de collaboration ({selected.size})
          </Button>
        </div>
      )}
    </div>
  );
}
