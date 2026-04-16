import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserMinus, Users, Check, X, UserPlus, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup, useGroupMembers, useLeaveGroup, useJoinRequests, useRespondJoinRequest, useAddMembersToGroup } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

function useAllProfiles() {
  return useQuery({
    queryKey: ['all_profiles_members'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
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
  const leaveGroup = useLeaveGroup();
  const respondRequest = useRespondJoinRequest();
  const addMembers = useAddMembersToGroup();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const isCreator = group?.created_by === user?.id;
  const memberIds = members?.map((m: any) => m.user_id) || [];
  const candidates = (allProfiles || []).filter(p => !memberIds.includes(p.user_id));
  const filtered = candidates.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

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
        <div className="mb-5 p-3 rounded-2xl border border-primary/20 bg-primary/5 animate-fade-in space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-primary flex-1">Ajouter des membres</h2>
            <button onClick={() => { setShowAdd(false); setPicked([]); setSearch(''); }} className="text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un contact..." className="rounded-full text-sm h-9 pl-9" />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun contact disponible</p>
            ) : filtered.map(p => {
              const name = `${p.first_name} ${p.last_name}`.trim() || 'Utilisateur';
              const isPicked = picked.includes(p.user_id);
              return (
                <button key={p.user_id} onClick={() => togglePick(p.user_id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition ${isPicked ? 'bg-primary/15' : 'hover:bg-muted'}`}>
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 ${isPicked ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
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
