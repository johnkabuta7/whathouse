import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, MoreVertical, Plus, Download, Settings, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { SelectGroupModal } from '@/components/SelectGroupModal';
import { InstallPrompt } from '@/components/InstallPrompt';

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
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const others = profiles?.filter(p => p.user_id !== user?.id);
  const filtered = others?.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

  const startLongPress = (userId: string) => {
    const timer = setTimeout(() => {
      setSelecting(true);
      setSelected([userId]);
    }, 500);
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };

  const toggleSelect = (userId: string) => {
    if (selecting) {
      setSelected(p => p.includes(userId) ? p.filter(id => id !== userId) : [...p, userId]);
    } else {
      navigate(`/contact/${userId}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/60 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold flex-1 text-foreground">Contacts</h1>
          <button className="p-1.5 rounded-full hover:bg-muted transition">
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>
          <button className="p-1.5 rounded-full hover:bg-muted transition">
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un contact..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {selecting && (
        <div className="px-4 py-2 bg-primary/10 flex items-center gap-3">
          <p className="text-xs font-medium text-primary flex-1">{selected.length} sélectionné(s)</p>
          <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => { setSelecting(false); setSelected([]); }}>Annuler</Button>
          <Button size="sm" className="rounded-full text-xs bg-primary text-primary-foreground" onClick={() => navigate('/create-group')}>
            <UserPlus className="h-3 w-3 mr-1" />Ajouter au groupe
          </Button>
        </div>
      )}

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
            {filtered.length} contact{filtered.length > 1 ? 's' : ''} sur l'application
          </p>
          {filtered.map(p => {
            const name = `${p.first_name} ${p.last_name}`.trim() || 'Utilisateur';
            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
            const isSelected = selected.includes(p.user_id);
            return (
              <div
                key={p.user_id}
                onClick={() => toggleSelect(p.user_id)}
                onMouseDown={() => startLongPress(p.user_id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(p.user_id)}
                onTouchEnd={cancelLongPress}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
              >
                <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                  {isSelected ? '✓' : p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover rounded-full" /> : initials}
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
