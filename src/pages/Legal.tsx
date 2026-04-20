import { useParams, Link } from 'react-router-dom';
import { useState, useRef } from 'react';
import { ArrowLeft, ShieldCheck, Sparkles, BookOpen, Plus, X, ImagePlus, Save } from 'lucide-react';
import { useAppContent, useUpsertAppContent, useIsAppAdmin, uploadListingImage } from '@/hooks/use-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const META: Record<string, { title: string; icon: any; fallback: string }> = {
  terms: {
    title: 'Termes & Confidentialité',
    icon: ShieldCheck,
    fallback: `# 1. Acceptation des conditions
En utilisant WhatHouse, vous acceptez les présentes conditions d'utilisation. Cette application est réservée aux professionnels de l'immobilier.

# 2. Compte utilisateur
L'inscription se fait via un numéro de téléphone unique. Un seul compte par numéro est autorisé.

# 3. Contenu publié
Toutes les annonces publiées doivent concerner des biens immobiliers réels. Les annonces frauduleuses, dupliquées ou hors-sujet seront supprimées sans préavis.

# 4. Diffusion publique
Les annonces que vous publiez dans les groupes sont automatiquement relayées sur www.zwandako.com pour amplifier leur portée.

# 5. Confidentialité des données
Vos données personnelles ne sont partagées avec aucun tiers.

# 6. Modération
Les administrateurs de groupe peuvent valider ou refuser les demandes d'adhésion.

# 7. Suppression du compte
Vous pouvez demander la suppression complète de votre compte à tout moment.`,
  },
  avantages: {
    title: 'Pourquoi WhatHouse ?',
    icon: Sparkles,
    fallback: `![](https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop)

# 📂 Tout est rangé
Sur les messageries classiques, les annonces se perdent dans le scroll. Ici, chaque groupe a sa propre liste structurée et triée par date.

![](https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=400&fit=crop)

# 🔍 Recherche instantanée
Tapez un mot-clé et toutes les annonces correspondantes s'affichent immédiatement, sans devoir remonter des heures de discussion.

# ⭐ Vos favoris en un clic
Sauvegardez les annonces qui vous intéressent pour les retrouver depuis votre profil à tout moment.

![](https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=400&fit=crop)

# 🌍 Diffusion automatique sur zwandako.com
Chaque annonce publiée ici est automatiquement publiée sur www.zwandako.com, multipliant votre visibilité auprès des acheteurs et locataires.

# 👥 Réseau 100% pro
Pas de spam, pas de curieux. Uniquement des agents immobiliers validés par les administrateurs de groupe.

# 📞 Contact direct
Un bouton ouvre directement la conversation avec le propriétaire de l'annonce, lien inclus.

# 🔔 Notifications intelligentes
Soyez alerté en temps réel des nouvelles annonces de vos groupes et des demandes d'adhésion.

# 📱 App native
Installez WhatHouse sur votre écran d'accueil — fonctionne comme une vraie application.

En résumé : moins de chaos, plus de business.`,
  },
  tuto: {
    title: 'Tuto — Comment ça marche',
    icon: BookOpen,
    fallback: `![](https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&h=400&fit=crop)

# 1. Créer ou rejoindre un groupe
Sur la page d'accueil, appuyez sur le bouton + en bas à droite pour créer un groupe, ou utilisez la loupe 🔍 en haut pour chercher un groupe existant et demander à le rejoindre.

![](https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=400&fit=crop)

# 2. Publier une annonce
Ouvrez un groupe, appuyez sur « Publier une annonce » en bas (toujours visible). Ajoutez un titre, des photos et la description. Astuce : vous pouvez coller directement votre annonce avec ses images.

# 3. Diffusion sur zwandako.com
Dès qu'elle est publiée, votre annonce est automatiquement envoyée à www.zwandako.com pour décupler son audience.

![](https://images.unsplash.com/photo-1582407947092-987bce739e14?w=800&h=400&fit=crop)

# 4. Ajouter aux favoris
Appuyez sur l'icône marque-page sur n'importe quelle annonce pour la sauvegarder. Retrouvez-la depuis Profil → Favoris.

# 5. Contacter un propriétaire
Appuyez sur Message sur une annonce pour ouvrir directement la conversation avec le propriétaire — le lien de l'annonce est joint automatiquement.

![](https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=800&h=400&fit=crop)

# 6. Installer l'application
Depuis le menu ⋮ en haut à droite, choisissez « Installer l'App ». WhatHouse sera ajouté à votre écran d'accueil comme une vraie app.`,
  },
};

