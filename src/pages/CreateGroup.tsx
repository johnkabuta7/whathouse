import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, ImagePlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateGroup, uploadListingImage } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const createGroup = useCreateGroup();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setIsLoading(true);

    let image_url: string | undefined;
    if (imageFile) {
      try {
        image_url = await uploadListingImage(imageFile, user.id);
      } catch {
        toast({ title: 'Erreur upload image', variant: 'destructive' });
      }
    }

    createGroup.mutate(
      { name: name.trim(), description: description.trim(), image_url, created_by: user.id },
      {
        onSuccess: () => {
          toast({ title: 'Groupe créé !' });
          navigate('/');
        },
        onError: () => {
          toast({ title: 'Erreur', variant: 'destructive' });
          setIsLoading(false);
        },
      }
    );
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-foreground">Créer un groupe</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                <div className="h-24 w-24 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
                  {imagePreview ? (
                    <img src={imagePreview} className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Nom du groupe *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Immobilier Kinshasa" className="rounded-xl" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description du groupe..." className="rounded-xl resize-none" rows={3} />
            </div>

            <Button type="submit" className="w-full rounded-xl font-semibold" disabled={isLoading || !name.trim()}>
              <Users className="h-4 w-4 mr-2" />
              {isLoading ? 'Création...' : 'Créer le groupe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
