import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, MoreVertical, Settings, Users, Clock, History, Plus, UsersRound } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { SelectGroupModal } from '@/components/SelectGroupModal';
import { InstallPrompt } from '@/components/InstallPrompt';
import { normalizeSearch } from '@/hooks/use-data';

function useAllProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      const { data: sessions } = await supabase
        .from('active_sessions' as any)
        .select('user_id, updated_at');
      const cutoff = Date.now() - 2 * 60 * 1000;
      const sessionMap = new Map<string, string>();
      ((sessions as any[]) || []).forEach((s: any) => sessionMap.set(s.user_id, s.updated_at));
      const onlineSet = new Set(
        (sessions as any[] | null)
          ?.filter((s: any) => new Date(s.updated_at).getTime() > cutoff)
          .map((s: any) => s.user_id) || []
      );
      return (data || []).map(p => ({
        ...p,
        online: onlineSet.has(p.user_id),
        last_seen: sessionMap.get(p.user_id) || null,
      }));
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Contacts() {
  const { user } = useAuth();
  const { data: profiles, isLoading } = useAllProfiles();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [recentMode, setRecentMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setRecentMode(v => !v);
    window.addEventListener('contacts:show-recent', handler as any);
    return () => window.removeEventListener('contacts:show-recent', handler as any);
  }, []);

  const others = profiles?.filter(p => p.user_id !== user?.id);
  const baseList = recentMode
    ? [...(others || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [...(others || [])].sort((a: any, b: any) => Number(b.online) - Number(a.online));
  const q = normalizeSearch(search);
  const filtered = baseList?.filter(p =>
    !q ||
    normalizeSearch(`${p.first_name} ${p.last_name}`).includes(q) ||
    normalizeSearch(p.phone || '').includes(q)
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

  const closeMenu = () => setShowMenu(false);

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/60 backdrop-blur-md border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 7mm)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold flex-1 text-foreground flex items-center gap-2">
            Contacts
            {recentMode && (
              <button
                onClick={() => setRecentMode(false)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary"
              >
                <Clock className="h-3 w-3" />Récents ✕
              </button>
            )}
          </h1>
          <button onClick={() => setSearchOpen(!searchOpen)} className="p-1.5 rounded-full hover:bg-muted transition">
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full hover:bg-muted transition">
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeMenu} />
                <div className="absolute right-0 top-full mt-1 w-60 bg-popover text-popover-foreground rounded-xl shadow-xl border border-border z-50 py-1 animate-fade-in">
                  <button onClick={() => { closeMenu(); setRecentMode(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-popover-foreground hover:bg-muted transition">
                    <History className="h-4 w-4 text-primary" />Historique
                  </button>
                  <button onClick={() => { closeMenu(); navigate('/create-group'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-popover-foreground hover:bg-muted transition">
                    <Users className="h-4 w-4 text-primary" />Créer un groupe
                  </button>
                  <button onClick={() => { closeMenu(); setSelecting(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-popover-foreground hover:bg-muted transition">
                    <UserPlus className="h-4 w-4 text-primary" />Sélectionner & ajouter
                  </button>
                  <button onClick={() => { closeMenu(); navigate('/profil?tab=infos'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-popover-foreground hover:bg-muted transition">
                    <Settings className="h-4 w-4 text-primary" />Paramètres
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un contact..." autoFocus
              className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      )}

      {selecting && (
        <div className="px-4 py-2 bg-primary/10 flex items-center gap-2">
          <p className="text-xs font-medium text-primary flex-1">{selected.length} sélectionné(s)</p>
          <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => { setSelecting(false); setSelected([]); }}>Annuler</Button>
          <Button size="sm" className="rounded-full text-xs bg-primary text-primary-foreground" disabled={selected.length === 0}
            onClick={() => setShowGroupModal(true)}>
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
                <div className="relative shrink-0">
                <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                  {isSelected ? '✓' : p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover rounded-full" /> : initials}
                </div>
                {(p as any).online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card" />}
                </div>
                <div className="flex-1 min-w-0 border-b border-border pb-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{(p as any).online ? 'En ligne' : (p.phone || 'Hors ligne')}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground shrink-0 text-right whitespace-nowrap">
                    {(p as any).online ? <span className="text-success font-semibold">● en ligne</span> : formatLastSeen((p as any).last_seen)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SelectGroupModal open={showGroupModal} onClose={() => { setShowGroupModal(false); setSelecting(false); setSelected([]); }} userIds={selected} />
      <InstallPrompt open={showInstall} onClose={() => setShowInstall(false)} />

      {/* FAB — créer un groupe (icône contacts/groupe) */}
      <button
        onClick={() => navigate('/create-group')}
        title="Créer un groupe"
        aria-label="Créer un groupe"
        className="fixed right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition"
        style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        <UsersRound className="h-6 w-6" />
        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-card text-primary border-2 border-primary flex items-center justify-center">
          <Plus className="h-3 w-3" />
        </span>
      </button>
    </div>
  );
}
