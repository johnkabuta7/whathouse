import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Heart, Share2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup, useListings, useIsMember, useJoinGroup, useToggleLike } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';

function ListingCard({ listing, userId }: { listing: any; userId: string }) {
  const [expanded, setExpanded] = useState(false);
  const toggleLike = useToggleLike();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const { toast } = useToast();

  const desc = listing.description || '';
  const isLong = desc.length > 150;

  const handleLike = () => {
    toggleLike.mutate({ listingId: listing.id, userId }, {
      onSuccess: (r) => {
        setLiked(r.liked);
        setLikeCount(c => r.liked ? c + 1 : c - 1);
      }
    });
  };

  const handleShare = async () => {
    const url = listing.zwandako_url || window.location.href;
    if (navigator.share) {
      await navigator.share({ title: listing.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Lien copié !' });
    }
  };

  const images: string[] = listing.images || [];

  return (
    <Card className="border-0 shadow-sm overflow-hidden animate-slide-up">
      {images.length > 0 && (
        <div className="relative">
          <div className="flex overflow-x-auto snap-x snap-mandatory">
            {images.map((img: string, i: number) => (
              <img key={i} src={img} alt={`${listing.title} ${i + 1}`} className="w-full h-52 object-cover snap-center shrink-0" />
            ))}
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-foreground/60 text-background text-[10px] font-bold px-2 py-0.5 rounded-lg">
              {images.length} photos
            </div>
          )}
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="text-sm font-bold text-foreground mb-1">{listing.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isLong && !expanded ? desc.slice(0, 150) + '...' : desc}
        </p>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
            {expanded ? <>Voir moins <ChevronUp className="h-3 w-3" /></> : <>Voir plus <ChevronDown className="h-3 w-3" /></>}
          </button>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <button onClick={handleLike} className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${liked ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
            <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
            {likeCount > 0 && likeCount}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
            <Share2 className="h-3.5 w-3.5" />Partager
          </button>
          {listing.zwandako_url && (
            <a href={listing.zwandako_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground ml-auto">
              <ExternalLink className="h-3.5 w-3.5" />Voir l'annonce
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: group, isLoading: groupLoading } = useGroup(id || '');
  const { data: listings, isLoading: listingsLoading } = useListings(id || '');
  const { data: isMember } = useIsMember(id || '');
  const joinGroup = useJoinGroup();
  const { toast } = useToast();

  if (groupLoading) {
    return <div className="px-4 py-6 max-w-lg mx-auto"><Skeleton className="h-40 rounded-2xl" /></div>;
  }

  if (!group) {
    return <div className="px-4 py-6 text-center text-sm text-muted-foreground">Groupe introuvable</div>;
  }

  const handleJoin = () => {
    if (!user) return;
    joinGroup.mutate({ groupId: group.id, userId: user.id }, {
      onSuccess: () => toast({ title: 'Bienvenue !', description: `Vous avez rejoint ${group.name}` }),
      onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
    });
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-card sticky top-0 z-10">
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {group.image_url ? <img src={group.image_url} className="h-full w-full object-cover rounded-xl" /> : <Users className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{group.name}</p>
          <p className="text-[10px] text-muted-foreground">{group.description}</p>
        </div>
        <Link to={`/group/${id}/members`} className="text-muted-foreground"><Users className="h-5 w-5" /></Link>
      </div>

      {!isMember ? (
        <div className="px-4 py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Vous n'êtes pas membre</p>
          <p className="text-xs text-muted-foreground mb-4">Rejoignez ce groupe pour voir les annonces</p>
          <Button onClick={handleJoin} disabled={joinGroup.isPending} className="rounded-xl">
            Rejoindre le groupe
          </Button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">
              {listings?.length || 0} annonce{(listings?.length || 0) > 1 ? 's' : ''}
            </p>
            <Button size="sm" asChild className="rounded-xl">
              <Link to={`/publish?group=${id}`}><Plus className="h-4 w-4 mr-1" />Publier</Link>
            </Button>
          </div>

          {listingsLoading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-60 rounded-2xl" />)
          ) : (!listings || listings.length === 0) ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Aucune annonce dans ce groupe</p>
              <Button size="sm" asChild className="mt-3 rounded-xl">
                <Link to={`/publish?group=${id}`}><Plus className="h-4 w-4 mr-1" />Publier une annonce</Link>
              </Button>
            </div>
          ) : (
            listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} userId={user?.id || ''} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
