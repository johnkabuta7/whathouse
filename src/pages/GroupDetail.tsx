import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Heart, Share2, ExternalLink, ChevronDown, ChevronUp, Search, ImagePlus, X, Send, Phone, Bookmark, Camera, Edit2, Save, LogOut, Save as SaveIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup, useListings, useIsMember, useToggleLike, useCreateListing, uploadListingImage, useListingLikes, useRequestJoin, useHasPendingRequest, useJoinRequests, useToggleFavorite, useIsFavorite, useUpdateGroup, uploadGroupImage, useMarkGroupRead, useProfile, useLeaveGroup } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { useDraft, deleteDraft, fileToDataUrl, dataUrlToFile } from '@/hooks/use-drafts';
import { usePlayTestSound } from '@/hooks/use-notifications';

function PublishForm({ groupId, userId, onDone }: { groupId: string; userId: string; onDone: () => void }) {
  const { draft, setDraft } = useDraft(groupId);
  const [title, setTitle] = useState(draft?.title || '');
  const [description, setDescription] = useState(draft?.description || '');
  const [zwandakoUrl, setZwandakoUrl] = useState(draft?.zwandako_url || '');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(draft?.image_previews || []);
  const [isLoading, setIsLoading] = useState(false);
  const createListing = useCreateListing();
  const { toast } = useToast();
  const playSuccessSound = usePlayTestSound();

  // Hydrate File objects from existing draft data URLs once at mount
  useEffect(() => {
    if (draft?.image_previews?.length && files.length === 0) {
      Promise.all(draft.image_previews.map((d, i) => dataUrlToFile(d, `draft-${i}.jpg`)))
        .then(setFiles)
        .catch(() => {/* ignore */});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft on every change (debounced via microtask)
  useEffect(() => {
    const t = setTimeout(() => {
      if (!title.trim() && !description.trim() && !zwandakoUrl.trim() && previews.length === 0) {
        setDraft(null);
        return;
      }
      setDraft({ title, description, zwandako_url: zwandakoUrl, image_previews: previews });
    }, 300);
    return () => clearTimeout(t);
  }, [title, description, zwandakoUrl, previews, setDraft]);

  const addFiles = useCallback(async (newFiles: File[]) => {
    const imgs = newFiles.filter(f => f.type.startsWith('image/'));
    setFiles(p => [...p, ...imgs]);
    const dataUrls = await Promise.all(imgs.map(fileToDataUrl));
    setPreviews(p => [...p, ...dataUrls]);
  }, []);

  const removeFile = (i: number) => {
    setFiles(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imgs = items.filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean) as File[];
    if (imgs.length) addFiles(imgs);
    const txt = items.find(i => i.type === 'text/plain');
    if (txt) txt.getAsString(t => { if (t.trim()) setDescription(p => p ? p + '\n' + t : t); });
  }, [addFiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsLoading(true);
    try {
      // Make sure we have File objects for every preview (older drafts)
      let actualFiles = files;
      if (actualFiles.length !== previews.length) {
        actualFiles = await Promise.all(previews.map((d, i) => dataUrlToFile(d, `draft-${i}.jpg`)));
      }
      const urls: string[] = [];
      for (const f of actualFiles) urls.push(await uploadListingImage(f, userId));
      createListing.mutate(
        { group_id: groupId, user_id: userId, title: title.trim(), description: description.trim(), images: urls, zwandako_url: zwandakoUrl.trim() || undefined },
        {
          onSuccess: (result: any) => {
            toast({
              title: 'Annonce publiée !',
              description: result?.zwandako_url ? 'Visible aussi sur zwandako.com' : 'Enregistrée dans l’application, synchronisation zwandako à vérifier.',
            });
            try { playSuccessSound(); } catch { /* sound is best-effort */ }
            deleteDraft(groupId);
            setTitle(''); setDescription(''); setZwandakoUrl(''); setFiles([]); setPreviews([]);
            setDraft(null);
            onDone();
            setIsLoading(false);
          },
          onError: (err: any) => {
            const msg = err?.message || err?.context?.error || 'Publication échouée';
            toast({ title: 'Erreur de publication', description: String(msg).slice(0, 200), variant: 'destructive' });
            setIsLoading(false);
          },
        }
      );
    } catch (err: any) {
      toast({ title: 'Erreur upload', description: err?.message || 'Impossible de téléverser les images', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  const handleSaveDraft = () => {
    setDraft({ title, description, zwandako_url: zwandakoUrl, image_previews: previews });
    toast({ title: 'Brouillon enregistré', description: 'Retrouvez-le dans l\'onglet Brouillons.' });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste} className="p-3 bg-card border-t border-border space-y-2">
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'annonce *" className="rounded-full text-sm h-9" required />
      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description... (collez votre texte d'annonce ici)" className="rounded-xl text-sm resize-none" rows={2} />
      <Input value={zwandakoUrl} onChange={e => setZwandakoUrl(e.target.value)} placeholder="Lien Zwandako (optionnel)" className="rounded-full text-sm h-9" />
      <div className="flex gap-2 items-center">
        <label className="cursor-pointer shrink-0">
          <input type="file" accept="image/*" multiple onChange={e => addFiles(Array.from(e.target.files || []))} className="hidden" />
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary"><ImagePlus className="h-4 w-4" /></div>
        </label>
        {previews.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
            {previews.map((p, i) => (
              <div key={i} className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0">
                <img src={p} className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeFile(i)} className="absolute top-0 right-0 bg-foreground/70 text-background rounded-full p-0.5"><X className="h-2.5 w-2.5" /></button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={handleSaveDraft} title="Enregistrer en brouillon"
          className="h-9 w-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
          <SaveIcon className="h-4 w-4" />
        </button>
        <Button type="submit" size="sm" className="rounded-full shrink-0 bg-primary text-primary-foreground" disabled={isLoading || !title.trim()}>
          {isLoading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}

function ListingCard({ listing, userId }: { listing: any; userId: string }) {
  const [expanded, setExpanded] = useState(false);
  const toggleLike = useToggleLike();
  const toggleFavorite = useToggleFavorite();
  const { data: likeData } = useListingLikes(listing.id);
  const { data: isFav } = useIsFavorite(listing.id);
  const { data: ownerProfile } = useProfile(listing.user_id);
  const { toast } = useToast();

  const desc = listing.description || '';
  const isLong = desc.length > 120;

  const handleLike = () => toggleLike.mutate({ listingId: listing.id, userId });
  const handleFav = () => {
    toggleFavorite.mutate({ listingId: listing.id, userId }, {
      onSuccess: (data) => toast({ title: data.favorited ? 'Ajouté aux favoris' : 'Retiré des favoris' }),
    });
  };

  const listingLink = `${window.location.origin}/listing/${listing.id}`;

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: listing.title, url: listingLink });
    else { await navigator.clipboard.writeText(listingLink); toast({ title: 'Lien copié !' }); }
  };

  const handleWhatsApp = () => {
    const ownerPhone = ownerProfile?.phone?.replace(/[^0-9]/g, '');
    if (!ownerPhone) {
      toast({ title: 'Numéro indisponible', description: "Le propriétaire n'a pas renseigné son numéro.", variant: 'destructive' });
      return;
    }
    const message = `Bonjour, je vous contacte au sujet de votre annonce "${listing.title}" : ${listingLink}`;
    window.open(`https://wa.me/${ownerPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const images: string[] = listing.images || [];

  const agentName = `${ownerProfile?.first_name || ''} ${ownerProfile?.last_name || ''}`.trim() || 'Agent';
  const agentInitials = agentName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'A';
  const dateStr = new Date(listing.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  return (
    <div id={`listing-${listing.id}`} className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border scroll-mt-20">
      {/* Agent header */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-primary/20">
          {ownerProfile?.avatar_url ? (
            <img src={ownerProfile.avatar_url} alt={agentName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-primary">{agentInitials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate leading-tight">{agentName}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{dateStr}</p>
        </div>
      </div>
      {images.length > 0 && (
        <div className="relative">
          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
            {images.map((img: string, i: number) => (
              <img key={i} src={img} alt={`${listing.title} ${i + 1}`} className="w-full h-48 object-cover snap-center shrink-0" />
            ))}
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-foreground/60 text-background text-[10px] font-bold px-2 py-0.5 rounded-lg">
              {images.length} photos
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <h3 className="text-sm font-bold text-foreground">{listing.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          {isLong && !expanded ? desc.slice(0, 120) + '...' : desc}
        </p>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
            {expanded ? <>Moins <ChevronUp className="h-3 w-3" /></> : <>Plus <ChevronDown className="h-3 w-3" /></>}
          </button>
        )}
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border">
          <button onClick={handleLike} className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors ${likeData?.liked ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
            <Heart className={`h-3.5 w-3.5 ${likeData?.liked ? 'fill-current' : ''}`} />
            {(likeData?.count || 0) > 0 && likeData?.count}
          </button>
          <button onClick={handleFav} className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors ${isFav ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Bookmark className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
          </button>
          <button onClick={handleShare} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full bg-muted text-muted-foreground">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleWhatsApp} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full bg-success text-success-foreground">
            <Send className="h-3.5 w-3.5" />Message
          </button>
          <a href={listing.zwandako_url || `https://zwandako.com/?p=${listing.wp_post_id || ''}`} target="_blank" rel="noopener noreferrer"
            aria-disabled={!listing.zwandako_url && !listing.wp_post_id}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full ml-auto ${listing.zwandako_url || listing.wp_post_id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground pointer-events-none opacity-60'}`}>
            <ExternalLink className="h-3.5 w-3.5" />Voir
          </a>
        </div>
      </div>
    </div>
  );
}

function GroupEditHeader({ group, onClose }: { group: any; onClose: () => void }) {
  const [name, setName] = useState(group.name);
  const [uploading, setUploading] = useState(false);
  const updateGroup = useUpdateGroup();
  const { toast } = useToast();
  const imgRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadGroupImage(file, group.id);
      updateGroup.mutate({ id: group.id, image_url: url }, {
        onSuccess: () => { toast({ title: 'Image mise à jour !' }); setUploading(false); },
        onError: () => { toast({ title: 'Erreur', variant: 'destructive' }); setUploading(false); },
      });
    } catch { toast({ title: 'Erreur upload', variant: 'destructive' }); setUploading(false); }
  };

  const handleSaveName = () => {
    if (!name.trim() || name === group.name) { onClose(); return; }
    updateGroup.mutate({ id: group.id, name: name.trim() }, {
      onSuccess: () => { toast({ title: 'Nom modifié !' }); onClose(); },
      onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
    });
  };

  return (
    <div className="p-3 bg-card border-b border-border space-y-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {group.image_url ? <img src={group.image_url} className="h-full w-full object-cover rounded-full" /> : <Users className="h-6 w-6 text-primary" />}
          </div>
          <button onClick={() => imgRef.current?.click()} disabled={uploading}
            className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
            <Camera className="h-3 w-3" />
          </button>
          <input ref={imgRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>
        <div className="flex-1">
          <Input value={name} onChange={e => setName(e.target.value)} className="rounded-full text-sm h-9" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSaveName} size="sm" className="flex-1 rounded-full bg-primary text-primary-foreground" disabled={updateGroup.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" />Sauvegarder
        </Button>
        <Button variant="outline" size="sm" onClick={onClose} className="rounded-full">Annuler</Button>
      </div>
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: group, isLoading: groupLoading } = useGroup(id || '');
  const { data: listings, isLoading: listingsLoading } = useListings(id || '');
  const { data: isMember } = useIsMember(id || '');
  const { data: hasPending } = useHasPendingRequest(id || '');
  const { data: joinRequests } = useJoinRequests(id || '');
  const requestJoin = useRequestJoin();
  const leaveGroup = useLeaveGroup();
  const markRead = useMarkGroupRead();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [showPublish, setShowPublish] = useState(searchParams.get('draft') === '1');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const isCreator = group?.created_by === user?.id;
  const pendingCount = joinRequests?.length || 0;

  // Mark as read when entering & listings load
  useEffect(() => {
    if (id && isMember && listings) markRead.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isMember, listings?.length]);

  // Scroll : si #listing-XXX → cibler ; sinon → aller à la dernière (la plus récente, en bas)
  useEffect(() => {
    if (!listings || listings.length === 0) return;
    const hash = window.location.hash;
    const t = setTimeout(() => {
      if (hash.startsWith('#listing-')) {
        const el = document.getElementById(hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const last = listings[listings.length - 1];
        const el = document.getElementById(`listing-${last.id}`);
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'end' });
        else window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [listings?.length]);

  const filteredListings = listings?.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    (l.description || '').toLowerCase().includes(search.toLowerCase())
  );

  if (groupLoading) return <div className="px-4 py-6 max-w-lg mx-auto"><Skeleton className="h-40 rounded-2xl" /></div>;
  if (!group) return <div className="px-4 py-6 text-center text-sm text-muted-foreground">Groupe introuvable</div>;

  const handleRequestJoin = () => {
    if (!user) return;
    requestJoin.mutate({ groupId: group.id, userId: user.id }, {
      onSuccess: () => toast({ title: 'Demande envoyée', description: "L'administrateur va examiner votre demande." }),
      onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
    });
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-3 bg-card/60 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {group.image_url ? <img src={group.image_url} className="h-full w-full object-cover rounded-full" /> : <Users className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate text-foreground">{group.name}</p>
          <p className="text-[10px] text-muted-foreground">{listings?.length || 0} annonces</p>
        </div>
        {isCreator && (
          <button onClick={() => setShowEdit(!showEdit)} className="p-1.5 rounded-full hover:bg-muted transition">
            <Edit2 className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 rounded-full hover:bg-muted transition">
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
        <Link to={`/group/${id}/members`} className="p-1.5 rounded-full hover:bg-muted transition relative">
          <Users className="h-4 w-4 text-muted-foreground" />
          {isCreator && pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center px-0.5">
              {pendingCount}
            </span>
          )}
        </Link>
        {isMember && !isCreator && (
          <button
            onClick={() => {
              if (!user) return;
              if (!confirm(`Quitter le groupe "${group.name}" ?`)) return;
              leaveGroup.mutate({ groupId: group.id, userId: user.id }, {
                onSuccess: () => { toast({ title: 'Vous avez quitté le groupe' }); window.history.back(); },
                onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
              });
            }}
            className="p-1.5 rounded-full hover:bg-destructive/10 transition"
            title="Quitter"
          >
            <LogOut className="h-4 w-4 text-destructive" />
          </button>
        )}
      </div>

      {showEdit && isCreator && <GroupEditHeader group={group} onClose={() => setShowEdit(false)} />}

      {showSearch && (
        <div className="px-3 py-2 bg-card border-b border-border animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une annonce..."
              className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
          </div>
        </div>
      )}

      {!isMember ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium text-foreground mb-1">Vous n'êtes pas membre</p>
          <p className="text-xs text-muted-foreground mb-4">Demandez à rejoindre ce groupe</p>
          {hasPending ? (
            <p className="text-sm text-primary font-medium">⏳ Demande en attente...</p>
          ) : (
            <Button onClick={handleRequestJoin} disabled={requestJoin.isPending} className="rounded-full bg-primary text-primary-foreground px-6">
              Demander à rejoindre
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Listings - scrollable area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {listingsLoading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-60 rounded-2xl" />)
            ) : (!filteredListings || filteredListings.length === 0) ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">Aucune annonce</p>
                <p className="text-xs text-muted-foreground mt-1">Publiez la première annonce !</p>
              </div>
            ) : (
              filteredListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} userId={user?.id || ''} />
              ))
            )}
          </div>

          {/* Fixed publish area at bottom - never scrolls */}
          <div className="shrink-0 z-20">
            {showPublish ? (
              <PublishForm groupId={group.id} userId={user?.id || ''} onDone={() => setShowPublish(false)} />
            ) : (
              <div className="px-3 py-2 bg-card border-t border-border">
                <button onClick={() => setShowPublish(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition">
                  <Plus className="h-4 w-4 text-primary" />
                  Publier une annonce...
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
