import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserMinus, Check, X, UserPlus, Search, Phone, Trash2, Smartphone, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup, useGroupMembers, useLeaveGroup, useJoinRequests, useRespondJoinRequest, useAddMembersToGroup } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

function useAllProfiles() {
  return useQuery({
    queryKey: ['all_profiles_members'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
    },
  });
}

function usePendingMembers(groupId: string) {
  return useQuery({
    queryKey: ['pending_group_members', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase.from('pending_group_members' as any).select('*').eq('group_id', groupId).order('created_at', { ascending: false });
      return (data as any[]) || [];
    },
  });
}

export default function GroupMembers() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: group } = useGroup(id || '');
  const { data: members, isLoading } = useGroupMembers(id || '');
  const { data: joinRequests } = useJoinRequests(id || '');
  const { data: allProfiles } = useAllProfiles();
  const { data: pendingMembers } = usePendingMembers(id || '');
  const leaveGroup = useLeaveGroup();
  const respondRequest = useRespondJoinRequest();
  const addMembers = useAddMembersToGroup();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const normP = (p: string) => {
    if (!p) return '';
    const d = p.replace(/[^0-9+]/g, '');
    return d.startsWith('+') ? '+' + d.slice(1).replace(/[^0-9]/g, '') : d.replace(/^00/, '+');
  };
  const { data: myImported } = useQuery({
    queryKey: ['my_imported_phones_gm', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('imported_contacts').select('contact_phone, contact_name, status').eq('user_id', user!.id);
      return data || [];
    },
  });
  const importedPhoneSet = new Set((myImported || []).map((r: any) => normP(r.contact_phone)));
  const ghostInvites = (myImported || []).filter((r: any) => r.status === 'pending');

  const isCreator = group?.created_by === user?.id;
  const memberIds = members?.map((m: any) => m.user_id) || [];
  const pendingPhonesInGroup = new Set((pendingMembers || []).map((p: any) => normP(p.phone)));
  const profilePhonesSet = new Set((allProfiles || []).map((p: any) => normP(p.phone || '')).filter(Boolean));

  // Ghost invites that aren't already real profiles and not already pending in this group
  const ghostRows = ghostInvites
    .filter((g: any) => !profilePhonesSet.has(normP(g.contact_phone)))
    .filter((g: any) => !pendingPhonesInGroup.has(normP(g.contact_phone)))
    .filter((g: any) => !search || g.contact_name?.toLowerCase().includes(search.toLowerCase()) || g.contact_phone.includes(search));

  const candidates = (allProfiles || []).filter(p => !memberIds.includes(p.user_id) && p.user_id !== user?.id);
  const filtered = candidates
    .filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || '').includes(search)
    )
    .sort((a, b) => {
      const ap = importedPhoneSet.has(normP(a.phone || '')) ? 0 : 1;
      const bp = importedPhoneSet.has(normP(b.phone || '')) ? 0 : 1;
      return ap - bp;
    });

  const handleRemove = (userId: string) => {
    if (!id) return;
    leaveGroup.mutate({ groupId: id, userId }, {
      onSuccess: () => toast({ title: 'Membre retiré' }),
    });
  };

  const handleRespond = (requestId: string, userId: string, accept: boolean) => {
    if (!id) return;
    respondRequest.mutate({ requestId, groupId: id, userId, accept }, {
      onSuccess: () => toast({ title: accept ? 'Membre accepté !' : 'Demande refusée' }),
    });
  };

  const togglePick = (uid: string) =>
    setPicked(p => p.includes(uid) ? p.filter(x => x !== uid) : [...p, uid]);

  const handleAddMembers = () => {
    if (!id || picked.length === 0) return;
    addMembers.mutate({ groupId: id, userIds: picked }, {
      onSuccess: () => {
        toast({ title: `${picked.length} membre${picked.length > 1 ? 's' : ''} ajouté${picked.length > 1 ? 's' : ''} !` });
        setPicked([]);
        setShowAdd(false);
        setSearch('');
      },
      onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
    });
  };

  const normalizePhone = (p: string) => {
    const d = (p || '').replace(/[^0-9+]/g, '');
    return d.startsWith('+') ? '+' + d.slice(1).replace(/[^0-9]/g, '') : d.replace(/^00/, '+');
  };

  const pickFromPhonebook = async () => {
    if (!id || !user) return;
    const nav: any = navigator;
    if (!nav.contacts || !nav.contacts.select) {
      toast({ title: 'Indisponible', description: "Le navigateur ne supporte pas l'accès au répertoire.", variant: 'destructive' });
      return;
    }
    setImporting(true);
    try {
      let result: any[];
      try { result = await nav.contacts.select(['name', 'tel', 'icon'], { multiple: true }); }
      catch { result = await nav.contacts.select(['name', 'tel'], { multiple: true }); }

      const contacts: { name: string; phone: string }[] = [];
      for (const c of result) {
        const nm = (c.name && c.name[0]) || '';
        for (const tel of (c.tel || [])) contacts.push({ name: nm, phone: normalizePhone(tel) });
      }
      const seen = new Set<string>();
      const cleaned = contacts.filter(c => {
        if (!c.phone || c.phone.replace(/[^0-9]/g, '').length < 7) return false;
        if (seen.has(c.phone)) return false; seen.add(c.phone); return true;
      });
      if (cleaned.length === 0) { toast({ title: 'Aucun numéro détecté' }); return; }

      // Lookup matching profiles
      const phones = cleaned.map(c => c.phone);
      const { data: profiles } = await supabase.from('profiles').select('user_id, phone').in('phone', phones);
      const byPhone = new Map<string, any>();
      (profiles || []).forEach((p: any) => p.phone && byPhone.set(normalizePhone(p.phone), p));

      // Save to imported_contacts (for repertoire)
      const importedRows = cleaned.map(c => ({
        user_id: user.id, contact_phone: c.phone, contact_name: c.name || c.phone,
        status: byPhone.get(c.phone) ? 'confirmed' : 'pending',
      }));
      await supabase.from('imported_contacts').upsert(importedRows as any, { onConflict: 'user_id,contact_phone' });

      // Add registered ones directly as group members
      let addedMembers = 0, pending = 0;
      for (const c of cleaned) {
        const prof = byPhone.get(c.phone);
        if (prof && !memberIds.includes(prof.user_id)) {
          const { error } = await supabase.from('group_members').insert({ group_id: id, user_id: prof.user_id });
          if (!error) addedMembers++;
        } else if (!prof && !pendingPhonesInGroup.has(c.phone)) {
          const { error } = await supabase.from('pending_group_members' as any).insert({
            group_id: id, phone: c.phone, name: c.name || c.phone, invited_by: user.id,
          });
          if (!error) pending++;
        }
      }

      toast({ title: 'Répertoire importé', description: `${addedMembers} membre(s) · ${pending} en attente` });
      qc.invalidateQueries({ queryKey: ['group_members', id] });
      qc.invalidateQueries({ queryKey: ['pending_group_members', id] });
      qc.invalidateQueries({ queryKey: ['my_imported_phones_gm', user.id] });
      qc.invalidateQueries({ queryKey: ['repertoire'] });
    } catch { toast({ title: 'Accès refusé', variant: 'destructive' }); }
    finally { setImporting(false); }
  };

  const removeGhostMember = async (pid: string) => {
    if (!id) return;
    const { error } = await supabase.from('pending_group_members' as any).delete().eq('id', pid);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['pending_group_members', id] });
  };

  const inviteGhost = (phone: string, name: string) => {
    const origin = window.location.origin;
    const msg = `Bonjour ${name || ''}, vous avez été ajouté(e) au groupe "${group?.name || ''}" sur WhatHouse. Inscrivez-vous ici : ${origin}/login`;
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const url = isMobile
      ? `whatsapp://send?phone=${phoneDigits}&text=${encodeURIComponent(msg)}`
      : `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`;
    if (isMobile) window.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Link to={`/group/${id}`} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-foreground flex-1">Membres</h1>
        <span className="text-xs text-muted-foreground">{members?.length || 0} membre{(members?.length || 0) > 1 ? 's' : ''}</span>
        {isCreator && (
          <button onClick={() => setShowAdd(!showAdd)} className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
            <UserPlus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Add members panel */}
      {showAdd && isCreator && (
        <div className="mb-5 p-3 rounded-2xl border border-border bg-card animate-fade-in space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground flex-1">Ajouter des membres</h2>
            <button onClick={() => { setShowAdd(false); setPicked([]); setSearch(''); }} className="text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>

          <Button onClick={pickFromPhonebook} disabled={importing} variant="outline" className="w-full rounded-full h-10 text-sm gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            Importer depuis le répertoire
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un contact..." className="rounded-full text-sm h-9 pl-9" />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {ghostRows.map((g: any) => (
              <button key={`ghost-${g.contact_phone}`}
                onClick={async () => {
                  if (!id || !user) return;
                  const { error } = await supabase.from('pending_group_members' as any).insert({
                    group_id: id, phone: normP(g.contact_phone), name: g.contact_name || g.contact_phone, invited_by: user.id,
                  });
                  if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
                  toast({ title: 'Invité ajouté au groupe', description: 'En attente d\'inscription.' });
                  qc.invalidateQueries({ queryKey: ['pending_group_members', id] });
                }}
                className="w-full flex items-center gap-3 p-2 rounded-xl text-left transition hover:bg-muted">
                <div className="h-9 w-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{g.contact_name || g.contact_phone}</p>
                  <p className="text-[10px] text-muted-foreground">👻 En attente d'inscription</p>
                </div>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
            {filtered.length === 0 && ghostRows.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun contact disponible</p>
            ) : filtered.map(p => {
              const name = `${p.first_name} ${p.last_name}`.trim() || 'Utilisateur';
              const isPicked = picked.includes(p.user_id);
              return (
                <button key={p.user_id} onClick={() => togglePick(p.user_id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition ${isPicked ? 'bg-primary/15' : 'hover:bg-muted'}`}>
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 ${isPicked ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    {isPicked ? <Check className="h-4 w-4" /> : (p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover rounded-full" /> : name.split(' ').map(n => n[0]).join('').slice(0, 2))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    {p.phone && <p className="text-[10px] text-muted-foreground">{p.phone}</p>}
                  </div>
                </button>
              );
            })}
          </div>
          <Button onClick={handleAddMembers} disabled={picked.length === 0 || addMembers.isPending}
            className="w-full rounded-full bg-primary text-primary-foreground">
            <UserPlus className="h-4 w-4 mr-1" />Ajouter {picked.length > 0 && `(${picked.length})`}
          </Button>
        </div>
      )}

      {pendingMembers && pendingMembers.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-muted-foreground uppercase mb-2">En attente ({pendingMembers.length})</h2>
          <div className="space-y-2">
            {pendingMembers.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-dashed border-border">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.phone} · En attente d'inscription</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => inviteGhost(p.phone, p.name)} className="rounded-full h-8 px-2 text-[10px]">
                  Inviter
                </Button>
                {isCreator && (
                  <Button size="sm" variant="ghost" onClick={() => removeGhostMember(p.id)} className="text-destructive h-8 w-8 p-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Join requests (admin only) */}
      {isCreator && joinRequests && joinRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-primary mb-3">🔔 Demandes d'adhésion ({joinRequests.length})</h2>
          <div className="space-y-2">
            {joinRequests.map((r: any) => {
              const profile = r.profile;
              const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Utilisateur';
              const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                    {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                    {profile?.phone && <p className="text-[10px] text-muted-foreground">{profile.phone}</p>}
                  </div>
                  <Button size="sm" onClick={() => handleRespond(r.id, r.user_id, true)} className="rounded-full bg-primary text-primary-foreground h-8 w-8 p-0">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRespond(r.id, r.user_id, false)} className="rounded-full h-8 w-8 p-0 text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        [1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl mb-2" />)
      ) : (
        <div className="space-y-2">
          {members?.map((m: any) => {
            const profile = m.profiles;
            const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Utilisateur';
            const isMe = m.user_id === user?.id;
            const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-card shadow-sm border border-border">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                  {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {name} {isMe && '(Vous)'} {m.user_id === group?.created_by && '👑'}
                  </p>
                  {profile?.phone && <p className="text-[10px] text-muted-foreground">{profile.phone}</p>}
                </div>
                {isCreator && !isMe && (
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(m.user_id)} className="text-destructive">
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
