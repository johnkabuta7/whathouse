import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Search, MessageSquare, Phone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useMyGroups, useSearchGroups } from '@/hooks/use-data';
import { useRealtimeListings } from '@/hooks/use-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

function useOnlineContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all_profiles_carousel'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data?.filter(p => p.user_id !== user?.id) || [];
    },
    enabled: !!user,
  });
}

export default function Index() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const { data: myGroups, isLoading } = useMyGroups();
  const { data: searchResults } = useSearchGroups(search);
  const { data: contacts } = useOnlineContacts();
  const [selectedContact, setSelectedContact] = useState<any>(null);

  // Activate realtime notifications
  useRealtimeListings();

  const displayGroups = search.trim().length >= 2 ? searchResults : myGroups;
  const isSearching = search.trim().length >= 2;

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

      {/* Contact carousel */}
      {contacts && contacts.length > 0 && !isSearching && (
        <div className="px-3 py-2">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            <Link to="/create-group" className="flex flex-col items-center gap-1 shrink-0">
              <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center border-2 border-dashed border-primary">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Créer</span>
            </Link>
            {contacts.slice(0, 15).map(c => {
              const name = `${c.first_name} ${c.last_name}`.trim() || '?';
              const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
              return (
                <button key={c.user_id} onClick={() => setSelectedContact(c)} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/40">
                    {c.avatar_url ? <img src={c.avatar_url} alt={name} className="h-full w-full object-cover" /> :
                      <span className="text-xs font-bold text-primary">{initials}</span>}
                  </div>
                  <span className="text-[10px] text-foreground font-medium max-w-[56px] truncate">{c.first_name || '?'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Contact modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedContact(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-xs text-center animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="h-24 w-24 rounded-full mx-auto bg-primary/10 flex items-center justify-center overflow-hidden mb-3">
              {selectedContact.avatar_url ? <img src={selectedContact.avatar_url} className="h-full w-full object-cover" /> :
                <span className="text-2xl font-bold text-primary">{`${selectedContact.first_name?.[0] || ''}${selectedContact.last_name?.[0] || ''}`}</span>}
            </div>
            <h3 className="text-lg font-bold text-foreground">{`${selectedContact.first_name} ${selectedContact.last_name}`.trim()}</h3>
            {selectedContact.phone && <p className="text-sm text-muted-foreground">{selectedContact.phone}</p>}
            <div className="flex gap-3 mt-4">
              {selectedContact.phone && (
                <>
                  <a href={`tel:${selectedContact.phone}`} className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl bg-primary text-primary-foreground">
                    <Phone className="h-5 w-5" />
                    <span className="text-xs font-medium">Appeler</span>
                  </a>
                  <a href={`https://wa.me/${selectedContact.phone.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl bg-accent text-accent-foreground">
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-xs font-medium">WhatsApp</span>
                  </a>
                </>
              )}
            </div>
            <button onClick={() => setSelectedContact(null)} className="mt-3 text-sm text-muted-foreground">Fermer</button>
          </div>
        </div>
      )}

      <div className="h-px bg-border" />

      {isSearching && <p className="px-4 py-2 text-xs font-semibold text-muted-foreground">Résultats de recherche</p>}

      {/* Group list */}
      {(!displayGroups || displayGroups.length === 0) ? (
        <div className="text-center py-16 px-4">
          <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">{isSearching ? 'Aucun groupe trouvé' : 'Aucun groupe'}</p>
          <p className="text-xs text-muted-foreground mt-1">{isSearching ? 'Essayez un autre nom' : 'Créez votre premier groupe immobilier'}</p>
          {!isSearching && (
            <Link to="/create-group" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold shadow-md hover:opacity-90 transition">
              <Plus className="h-4 w-4" />Créer un groupe
            </Link>
          )}
        </div>
      ) : (
        <div>
          {displayGroups.map(group => (
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

      {/* FAB */}
      {myGroups && myGroups.length > 0 && !isSearching && (
        <Link to="/create-group" className="fixed bottom-20 right-4 h-14 w-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition z-40">
          <MessageSquare className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}
