import { useState } from 'react';
import { X, Users, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useMyGroups, useCreateListing } from '@/hooks/use-data';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  listing: { id: string; title: string; description: string; images: string[] | null; group_id: string };
}

export function ShareToGroupsModal({ open, onClose, listing }: Props) {
  const { user } = useAuth();
  const { data: myGroups } = useMyGroups();
  const createListing = useCreateListing();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);

  if (!open) return null;

  // Exclude the source group
  const targetGroups = (myGroups || []).filter(g => g.id !== listing.group_id);

  const toggle = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const listingUrl = `${window.location.origin}/listing/${listing.id}`;
  const waText = `🏠 ${listing.title}\n\n${(listing.description || '').slice(0, 200)}${(listing.description || '').length > 200 ? '…' : ''}\n\n👉 Voir l'annonce : ${listingUrl}`;

  const openWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(waText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    if (!user) {
      openWhatsApp();
      onClose();
      return;
    }
    if (selected.length === 0) {
      // Skip groups → go straight to WhatsApp
      openWhatsApp();
      onClose();
      return;
    }
    setSharing(true);
    let success = 0;
    for (const groupId of selected) {
      try {
        await createListing.mutateAsync({
          group_id: groupId,
          user_id: user.id,
          title: listing.title,
          description: listing.description,
          images: listing.images || [],
        });
        success++;
      } catch (e) {
        console.warn('Share to group failed:', groupId, e);
      }
    }
    setSharing(false);
    toast({
      title: success > 0 ? `Partagé dans ${success} groupe${success > 1 ? 's' : ''} — ouverture de WhatsApp…` : 'Échec du partage',
      variant: success === 0 ? 'destructive' : 'default',
    });
    setSelected([]);
    // After group share, open WhatsApp to forward to contacts
    setTimeout(() => openWhatsApp(), 200);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-4 max-h-[80vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center mb-3">
          <h2 className="text-base font-bold text-foreground flex-1">Partager dans des groupes</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">« {listing.title} »</p>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {targetGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun autre groupe disponible</p>
          ) : (
            targetGroups.map(g => {
              const checked = selected.includes(g.id);
              return (
                <label key={g.id}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition ${checked ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                  <Checkbox checked={checked} onCheckedChange={() => toggle(g.id)} />
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {g.image_url ? <img src={g.image_url} className="h-full w-full object-cover" /> : <Users className="h-4 w-4 text-primary" />}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate flex-1">{g.name}</span>
                </label>
              );
            })
          )}
        </div>

        <Button onClick={handleShare} disabled={sharing || selected.length === 0}
          className="w-full rounded-full bg-primary text-primary-foreground mt-3">
          {sharing ? (
            <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          Partager{selected.length > 0 ? ` (${selected.length})` : ''}
        </Button>
      </div>
    </div>
  );
}
