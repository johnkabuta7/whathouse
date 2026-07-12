import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Users, Trash2, BookUser, Sparkles, Inbox, Handshake, Home, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMyGroups, normalizeSearch } from '@/hooks/use-data';
import { SelectGroupModal } from '@/components/SelectGroupModal';
import { ImportContactsModal } from '@/components/ImportContactsModal';
import { useIncomingCollabRequests } from '@/pages/CollaborationInbox';
import { toast } from '@/hooks/use-toast';
import { getHomeGroupIds, addPinnedHome, removePinnedHome, isPinnedHome } from '@/hooks/use-home-groups';

type Tab = 'groupe' | 'contacts';

function normalizePhone(p: string): string {
  if (!p) return '';
  const digits = p.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return '+' + digits.slice(1).replace(/[^0-9]/g, '');
  return digits.replace(/^00/, '+');
}

function useRepertoire() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['repertoire', user?.id],
    queryFn: async () => {
      if (!user) return { confirmed: [] as any[], pending: [] as any[] };
      const { data: imported, error } = await supabase.from('imported_contacts').select('*').eq('user_id', user.id);
      if (error) throw error;
      const all = imported || [];
      const phones = all.map(i => i.contact_phone).filter(Boolean);
      if (phones.length === 0) return { confirmed: [], pending: [] };
      const { data: profiles } = await supabase.from('profiles').select('user_id, first_name, last_name, phone, avatar_url, background_url, account_type, ghost_mode').in('phone', phones);
      const byPhone = new Map<string, any>();
      (profiles || []).forEach((p: any) => p.phone && byPhone.set(normalizePhone(p.phone), p));
      const userIds = (profiles || []).map((p: any) => p.user_id).filter(Boolean);
      const { data: sessions } = userIds.length ? await supabase.rpc('get_online_status' as any, { _user_ids: userIds }) : { data: [] as any[] };
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
          if (imp.status === 'confirmed') confirmed.push(row); else pending.push(row);
        } else {
          pending.push({
            user_id: null, first_name: imp.contact_name || '', last_name: '',
            phone: imp.contact_phone, avatar_url: null,
            import_id: imp.id, import_status: 'pending', contact_name: imp.contact_name,
            online: false, last_seen: null, is_pending: true,
          });
        }
      }
      return { confirmed, pending };
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
}

