import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, Search, Phone, MessageSquare, Bell, Download, MoreVertical, UserPlus, Settings, Share2, X, PenSquare, MapPin, Zap, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useMyGroups, useSearchGroups, useSliderBanners, useIsAppAdmin, useAllGroups, useMyGroupJoinRequestCounts, useUnreadCounts, normalizeSearch } from '@/hooks/use-data';
import { useRealtimeListings, useRealtimeJoinRequests } from '@/hooks/use-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useZwandakoLeads, leadTitle, leadCity, leadPrice, leadTxType } from '@/hooks/use-zwandako-leads';
import { getHomeGroupIds } from '@/hooks/use-home-groups';


function normPhone(p: string): string {
  if (!p) return '';
  const digits = p.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return '+' + digits.slice(1).replace(/[^0-9]/g, '');
  return digits.replace(/^00/, '+');
}

function useOnlineContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['repertoire_carousel', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Only show contacts the user has imported & confirmed
      const { data: imported } = await supabase
        .from('imported_contacts')
        .select('contact_phone')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');
      const phones = (imported || []).map((i: any) => i.contact_phone);
      if (phones.length === 0) return [];
      const { data: profiles } = await supabase.from('profiles').select('user_id, first_name, last_name, phone, avatar_url, background_url, account_type, ghost_mode').in('phone', phones);
      const others = (profiles || []).filter((p: any) => p.user_id !== user.id);
      const userIds = others.map((p: any) => p.user_id).filter(Boolean);
      const { data: sessions } = userIds.length
        ? await supabase.rpc('get_online_status' as any, { _user_ids: userIds })
        : { data: [] as any[] };
      const cutoff = Date.now() - 60 * 1000;
      const onlineSet = new Set(
        (sessions as any[] | null)
          ?.filter((s: any) => new Date(s.updated_at).getTime() > cutoff)
          .map((s: any) => s.user_id) || []
      );
      const withStatus = others.map((p: any) => ({ ...p, online: p.ghost_mode ? false : onlineSet.has(p.user_id) }));
      // Sort: online contacts first
      withStatus.sort((a: any, b: any) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
      return withStatus;
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
}

function useNewSignupsCount() {
  return useQuery({
    queryKey: ['new_signups_count'],
    queryFn: async () => {
      // New = profile created in the last 7 days
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', since);
      return count || 0;
    },
    refetchInterval: 60_000,
  });
}

function SliderBanner() {
  const { data: banners } = useSliderBanners();
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // No default banners — only admin-managed slider banners are shown.

  const slides = banners || [];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrent(p => (p + 1) % slides.length), 3000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goTo = (direction: 1 | -1) => {
    setCurrent(p => (p + direction + slides.length) % slides.length);
  };

  const handleTouchEnd = (x: number) => {
    if (touchStart === null || slides.length <= 1) return;
    const delta = touchStart - x;
    if (Math.abs(delta) > 35) goTo(delta > 0 ? 1 : -1);
    setTouchStart(null);
  };

  if (slides.length === 0) return null;
  return (
    <div
      data-no-swipe
      className="relative w-full h-[100px] lg:h-[260px] lg:rounded-2xl lg:mt-3 lg:mb-2 overflow-hidden touch-pan-y"
      onTouchStart={e => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={e => handleTouchEnd(e.changedTouches[0].clientX)}
    >
      {slides.map((slide: any, i) => (
        <div key={slide.id} className={`absolute inset-0 transition-opacity duration-500 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
          <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
          {slide.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent px-3 pt-6 pb-3">
              <p className="text-background text-xs font-semibold drop-shadow line-clamp-2">{slide.caption}</p>
            </div>
          )}
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

function useFeaturedProperties() {
  return useQuery({
    queryKey: ['wp_featured_properties'],
    queryFn: async () => {
      try {
        const res = await fetch('https://zwandako.com/wp-json/wp/v2/properties?_embed&per_page=10&orderby=date&order=desc');
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useSearchProperties(search: string) {
  return useQuery({
    queryKey: ['wp_search_properties', search],
    queryFn: async () => {
      try {
        const res = await fetch(`https://zwandako.com/wp-json/wp/v2/properties?_embed&per_page=20&search=${encodeURIComponent(search)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: search.trim().length >= 2,
    staleTime: 60 * 1000,
  });
}

function FeaturedProperties() {
  const { data: properties, isLoading } = useFeaturedProperties();

  if (isLoading) {
    return (
      <div className="px-3 py-3">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-44 rounded-2xl shrink-0" />)}
        </div>
      </div>
    );
  }

  if (!properties || properties.length === 0) return null;

  return (
    <div className="py-3" data-no-swipe>
      <div className="px-4 flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">À la une sur Zwandako</h2>
        <a href="https://zwandako.com" target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-primary">Voir tout →</a>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-3 pb-1">
        {properties.map((p: any) => {
          const img = p._embedded?.['wp:featuredmedia']?.[0]?.source_url
            || p.jetpack_featured_media_url
            || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop';
          const title = p.title?.rendered?.replace(/<[^>]+>/g, '') || 'Propriété';
          const author = p._embedded?.author?.[0]?.name || p.author_name || 'Auteur Zwandako';
          return (
            <a key={p.id} href={p.link} target="_blank" rel="noopener noreferrer"
              className="shrink-0 w-44 overflow-hidden bg-card border border-border shadow-md hover:shadow-lg transition">
              <div className="h-28 w-full overflow-hidden bg-muted">
                <img src={img} alt={title} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{title}</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-1 truncate">Par {author}</p>
                <p className="text-[10px] text-primary font-bold mt-1">Voir l'annonce →</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function useConseils() {
  return useQuery({
    queryKey: ['zwandako_conseils'],
    queryFn: async () => {
      try {
        const res = await fetch('https://zwandako.com/wp-json/wp/v2/posts?_embed&per_page=15&categories=840&orderby=date&order=desc');
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch { return []; }
    },
    staleTime: 5 * 60 * 1000,
  });
}

function PostImmobilierCarousel() {
  const { data: posts, isLoading } = useConseils();
  if (isLoading) {
    return (
      <div className="py-3">
        <div className="px-4 mb-2"><Skeleton className="h-4 w-40" /></div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-56 rounded-2xl shrink-0" />)}
        </div>
      </div>
    );
  }
  if (!posts || posts.length === 0) return null;
  return (
    <div className="py-3" data-no-swipe>
      <div className="px-4 flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Post Immobilier</h2>
        <a href="https://zwandako.com/conseil-sur-limmobilier-en-rdc/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-primary">Voir tout →</a>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-3 pb-1">
        {posts.map((p: any) => {
          const img = p._embedded?.['wp:featuredmedia']?.[0]?.source_url || p.jetpack_featured_media_url;
          const title = (p.title?.rendered || '').replace(/<[^>]+>/g, '');
          const excerpt = (p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').trim();
          return (
            <a
              key={p.id}
              href={p.link}
              target="_blank" rel="noopener noreferrer"
              className="shrink-0 w-56 overflow-hidden bg-card border border-border shadow-md hover:shadow-lg transition"
            >
              {img && (
                <div className="h-28 w-full overflow-hidden bg-muted">
                  <img src={img} alt={title} className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="p-3 flex flex-col gap-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold self-start">Conseil</span>
                <p className="text-sm font-bold text-foreground line-clamp-2 leading-tight">{title}</p>
                {excerpt && <p className="text-[11px] text-foreground/70 line-clamp-2">{excerpt}</p>}
                <p className="text-[10px] text-primary font-bold mt-1">Lire l'article →</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}


// FAB rendered globally by Layout to avoid showing on inactive carousel panels.


export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshSearch = () => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['wp_search_properties'] });
    queryClient.invalidateQueries({ queryKey: ['search_groups'] });
    queryClient.invalidateQueries({ queryKey: ['wp_featured_properties'] });
    queryClient.invalidateQueries({ queryKey: ['zwandako_conseils'] });
    setTimeout(() => setRefreshing(false), 700);
  };
  const [showMenu, setShowMenu] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const { data: myGroups, isLoading } = useMyGroups();
  const { data: searchResults } = useSearchGroups(search);
  const { data: zwandakoResults } = useSearchProperties(search);
  const { data: contacts } = useOnlineContacts();
  const { data: isAdmin } = useIsAppAdmin();
  const { data: allGroups } = useAllGroups();
  const { data: requestCounts } = useMyGroupJoinRequestCounts();
  const { data: unreadCounts } = useUnreadCounts();
  const { data: newSignups } = useNewSignupsCount();
  const [selectedContact, setSelectedContact] = useState<any>(null);

  useRealtimeListings();
  useRealtimeJoinRequests();

  const isSearching = search.trim().length >= 2;
  const [pinnedTick, setPinnedTick] = useState(0);
  useEffect(() => {
    const h = () => setPinnedTick(t => t + 1);
    window.addEventListener('wh_home_groups_changed', h);
    window.addEventListener('storage', h);
    return () => {
      window.removeEventListener('wh_home_groups_changed', h);
      window.removeEventListener('storage', h);
    };
  }, []);
  const pinnedIds = useMemo(() => new Set(getHomeGroupIds()), [pinnedTick, myGroups]);
  const filteredMy = pinnedIds.size > 0
    ? (myGroups || []).filter((g: any) => pinnedIds.has(g.id))
    : (myGroups || []);
  const displayGroups = isSearching ? searchResults : filteredMy;
  const totalRequests = requestCounts?.total || 0;
  const totalUnread = Object.values(unreadCounts || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const totalNotifications = totalRequests + totalUnread;

  const handleBellClick = () => {
    const requestGroupIds = Object.keys(requestCounts?.byGroup || {}).filter(id => (requestCounts?.byGroup || {})[id] > 0);
    if (requestGroupIds.length > 0) { navigate(`/group/${requestGroupIds[0]}/members`); return; }
    const unreadGroupId = Object.keys(unreadCounts || {}).find(id => (unreadCounts || {})[id] > 0);
    if (unreadGroupId) navigate(`/group/${unreadGroupId}`);
  };

  const closeMenu = () => setShowMenu(false);

  if (isLoading) {
    return (
      <div className="px-4 py-4 max-w-lg lg:max-w-5xl mx-auto space-y-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-[72px] rounded-none" />)}
      </div>
    );
  }

  return (
    <div className="max-w-lg lg:max-w-5xl mx-auto min-h-full animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)', position: 'sticky' as any }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold leading-tight flex-1 text-foreground">WhatHouse <span className="block text-[10px] font-medium text-muted-foreground">Pro Immobilier</span></h1>
          <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 rounded-full hover:bg-muted transition" aria-label="Rechercher">
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={refreshSearch}
            disabled={refreshing}
            className="p-1.5 rounded-full hover:bg-muted transition disabled:opacity-50"
            aria-label="Actualiser la page"
            title="Actualiser"
          >
            <RefreshCw className={`h-5 w-5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {isAdmin && (newSignups || 0) > 0 && (
            <div title="Nouveaux inscrits (7 derniers jours)" className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              <UserPlus className="h-3 w-3" />{newSignups}
            </div>
          )}
          <button onClick={handleBellClick} className="relative p-1.5 rounded-full hover:bg-muted transition">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center px-1">
                {totalNotifications > 999 ? '999+' : totalNotifications}
              </span>
            )}
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full hover:bg-muted transition">
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeMenu} />
                <div className="absolute right-0 top-full mt-1 w-60 bg-popover text-popover-foreground rounded-xl shadow-xl border border-border z-50 py-1 animate-fade-in">
                  <button onClick={() => { closeMenu(); setShowInstall(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-popover-foreground hover:bg-muted transition">
                    <Download className="h-4 w-4 text-primary" />Installer l'App
                  </button>
                  <button onClick={async () => {
                    closeMenu();
                    const url = window.location.origin;
                    const text = `🏢 WhatHouse — le réseau Pro Immobilier des agents. Installe l'app : ${url}`;
                    if ((navigator as any).share) {
                      try { await (navigator as any).share({ title: 'WhatHouse', text, url }); } catch {}
                    } else {
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }
                  }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-popover-foreground hover:bg-muted transition">
                    <Share2 className="h-4 w-4 text-primary" />Partager l'application
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {showSearch && (
          <div className="px-3 pb-2">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une annonce, un groupe..."
                  className="w-full pl-9 pr-10 py-2 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
                <button
                  type="button"
                  onClick={() => { setSearch(''); setShowSearch(false); }}
                  aria-label="Fermer la recherche"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground flex items-center justify-center transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={refreshSearch}
                aria-label="Actualiser la recherche"
                title="Actualiser"
                className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center shrink-0 transition disabled:opacity-50"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Contact carousel — Messenger style online indicator */}
      {contacts && contacts.length > 0 && !isSearching && (
        <div className="px-4 pt-[5mm] pb-3" data-no-swipe>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {contacts.slice(0, 30).map(c => {
              const name = `${c.first_name} ${c.last_name}`.trim() || '?';
              const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
              return (
                <button key={c.user_id} onClick={() => setSelectedContact(c)} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="relative">
                    <div className={`h-[68px] w-[68px] rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ${c.online ? 'ring-[#22C55E]' : 'ring-border'}`}>
                      {c.avatar_url ? <img src={c.avatar_url} alt={name} className="h-full w-full object-cover" /> :
                        <span className="text-sm font-bold text-primary">{initials}</span>}
                    </div>
                    {c.online && (
                      <span
                        title="En ligne"
                        className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-[#22C55E] border-2 border-card shadow"
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-medium max-w-[68px] truncate text-foreground">{c.first_name || '?'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Slider banner - full width */}
      {!isSearching && <SliderBanner />}

      {/* Featured properties from Zwandako */}
      {!isSearching && <FeaturedProperties />}

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
                  <a href={`tel:${selectedContact.phone}`} className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl bg-success text-success-foreground">
                    <Phone className="h-5 w-5" /><span className="text-xs font-medium">Appeler</span>
                  </a>
                  <a href={`https://wa.me/${selectedContact.phone.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl bg-success text-success-foreground">
                    <MessageSquare className="h-5 w-5" /><span className="text-xs font-medium">Message</span>
                  </a>
                </>
              )}
            </div>
            <button onClick={() => setSelectedContact(null)} className="mt-3 text-sm text-muted-foreground">Fermer</button>
          </div>
        </div>
      )}

      {/* Post Immobilier — live client requests from Zwandako */}
      {!isSearching && <PostImmobilierCarousel />}

      {/* Section title */}
      {!isSearching && (
        <div className="px-4 pt-3 pb-1">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Liste des groupes</h2>
        </div>
      )}

      {isSearching && <p className="px-4 py-2 text-xs font-semibold text-muted-foreground">Résultats de recherche</p>}

      {/* Merged search results: groups + Zwandako properties, sorted by most recent */}
      {isSearching ? (() => {
        const groupItems = (searchResults || []).map((g: any) => ({
          kind: 'group' as const,
          id: `g-${g.id}`,
          date: new Date(g.updated_at || g.created_at || 0).getTime(),
          data: g,
        }));
        const wpItems = (zwandakoResults || []).map((p: any) => ({
          kind: 'wp' as const,
          id: `w-${p.id}`,
          date: new Date(p.date || p.modified || 0).getTime(),
          data: p,
        }));
        const merged = [...groupItems, ...wpItems].sort((a, b) => b.date - a.date);
        if (merged.length === 0) {
          return (
            <div className="text-center py-16 px-4">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Aucun résultat</p>
              <p className="text-xs text-muted-foreground mt-1">Essayez d'autres mots-clés</p>
            </div>
          );
        }
        return (
          <div className="px-4 space-y-2 pb-4">
            {merged.map(item => {
              if (item.kind === 'group') {
                const g = item.data;
                const dateStr = new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                return (
                  <a key={item.id} href={`/group/${g.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-xl bg-card border border-border hover:bg-muted/50 transition">
                    <div className="h-14 w-14 rounded-lg overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
                      {g.image_url ? <img src={g.image_url} alt={g.name} className="h-full w-full object-cover" /> : <Users className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{g.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-primary font-bold">Groupe →</p>
                        <p className="text-[10px] text-muted-foreground">{dateStr}</p>
                      </div>
                    </div>
                  </a>
                );
              }
              const p = item.data;
              const img = p._embedded?.['wp:featuredmedia']?.[0]?.source_url || p.jetpack_featured_media_url;
              const title = p.title?.rendered?.replace(/<[^>]+>/g, '') || 'Propriété';
              const dateStr = new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
              return (
                <a key={item.id} href={p.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-xl bg-card border border-border hover:bg-muted/50 transition">
                  <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {img && <img src={img} alt={title} className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-primary font-bold">Zwandako →</p>
                      <p className="text-[10px] text-muted-foreground">{dateStr}</p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        );
      })() : (
        <>
          {/* Group list */}
          {(!displayGroups || displayGroups.length === 0) ? (
            <div className="text-center py-16 px-4">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Aucun groupe</p>
              <p className="text-xs text-muted-foreground mt-1">Créez votre premier groupe immobilier</p>
              <Link to="/create-group" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold shadow-md hover:opacity-90 transition">
                <Plus className="h-4 w-4" />Créer un groupe
              </Link>
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-4 lg:px-2">
              {displayGroups.map(group => {
                const reqCount = requestCounts?.byGroup[group.id] || 0;
                const unread = unreadCounts?.[group.id] || 0;
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
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {reqCount > 0 && (
                            <span title="Demandes d'adhésion" className="h-5 min-w-[20px] rounded-full bg-success text-[10px] font-bold text-success-foreground flex items-center justify-center px-1.5">
                              {reqCount > 999 ? '999+' : reqCount}
                            </span>
                          )}
                          {unread > 0 && (
                            <span title="Nouvelles annonces" className="h-5 min-w-[20px] rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center px-1.5">
                              {unread > 999 ? '999+' : unread}
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
              {/* 2cm spacing under the groups list */}
              <div style={{ height: '2cm' }} />
            </div>
          )}
        </>
      )}

      <InstallPrompt open={showInstall} onClose={() => setShowInstall(false)} />
    </div>
  );
}
