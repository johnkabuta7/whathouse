import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserMinus, Users, Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup, useGroupMembers, useLeaveGroup, useJoinRequests, useRespondJoinRequest } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';

export default function GroupMembers() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: group } = useGroup(id || '');
  const { data: members, isLoading } = useGroupMembers(id || '');
  const { data: joinRequests } = useJoinRequests(id || '');
  const leaveGroup = useLeaveGroup();
  const respondRequest = useRespondJoinRequest();
  const { toast } = useToast();

  const isCreator = group?.created_by === user?.id;

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

  return (
    <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/group/${id}`} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-foreground">Membres</h1>
        <span className="text-xs text-muted-foreground ml-auto">{members?.length || 0} membre{(members?.length || 0) > 1 ? 's' : ''}</span>
      </div>

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
