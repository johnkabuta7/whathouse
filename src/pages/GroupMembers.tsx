import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserMinus, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup, useGroupMembers, useLeaveGroup } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';

export default function GroupMembers() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: group } = useGroup(id || '');
  const { data: members, isLoading } = useGroupMembers(id || '');
  const leaveGroup = useLeaveGroup();
  const { toast } = useToast();

  const isCreator = group?.created_by === user?.id;

  const handleRemove = (userId: string) => {
    if (!id) return;
    leaveGroup.mutate({ groupId: id, userId }, {
      onSuccess: () => toast({ title: 'Membre retiré' }),
    });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/group/${id}`} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-foreground">Membres</h1>
        <span className="text-xs text-muted-foreground ml-auto">{members?.length || 0} membre{(members?.length || 0) > 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        [1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl mb-2" />)
      ) : (
        <div className="space-y-2">
          {members?.map((m: any) => {
            const profile = m.profiles;
            const name = profile ? `${profile.first_name} ${profile.last_name}` : 'Utilisateur';
            const isMe = m.user_id === user?.id;
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-card shadow-sm">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{name} {isMe && '(Vous)'}</p>
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