function renderContent(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    const imgMatch = trimmed.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    if (imgMatch) {
      return <img key={i} src={imgMatch[1]} alt="" className="w-full rounded-2xl my-3 object-cover max-h-56" loading="lazy" />;
    }
    if (trimmed.startsWith('# ')) {
      return <h2 key={i} className="text-base font-semibold text-foreground mt-4">{trimmed.slice(2)}</h2>;
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={i} className="text-sm font-semibold text-foreground mt-3">{trimmed.slice(3)}</h3>;
    }
    // Render plain text — strip ** markers if any leftover
    const clean = trimmed.replace(/\*\*([^*]+)\*\*/g, '$1');
    return (
      <p key={i} className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line font-normal">
        {clean}
      </p>
    );
  });
}

export default function Legal() {
  const { page } = useParams<{ page: string }>();
  const meta = META[page || 'terms'];
  const { data, isLoading } = useAppContent(page || 'terms');
  const { data: isAdmin } = useIsAppAdmin();
  const { user } = useAuth();
  const upsert = useUpsertAppContent();
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!meta) return <div className="p-4 text-center text-sm text-muted-foreground">Page introuvable</div>;
  const Icon = meta.icon;
  const content = (data?.content && data.content.trim()) || meta.fallback;

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadListingImage(file, user.id);
      setNewText(t => `${t}${t ? '\n\n' : ''}![](${url})`);
      toast({ title: 'Image ajoutée' });
    } catch {
      toast({ title: 'Erreur upload', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handlePublish = () => {
    if (!newText.trim()) return;
    const merged = `${content}\n\n${newText.trim()}`;
    upsert.mutate({ key: page || 'terms', content: merged }, {
      onSuccess: () => {
        toast({ title: 'Contenu publié !' });
        setNewText('');
        setEditorOpen(false);
      },
      onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
    });
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <header className="sticky top-0 z-50 bg-card/60 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link to="/profil" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <Icon className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold flex-1 text-foreground truncate">{meta.title}</h1>
          {isAdmin && (
            <button
              onClick={() => setEditorOpen(o => !o)}
              className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow"
              title="Ajouter du contenu"
            >
              {editorOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          )}
        </div>
      </header>

      {isAdmin && editorOpen && (
        <div className="px-4 py-3 bg-card border-b border-border space-y-2 animate-fade-in">
          <p className="text-xs font-semibold text-foreground">Publier du nouveau contenu</p>
          <Textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="# Titre&#10;Votre texte ici..."
            rows={6}
            className="text-xs rounded-xl resize-y min-h-[120px]"
          />
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full bg-muted text-foreground text-xs font-medium"
            >
              <ImagePlus className="h-3.5 w-3.5" />{uploading ? 'Upload...' : 'Ajouter image'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAddImage} className="hidden" />
            <Button onClick={handlePublish} disabled={!newText.trim() || upsert.isPending} size="sm" className="flex-1 rounded-full text-xs bg-primary text-primary-foreground">
              <Save className="h-3.5 w-3.5 mr-1" />Publier
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Astuce : <code>#</code> pour un titre. Les images s'insèrent automatiquement.</p>
        </div>
      )}

      <div className="px-4 py-5 pb-24 space-y-2">
        {isLoading ? <Skeleton className="h-40" /> : renderContent(content)}
      </div>
    </div>
  );
}
