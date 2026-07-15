import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Heart, Share2, ExternalLink, ChevronDown, ChevronUp, Search, ImagePlus, X, Send, Phone, Bookmark, Camera, Edit2, Save, LogOut, Save as SaveIcon, FileText, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup, useListings, useIsMember, useToggleLike, useCreateListing, uploadListingImage, useListingLikes, useRequestJoin, useHasPendingRequest, useJoinRequests, useToggleFavorite, useIsFavorite, useUpdateGroup, uploadGroupImage, useMarkGroupRead, useProfile, useLeaveGroup, normalizeSearch } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { useDraft, deleteDraft, fileToDataUrl, dataUrlToFile } from '@/hooks/use-drafts';
import { usePlayTestSound } from '@/hooks/use-notifications';
import { ShareToGroupsModal } from '@/components/ShareToGroupsModal';

function PublishForm({ groupId, userId, onDone }: { groupId: string; userId: string; onDone: () => void }) {
  const { draft, setDraft } = useDraft(groupId);
  const [title, setTitle] = useState(draft?.title || '');
  const [description, setDescription] = useState(draft?.description || '');
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
      if (!title.trim() && !description.trim() && previews.length === 0) {
        setDraft(null);
        return;
      }
      setDraft({ title, description, zwandako_url: '', image_previews: previews });
    }, 300);
    return () => clearTimeout(t);
  }, [title, description, previews, setDraft]);

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
    if (!title.trim() || !description.trim()) return;
    if (previews.length === 0) {
      toast({ title: 'Image obligatoire', description: 'Ajoutez au moins une image avant de publier.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      // Make sure we have File objects for every preview (older drafts)
      let actualFiles = files;
      if (actualFiles.length !== previews.length) {
        actualFiles = await Promise.all(previews.map((d, i) => dataUrlToFile(d, `draft-${i}.jpg`)));
      }
      // Parallel uploads — much faster than sequential
      const urls = await Promise.all(actualFiles.map(f => uploadListingImage(f, userId)));
      createListing.mutate(
        { group_id: groupId, user_id: userId, title: title.trim(), description: description.trim(), images: urls },
        {
          onSuccess: (result: any) => {
            toast({
              title: 'Annonce publiée !',
              description: result?.zwandako_url ? 'Visible aussi sur zwandako.com' : 'Publication Zwandako confirmée.',
            });
            try { playSuccessSound(); } catch { /* sound is best-effort */ }
            deleteDraft(groupId);
            setTitle(''); setDescription(''); setFiles([]); setPreviews([]);
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
    setDraft({ title, description, zwandako_url: '', image_previews: previews });
    toast({ title: 'Brouillon enregistré', description: 'Retrouvez-le dans l\'onglet Brouillons.' });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste} className="p-3 bg-card border-t border-border space-y-2">
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'annonce *" className="rounded-full text-sm h-9" required />
      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description complète *" className="rounded-xl text-sm resize-none" rows={2} required />
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
        <Button type="submit" size="sm" className="rounded-full shrink-0 bg-primary text-primary-foreground" disabled={isLoading || !title.trim() || !description.trim() || previews.length === 0}>
          {isLoading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}

function ListingCard({ listing, userId }: { listing: any; userId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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

  const handleShare = () => setShareOpen(true);

  const handleTake = () => {
    try {
      const key = 'wh_taken_listings';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      const already = arr.find((x: any) => x.id === listing.id);
      if (!already) {
        const entry = {
          id: listing.id,
          title: listing.title,
          description: listing.description || '',
          image: (listing.images || [])[0] || null,
          group_id: listing.group_id,
          takenAt: Date.now(),
          source: 'whathouse' as const,
          zwandako_url: listing.zwandako_url || null,
        };
        localStorage.setItem(key, JSON.stringify([entry, ...arr]));
      }
    } catch { /* ignore */ }
    // Notify the owner via realtime notification
    import('@/hooks/use-takes').then(({ recordListingTake }) => {
      recordListingTake({
        listingId: listing.id,
        ownerId: listing.user_id,
        takerId: userId,
        title: listing.title,
        image: (listing.images || [])[0] || null,
      });
    });
    toast({ title: 'Annonce prise', description: 'Ouverture de vos affaires…' });
    window.location.href = '/affaires?tab=tableau&sub=ongoing';
  };

  const images: string[] = listing.images || [];
  const zwandakoHref = listing.zwandako_url || (listing.wp_post_id ? `https://zwandako.com/?p=${listing.wp_post_id}` : `https://zwandako.com/?s=${encodeURIComponent(listing.title || '')}`);

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
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold text-foreground truncate leading-tight">{agentName}</p>
            {ownerProfile?.show_stars !== false && (ownerProfile?.stars || 0) > 0 && (
              <span className="flex items-center gap-[1px] shrink-0" title={`${ownerProfile.stars} étoile${ownerProfile.stars>1?'s':''}`}>
                {Array.from({ length: ownerProfile.stars }).map((_, i) => (
                  <span key={i} className="text-amber-500 text-[10px] leading-none">★</span>
                ))}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">{dateStr}</p>
        </div>
      </div>
      {images.length > 0 && (
        <Link to={`/listing/${listing.id}`} className="block relative" aria-label="Voir l'annonce en aperçu">
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
        </Link>
      )}
      <div className="p-3">
        <Link to={`/listing/${listing.id}`} className="block">
          <h3 className="text-sm font-bold text-foreground hover:underline">{listing.title}</h3>
        </Link>
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
          <button onClick={handleTake} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full bg-success text-success-foreground">
            <Send className="h-3.5 w-3.5" />Prendre
          </button>
          <a href={zwandakoHref} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full ml-auto bg-primary text-primary-foreground">
            <ExternalLink className="h-3.5 w-3.5" />Voir
          </a>
        </div>
      </div>
      <ShareToGroupsModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        listing={{
          id: listing.id,
          title: listing.title,
          description: listing.description,
          images: listing.images,
          group_id: listing.group_id,
        }}
      />
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

function GridListingCard({ listing }: { listing: any }) {
  const img = (listing.images && listing.images[0]) || '';
  const { data: ownerProfile } = useProfile(listing.user_id);
  const { user } = useAuth();
  const { toast } = useToast();
  const agentName = `${ownerProfile?.first_name || ''} ${ownerProfile?.last_name || ''}`.trim() || 'Agent';
  const agentInitials = agentName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'A';
  const zwandakoHref = listing.zwandako_url || (listing.wp_post_id ? `https://zwandako.com/?p=${listing.wp_post_id}` : `https://zwandako.com/?s=${encodeURIComponent(listing.title || '')}`);

  const handleTake = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return;
    try {
      const key = 'wh_taken_listings';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      if (!arr.find((x: any) => x.id === listing.id)) {
        arr.unshift({
          id: listing.id, title: listing.title, description: listing.description || '',
          image: img || null, group_id: listing.group_id, takenAt: Date.now(),
          source: 'whathouse', zwandako_url: listing.zwandako_url || null,
        });
        localStorage.setItem(key, JSON.stringify(arr));
      }
    } catch {}
    import('@/hooks/use-takes').then(({ recordListingTake }) => {
      recordListingTake({
        listingId: listing.id, ownerId: listing.user_id, takerId: user.id,
        title: listing.title, image: img || null,
      });
    });
    toast({ title: 'Annonce prise', description: 'Ouverture du tableau…' });
    window.location.href = '/affaires?tab=tableau&sub=ongoing';
  };

  return (
    <a href={`/listing/${listing.id}`}
      className="block bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition">
      <div className="relative aspect-square w-full bg-muted overflow-hidden">
        {img ? <img src={img} alt={listing.title} className="h-full w-full object-cover" loading="lazy" /> : null}
        <div className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full bg-card/90 backdrop-blur ring-2 ring-primary/30 flex items-center justify-center overflow-hidden">
          {ownerProfile?.avatar_url ? (
            <img src={ownerProfile.avatar_url} alt={agentName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-primary">{agentInitials}</span>
          )}
        </div>
      </div>
      <div className="p-2">
        <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">{listing.title}</p>
        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 font-normal">{listing.description}</p>
        <div className="flex items-center justify-between mt-1 gap-1">
          <a href={zwandakoHref} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="text-[10px] text-primary font-bold inline-block">Voir →</a>
          <button
            type="button"
            onClick={handleTake}
            className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success text-success-foreground hover:opacity-90 transition"
          >
            <Send className="h-2.5 w-2.5" />Prendre
          </button>
        </div>
      </div>
    </a>
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try { return (localStorage.getItem('group_view_mode') as any) || 'list'; } catch { return 'list'; }
  });
  const setView = (m: 'list' | 'grid') => {
    setViewMode(m);
    try { localStorage.setItem('group_view_mode', m); } catch {}
  };

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

  const q = normalizeSearch(search);
  const filteredListings = listings?.filter(l =>
    !q ||
    normalizeSearch(l.title).includes(q) ||
    normalizeSearch(l.description || '').includes(q)
  );

  if (groupLoading) return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <p className="text-sm font-bold text-foreground">Chargement…</p>
        </div>
      </div>
      <div className="px-4 py-6"><Skeleton className="h-40 rounded-2xl" /></div>
    </div>
  );
  if (!group) return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <p className="text-sm font-bold text-foreground">Groupe</p>
        </div>
      </div>
      <div className="px-4 py-10 text-center space-y-3">
        <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
        <p className="text-sm font-medium text-foreground">Ce groupe n'est pas accessible</p>
        <p className="text-xs text-muted-foreground">Vous devez être membre pour voir son contenu. Demandez à rejoindre depuis la recherche.</p>
        <Link to="/" className="inline-block mt-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold">Retour à l'accueil</Link>
      </div>
    </div>
  );

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
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5mm)' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
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
          <button
            onClick={() => setView(viewMode === 'list' ? 'grid' : 'list')}
            className="p-1.5 rounded-full hover:bg-muted transition"
            title={viewMode === 'list' ? 'Vue grille' : 'Vue liste'}
            aria-label="Changer la vue"
          >
            {viewMode === 'list'
              ? <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              : <List className="h-4 w-4 text-muted-foreground" />}
          </button>
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
          <div className="px-3 pb-2 animate-fade-in">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une annonce..."
                className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
            </div>
          </div>
        )}
      </div>

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
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {listingsLoading ? (
              <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-60 rounded-2xl" />)}</div>
            ) : (!filteredListings || filteredListings.length === 0) ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">Aucune annonce</p>
                <p className="text-xs text-muted-foreground mt-1">Publiez la première annonce !</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredListings.map(listing => (
                  <GridListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredListings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} userId={user?.id || ''} />
                ))}
              </div>
            )}
          </div>

          {/* Publish trigger + popup */}
          <div className="shrink-0 z-20">
            <div className="px-3 py-2 bg-card border-t border-border">
              <button onClick={() => setShowPublish(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition">
                <Plus className="h-4 w-4 text-primary" />
                Publier une annonce...
              </button>
            </div>
          </div>
          {/* Floating share/publish FAB — opens the same publish modal directly in this group */}
          <button
            onClick={() => setShowPublish(true)}
            title="Publier dans ce groupe"
            aria-label="Publier une annonce dans ce groupe"
            className="fixed right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
            style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
          >
            <Share2 className="h-6 w-6" />
          </button>
          {showPublish && (
            <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setShowPublish(false)}>
              <div
                className="relative w-full sm:max-w-lg max-h-[92dvh] bg-card border border-border shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up"
                onClick={e => e.stopPropagation()}
                data-no-swipe
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                  <p className="text-sm font-bold text-foreground">Publier dans « {group.name} »</p>
                  <button onClick={() => setShowPublish(false)} className="p-1.5 rounded-full hover:bg-muted" aria-label="Fermer">
                    <X className="h-4 w-4 text-foreground" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <PublishForm groupId={group.id} userId={user?.id || ''} onDone={() => setShowPublish(false)} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
