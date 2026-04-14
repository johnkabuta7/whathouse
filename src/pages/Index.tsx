import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Clock, Search, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/use-data';

export default function Index() {
  const { user } = useAuth();
  const { data: groups, isLoading } = useGroups();
  const [search, setSearch] = useState('');

  const filtered = groups?.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-[72px] rounded-none" />)}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un groupe..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Group carousel */}
      {filtered && filtered.length > 0 && (
        <div className="px-3 py-2">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            <Link to="/create-group" className="flex flex-col items-center gap-1 shrink-0">
              <div className="h-14 w-14 rounded-full bg-secondary/20 flex items-center justify-center border-2 border-dashed border-secondary">
                <Plus className="h-6 w-6 text-secondary" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Créer</span>
            </Link>
            {filtered.slice(0, 10).map(group => (
              <Link key={group.id} to={`/group/${group.id}`} className="flex flex-col items-center gap-1 shrink-0">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-secondary/50">
                  {group.image_url ? (
                    <img src={group.image_url} alt={group.name} className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-5 w-5 text-primary" />
                  )}
                </div>
                <span className="text-[10px] text-foreground font-medium max-w-[56px] truncate">{group.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="h-px bg-border" />

      {/* Group list (WhatsApp style) */}
      {(!filtered || filtered.length === 0) ? (
        <div className="text-center py-16 px-4">
          <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Aucun groupe</p>
          <p className="text-xs text-muted-foreground mt-1">Créez votre premier groupe immobilier</p>
          <Link to="/create-group" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-full text-sm font-semibold shadow-md hover:opacity-90 transition">
            <Plus className="h-4 w-4" />Créer un groupe
          </Link>
        </div>
      ) : (
        <div>
          {filtered.map(group => (
            <Link key={group.id} to={`/group/${group.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {group.image_url ? (
                  <img src={group.image_url} alt={group.name} className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0 border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground truncate">{group.name}</p>
                  <p className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {new Date(group.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{group.description || 'Groupe immobilier'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* FAB create group */}
      {filtered && filtered.length > 0 && (
        <Link to="/create-group" className="fixed bottom-20 right-4 h-14 w-14 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition z-40">
          <MessageSquare className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}
