import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X, Send, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useMyGroups, useCreateMultiGroupListing, uploadListingImage } from '@/hooks/use-data';
import { toast } from 'sonner';

export default function Publish() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: myGroups } = useMyGroups();
  const createMulti = useCreateMultiGroupListing();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  const addFiles = useCallback(async (newFiles: File[]) => {
    const imgs = newFiles.filter(f => f.type.startsWith('image/'));
    setFiles(p => [...p, ...imgs]);
    const dataUrls = await Promise.all(imgs.map(f => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(f);
    })));
    setPreviews(p => [...p, ...dataUrls]);
  }, []);

  const removeFile = (i: number) => {
    setFiles(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const toggleGroup = (id: string) =>
    setSelectedGroups(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setFiles([]);
    setPreviews([]);
    setSelectedGroups([]);
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      toast.error('Titre et description obligatoires');
      return;
    }
    if (files.length === 0) {
      toast.error('Ajoutez au moins une image');
      return;
    }
    if (selectedGroups.length === 0) {
      toast.error('Cochez au moins un groupe');
      return;
    }

    setUploading(true);
    setProgress(2);
    setProgressLabel(`Téléversement de ${files.length} image${files.length > 1 ? 's' : ''}...`);

    try {
      // Parallel upload — much faster
      let done = 0;
      const urls = await Promise.all(files.map(async (f) => {
        const url = await uploadListingImage(f, user.id);
        done++;
        const pct = 5 + Math.round((done / files.length) * 55); // 5 → 60
        setProgress(pct);
        setProgressLabel(`Image ${done}/${files.length} téléversée`);
        return url;
      }));

      setProgress(65);
      setProgressLabel('Publication sur Zwandako (en attente)...');

      createMulti.mutate({
        group_ids: selectedGroups,
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        images: urls,
      }, {
        onSuccess: (res) => {
          setProgress(95);
          setProgressLabel(`Diffusion dans ${res.groups_count} groupe${res.groups_count > 1 ? 's' : ''}...`);
          setTimeout(() => {
            setProgress(100);
            toast.success('Annonce publiée !', {
              description: `1 publication créée, partagée dans ${res.groups_count} groupe${res.groups_count > 1 ? 's' : ''}${res.wp_sync_failed ? ' (Zwandako : sync ultérieure)' : ' + Zwandako (en attente)'}.`,
            });
            setUploading(false);
            navigate('/');
          }, 250);
        },
        onError: (err: any) => {
          toast.error('Publication échouée', { description: err?.message || 'Vos textes et images sont conservés. Réessayez.' });
          setUploading(false);
          setProgress(0);
          setProgressLabel('');
        },
      });
    } catch (err: any) {
      toast.error('Erreur upload', { description: err?.message || 'Vos textes et images sont conservés. Réessayez.' });
      setUploading(false);
      setProgress(0);
      setProgressLabel('');
    }
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-24 animate-fade-in">
      <header
        className="sticky top-0 z-50 bg-card border-b border-border"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted" aria-label="Retour">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Publier une annonce</h1>
        </div>
        {uploading && (
          <div className="px-4 pb-3 space-y-1.5 animate-fade-in">
            <Progress value={progress} className="h-2" />
            <p className="text-[11px] font-medium text-muted-foreground">{progressLabel} ({progress}%)</p>
          </div>
        )}
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'annonce *" className="rounded-full text-sm h-10" required />
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description complète *" className="rounded-xl text-sm resize-y min-h-[140px]" rows={6} required />

        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Photos ({previews.length}) *</p>
          <div className="flex gap-2 flex-wrap">
            {previews.map((p, i) => (
              <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border">
                <img src={p} className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeFile(i)} className="absolute top-0 right-0 bg-foreground/70 text-background rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="cursor-pointer h-20 w-20 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center text-primary">
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(Array.from(e.target.files || []))} />
              <ImagePlus className="h-6 w-6" />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Publier dans ({selectedGroups.length} groupe{selectedGroups.length > 1 ? 's' : ''} sélectionné{selectedGroups.length > 1 ? 's' : ''})
          </p>
          {(!myGroups || myGroups.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-xl">
              Vous n'êtes membre d'aucun groupe.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto rounded-xl border border-border p-2 bg-card">
              {myGroups.map(g => {
                const checked = selectedGroups.includes(g.id);
                return (
                  <label key={g.id}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${checked ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                    <Checkbox checked={checked} onCheckedChange={() => toggleGroup(g.id)} />
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {g.image_url ? <img src={g.image_url} className="h-full w-full object-cover" /> : <Users className="h-4 w-4 text-primary" />}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate flex-1">{g.name}</span>
                    {checked && <Check className="h-4 w-4 text-primary" />}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-muted/40 rounded-xl p-3 text-[11px] text-muted-foreground leading-relaxed">
          ℹ️ Une seule annonce sera envoyée sur <strong>zwandako.com</strong> (statut « en attente » de validation). La même annonce apparaît dans tous les groupes cochés et reste comptée comme <strong>1 seule publication</strong> dans votre profil.
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={uploading || createMulti.isPending} className="rounded-full h-11 text-sm font-semibold px-5">
            Annuler
          </Button>
          <Button type="submit" disabled={uploading || createMulti.isPending}
          className="flex-1 rounded-full bg-primary text-primary-foreground h-11 text-sm font-semibold">
          {(uploading || createMulti.isPending) ? (
            <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Publier
          </Button>
        </div>
      </form>
    </div>
  );
}
