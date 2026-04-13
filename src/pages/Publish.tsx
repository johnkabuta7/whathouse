import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X, Clipboard, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups, useCreateListing, uploadListingImage } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';

export default function Publish() {
  const [searchParams] = useSearchParams();
  const preselectedGroup = searchParams.get('group') || '';
  const [groupId, setGroupId] = useState(preselectedGroup);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [zwandakoUrl, setZwandakoUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const { data: groups } = useGroups();
  const createListing = useCreateListing();
  const navigate = useNavigate();
  const { toast } = useToast();

  const addFiles = useCallback((newFiles: File[]) => {
    const imageFiles = newFiles.filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...imageFiles]);
    setPreviews(prev => [...prev, ...imageFiles.map(f => URL.createObjectURL(f))]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    const textItem = items.find(item => item.type === 'text/plain');

    if (imageItems.length > 0) {
      const imageFiles = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[];
      addFiles(imageFiles);
    }

    if (textItem) {
      textItem.getAsString(text => {
        if (text.trim()) {
          setDescription(prev => prev ? prev + '\n' + text : text);
        }
      });
    }
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groupId || !title.trim()) return;
    setIsLoading(true);

    try {
      const imageUrls: string[] = [];
      for (const file of files) {
        const url = await uploadListingImage(file, user.id);
        imageUrls.push(url);
      }

      createListing.mutate(
        {
          group_id: groupId,
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          images: imageUrls,
          zwandako_url: zwandakoUrl.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast({ title: 'Annonce publiée !' });
            navigate(`/group/${groupId}`);
          },
          onError: () => {
            toast({ title: 'Erreur', variant: 'destructive' });
            setIsLoading(false);
          },
        }
      );
    } catch {
      toast({ title: "Erreur lors de l'upload des images", variant: 'destructive' });
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to={groupId ? `/group/${groupId}` : '/'} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-foreground">Publier une annonce</h1>
      </div>

      {/* Smart paste hint */}
      <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <p className="text-xs text-primary font-medium flex items-center gap-2">
          <Clipboard className="h-4 w-4" />
          Astuce : Collez du contenu WhatsApp ici ! Les images et textes seront détectés automatiquement.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4" onPaste={handlePaste}>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Groupe *</label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choisir un groupe" /></SelectTrigger>
                <SelectContent>
                  {groups?.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Titre *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Villa 3 chambres à Gombe" className="rounded-xl" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Décrivez votre bien... (Vous pouvez coller du texte WhatsApp ici)"
                className="rounded-xl resize-none"
                rows={5}
              />
            </div>

            {/* Image upload zone */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Photos</label>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary transition-colors"
              >
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" multiple onChange={e => addFiles(Array.from(e.target.files || []))} className="hidden" />
                  <ImagePlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Cliquez ou glissez des images ici</p>
                </label>
              </div>
              {previews.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {previews.map((p, i) => (
                    <div key={i} className="relative h-20 w-20 rounded-xl overflow-hidden">
                      <img src={p} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Lien Zwandako (optionnel)</label>
              <Input value={zwandakoUrl} onChange={e => setZwandakoUrl(e.target.value)} placeholder="https://zwandako.com/annonce/..." className="rounded-xl" />
            </div>

            <Button type="submit" className="w-full rounded-xl font-semibold" disabled={isLoading || !groupId || !title.trim()}>
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'Publication...' : 'Publier'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
