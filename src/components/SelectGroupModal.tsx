import { X, Users, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMyGroups, useAddMembersToGroup } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  userIds: string[];
}

export function SelectGroupModal({ open, onClose, userIds }: Props) {
  const { user } = useAuth();
  const { data: myGroups } = useMyGroups();
  const addMembers = useAddMembersToGroup();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!open) return null;

  // Only groups the user created can have members added
  const ownGroups = myGroups?.filter(g => g.created_by === user?.id) || [];

  const handleSelect = (groupId: string) => {
    addMembers.mutate({ groupId, userIds }, {
      onSuccess: () => {
        toast({ title: `${userIds.length} membre${userIds.length > 1 ? 's' : ''} ajouté${userIds.length > 1 ? 's' : ''} !` });
        onClose();
        navigate(`/group/${groupId}`);
      },
      onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
    });
  };

  const handleCreate = () => {
    onClose();
    // Pass selected ids via session storage
    sessionStorage.setItem('preselected_members', JSON.stringify(userIds));
    navigate('/create-group');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-4 max-h-[80vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center mb-3">
          <h2 className="text-base font-bold text-foreground flex-1">Ajouter à un groupe</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{userIds.length} contact{userIds.length > 1 ? 's' : ''} sélectionné{userIds.length > 1 ? 's' : ''}</p>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {ownGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Vous n'avez créé aucun groupe</p>
          ) : (
            ownGroups.map(g => (
              <button key={g.id} onClick={() => handleSelect(g.id)} disabled={addMembers.isPending}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition text-left">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {g.image_url ? <img src={g.image_url} className="h-full w-full object-cover" /> : <Users className="h-4 w-4 text-primary" />}
                </div>
                <span className="text-sm font-medium text-foreground truncate flex-1">{g.name}</span>
              </button>
            ))
          )}
        </div>

        <Button onClick={handleCreate} className="w-full rounded-full bg-primary text-primary-foreground mt-3">
          <Plus className="h-4 w-4 mr-1" />Créer un nouveau groupe
        </Button>
      </div>
    </div>
  );
}