function useGroupsStats(groupIds: string[]) {
  return useQuery({
    queryKey: ['groups_stats', groupIds.sort().join(',')],
    queryFn: async () => {
      if (groupIds.length === 0) return { members: {} as Record<string, number>, listings: {} as Record<string, number> };
      const [{ data: members }, { data: listings }] = await Promise.all([
        supabase.from('group_members').select('group_id').in('group_id', groupIds),
        supabase.from('listings').select('group_id').in('group_id', groupIds),
      ]);
      const memberCounts: Record<string, number> = {};
      const listingCounts: Record<string, number> = {};
      (members || []).forEach((m: any) => { memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1; });
      (listings || []).forEach((l: any) => { listingCounts[l.group_id] = (listingCounts[l.group_id] || 0) + 1; });
      return { members: memberCounts, listings: listingCounts };
    },
    enabled: groupIds.length > 0,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} · ${hh}:${mi}`;
}
function formatLastSeen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Contacts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('groupe');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectingGroups, setSelectingGroups] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [pinnedTick, setPinnedTick] = useState(0);
  const longPressTimer = useRef<any>(null);

  const { data: groups, isLoading: groupsLoading } = useMyGroups();
  const groupIds = (groups || []).map((g: any) => g.id);
  const { data: stats } = useGroupsStats(groupIds);
  const { data: repertoire, isLoading: contactsLoading } = useRepertoire();
  const { data: incomingCollab } = useIncomingCollabRequests();
  const incomingCount = incomingCollab?.length || 0;

  const q = normalizeSearch(search);
  const filteredGroups = (groups || []).filter((g: any) => !q || normalizeSearch(g.name).includes(q));
  const confirmed = repertoire?.confirmed || [];
  const pending = repertoire?.pending || [];
  const filteredContacts = confirmed
    .slice()
    .sort((a: any, b: any) => Number(b.online) - Number(a.online))
    .filter((p: any) => !q || normalizeSearch(`${p.first_name} ${p.last_name} ${p.contact_name || ''} ${p.phone || ''}`).includes(q));

  const confirmPending = async (importId: string) => {
    await supabase.from('imported_contacts').update({ status: 'confirmed' }).eq('id', importId);
    qc.invalidateQueries({ queryKey: ['repertoire'] });
    toast({ title: 'Contact ajouté à votre répertoire' });
  };
  const removeImport = async (importId: string) => {
    await supabase.from('imported_contacts').delete().eq('id', importId);
    qc.invalidateQueries({ queryKey: ['repertoire'] });
  };

  const startLongPress = (id: string) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setSelectingGroups(true);
      setSelectedGroups(prev => prev.includes(id) ? prev : [...prev, id]);
    }, 450);
  };
  const cancelLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };
  const toggleGroupSelected = (id: string) => {
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const pinToHome = () => {
    addPinnedHome(selectedGroups);
    setPinnedTick(t => t + 1);
    toast({ title: `${selectedGroups.length} groupe(s) ajouté(s) à l'accueil` });
    setSelectingGroups(false); setSelectedGroups([]);
  };
  const unpinFromHome = () => {
    removePinnedHome(selectedGroups);
    setPinnedTick(t => t + 1);
    toast({ title: `${selectedGroups.length} groupe(s) retiré(s) de l'accueil` });
    setSelectingGroups(false); setSelectedGroups([]);
  };
  const deleteSelectedGroups = async () => {
    if (!confirm(`Supprimer ${selectedGroups.length} groupe(s) ? Cette action est irréversible.`)) return;
    for (const gid of selectedGroups) {
      try { await supabase.rpc('delete_group_cascade' as any, { _group_id: gid }); }
      catch { await supabase.from('groups').delete().eq('id', gid); }
    }
    removePinnedHome(selectedGroups);
    setPinnedTick(t => t + 1);
    qc.invalidateQueries({ queryKey: ['my_groups'] });
    toast({ title: 'Groupe(s) supprimé(s)' });
    setSelectingGroups(false); setSelectedGroups([]);
  };

  const RoundBtn = ({ onClick, ariaLabel, children }: any) => (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md active:scale-95 transition"
    >
      {children}
    </button>
  );

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto min-h-full animate-fade-in flex flex-col">
      <header className="shrink-0 px-4 pt-6 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Groupes</h1>
          {incomingCount > 0 && (
            <button onClick={() => navigate('/collaboration/inbox')} className="relative p-2 rounded-full hover:bg-muted transition" aria-label="Demandes de collaboration">
              <Inbox className="h-5 w-5 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground inline-flex items-center justify-center px-1">{incomingCount}</span>
            </button>
          )}
        </div>
      </header>

      <div className="shrink-0 flex items-center border-b border-border">
        {[
          { key: 'groupe', label: 'Groupe' },
          { key: 'contacts', label: 'Contacts' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key as Tab); setSearchOpen(false); setSearch(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${tab === t.key ? 'text-primary' : 'text-primary/60'}`}
          >
            {t.label}
            {tab === t.key && <span className="absolute bottom-0 left-8 right-8 h-[3px] bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {/* Actions bar (round buttons or search input) */}
      <div className="shrink-0 px-4 py-3" data-no-swipe>
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/60" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                onBlur={() => { if (!search) setSearchOpen(false); }}
                placeholder={tab === 'groupe' ? 'Rechercher un groupe' : 'Rechercher un contact'}
                className="w-full pl-11 pr-4 py-3 rounded-full border border-border bg-background text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {tab === 'groupe' ? (
              <RoundBtn onClick={() => navigate('/create-group')} ariaLabel="Créer un groupe"><UserPlus className="h-5 w-5" /></RoundBtn>
            ) : (
              <>
                <RoundBtn onClick={() => setShowImport(true)} ariaLabel="Importer le répertoire"><BookUser className="h-5 w-5" /></RoundBtn>
                <RoundBtn onClick={() => setShowImport(true)} ariaLabel="Ajouter un contact"><UserPlus className="h-5 w-5" /></RoundBtn>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3">
            <RoundBtn onClick={() => setSearchOpen(true)} ariaLabel="Rechercher"><Search className="h-5 w-5" /></RoundBtn>
            {tab === 'groupe' ? (
              <RoundBtn onClick={() => navigate('/create-group')} ariaLabel="Créer un groupe"><UserPlus className="h-5 w-5" /></RoundBtn>
            ) : (
              <>
                <RoundBtn onClick={() => setShowImport(true)} ariaLabel="Importer le répertoire"><BookUser className="h-5 w-5" /></RoundBtn>
                <RoundBtn onClick={() => setShowImport(true)} ariaLabel="Ajouter un contact"><UserPlus className="h-5 w-5" /></RoundBtn>
              </>
            )}
          </div>
        )}
      </div>

      {selecting && tab === 'contacts' && (
        <div className="px-4 py-2 bg-primary/10 flex items-center gap-2">
          <p className="text-xs font-medium text-primary flex-1">{selected.length} sélectionné(s)</p>
          <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => { setSelecting(false); setSelected([]); }}>Annuler</Button>
          <Button size="sm" className="rounded-full text-xs" disabled={selected.length === 0} onClick={() => setShowGroupModal(true)}>
            <UserPlus className="h-3 w-3 mr-1" /> Ajouter au groupe
          </Button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-4">
        {tab === 'groupe' ? (
          groupsLoading ? (
            <div className="px-4 space-y-2 mt-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm font-medium text-foreground">{q ? 'Aucun groupe trouvé' : "Vous n'êtes dans aucun groupe"}</p>
              {!q && <Button className="mt-4 rounded-full" onClick={() => navigate('/create-group')}><UserPlus className="h-4 w-4 mr-1" />Créer un groupe</Button>}
            </div>
          ) : (
            <ul>
              {filteredGroups.map((g: any) => {
                const memberCount = stats?.members?.[g.id] || 0;
                const listingCount = stats?.listings?.[g.id] || 0;
                return (
                  <li key={g.id}>
                    <button onClick={() => navigate(`/group/${g.id}`)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition text-left">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                        {g.avatar_url ? (
                          <img src={g.avatar_url} alt={g.name} className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 border-b border-border pb-3">
                        <p className="text-base font-semibold text-foreground truncate">{g.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{listingCount} annonce(s) · {memberCount} membre(s)</p>
                        {g.updated_at && <p className="text-[11px] text-muted-foreground truncate">Dernière activité {formatDateTime(g.updated_at)}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 self-start pt-1">{g.updated_at ? formatDate(g.updated_at) : ''}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <>
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
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.phone}</p>
                      </div>
                      {p.is_pending ? (
                        <div className="flex items-center gap-1">
                          {inviteHref && <a href={inviteHref} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-success text-success-foreground">Inviter</a>}
                          <button onClick={() => removeImport(p.import_id)} className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <Button size="sm" className="rounded-full text-xs h-8" onClick={() => confirmPending(p.import_id)}>Ajouter</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {contactsLoading ? (
              <div className="px-4 space-y-2 mt-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : filteredContacts.length === 0 ? (
              <div className="px-4 py-6">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Aucun contact avec compte WhatHouse détecté pour le moment. Importez le répertoire ou vérifiez que les numéros ont un format international.
                </p>
              </div>
            ) : (
              <ul>
                <li className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{filteredContacts.length} contact{filteredContacts.length > 1 ? 's' : ''}</li>
                {filteredContacts.map((p: any) => {
                  const name = `${p.first_name} ${p.last_name}`.trim() || p.contact_name || 'Contact';
                  const isSelected = selected.includes(p.user_id);
                  return (
                    <li key={p.user_id} onClick={() => { if (selecting) setSelected(prev => prev.includes(p.user_id) ? prev.filter(x => x !== p.user_id) : [...prev, p.user_id]); else navigate(`/contact/${p.user_id}`); }} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition ${isSelected ? 'bg-primary/10' : ''}`}>
                      <div className="relative shrink-0">
                        <div className={`h-11 w-11 rounded-full flex items-center justify-center overflow-hidden ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-white'}`}>
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
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <SelectGroupModal open={showGroupModal} onClose={() => { setShowGroupModal(false); setSelecting(false); setSelected([]); }} userIds={selected} />
      <ImportContactsModal open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
