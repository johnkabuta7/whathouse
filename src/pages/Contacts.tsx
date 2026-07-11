import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, MoreVertical, Settings, Users, Clock, History, Plus, Sparkles, Trash2, Handshake, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SelectGroupModal } from '@/components/SelectGroupModal';
import { InstallPrompt } from '@/components/InstallPrompt';
import { ImportContactsModal } from '@/components/ImportContactsModal';
import { useIncomingCollabRequests } from '@/pages/CollaborationInbox';
import { normalizeSearch } from '@/hooks/use-data';
import { toast } from '@/hooks/use-toast';

function normalizePhone(p: string): string {
  if (!p) return '';
  const digits = p.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return '+' + digits.slice(1).replace(/[^0-9]/g, '');
  return digits.replace(/^00/, '+');
}

// Returns the user's repertoire (imported & confirmed) joined with profile + presence info.
function useRepertoire() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['repertoire', user?.id],
    queryFn: async () => {
      if (!user) return { confirmed: [] as any[], pending: [] as any[] };
      const { data: imported, error } = await supabase
        .from('imported_contacts')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      const all = imported || [];
      const phones = all.map(i => i.contact_phone).filter(Boolean);
      if (phones.length === 0) return { confirmed: [], pending: [] };

      const { data: profiles } = await supabase.from('profiles').select('*').in('phone', phones);
      const byPhone = new Map<string, any>();
      (profiles || []).forEach((p: any) => p.phone && byPhone.set(normalizePhone(p.phone), p));

      const userIds = (profiles || []).map((p: any) => p.user_id).filter(Boolean);
      const { data: sessions } = userIds.length
        ? await supabase.rpc('get_online_status' as any, { _user_ids: userIds })
        : { data: [] as any[] };
      const cutoff = Date.now() - 2 * 60 * 1000;
      const onlineSet = new Set<string>();
      const seenMap = new Map<string, string>();
      ((sessions as any[]) || []).forEach((s: any) => {
        seenMap.set(s.user_id, s.updated_at);
        if (new Date(s.updated_at).getTime() > cutoff) onlineSet.add(s.user_id);
      });

      const confirmed: any[] = [];
      const pending: any[] = [];
      for (const imp of all) {
        const profile = byPhone.get(normalizePhone(imp.contact_phone));
        if (profile && profile.user_id === user.id) continue;

        if (profile) {
          const ghost = !!profile.ghost_mode;
          const row = {
            ...profile,
            import_id: imp.id,
            import_status: imp.status,
            contact_name: imp.contact_name,
            online: ghost ? false : onlineSet.has(profile.user_id),
            last_seen: ghost ? null : (seenMap.get(profile.user_id) || null),
            is_pending: false,
          };
          if (imp.status === 'confirmed') confirmed.push(row);
          else pending.push(row);
        } else {
          // Contact imported but not yet on WhatHouse — keep in "pending" list
          pending.push({
            user_id: null,
            first_name: imp.contact_name || '',
            last_name: '',
            phone: imp.contact_phone,
            avatar_url: null,
            import_id: imp.id,
            import_status: 'pending',
            contact_name: imp.contact_name,
            online: false,
            last_seen: null,
            is_pending: true,
          });
        }
      }
      return { confirmed, pending };
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
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
  const qc = useQueryClient();
  const { data, isLoading } = useRepertoire();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const navigate = useNavigate();
  const { data: incomingCollab } = useIncomingCollabRequests();
  const incomingCount = incomingCollab?.length || 0;

  const confirmed = data?.confirmed || [];
  const pending = data?.pending || [];

  const q = normalizeSearch(search);
  const filtered = confirmed
    .slice()
    .sort((a: any, b: any) => Number(b.online) - Number(a.online))
    .filter((p: any) =>
      !q ||
      normalizeSearch(`${p.first_name} ${p.last_name} ${p.contact_name || ''}`).includes(q) ||
      normalizeSearch(p.phone || '').includes(q)
    );

  const startLongPress = (userId: string) => {
    const timer = setTimeout(() => { setSelecting(true); setSelected([userId]); }, 500);
    setLongPressTimer(timer);
  };
  const cancelLongPress = () => { if (longPressTimer) clearTimeout(longPressTimer); };
  const toggleSelect = (userId: string) => {
    if (selecting) setSelected(p => p.includes(userId) ? p.filter(id => id !== userId) : [...p, userId]);
    else navigate(`/contact/${userId}`);
  };
  const closeMenu = () => setShowMenu(false);

  const confirmPending = async (importId: string) => {
    await supabase.from('imported_contacts').update({ status: 'confirmed' }).eq('id', importId);
    qc.invalidateQueries({ queryKey: ['repertoire'] });
    toast({ title: 'Contact ajouté à votre répertoire' });
  };

  const removeImport = async (importId: string) => {
    await supabase.from('imported_contacts').delete().eq('id', importId);
    qc.invalidateQueries({ queryKey: ['repertoire'] });
  };

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto min-h-full animate-fade-in">
      <header className="sticky top-0 z-50 bg-card border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold flex-1 text-foreground">Contacts</h1>
          <button onClick={() => setShowImport(true)} className="p-1.5 rounded-full hover:bg-muted transition" aria-label="Importer des contacts">
            <UserPlus className="h-5 w-5 text-primary" />
          </button>
          <button onClick={() => navigate('/collaboration/inbox')} className="relative p-1.5 rounded-full hover:bg-muted transition" aria-label="Demandes de collaboration">
            <Inbox className="h-5 w-5 text-primary" />
            {incomingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground inline-flex items-center justify-center px-1">{incomingCount}</span>
            )}
          </button>
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
                  <button onClick={() => { closeMenu(); setShowImport(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition">
                    <UserPlus className="h-4 w-4 text-primary" />Importer des contacts
                  </button>
                  <button onClick={() => { closeMenu(); navigate('/collaboration/request'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition">
                    <Handshake className="h-4 w-4 text-primary" />Demande de collaboration
                  </button>
                  <button onClick={() => { closeMenu(); navigate('/create-group'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition">
                    <Users className="h-4 w-4 text-primary" />Créer un groupe
                  </button>
                  <button onClick={() => { closeMenu(); setSelecting(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition">
                    <UserPlus className="h-4 w-4 text-primary" />Sélectionner & ajouter
                  </button>
                  <button onClick={() => { closeMenu(); navigate('/profil?tab=infos'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition">
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

      {/* Nouveaux contacts disponibles / en attente d'inscription */}
      {pending.length > 0 && (
        <div className="border-b border-border bg-primary/5">
          <p className="px-4 py-2 text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1">
            <Sparkles className="h-3 w-3" />Contacts ({pending.length})
          </p>
          {pending.map((p: any) => {
            const name = `${p.first_name} ${p.last_name}`.trim() || p.contact_name || 'Contact';
            const inviteHref = p.is_pending
              ? `https://wa.me/${(p.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${name}, rejoignez-moi sur WhatHouse : ${window.location.origin}/login`)}`
              : null;
            return (
              <div key={p.import_id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
                  <img src={p.avatar_url || '/whathouse-icon.png'} className="h-full w-full object-cover" alt={name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                    {name}
                    {p.is_pending && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600">En attente</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.phone}</p>
                </div>
                {p.is_pending ? (
                  <div className="flex items-center gap-1">
                    {inviteHref && (
                      <a href={inviteHref} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-success text-success-foreground">Inviter</a>
                    )}
                    <button onClick={() => removeImport(p.import_id)} title="Retirer"
                      className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <Button size="sm" className="rounded-full text-xs h-8 bg-primary text-primary-foreground"
                    onClick={() => confirmPending(p.import_id)}>Ajouter</Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="px-4 space-y-2 mt-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-none" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-6">
          <UserPlus className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">Votre répertoire est vide</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Importez vos contacts pour retrouver ceux qui utilisent WhatHouse.</p>
          <Button onClick={() => setShowImport(true)} className="rounded-full bg-primary text-primary-foreground">
            <UserPlus className="h-4 w-4 mr-1" />Importer des contacts
          </Button>
        </div>
      ) : (
        <div>
          <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {filtered.length} contact{filtered.length > 1 ? 's' : ''}
          </p>
          {filtered.map((p: any) => {
            const name = `${p.first_name} ${p.last_name}`.trim() || p.contact_name || 'Contact';
            const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
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
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-white'}`}>
                    {isSelected ? '✓' : <img src={p.avatar_url || '/whathouse-icon.png'} className="h-full w-full object-cover rounded-full" alt={name} />}
                  </div>
                  {p.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card" />}
                </div>
                <div className="flex-1 min-w-0 border-b border-border pb-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.phone || ''}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground shrink-0 text-right whitespace-nowrap">
                    {p.online ? <span className="text-success font-semibold">● en ligne</span> : formatLastSeen(p.last_seen)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SelectGroupModal open={showGroupModal} onClose={() => { setShowGroupModal(false); setSelecting(false); setSelected([]); }} userIds={selected} />
      <InstallPrompt open={showInstall} onClose={() => setShowInstall(false)} />
      <ImportContactsModal open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
