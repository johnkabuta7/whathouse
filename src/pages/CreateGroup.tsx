import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Smartphone, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateGroup, uploadListingImage } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

function normPhone(p: string): string {
  if (!p) return '';
  const d = p.replace(/[^0-9+]/g, '');
  if (d.startsWith('+')) return '+' + d.slice(1).replace(/[^0-9]/g, '');
  return d.replace(/^00/, '+');
}

// All profiles + ghost invites (pending imported_contacts). Ghosts and phone-book contacts first.
function useRepertoireProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all_profiles_for_members', user?.id],
    queryFn: async () => {
      if (!user) return [] as any[];
      const [{ data: imported }, { data: profiles }] = await Promise.all([
        supabase.from('imported_contacts').select('contact_phone, contact_name, status').eq('user_id', user.id),
        supabase.from('profiles').select('*'),
      ]);
      const importedSet = new Set((imported || []).map((i: any) => normPhone(i.contact_phone)));
      const profilePhones = new Set((profiles || []).map((p: any) => normPhone(p.phone || '')).filter(Boolean));
      const ghosts = (imported || [])
        .filter((i: any) => i.status === 'pending')
        .filter((i: any) => !profilePhones.has(normPhone(i.contact_phone)))
        .map((i: any) => ({
          user_id: `ghost:${normPhone(i.contact_phone)}`,
          first_name: i.contact_name || '',
          last_name: '',
          phone: normPhone(i.contact_phone),
          avatar_url: null,
          __ghost: true,
        }));
      const real = (profiles || [])
        .filter((p: any) => p.user_id !== user.id)
        .sort((a: any, b: any) => {
          const ap = importedSet.has(normPhone(a.phone || '')) ? 0 : 1;
          const bp = importedSet.has(normPhone(b.phone || '')) ? 0 : 1;
          return ap - bp;
        });
      return [...ghosts, ...real];
    },
    enabled: !!user,
  });
}


export default function CreateGroup() {
  const [step, setStep] = useState<'info' | 'members'>('info');
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('preselected_members');
      if (stored) {
        sessionStorage.removeItem('preselected_members');
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  });
  const [memberSearch, setMemberSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const createGroup = useCreateGroup();
  const { data: repertoire } = useRepertoireProfiles();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(p => p.includes(userId) ? p.filter(id => id !== userId) : [...p, userId]);
  };

  const q = memberSearch.trim().toLowerCase();
  const filteredProfiles = (repertoire || []).filter(p =>
    !q ||
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
    (p.phone || '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))
  );

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setIsLoading(true);

    let image_url: string | undefined;
    if (imageFile) {
      try { image_url = await uploadListingImage(imageFile, user.id); } catch { /* ignore */ }
    }

    const ghostPicks = selectedMembers.filter(id => id.startsWith('ghost:'));
    const realPicks = selectedMembers.filter(id => !id.startsWith('ghost:'));

    createGroup.mutate(
      { name: name.trim(), created_by: user.id, image_url },
      {
        onSuccess: async (data) => {
          for (const memberId of realPicks) {
            await supabase.from('group_members').insert({ group_id: data.id, user_id: memberId });
          }
          // Add ghost invites as pending_group_members
          for (const gid of ghostPicks) {
            const phone = gid.replace('ghost:', '');
            const ghost = (repertoire || []).find((r: any) => r.user_id === gid);
            await supabase.from('pending_group_members' as any).insert({
              group_id: data.id, phone, name: ghost?.first_name || phone, invited_by: user.id,
            });
          }
          toast({ title: 'Groupe créé !' });
          navigate(`/group/${data.id}`);
        },
        onError: () => { toast({ title: 'Erreur', variant: 'destructive' }); setIsLoading(false); },
      }
    );
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-3 bg-card/60 backdrop-blur-md border-b border-border">
        {step === 'info' ? (
          <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        ) : (
          <button onClick={() => setStep('info')} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
        )}
        <h1 className="text-sm font-bold flex-1 text-foreground">
          {step === 'info' ? 'Nouveau groupe' : 'Ajouter des membres'}
        </h1>
        {step === 'info' ? (
          <button onClick={() => { if (name.trim()) setStep('members'); }} className={`text-sm font-semibold ${name.trim() ? 'text-primary' : 'text-muted-foreground/30'}`}>
            Suivant
          </button>
        ) : (
          <button onClick={handleCreate} disabled={isLoading} className="text-sm font-semibold text-primary">
            {isLoading ? '...' : 'Créer'}
          </button>
        )}
      </div>

      {step === 'info' ? (
        <div className="flex-1 px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <label className="cursor-pointer shrink-0">
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary transition">
                {imagePreview ? <img src={imagePreview} className="h-full w-full object-cover" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
              </div>
            </label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du groupe" className="rounded-none border-0 border-b-2 border-primary/30 focus-visible:ring-0 focus-visible:border-primary text-base px-0" autoFocus />
          </div>
          <p className="text-xs text-muted-foreground">Donnez un nom à votre groupe et une icône optionnelle.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {selectedMembers.length > 0 && (
            <div className="px-4 py-2 bg-primary/10 text-xs font-medium text-primary">
              {selectedMembers.length} membre{selectedMembers.length > 1 ? 's' : ''} sélectionné{selectedMembers.length > 1 ? 's' : ''}
            </div>
          )}
          <div className="px-4 py-2">
            <Input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Rechercher un contact..." className="rounded-full text-sm h-9" />
          </div>

          <div className="px-4">
            {filteredProfiles?.map((p: any) => {
              const pName = `${p.first_name} ${p.last_name}`.trim() || 'Utilisateur';
              const selected = selectedMembers.includes(p.user_id);
              const isGhost = !!p.__ghost;
              return (
                <button key={p.user_id} onClick={() => toggleMember(p.user_id)}
                  className={`w-full flex items-center gap-3 py-3 border-b border-border text-left ${isGhost ? 'bg-amber-500/5' : ''}`}>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${selected ? 'bg-primary text-primary-foreground' : isGhost ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                    {selected ? <Check className="h-4 w-4" /> : isGhost ? '👻' : pName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{pName}</p>
                    {isGhost ? (
                      <p className="text-[10px] text-amber-600">Fantôme · En attente d'inscription</p>
                    ) : p.phone && <p className="text-[10px] text-muted-foreground">{p.phone}</p>}
                  </div>
                </button>
              );
            })}
            {(!filteredProfiles || filteredProfiles.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-8">Aucun contact trouvé</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
