import { useState } from 'react';
import { Search, UserPlus, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

function useAllProfiles() {
  return useQuery({
    queryKey: ['all_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export default function Contacts() {
  const { user } = useAuth();
  const { data: profiles, isLoading } = useAllProfiles();
  const [search, setSearch] = useState('');

  const others = profiles?.filter(p => p.user_id !== user?.id);
  const filtered = others?.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un contact..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-none" />)}
        </div>
      ) : (!filtered || filtered.length === 0) ? (
        <div className="text-center py-16">
          <UserPlus className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Aucun contact trouvé</p>
          <p className="text-xs text-muted-foreground mt-1">Les utilisateurs inscrits apparaîtront ici</p>
        </div>
      ) : (
        <div>
          <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {filtered.length} contact{filtered.length > 1 ? 's' : ''} sur Groupe Immo
          </p>
          {filtered.map(p => {
            const name = `${p.first_name} ${p.last_name}`.trim() || 'Utilisateur';
            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
            return (
              <div key={p.user_id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover rounded-full" /> : initials}
                </div>
                <div className="flex-1 min-w-0 border-b border-border pb-3">
                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                  {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
