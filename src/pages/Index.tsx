import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, Search, Phone, MessageSquare, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useMyGroups, useSearchGroups, useSliderBanners, useIsAppAdmin, useAllGroups, useMyGroupJoinRequestCounts } from '@/hooks/use-data';
import { useRealtimeListings, useRealtimeJoinRequests } from '@/hooks/use-notifications';
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

function useUnreadCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['unread_counts', user?.id],
    queryFn: async () => {
      // Track unread by comparing listing count vs last seen
      // For now, return empty - will be updated via realtime
      return {} as Record<string, number>;
    },
    enabled: !!user,
  });
}

function SliderBanner() {
  const { data: banners } = useSliderBanners();
  const [current, setCurrent] = useState(0);

  const defaultBanners = [
    { id: '1', image_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=200&fit=crop', link_url: null },
    { id: '2', image_url: 'https://images.unsplash.com/photo-1582407947092-987bce739e14?w=800&h=200&fit=crop', link_url: null },
    { id: '3', image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=200&fit=crop', link_url: null },
  ];

  const slides = banners && banners.length > 0 ? banners : defaultBanners;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrent(p => (p + 1) % slides.length), 3000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative w-full h-[80px] overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-500 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
        {slides.map((_, i) => (
          <div key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === current ? 'bg-primary' : 'bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
}

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { data: myGroups, isLoading } = useMyGroups();
  const { data: searchResults } = useSearchGroups(search);
  const { data: contacts } = useOnlineContacts();
  const { data: isAdmin } = useIsAppAdmin();
  const { data: allGroups } = useAllGroups();
  const { data: requestCounts } = useMyGroupJoinRequestCounts();
  const [selectedContact, setSelectedContact] = useState<any>(null);

  useRealtimeListings();
  useRealtimeJoinRequests();

  const isSearching = search.trim().length >= 2;
  const displayGroups = isSearching ? searchResults : (isAdmin ? allGroups : myGroups);
  const totalRequests = requestCounts?.total || 0;

  // Find first group with pending requests for bell click
  const handleBellClick = () => {
    if (!requestCounts?.byGroup) return;
    const groupIds = Object.keys(requestCounts.byGroup).filter(id => requestCounts.byGroup[id] > 0);
    if (groupIds.length > 0) {
      navigate(`/group/${groupIds[0]}/members`);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-[72px] rounded-none" />)}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/60 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold flex-1 text-foreground">Pro Immobilier</h1>
          <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 rounded-full hover:bg-muted transition">
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>
          <button onClick={handleBellClick} className="relative p-1.5 rounded-full hover:bg-muted transition">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {totalRequests > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center px-1">
                {totalRequests}
              </span>
            )}
          </button>
        </div>
        {showSearch && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un groupe..."
                className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

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

      {/* Slider banner - full width, no padding, no border radius */}
      {!isSearching && <SliderBanner />}

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
          {displayGroups.map(group => {
            const reqCount = requestCounts?.byGroup[group.id] || 0;
            return (
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
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {reqCount > 0 && (
                        <span className="h-5 min-w-[20px] rounded-full bg-green-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
                          {reqCount > 999 ? '999+' : reqCount}
                        </span>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(group.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{group.description || 'Groupe immobilier'}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* FAB */}
      {!isSearching && (
        <Link to="/create-group" className="fixed bottom-20 right-4 h-14 w-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition z-40">
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}
